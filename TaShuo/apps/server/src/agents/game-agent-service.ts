import { randomUUID } from "node:crypto";
import {
  createReportSnapshot, pauseGame, publishComment, recordAccountResponse, revealPreparedContent, scoreReport, submitReport, validateCommentTarget,
  type CaseDefinition, type CommentInput, type GameState, type PendingAgentTask, type ReportAnalysis, type SpeechFeatures,
} from "@tashuo/core";
import { assertSameAction, StateConflictError, type GameRepository } from "../repository.js";
import { AgentOrchestrator } from "./orchestrator.js";

export class ConfirmationRequiredError extends Error {
  constructor(readonly state: GameState, readonly speech: SpeechFeatures) { super("发言含义需要确认"); }
}

export class ReportConfirmationRequiredError extends Error {
  constructor(readonly state: GameState, readonly analysis: ReportAnalysis) { super("请先确认系统对报告的理解"); }
}

export class AgentTaskBusyError extends Error {
  constructor() { super("当前内容正在处理，请稍候；尚未发布的文字仍会保留"); }
}

const leaseDurationMs = 15 * 60_000;
const leaseEnd = () => new Date(Date.now() + leaseDurationMs).toISOString();

/** Every model operation starts from a durable, paused snapshot. Reads never generate. */
export class GameAgentService {
  constructor(private readonly repository: GameRepository, private readonly agents: AgentOrchestrator) {}

  private async current(state: GameState): Promise<GameState> {
    const current = await this.repository.getGame(state.id, state.ownerUserId);
    if (!current) throw new Error("游戏实例不存在");
    return current;
  }

  private async store(state: GameState, nextState: GameState, key: string, actionType: string, action: unknown): Promise<GameState> {
    const saved = await this.repository.saveGame({ gameInstanceId: state.id, ownerUserId: state.ownerUserId,
      expectedStateVersion: state.stateVersion, idempotencyKey: key, actionType, action, nextState });
    if (!saved) throw new Error("游戏实例不存在");
    return saved.state;
  }

  private missing(state: GameState, definition: CaseDefinition) {
    const unlocked = new Set(state.discoveries?.flatMap((item) => item.contentIds) ?? []);
    return definition.contents.filter((item) => item.editorial && (item.publishedAtMinute <= state.worldMinute || unlocked.has(item.id))
      && !state.publications?.some((draft) => draft.contentId === item.id));
  }

  async preparePublications(state: GameState, definition: CaseDefinition): Promise<GameState> {
    if (state.pendingAgentTask || state.status === "finished" || this.missing(state, definition).length === 0) return state;
    const task: PendingAgentTask = { id: randomUUID(), operation: "publication", actionKey: `publication:${randomUUID()}`,
      action: { atMinute: state.worldMinute }, resumeStatus: state.status, leaseUntil: leaseEnd() };
    const next = { ...structuredClone(state), status: "paused" as const, lastResumedAt: null, pendingAgentTask: task, stateVersion: state.stateVersion + 1 };
    const reserved = await this.store(state, next, `agent-begin:${task.id}`, "agent_begin", { operation: task.operation });
    return this.run(reserved, definition);
  }

  async startComment(state: GameState, definition: CaseDefinition, input: CommentInput, actionKey: string): Promise<GameState> {
    const duplicate = await this.repository.findAction(state.id, state.ownerUserId, actionKey);
    if (duplicate) { assertSameAction(duplicate, "publish_comment", input); return this.current(state); }
    if (state.pendingAgentTask) throw new AgentTaskBusyError();
    if (state.status !== "active") throw new Error("恢复游戏时间后才能发表评论");
    const paused = pauseGame(state, definition);
    if (paused.status === "awaiting_report") throw new Error("事件热度已经消散，请整理并提交报告");
    validateCommentTarget(paused, definition, input);
    const task: PendingAgentTask = { id: randomUUID(), operation: "comment", actionKey, action: { ...input },
      resumeStatus: "active", leaseUntil: leaseEnd(), confirmationVersion: state.stateVersion, commentId: randomUUID() };
    paused.pendingAgentTask = task;
    paused.stateVersion += 1;
    const reserved = await this.store(state, paused, `agent-begin:${task.id}`, "agent_begin", input);
    return this.run(reserved, definition);
  }

  async retry(state: GameState, definition: CaseDefinition, confirmed = false): Promise<GameState> {
    const task = state.pendingAgentTask;
    if (!task) return this.preparePublications(state, definition);
    if (!task.failure && Date.parse(task.leaseUntil) > Date.now()) throw new AgentTaskBusyError();
    const next = structuredClone(state);
    next.pendingAgentTask = { ...task, id: randomUUID(), failure: undefined, leaseUntil: leaseEnd(), confirmed: task.confirmed || confirmed };
    next.stateVersion += 1;
    const reserved = await this.store(state, next, `agent-retry:${next.pendingAgentTask.id}`, "agent_retry", { actionKey: task.actionKey });
    return this.run(reserved, definition);
  }

  async startReport(state: GameState, definition: CaseDefinition, text: string, actionKey: string): Promise<GameState> {
    const duplicate = await this.repository.findAction(state.id, state.ownerUserId, actionKey);
    if (duplicate) { assertSameAction(duplicate, "submit_report", { text }); return this.current(state); }
    if (state.pendingAgentTask) throw new AgentTaskBusyError();
    if (state.status === "finished") throw new Error("报告已经提交");
    const paused = state.status === "active" ? pauseGame(state, definition) : structuredClone(state);
    paused.pendingAgentTask = { id: randomUUID(), operation: "report", actionKey, action: { text }, resumeStatus: paused.status === "awaiting_report" ? "awaiting_report" : state.status,
      leaseUntil: leaseEnd(), progress: { snapshot: createReportSnapshot(paused, definition) } };
    paused.status = "paused";
    paused.lastResumedAt = null;
    paused.stateVersion += 1;
    const reserved = await this.store(state, paused, `agent-begin:${paused.pendingAgentTask.id}`, "agent_begin", { text });
    return this.run(reserved, definition);
  }

  private async updateTask(state: GameState, mutate: (next: GameState) => void, step: string): Promise<GameState> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await this.current(state);
      if (current.pendingAgentTask?.id !== state.pendingAgentTask?.id) throw new StateConflictError();
      const next = structuredClone(current);
      // Each committed step renews the reservation; a long sequence of valid model calls
      // must not become retryable while its worker is still making progress.
      next.pendingAgentTask!.leaseUntil = leaseEnd();
      mutate(next);
      next.stateVersion += 1;
      try { return await this.store(current, next, `agent-step:${state.pendingAgentTask!.id}:${step}`, "agent_progress", { step }); }
      catch (error) { if (!(error instanceof StateConflictError) || attempt === 4) throw error; }
    }
    throw new StateConflictError();
  }

  private async prepareDrafts(state: GameState, definition: CaseDefinition): Promise<GameState> {
    let next = state;
    for (const content of this.missing(next, definition)) {
      const draft = await this.repository.getOrCreatePublication({ caseId: definition.id, caseVersion: definition.version,
        contentId: content.id, promptVersion: AgentOrchestrator.publicationPromptVersion }, () => this.agents.writePublication(definition, next, content));
      next = await this.updateTask(next, (updated) => { updated.publications ??= []; updated.publications.push(draft); }, `draft:${content.id}`);
    }
    return next;
  }

  private async run(reserved: GameState, definition: CaseDefinition): Promise<GameState> {
    let state = reserved;
    try {
      if (state.pendingAgentTask!.operation === "report") {
        const task = state.pendingAgentTask!;
        const snapshot = task.progress?.snapshot;
        if (!snapshot) throw new Error("报告缺少提交时的证据快照，请取消后重新提交");
        if (!task.progress!.report) {
          const report = await this.agents.analyzeReport(snapshot, String(task.action.text));
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress = { ...next.pendingAgentTask!.progress, report }; }, "report-analysis");
        }
        const analysis = state.pendingAgentTask!.progress!.report!;
        if (analysis.parseConfidence < 60 && !state.pendingAgentTask!.confirmed) {
          state = await this.updateTask(state, (next) => {
            next.pendingAgentTask!.failure = "请先确认系统对报告的理解";
            next.pendingAgentTask!.leaseUntil = new Date().toISOString();
          }, "report-confirmation");
          throw new ReportConfirmationRequiredError(state, analysis);
        }
        if (!state.pendingAgentTask!.progress!.reportScore) {
          const reportScore = scoreReport(snapshot, analysis);
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress!.reportScore = reportScore; }, "report-score");
        }
        if (!state.pendingAgentTask!.progress!.reportFeedback) {
          const feedback = await this.agents.explainReport(String(task.action.text), state.pendingAgentTask!.progress!.reportScore!);
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress!.reportFeedback = feedback; }, "report-feedback");
        }
        return await this.finish(state, definition, (current) => {
          const progress = current.pendingAgentTask!.progress!;
          const completed = submitReport(current, definition, String(task.action.text), progress.report!, new Date().toISOString(), snapshot);
          completed.report!.score = progress.reportScore!;
          completed.report!.feedback = progress.reportFeedback!;
          return completed;
        });
      }
      state = await this.prepareDrafts(state, definition);
      state = revealPreparedContent(state, definition);
      const task = state.pendingAgentTask!;
      if (task.operation === "comment") {
        const input = task.action as unknown as CommentInput;
        validateCommentTarget(state, definition, input);
        if (!task.progress?.speech) {
          const speech = await this.agents.analyzeSpeech(definition, state, input.contentId, input.text, randomUUID());
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress = { ...next.pendingAgentTask!.progress, speech }; }, "speech");
        }
        const speech = state.pendingAgentTask!.progress!.speech!;
        if (speech.confidence < 60 && !state.pendingAgentTask!.confirmed) {
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.failure = "请确认系统对发言的理解后再发布"; next.pendingAgentTask!.leaseUntil = new Date().toISOString(); }, "confirmation");
          throw new ConfirmationRequiredError(state, speech);
        }
        if (!state.pendingAgentTask!.progress!.reactions) {
          const reactions = await this.agents.reactGroups(definition, state, input.contentId, input.text, speech);
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress!.reactions = reactions; }, "reactions");
        }
        if (state.pendingAgentTask!.progress!.response === undefined) {
          const response = await this.agents.respondAccount(definition, state, input);
          state = await this.updateTask(state, (next) => { next.pendingAgentTask!.progress!.response = response; }, "account-response");
        }
        // Comment and disclosure form one authoritative write. Partial model work stays private.
        let proposed = publishComment(state, definition, { ...input, id: task.commentId!, speechFeatures: speech, groupReactions: state.pendingAgentTask!.progress!.reactions! });
        const response = state.pendingAgentTask!.progress!.response;
        if (response) proposed = recordAccountResponse(proposed, definition, task.commentId!, response);
        // A supplemental media article is prepared before the response becomes publicly committed.
        for (const content of this.missing(proposed, definition)) {
          const draft = await this.repository.getOrCreatePublication({ caseId: definition.id, caseVersion: definition.version,
            contentId: content.id, promptVersion: AgentOrchestrator.publicationPromptVersion }, () => this.agents.writePublication(definition, proposed, content));
          state = await this.updateTask(state, (next) => { next.publications ??= []; next.publications.push(draft); }, `draft:${content.id}`);
          proposed.publications = state.publications;
        }
        return await this.finish(state, definition, (current) => {
          let next = publishComment(current, definition, { ...input, id: task.commentId!, speechFeatures: speech, groupReactions: current.pendingAgentTask!.progress!.reactions! });
          if (response) next = recordAccountResponse(next, definition, task.commentId!, response);
          return next;
        });
      }
      return await this.finish(state, definition, (current) => current);
    } catch (error) {
      if (error instanceof ConfirmationRequiredError || error instanceof ReportConfirmationRequiredError) throw error;
      try {
        state = await this.updateTask(state, (next) => {
          next.pendingAgentTask!.failure = error instanceof Error ? error.message : "生成失败，请重试原任务";
          next.pendingAgentTask!.leaseUntil = new Date().toISOString();
        }, `failure:${randomUUID()}`);
      } catch { /* Another worker may have recovered the lease; never overwrite it. */ }
      return this.current(state);
    }
  }

  private async finish(state: GameState, definition: CaseDefinition, apply: (current: GameState) => GameState): Promise<GameState> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await this.current(state);
      if (current.pendingAgentTask?.id !== state.pendingAgentTask?.id) throw new StateConflictError();
      const task = current.pendingAgentTask!;
      let next = revealPreparedContent(apply(current), definition);
      next.pendingAgentTask = null;
      if (next.status !== "finished") next.status = task.resumeStatus;
      next.lastResumedAt = next.status === "active" ? new Date().toISOString() : null;
      next.stateVersion += 1;
      try { return await this.store(current, next, task.actionKey, task.operation === "comment" ? "publish_comment" : task.operation === "report" ? "submit_report" : "prepare_publications", task.action); }
      catch (error) { if (!(error instanceof StateConflictError) || attempt === 4) throw error; }
    }
    throw new StateConflictError();
  }
}
