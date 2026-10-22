import {
  createInitialGameState, createInvestigationNote, synchronizeGame, toPublicGameState,
  type CaseDefinition, type CommentInput, type GameState,
} from "@tashuo/core";
import { describe, expect, it, vi } from "vitest";
import { AgentOrchestrator } from "../src/agents/orchestrator.js";
import type { AgentProvider } from "../src/agents/provider.js";
import { AgentTaskBusyError, ConfirmationRequiredError, GameAgentService, ReportConfirmationRequiredError } from "../src/agents/game-agent-service.js";
import { InMemoryGameRepository } from "../src/memory-repository.js";
import { IdempotencyConflictError, StateConflictError } from "../src/repository.js";

const definition: CaseDefinition = {
  id: "service-test-event", version: "1.0.0", title: "公开记录", synopsis: "服务流程测试专用事件",
  durationMinutes: 1_440, realSecondsPerGameMinute: 6,
  stages: [{ id: "breaking", name: "引爆", startsAtMinute: 0 }],
  facts: [{ id: "scene-recorded", statement: "现场画面留有记录", truth: "true", importance: "critical", explanation: "公开记录可核验" }],
  reportRubric: [{ factId: "scene-recorded", kind: "observation",
    evidence: [{ contentId: "post-1", originIds: ["original-camera"], role: "record" }],
    routes: [{ id: "record-route", contentIds: ["post-1"], acceptedJudgments: ["true"], confidenceRange: [70, 100], explanation: "公开原片保留现场画面。" }] }],
  sources: [
    { id: "tv-source", name: "测试新闻台", kind: "tv", publicDescription: "公开播报", agenda: "核对现场", knownFactIds: ["scene-recorded"] },
    { id: "author-source", name: "拍摄者", kind: "resident", publicDescription: "发布现场视频", agenda: "解释拍摄范围", knownFactIds: ["scene-recorded"] },
  ],
  contents: [
    { id: "post-1", sourceId: "author-source", kind: "post", publishedAtMinute: 0, title: "现场短片", body: "我录下了现场后半段，有问题可以在这里问。", claims: [{ factId: "scene-recorded", relation: "supports" }], misleadingTechniques: [], commentsEnabled: true, trafficWeight: 6 },
    { id: "tv-1", sourceId: "tv-source", kind: "tv_news", publishedAtMinute: 0, title: "现场记录待播", body: "不得作为生成失败后的替代稿件", claims: [{ factId: "scene-recorded", relation: "supports" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 7, editorial: { materialIds: ["tv-material"], instructions: "根据公开材料完成现场报道" } },
    { id: "full-record", sourceId: "author-source", kind: "post", publishedAtMinute: 120, title: "前半段画面补充", body: "完整片段包括转向前的控制台画面。", claims: [{ factId: "scene-recorded", relation: "supports" }], misleadingTechniques: [], commentsEnabled: true, trafficWeight: 4 },
  ],
  materials: [
    { id: "tv-material", title: "公开现场记录", text: "视频拍摄了演示现场，有连续画面。", availableAtMinute: 0, sourceIds: ["tv-source"], originId: "original-camera" },
    { id: "account-material", title: "拍摄者记录", text: "拍摄者保存了转向前的原片。", availableAtMinute: 0, sourceIds: ["author-source"], originId: "original-camera" },
  ],
  accounts: [{ id: "author", displayName: "拍摄者", sourceId: "author-source", description: "只回应自己拍摄范围内的问题", knownMaterialIds: ["account-material"], initialComments: [{ id: "author-intro", contentId: "post-1", text: "前面还有一段，能说明大家问的是哪个时间点吗？", publishedAtMinute: 0 }] }],
  publicLeads: [{ id: "lead-full-record", contentId: "post-1", accountId: "author", question: "原片前半段是否存在", responseGuidance: "询问前半段时公开原片补充", responseMaterialIds: ["account-material"], unlockContentIds: ["full-record"], requiresLeadIds: [], availableAtMinute: 0 }],
  groups: [{ id: "viewers", name: "围观网友", description: "关心画面完整性", initialFrenzy: 50, attention: 70, exclusivity: 20, dissentSensitivity: 30, mobilization: 35, persistence: 40, narrativeFactIds: ["scene-recorded"] }],
};

const input: CommentInput = { contentId: "post-1", text: "能否补充原片前半段？", targetAccountId: "author", citedContentIds: ["post-1"] };
const generatedBody = Array.from({ length: 4 }, (_, index) => `${index + 1}。${"记者核对公开记录后确认，视频保留了演示现场画面，相关发布者说明了自己的拍摄范围。".repeat(8)}`).join("\n\n");

/** These responses are test fixtures; deployed providers never substitute this implementation. */
class TestProvider implements AgentProvider {
  readonly name = "test-only-provider";
  readonly model = "test-only-model";
  readonly calls: string[] = [];
  readonly reportInputs: string[] = [];
  readonly auditInputs: Array<Record<string, unknown>> = [];
  readonly failures = new Map<string, number>();
  speechConfidence = 90;
  reportConfidence = 90;
  approveAudit = true;
  beforeTask?: (task: string) => Promise<void>;

  async complete(_system: string, user: string): Promise<unknown> {
    const payload = JSON.parse(user) as { task: string; report?: string; responseOptions?: Array<{ id: string }> };
    this.calls.push(payload.task);
    if (payload.task === "parse_final_report") this.reportInputs.push(payload.report!);
    if (payload.task === "audit_public_text") this.auditInputs.push(JSON.parse(user));
    await this.beforeTask?.(payload.task);
    const failures = this.failures.get(payload.task) ?? 0;
    if (failures > 0) {
      this.failures.set(payload.task, failures - 1);
      throw new Error(`provider unavailable: ${payload.task}`);
    }
    switch (payload.task) {
      case "write_media_publication": return { title: "演示现场公开记录核对", body: generatedBody, materialIds: ["tv-material"] };
      case "audit_public_text": return { approved: this.approveAudit, issues: this.approveAudit ? [] : ["缺少决定性记录"] };
      case "analyze_public_comment": return { expressionType: "question", targetIds: ["author"], supportedFactIds: [], deniedFactIds: [], certainty: 20, aggression: 0, provocation: 0, informationDensity: 80, citedContentIds: ["post-1"], confidence: this.speechConfidence };
      case "react_to_player_comment": return { stanceConflict: 20, targetingTendency: 40, reactionIntents: ["reply"], reasonIds: [], replies: [{ accountId: "viewer-1", displayName: "想看原片", text: "也想看看前半段。" }] };
      case "select_public_response": return { leadId: payload.responseOptions?.[0]?.id ?? null };
      case "reply_as_public_account": return { text: "我补充了前半段原片，大家可以查看完整画面。", leadId: payload.responseOptions?.[0]?.id ?? null, materialIds: ["account-material"] };
      case "parse_final_report": return { summary: "玩家根据公开记录陈述了可核验内容。", parseConfidence: this.reportConfidence, unmappedClaims: [],
        claims: [{ factId: "scene-recorded", judgment: "true", confidence: null, confidenceQuote: null, citedContentIds: ["post-1"], quote: payload.report,
          reasoning: "observation", reasoningQuote: payload.report, counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }], unresolvedQuestions: [] };
      case "explain_report_assessment": return { feedback: "报告引用公开记录支持现场画面存在，其余因果问题仍需单独核验。" };
      default: throw new Error(`Unexpected test task: ${payload.task}`);
    }
  }

  count(task: string) { return this.calls.filter((item) => item === task).length; }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

async function fixture() {
  const repository = new InMemoryGameRepository();
  const provider = new TestProvider();
  const service = new GameAgentService(repository, new AgentOrchestrator(provider));
  const initial = createInitialGameState(definition, "game-a", "user-a");
  await repository.createGame(initial.ownerUserId, initial);
  return { repository, provider, service, initial };
}

describe("durable game agent workflow", () => {
  it("publishes complete approved text once and reuses it across independent user instances", async () => {
    const { repository, provider, service, initial } = await fixture();
    expect(toPublicGameState(initial, definition).visibleContents.map((item) => item.id)).toEqual(["post-1"]);
    const first = await service.preparePublications(initial, definition);
    const otherInitial = createInitialGameState(definition, "game-b", "user-b");
    await repository.createGame("user-b", otherInitial);
    const other = await service.preparePublications(otherInitial, definition);
    expect(provider.count("write_media_publication")).toBe(1);
    expect(provider.count("audit_public_text")).toBe(1);
    expect(first.publications).toEqual(other.publications);
    expect(first.publications?.[0].body).toBe(generatedBody);
    expect(toPublicGameState(other, definition).visibleContents.find((item) => item.id === "tv-1")?.body).toBe(generatedBody);
    expect(await repository.getGame(first.id, "user-b")).toBeNull();
    const calls = provider.calls.length;
    const saved = await repository.getGame(first.id, first.ownerUserId);
    await service.preparePublications(saved!, definition);
    expect(provider.calls).toHaveLength(calls);
  });

  it("persists a paused failure without a substitute article and retries the original publication task", async () => {
    const { repository, provider, service, initial } = await fixture();
    provider.failures.set("write_media_publication", 1);
    const failed = await service.preparePublications(initial, definition);
    expect(failed.status).toBe("paused");
    expect(failed.pendingAgentTask?.failure).toContain("provider unavailable");
    expect(failed.publications).toEqual([]);
    expect(toPublicGameState(failed, definition).visibleContents.some((item) => item.id === "tv-1")).toBe(false);
    const originalActionKey = failed.pendingAgentTask!.actionKey;
    const recovered = await service.retry((await repository.getGame(initial.id, initial.ownerUserId))!, definition);
    expect(recovered.status).toBe("active");
    expect(recovered.pendingAgentTask).toBeNull();
    expect(recovered.publications).toHaveLength(1);
    expect(await repository.findAction(initial.id, initial.ownerUserId, originalActionKey)).toEqual({ actionType: "prepare_publications", action: { atMinute: 0 } });
  });

  it("requires media review of evidence coverage and rejects incomplete manuscripts without publishing the reference", async () => {
    const { provider, service, initial } = await fixture();
    provider.approveAudit = false;
    const failed = await service.preparePublications(initial, definition);
    expect(failed.status).toBe("paused");
    expect(failed.publications).toEqual([]);
    expect(provider.auditInputs[0].requiredEvidenceReference).toEqual({
      text: definition.contents.find((item) => item.id === "tv-1")!.body, citedMaterialIds: ["tv-material"],
    });
    expect(JSON.stringify(provider.auditInputs[0])).not.toContain("reportRubric");
    expect(toPublicGameState(failed, definition).visibleContents.map((item) => item.id)).toEqual(["post-1"]);
    provider.approveAudit = true;
    const completed = await service.retry(failed, definition);
    expect(completed.publications![0].body).toBe(generatedBody);
    expect(completed.publications![0].promptVersion).toBe("public-reporting-2");
  });

  it("commits one comment, pressure update, public response and discovery for the same request key", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    const commented = await service.startComment(prepared, definition, input, "comment-request-1");
    expect(commented.comments).toHaveLength(1);
    expect(commented.accountReplies).toHaveLength(1);
    expect(commented.discoveries).toHaveLength(1);
    expect(commented.revealedContentIds).toContain("full-record");
    expect(commented.savedContentIds).not.toContain("full-record");
    const callCount = provider.calls.length;
    const duplicate = await service.startComment(commented, definition, input, "comment-request-1");
    expect(provider.calls).toHaveLength(callCount);
    expect(duplicate).toEqual(commented);
    await expect(service.startComment(commented, definition, { ...input, text: "不同问题" }, "comment-request-1")).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(provider.calls).toHaveLength(callCount);
    expect((await repository.getGame(initial.id, initial.ownerUserId))?.harassment).toBe(commented.harassment);
  });

  it("retains speech analysis while a low-confidence comment waits for user confirmation", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    provider.speechConfidence = 40;
    await expect(service.startComment(prepared, definition, input, "comment-confirm-1")).rejects.toBeInstanceOf(ConfirmationRequiredError);
    const waiting = (await repository.getGame(initial.id, initial.ownerUserId))!;
    expect(waiting.status).toBe("paused");
    expect(waiting.comments).toHaveLength(0);
    expect(waiting.pendingAgentTask?.progress?.speech?.confidence).toBe(40);
    expect(provider.count("react_to_player_comment")).toBe(0);
    const completed = await service.retry(waiting, definition, true);
    expect(completed.comments).toHaveLength(1);
    expect(completed.pendingAgentTask).toBeNull();
    expect(provider.count("analyze_public_comment")).toBe(1);
    expect(provider.count("react_to_player_comment")).toBe(1);
  });

  it("retries a failed account response without redoing successful speech or crowd work", async () => {
    const { provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    provider.failures.set("reply_as_public_account", 1);
    const failed = await service.startComment(prepared, definition, input, "comment-retry-1");
    expect(failed.status).toBe("paused");
    expect(failed.comments).toHaveLength(0);
    expect(failed.harassment).toBe(0);
    expect(failed.discoveries).toEqual([]);
    expect(failed.pendingAgentTask?.progress?.speech).toBeDefined();
    expect(failed.pendingAgentTask?.progress?.reactions).toHaveLength(1);
    const completed = await service.retry(failed, definition);
    expect(completed.comments).toHaveLength(1);
    expect(completed.accountReplies).toHaveLength(1);
    expect(completed.discoveries).toHaveLength(1);
    expect(provider.count("analyze_public_comment")).toBe(1);
    expect(provider.count("react_to_player_comment")).toBe(1);
    expect(provider.count("reply_as_public_account")).toBe(2);
  });

  it("rejects concurrent starts and preserves a note written while a model call is in flight", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    const started = deferred();
    const gate = deferred();
    provider.beforeTask = async (task) => {
      if (task === "analyze_public_comment") { started.resolve(); await gate.promise; }
    };
    const running = service.startComment(prepared, definition, input, "comment-concurrent-1");
    await started.promise;
    const reserved = (await repository.getGame(initial.id, initial.ownerUserId))!;
    await expect(service.startComment(reserved, definition, input, "comment-concurrent-1")).rejects.toBeInstanceOf(AgentTaskBusyError);
    await expect(service.startComment(prepared, definition, input, "comment-concurrent-2")).rejects.toBeInstanceOf(StateConflictError);
    const noted: GameState = createInvestigationNote(reserved, { id: "note-during-model", text: "等待公开补充时整理已有材料。", linkedContentIds: ["post-1"] });
    await repository.saveGame({ gameInstanceId: reserved.id, ownerUserId: reserved.ownerUserId, expectedStateVersion: reserved.stateVersion, idempotencyKey: "note-while-waiting", actionType: "create_note", action: { text: "等待公开补充时整理已有材料。" }, nextState: noted });
    gate.resolve();
    const completed = await running;
    expect(completed.investigationNotes.map((note) => note.id)).toContain("note-during-model");
    expect(completed.comments).toHaveLength(1);
    expect(completed.discoveries).toHaveLength(1);
    expect(provider.count("analyze_public_comment")).toBe(1);
  });

  it("keeps a report durably paused during sync and rejects a concurrent comment or report", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    const started = deferred();
    const gate = deferred();
    provider.beforeTask = async (task) => {
      if (task === "parse_final_report") { started.resolve(); await gate.promise; }
    };
    const text = "公开记录说明现场留有连续画面，尚不能仅凭这一段断定全部原因。";
    const running = service.startReport(prepared, definition, text, "report-running-1");
    await started.promise;
    const reserved = (await repository.getGame(initial.id, initial.ownerUserId))!;
    expect(reserved.status).toBe("paused");
    expect(reserved.pendingAgentTask?.operation).toBe("report");
    expect(reserved.report).toBeNull();
    expect(synchronizeGame(reserved, definition, new Date(Date.now() + 60_000).toISOString())).toEqual(reserved);
    await expect(service.startComment(reserved, definition, input, "comment-during-report")).rejects.toBeInstanceOf(AgentTaskBusyError);
    await expect(service.startReport(reserved, definition, "另一份报告", "report-running-2")).rejects.toBeInstanceOf(AgentTaskBusyError);
    expect(await service.preparePublications(reserved, definition)).toEqual(reserved);
    gate.resolve();
    const completed = await running;
    expect(completed.status).toBe("finished");
    expect(completed.pendingAgentTask).toBeNull();
    expect(completed.lastResumedAt).toBeNull();
    expect(completed.report?.text).toBe(text);
    expect(completed.comments).toHaveLength(0);
    expect(provider.count("parse_final_report")).toBe(1);
    expect(synchronizeGame(completed, definition, new Date(Date.now() + 60_000).toISOString())).toEqual(completed);
  });

  it("retries only the saved report after a provider failure and commits under its original key", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    provider.failures.set("parse_final_report", 1);
    const text = "公开片段保留了现场画面，这是可以确认的部分，其他归因仍需要更多记录。";
    const failed = await service.startReport(prepared, definition, text, "report-retry-1");
    expect(failed.status).toBe("paused");
    expect(failed.pendingAgentTask?.operation).toBe("report");
    expect(failed.pendingAgentTask?.action).toEqual({ text });
    expect(failed.pendingAgentTask?.failure).toContain("provider unavailable");
    expect(failed.report).toBeNull();
    await expect(service.startReport(failed, definition, "不同报告", "report-retry-2")).rejects.toBeInstanceOf(AgentTaskBusyError);
    const completed = await service.retry(failed, definition);
    expect(completed.status).toBe("finished");
    expect(completed.report?.text).toBe(text);
    expect(completed.pendingAgentTask).toBeNull();
    expect(provider.reportInputs).toEqual([text, text]);
    expect(await repository.findAction(initial.id, initial.ownerUserId, "report-retry-1")).toEqual({ actionType: "submit_report", action: { text } });
    expect(await repository.findAction(initial.id, initial.ownerUserId, "report-retry-2")).toBeNull();
  });

  it("returns an already submitted report without another model call and rejects a changed body", async () => {
    const { provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    const text = "现场有连续视频记录，我以原片为依据，其他无法独立核验的判断暂不确认。";
    const completed = await service.startReport(prepared, definition, text, "report-duplicate-1");
    const count = provider.calls.length;
    expect(await service.startReport(completed, definition, text, "report-duplicate-1")).toEqual(completed);
    await expect(service.startReport(completed, definition, `${text}另加结论。`, "report-duplicate-1")).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(provider.calls).toHaveLength(count);
    expect(provider.count("parse_final_report")).toBe(1);
  });

  it("waits for report interpretation confirmation without scoring or re-parsing", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    provider.reportConfidence = 35;
    const text = "现场留下了连续画面，但这段视频是否足够说明全部原因，我依然存疑。";
    await expect(service.startReport(prepared, definition, text, "report-confirm-1")).rejects.toBeInstanceOf(ReportConfirmationRequiredError);
    const waiting = (await repository.getGame(initial.id, initial.ownerUserId))!;
    expect(waiting.status).toBe("paused");
    expect(waiting.report).toBeNull();
    expect(waiting.pendingAgentTask?.progress?.reportScore).toBeUndefined();
    expect(provider.count("explain_report_assessment")).toBe(0);
    const snapshot = waiting.pendingAgentTask!.progress!.snapshot!;
    const publicState = toPublicGameState(waiting, definition);
    expect(publicState).not.toHaveProperty("pendingAgentTask");
    expect(JSON.stringify(publicState)).not.toContain("acceptedJudgments");
    await expect(service.retry(waiting, definition)).rejects.toBeInstanceOf(ReportConfirmationRequiredError);
    const refreshed = (await repository.getGame(initial.id, initial.ownerUserId))!;
    const completed = await service.retry(refreshed, definition, true);
    expect(completed.status).toBe("finished");
    expect(completed.report?.snapshot.id).toBe(snapshot.id);
    expect(completed.report?.analysis.parseConfidence).toBe(35);
    expect(completed.report?.analysis.claims[0].confidence).toBeNull();
    expect(provider.count("parse_final_report")).toBe(1);
    expect(provider.count("explain_report_assessment")).toBe(1);
  });

  it("freezes readable evidence before generation and reuses analysis and score after debrief failure", async () => {
    const { provider, service, initial } = await fixture();
    provider.failures.set("explain_report_assessment", 1);
    const text = "公开片段保留现场记录；我只能引用此时已经读到的原片，待播新闻尚不可作为依据。";
    const failed = await service.startReport(initial, definition, text, "report-frozen-evidence");
    const progress = failed.pendingAgentTask!.progress!;
    expect(progress.snapshot!.evidence.some((item) => item.id === "tv-1")).toBe(false);
    expect(progress.snapshot!.evidence.some((item) => item.id === "full-record")).toBe(false);
    expect(progress.reportScore).toBeDefined();
    expect(failed.report).toBeNull();
    expect(provider.count("write_media_publication")).toBe(0);
    const completed = await service.retry(failed, definition);
    expect(completed.status).toBe("finished");
    expect(completed.report?.snapshot.id).toBe(progress.snapshot!.id);
    expect(completed.report?.snapshot.evidenceVersions).toEqual(progress.snapshot!.evidenceVersions);
    expect(completed.reportAssessmentSnapshot).toEqual(progress.snapshot);
    expect(toPublicGameState(completed, definition)).not.toHaveProperty("reportAssessmentSnapshot");
    expect(completed.report?.score).toEqual(progress.reportScore);
    expect(completed.report?.feedback).toContain("公开记录");
    expect(provider.count("parse_final_report")).toBe(1);
    expect(provider.count("explain_report_assessment")).toBe(2);
    expect(provider.count("write_media_publication")).toBe(0);
  });

  it("reuses a saved report analysis when the final database write failed", async () => {
    const { repository, provider, service, initial } = await fixture();
    const prepared = await service.preparePublications(initial, definition);
    const originalSave = repository.saveGame.bind(repository);
    let failures = 1;
    const save = vi.spyOn(repository, "saveGame").mockImplementation(async (request) => {
      if (request.actionType === "submit_report" && failures-- > 0) throw new Error("temporary report storage failure");
      return originalSave(request);
    });
    try {
      const text = "原始画面支持现场有记录，结论的范围应受现有公开材料约束。";
      const failed = await service.startReport(prepared, definition, text, "report-store-retry-1");
      expect(failed.status).toBe("paused");
      expect(failed.report).toBeNull();
      expect(failed.pendingAgentTask?.progress?.report?.summary).toBe("玩家根据公开记录陈述了可核验内容。");
      const completed = await service.retry(failed, definition);
      expect(completed.status).toBe("finished");
      expect(completed.report?.text).toBe(text);
      expect(provider.count("parse_final_report")).toBe(1);
      expect(provider.count("explain_report_assessment")).toBe(1);
    } finally { save.mockRestore(); }
  });
});
