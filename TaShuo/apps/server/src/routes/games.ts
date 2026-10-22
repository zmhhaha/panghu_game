import { randomUUID } from "node:crypto";
import { CASES, getCase } from "@tashuo/content";
import {
  createInitialGameState, createInvestigationNote, deleteInvestigationNote, pauseGame, repostContent, resumeGame, saveContent, setEvidence, setTimeScale, toggleContentLike,
  synchronizeGame, toPublicGameState, type CommentInput, type EvidenceEntry, type GameState,
} from "@tashuo/core";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { AgentOrchestrator } from "../agents/orchestrator.js";
import { AgentTaskBusyError, ConfirmationRequiredError, GameAgentService, ReportConfirmationRequiredError } from "../agents/game-agent-service.js";
import { createConfirmationToken, verifyConfirmationToken } from "../confirmation-token.js";
import { createReportConfirmationToken, verifyReportConfirmationToken } from "../report-confirmation-token.js";
import type { GameRepository } from "../repository.js";
import { assertSameAction, IdempotencyConflictError, StateConflictError } from "../repository.js";

const createSchema = z.object({ caseId: z.string().min(1) });
const actionSchema = z.object({ idempotencyKey: z.string().min(8).max(128) });
const contentActionSchema = actionSchema.extend({ contentId: z.string().min(1) });
const commentSchema = contentActionSchema.extend({ text: z.string().trim().min(1).max(1000), confirmationToken: z.string().optional(),
  parentCommentId: z.string().min(1).optional(), targetAccountId: z.string().min(1).optional(), citedContentIds: z.array(z.string()).max(12).default([]) });
const evidenceSchema = actionSchema.extend({
  entry: z.object({ factId: z.string(), judgment: z.enum(["true", "false", "partial", "unknown"]), confidence: z.number().min(0).max(100), supportingContentIds: z.array(z.string()).max(30), opposingContentIds: z.array(z.string()).max(30), note: z.string().max(2000) }),
});
const reportSchema = actionSchema.extend({ text: z.string().trim().min(20).max(20_000), confirmationToken: z.string().max(12_000).optional() });
const cancelReportSchema = actionSchema.extend({ expectedActionKey: z.string().min(8).max(128) });
const noteSchema = actionSchema.extend({ text: z.string().trim().min(1).max(2000), linkedContentIds: z.array(z.string()).max(12).default([]) });
const engagementSchema = contentActionSchema.extend({ action: z.enum(["like", "repost"]) });
const timeScaleSchema = actionSchema.extend({ timeScale: z.union([z.literal(1), z.literal(10), z.literal(100)]) });

const requireUser = (user: Express.Request["user"]) => {
  if (!user) throw new Error("未登录");
  return user;
};

class ExpiredTestSaveError extends Error {
  constructor() { super("测试存档已失效，请重新开始事件"); }
}

const supportedDefinitionFor = (state: GameState) => {
  const definition = getCase(state.caseId, state.caseVersion);
  return definition?.version === state.caseVersion ? definition : null;
};

const definitionFor = (state: GameState) => {
  const definition = supportedDefinitionFor(state);
  if (!definition) throw new ExpiredTestSaveError();
  return definition;
};

export function createGamesRouter(repository: GameRepository, orchestrator: AgentOrchestrator, confirmationSecret: string): Router {
  const router = Router();
  const agentService = new GameAgentService(repository, orchestrator);
  const replay = async (state: GameState, key: string, type: string, action: unknown, res: Response): Promise<boolean> => {
    const previous = await repository.findAction(state.id, state.ownerUserId, key);
    if (!previous) return false;
    assertSameAction(previous, type, action);
    res.json({ state: toPublicGameState(state, definitionFor(state)), duplicate: true });
    return true;
  };
  const confirmationResponse = (res: Response, error: ConfirmationRequiredError, definition: ReturnType<typeof definitionFor>) => {
    const task = error.state.pendingAgentTask!;
    const input = task.action as unknown as CommentInput;
    const publicSpeech = { ...error.speech, targetIds: [], supportedFactIds: [], deniedFactIds: [] };
    const confirmationToken = createConfirmationToken({ ownerUserId: error.state.ownerUserId, gameInstanceId: error.state.id,
      contentId: input.contentId, text: JSON.stringify(input), stateVersion: task.confirmationVersion!, speechFeatures: publicSpeech }, confirmationSecret);
    res.status(422).json({ error: error.message, speechFeatures: publicSpeech, confirmationToken, state: toPublicGameState(error.state, definition) });
  };
  const reportConfirmationResponse = (res: Response, error: ReportConfirmationRequiredError) => {
    const task = error.state.pendingAgentTask!;
    const snapshot = task.progress!.snapshot!;
    const confirmationToken = createReportConfirmationToken({ ownerUserId: error.state.ownerUserId,
      gameInstanceId: error.state.id, actionKey: task.actionKey, snapshotId: snapshot.id,
      text: String(task.action.text), analysis: error.analysis }, confirmationSecret);
    const { summary, parseConfidence, unresolvedQuestions, unmappedClaims } = error.analysis;
    const claims = error.analysis.claims.map((claim) => ({ statement: snapshot.rules.find((rule) => rule.factId === claim.factId)!.statement,
      quote: claim.quote, judgment: claim.judgment, confidence: claim.confidence, confidenceQuote: claim.confidenceQuote, citedContentIds: claim.citedContentIds,
      reasoning: claim.reasoning, reasoningQuote: claim.reasoningQuote, counterContentIds: claim.counterContentIds,
      counterQuote: claim.counterQuote, sourceRelation: claim.sourceRelation, sourceQuote: claim.sourceQuote }));
    res.status(422).json({ error: error.message, operation: "report", confirmationToken,
      reportInterpretation: { summary, parseConfidence, claims, unresolvedQuestions, unmappedClaims },
      state: toPublicGameState(error.state, definitionFor(error.state)) });
  };

  router.get("/", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      const games = await repository.listGames(user.id);
      res.json({ games: games.flatMap((state) => {
        const definition = supportedDefinitionFor(state);
        return definition ? [toPublicGameState(state, definition)] : [];
      }) });
    } catch (error) { next(error); }
  });

  router.post("/", async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "事件参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      await repository.ensureUser(user);
      const definition = CASES.find((item) => item.id === parsed.data.caseId);
      if (!definition) { res.status(404).json({ error: "事件不存在" }); return; }
      const state = createInitialGameState(definition, randomUUID(), user.id);
      await repository.createGame(user.id, state);
      const prepared = await agentService.preparePublications(state, definition);
      res.status(201).json(toPublicGameState(prepared, definition));
    } catch (error) { next(error); }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      const state = await repository.getGame(req.params.id, user.id);
      if (!state) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      res.json(toPublicGameState(state, definitionFor(state)));
    } catch (error) { next(error); }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      if (!await repository.deleteGame(req.params.id, user.id)) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      res.json({ deleted: true });
    } catch (error) { next(error); }
  });

  const simpleAction = (type: "sync" | "pause" | "resume") => async (req: Request, res: Response, next: NextFunction) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "操作参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (current.pendingAgentTask) { res.json({ state: toPublicGameState(current, definition) }); return; }
      const nextState = type === "sync" ? synchronizeGame(current, definition) : type === "pause" ? pauseGame(current, definition) : resumeGame(current);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: type, action: parsed.data, nextState });
      if (!saved) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const prepared = type === "pause" ? saved.state : await agentService.preparePublications(saved.state, definition);
      res.json({ state: toPublicGameState(prepared, definition), duplicate: saved.duplicate });
    } catch (error) { next(error); }
  };

  router.post("/:id/sync", simpleAction("sync"));
  router.post("/:id/pause", simpleAction("pause"));
  router.post("/:id/resume", simpleAction("resume"));

  router.post("/:id/time-scale", async (req, res, next) => {
    const parsed = timeScaleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "时间速度参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (current.pendingAgentTask) throw new AgentTaskBusyError();
      const nextState = setTimeScale(current, definition, parsed.data.timeScale);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "time_scale_changed", action: parsed.data, nextState });
      const prepared = await agentService.preparePublications(saved!.state, definition);
      res.json({ state: toPublicGameState(prepared, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/save-content", async (req, res, next) => {
    const parsed = contentActionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "收藏参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = saveContent(current, parsed.data.contentId, definition);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "save_content", action: parsed.data, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/engagement", async (req, res, next) => {
    const parsed = engagementSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "互动参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (await replay(current, parsed.data.idempotencyKey, `content_${parsed.data.action}`, parsed.data, res)) return;
      const nextState = parsed.data.action === "like" ? toggleContentLike(current, definition, parsed.data.contentId) : repostContent(current, definition, parsed.data.contentId);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: `content_${parsed.data.action}`, action: parsed.data, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/comments", async (req, res, next) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "评论参数无效", detail: parsed.error.flatten() }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const definition = definitionFor(current);
      const { contentId, text, parentCommentId, targetAccountId, citedContentIds } = parsed.data;
      const input: CommentInput = { contentId, text, parentCommentId, targetAccountId, citedContentIds };
      if (await replay(current, parsed.data.idempotencyKey, "publish_comment", input, res)) return;
      let updated: GameState;
      const task = current.pendingAgentTask;
      if (task?.operation === "comment" && task.actionKey === parsed.data.idempotencyKey) {
        assertSameAction({ actionType: "publish_comment", action: task.action }, "publish_comment", input);
        if (parsed.data.confirmationToken) verifyConfirmationToken(parsed.data.confirmationToken, { ownerUserId: user.id,
          gameInstanceId: current.id, contentId, text: JSON.stringify(task.action), stateVersion: task.confirmationVersion! }, confirmationSecret);
        updated = await agentService.retry(current, definition, Boolean(parsed.data.confirmationToken));
      } else {
        if (parsed.data.confirmationToken) throw new Error("确认操作已失效，请重新提交评论");
        updated = await agentService.startComment(current, definition, input, parsed.data.idempotencyKey);
      }
      const publicState = toPublicGameState(updated, definition);
      res.json({ state: publicState, comment: publicState.comments.at(-1) });
    } catch (error) {
      if (error instanceof ConfirmationRequiredError) confirmationResponse(res, error, definitionFor(error.state));
      else if (error instanceof ReportConfirmationRequiredError) reportConfirmationResponse(res, error);
      else next(error);
    }
  });

  router.post("/:id/retry", async (req, res, next) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "重试参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const definition = definitionFor(current);
      if (current.pendingAgentTask && current.pendingAgentTask.actionKey !== parsed.data.idempotencyKey) throw new StateConflictError();
      res.json({ state: toPublicGameState(await agentService.retry(current, definition), definition) });
    } catch (error) {
      if (error instanceof ConfirmationRequiredError) confirmationResponse(res, error, definitionFor(error.state));
      else if (error instanceof ReportConfirmationRequiredError) reportConfirmationResponse(res, error);
      else next(error);
    }
  });

  router.post("/:id/cancel-comment", async (req, res, next) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "取消参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const definition = definitionFor(current);
      const task = current.pendingAgentTask;
      if (!task || task.operation !== "comment") { res.json({ state: toPublicGameState(current, definition) }); return; }
      if (!task.failure && Date.parse(task.leaseUntil) > Date.now()) throw new AgentTaskBusyError();
      const updated = { ...current, pendingAgentTask: null, status: task.resumeStatus,
        lastResumedAt: task.resumeStatus === "active" ? new Date().toISOString() : null, stateVersion: current.stateVersion + 1 };
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion,
        idempotencyKey: parsed.data.idempotencyKey, actionType: "cancel_comment", action: { taskId: task.id }, nextState: updated });
      res.json({ state: toPublicGameState(saved!.state, definition) });
    } catch (error) { next(error); }
  });

  router.post("/:id/cancel-report", async (req, res, next) => {
    const parsed = cancelReportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "取消参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const definition = definitionFor(current);
      const task = current.pendingAgentTask;
      if (!task || task.operation !== "report") { res.json({ state: toPublicGameState(current, definition) }); return; }
      if (task.actionKey !== parsed.data.expectedActionKey) throw new StateConflictError();
      if (!task.failure && Date.parse(task.leaseUntil) > Date.now()) throw new AgentTaskBusyError();
      const updated = { ...current, pendingAgentTask: null, status: task.resumeStatus,
        lastResumedAt: task.resumeStatus === "active" ? new Date().toISOString() : null, stateVersion: current.stateVersion + 1 };
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion,
        idempotencyKey: parsed.data.idempotencyKey, actionType: "cancel_report", action: { taskId: task.id }, nextState: updated });
      res.json({ state: toPublicGameState(saved!.state, definition) });
    } catch (error) { next(error); }
  });

  router.put("/:id/evidence", async (req, res, next) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "证据参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (!definition.facts.some((fact) => fact.id === parsed.data.entry.factId)) { res.status(400).json({ error: "调查主张不存在" }); return; }
      const nextState = setEvidence(current, parsed.data.entry as EvidenceEntry);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "set_evidence", action: parsed.data.entry, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/notes", async (req, res, next) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "调查笔记参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = createInvestigationNote(current, { id: randomUUID(), text: parsed.data.text, linkedContentIds: parsed.data.linkedContentIds });
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "create_note", action: { text: parsed.data.text, linkedContentIds: parsed.data.linkedContentIds }, nextState });
      res.status(201).json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.delete("/:id/notes/:noteId", async (req, res, next) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "调查笔记参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (await replay(current, parsed.data.idempotencyKey, "delete_note", { noteId: req.params.noteId }, res)) return;
      const nextState = deleteInvestigationNote(current, req.params.noteId);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "delete_note", action: { noteId: req.params.noteId }, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/report", async (req, res, next) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "报告参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      const definition = definitionFor(current);
      const input = { text: parsed.data.text };
      if (await replay(current, parsed.data.idempotencyKey, "submit_report", input, res)) return;
      const task = current.pendingAgentTask;
      let updated: GameState;
      if (task?.operation === "report" && task.actionKey === parsed.data.idempotencyKey) {
        assertSameAction({ actionType: "submit_report", action: task.action }, "submit_report", input);
        if (parsed.data.confirmationToken) {
          if (!task.progress?.report || !task.progress.snapshot) throw new StateConflictError();
          verifyReportConfirmationToken(parsed.data.confirmationToken, { ownerUserId: user.id, gameInstanceId: current.id,
            actionKey: task.actionKey, snapshotId: task.progress.snapshot.id, text: parsed.data.text, analysis: task.progress.report }, confirmationSecret);
        }
        updated = await agentService.retry(current, definition, Boolean(parsed.data.confirmationToken));
      } else {
        if (parsed.data.confirmationToken) throw new StateConflictError();
        updated = await agentService.startReport(current, definition, parsed.data.text, parsed.data.idempotencyKey);
      }
      res.json({ state: toPublicGameState(updated, definition) });
    } catch (error) {
      if (error instanceof ReportConfirmationRequiredError) reportConfirmationResponse(res, error);
      else next(error);
    }
  });

  return router;
}

export function gameErrorStatus(error: unknown): number {
  return error instanceof StateConflictError || error instanceof IdempotencyConflictError || error instanceof AgentTaskBusyError || error instanceof ExpiredTestSaveError ? 409 : error instanceof z.ZodError ? 422 : 500;
}
