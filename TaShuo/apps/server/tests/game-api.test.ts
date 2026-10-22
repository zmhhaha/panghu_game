import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { CASES } from "@tashuo/content";
import type { GameState, PublicGameState } from "@tashuo/core";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AgentProvider } from "../src/agents/provider.js";
import { InMemoryGameRepository } from "../src/memory-repository.js";

// Deterministic test double only. Production always uses the configured LLM service.
class TestProvider implements AgentProvider {
  name = "test-only";
  model = "fixture";
  calls: Array<Record<string, any>> = [];
  failTask: string | null = null;
  speechConfidence = 99;
  reportConfidence = 99;
  includeReportClaim = false;
  includePrivateSpeechFields = false;
  async complete(_system: string, raw: string): Promise<unknown> {
    const input = JSON.parse(raw);
    this.calls.push(input);
    if (this.failTask === input.task) throw new Error("test provider unavailable");
    if (input.task === "write_media_publication") return { title: input.assignment.workingTitle,
      body: Array.from({ length: 4 }, (_, index) => `测试段落${index + 1}：${input.allowedMaterials.map((item: any) => item.text).join("\n").repeat(4)}`).join("\n\n"),
      materialIds: input.allowedMaterials.map((item: any) => item.id) };
    if (input.task === "audit_public_text") return { approved: true, issues: [] };
    if (input.task === "analyze_public_comment") return { expressionType: "question",
      targetIds: this.includePrivateSpeechFields ? ["internal-target-marker"] : [],
      supportedFactIds: this.includePrivateSpeechFields ? input.publicClaims.slice(0, 1).map((item: any) => item.id) : [],
      deniedFactIds: this.includePrivateSpeechFields ? input.publicClaims.slice(1, 2).map((item: any) => item.id) : [], certainty: 10,
      aggression: 0, provocation: 0, informationDensity: 50, citedContentIds: [], confidence: this.speechConfidence };
    if (input.task === "react_to_player_comment") return { stanceConflict: 0, targetingTendency: 0, reactionIntents: ["reply"], reasonIds: [], replies: [{ accountId: "reader", displayName: "读者", text: "想看看完整记录。" }] };
    if (input.task === "select_public_response") return { leadId: input.responseOptions[0]?.id ?? null };
    if (input.task === "reply_as_public_account") return { text: input.responseOptions[0]?.guidance ?? "我的观察范围有限，无法确认。", leadId: input.responseOptions[0]?.id ?? null, materialIds: input.allowedMaterials.map((item: any) => item.id) };
    if (input.task === "parse_final_report") return { summary: "玩家保留了待验证问题。", parseConfidence: this.reportConfidence,
      claims: this.includeReportClaim ? [{ factId: input.canonicalClaims[0].id, judgment: "unknown", confidence: null, confidenceQuote: null,
        citedContentIds: [input.publicEvidence[0].id], quote: input.report, reasoning: "none", reasoningQuote: null,
        counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }] : [],
      unmappedClaims: [], unresolvedQuestions: ["仍需核对原始记录"] };
    if (input.task === "explain_report_assessment") return { feedback: "尚未提出可以评价的具体结论，需要进一步核对公开材料。" };
    throw new Error(`Unexpected test task: ${input.task}`);
  }
}

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

async function start() {
  const provider = new TestProvider();
  const repository = new InMemoryGameRepository();
  const server = createApp(repository, provider, "test-secret-long-enough").listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  const request = async (path: string, body?: unknown, user = "a", method = body === undefined ? "GET" : "POST") => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1${path}`, { method,
      headers: { "content-type": "application/json", "x-auth-request-sub": user, "x-forwarded-preferred-username": user },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  return { provider, repository, request };
}

describe("public investigation API", () => {
  it("excludes unsupported test saves, rejects their actions without mutation and still allows owner deletion", async () => {
    const { request, repository, provider } = await start();
    const created = await request("/games", { caseId: CASES[0].id });
    expect(created.status).toBe(201);
    const current = (await repository.getGame(created.body.id, created.body.ownerUserId))!;
    const oldVersion: GameState = { ...current, id: "old-version-save", caseVersion: "1.0.0", status: "paused",
      pendingAgentTask: { id: "old-comment-task", operation: "comment", actionKey: "old-comment-request", action: {},
        resumeStatus: "active", leaseUntil: "2000-01-01T00:00:00.000Z", failure: "interrupted old test task" } };
    const removedEvent: GameState = { ...current, id: "removed-event-save", caseId: "removed-test-event" };
    await repository.createGame(current.ownerUserId, oldVersion);
    await repository.createGame(current.ownerUserId, removedEvent);
    const callsBefore = provider.calls.length;

    const listed = await request("/games");
    expect(listed.status).toBe(200);
    expect(listed.body.games.map((game: PublicGameState) => game.id)).toEqual([current.id]);
    for (const stale of [oldVersion, removedEvent]) {
      const base = `/games/${stale.id}`;
      const rejected = [
        await request(base),
        await request(`${base}/sync`, { idempotencyKey: "sync-expired-save" }),
        await request(`${base}/cancel-comment`, { idempotencyKey: "cancel-expired-save" }),
        await request(`${base}/comments`, { idempotencyKey: "comment-expired-save", contentId: CASES[0].publicLeads![0].contentId, text: "请补充原始记录。" }),
      ];
      for (const response of rejected) expect(response).toEqual({ status: 409, body: { error: "测试存档已失效，请重新开始事件" } });
      expect(await repository.getGame(stale.id, current.ownerUserId)).toEqual(stale);
      expect((await request(base, undefined, "b")).status).toBe(404);
      expect((await request(base, undefined, "b", "DELETE")).status).toBe(404);
      expect(await request(base, undefined, "a", "DELETE")).toEqual({ status: 200, body: { deleted: true } });
      expect(await repository.getGame(stale.id, current.ownerUserId)).toBeNull();
    }
    expect(provider.calls).toHaveLength(callsBefore);
    expect((await request(`/games/${current.id}`)).status).toBe(200);
  });

  it.each(CASES.map((definition) => [definition.title, definition] as const))("runs %s through persistent follow-ups without leaking another game", async (_title, definition) => {
    const { request, provider } = await start();
    const first = await request("/games", { caseId: definition.id });
    expect(first.status).toBe(201);
    let state = first.body as PublicGameState;
    expect(state.generationFailure).toBeNull();
    expect(state.visibleContents.some((item) => item.kind === "tv_news")).toBe(true);
    expect(state.visibleContents.every((item) => !("editorial" in item) && !("misleadingTechniques" in item) && !("claims" in item))).toBe(true);
    const writes = provider.calls.filter((item) => item.task === "write_media_publication").length;
    const reread = await request(`/games/${state.id}`);
    expect(reread.body.visibleContents).toEqual(state.visibleContents);
    const other = await request("/games", { caseId: definition.id }, "b");
    expect(provider.calls.filter((item) => item.task === "write_media_publication")).toHaveLength(writes);
    expect(other.body.visibleContents).toEqual(state.visibleContents);
    expect((await request(`/games/${state.id}`, undefined, "b")).status).toBe(404);

    const firstLead = definition.publicLeads!.find((item) => item.requiresLeadIds.length === 0)!;
    const account = definition.accounts!.find((item) => item.id === firstLead.accountId)!;
    let parent = account.initialComments.find((item) => item.contentId === firstLead.contentId)!.id;
    for (let turn = 1; turn <= 3; turn++) {
      const body = { idempotencyKey: `question-${turn}`, contentId: firstLead.contentId, targetAccountId: account.id,
        parentCommentId: parent, text: `请核对这一段的来源与观察范围，第${turn}次追问。`, citedContentIds: [firstLead.contentId] };
      const response = await request(`/games/${state.id}/comments`, body);
      expect(response.status).toBe(200);
      state = response.body.state;
      expect(state.generationFailure).toBeNull();
      expect(state.comments).toHaveLength(turn);
      expect(state.discoveries).toHaveLength(turn);
      const accountReply = state.threadComments.find((item) => item.role === "account" && item.triggeredByCommentId === state.comments.at(-1)!.id)!;
      expect(accountReply.parentCommentId).toBe(state.comments.at(-1)!.id);
      parent = accountReply.id;
      const beforeDuplicate = provider.calls.length;
      const duplicate = await request(`/games/${state.id}/comments`, body);
      expect(duplicate.body.state.comments).toHaveLength(turn);
      expect(duplicate.body.state.exposure).toBe(state.exposure);
      expect(provider.calls).toHaveLength(beforeDuplicate);
      expect((await request(`/games/${state.id}/comments`, { ...body, text: "不同的文字" })).status).toBe(409);
    }
    const secondCall = provider.calls.filter((item) => item.task === "reply_as_public_account")[1];
    expect(secondCall.history.some((item: any) => item.triggeredByCommentId)).toBe(true);
    expect((await request(`/games/${other.body.id}`, undefined, "b")).body.comments).toHaveLength(0);
    expect(JSON.stringify(state)).not.toContain("responseGuidance");
    expect(state).not.toHaveProperty("pendingAgentTask");
    const note = await request(`/games/${state.id}/notes`, { idempotencyKey: "save-reply-note", text: "我仍需独立核对这个公开回应。", linkedContentIds: state.discoveries[0].contentIds });
    expect(note.body.state.investigationNotes[0].linkedContentIds).toEqual(state.discoveries[0].contentIds);
    const report = await request(`/games/${state.id}/report`, { idempotencyKey: "report-once", text: "我根据公开补充重新核对了观察范围，目前部分因果关系仍然没有充分证据，保留未知。" });
    expect(report.body.state.status).toBe("finished");
  });

  it("keeps failed generation paused and retries only the unfinished work", async () => {
    const { request, provider } = await start();
    provider.failTask = "write_media_publication";
    const created = await request("/games", { caseId: CASES[0].id });
    expect(created.body.status).toBe("paused");
    expect(created.body.generationFailure.operation).toBe("publication");
    expect(created.body.visibleContents.every((item: any) => item.kind !== "tv_news")).toBe(true);
    const beforeRead = provider.calls.length;
    await request(`/games/${created.body.id}`);
    expect(provider.calls).toHaveLength(beforeRead);
    provider.failTask = null;
    const staleWriteRetry = await request(`/games/${created.body.id}/retry`, { idempotencyKey: "old-publication-task" });
    expect(staleWriteRetry.status).toBe(409);
    expect(provider.calls).toHaveLength(beforeRead);
    const retried = await request(`/games/${created.body.id}/retry`, { idempotencyKey: created.body.generationFailure.retryKey });
    expect(retried.body.state.generationFailure).toBeNull();
    expect(retried.body.state.status).toBe("active");

    const lead = CASES[0].publicLeads![0];
    provider.failTask = "reply_as_public_account";
    const failed = await request(`/games/${created.body.id}/comments`, { idempotencyKey: "question-fails", contentId: lead.contentId, text: "请补充这段视频的原始记录", targetAccountId: lead.accountId });
    expect(failed.body.state.generationFailure.operation).toBe("comment");
    expect(failed.body.state.comments).toHaveLength(0);
    const parsedCount = provider.calls.filter((item) => item.task === "analyze_public_comment").length;
    provider.failTask = null;
    const beforeStaleRetry = provider.calls.length;
    const staleCommentRetry = await request(`/games/${created.body.id}/retry`, { idempotencyKey: created.body.generationFailure.retryKey });
    expect(staleCommentRetry.status).toBe(409);
    expect(provider.calls).toHaveLength(beforeStaleRetry);
    const completed = await request(`/games/${created.body.id}/retry`, { idempotencyKey: failed.body.state.generationFailure.retryKey });
    expect(completed.body.state.comments).toHaveLength(1);
    expect(provider.calls.filter((item) => item.task === "analyze_public_comment")).toHaveLength(parsedCount);
  });

  it("binds low-confidence confirmation to the complete comment and keeps it unpublished", async () => {
    const { request, provider } = await start();
    const created = await request("/games", { caseId: CASES[0].id });
    const lead = CASES[0].publicLeads![0];
    provider.speechConfidence = 30;
    provider.includePrivateSpeechFields = true;
    const input = { idempotencyKey: "uncertain-comment", contentId: lead.contentId, text: "你这句话到底是什么意思？", targetAccountId: lead.accountId };
    const confirmation = await request(`/games/${created.body.id}/comments`, input);
    expect(confirmation.status).toBe(422);
    expect(confirmation.body.state.comments).toHaveLength(0);
    expect(confirmation.body.state.status).toBe("paused");
    expect(confirmation.body.speechFeatures).toMatchObject({ targetIds: [], supportedFactIds: [], deniedFactIds: [] });
    const tokenPayload = JSON.parse(Buffer.from(confirmation.body.confirmationToken.split(".")[0], "base64url").toString("utf8"));
    expect(tokenPayload.speechFeatures).toMatchObject({ targetIds: [], supportedFactIds: [], deniedFactIds: [] });
    expect(JSON.stringify(confirmation.body)).not.toContain("internal-target-marker");
    expect(JSON.stringify(tokenPayload)).not.toContain("internal-target-marker");
    expect((await request(`/games/${created.body.id}/comments`, { ...input, text: "换一条句子", confirmationToken: confirmation.body.confirmationToken })).status).toBe(409);
    const confirmedInput = { ...input, confirmationToken: confirmation.body.confirmationToken };
    const accepted = await request(`/games/${created.body.id}/comments`, confirmedInput);
    expect(accepted.status).toBe(200);
    expect(accepted.body.state.comments).toHaveLength(1);
    expect(provider.calls.filter((item) => item.task === "analyze_public_comment")).toHaveLength(1);
    const beforeDuplicate = provider.calls.length;
    const duplicate = await request(`/games/${created.body.id}/comments`, confirmedInput);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.state).toEqual(accepted.body.state);
    expect(provider.calls).toHaveLength(beforeDuplicate);
  });

  it("requires report confirmation, binds the original text and snapshot, and replays completion once", async () => {
    const { request, provider, repository } = await start();
    const created = await request("/games", { caseId: CASES[0].id });
    const base = `/games/${created.body.id}`;
    provider.reportConfidence = 35;
    provider.includeReportClaim = true;
    const input = { idempotencyKey: "uncertain-report", text: "我根据现有公开材料作出判断，但尚未掌握足够的证据，可以暂时保留未知。" };
    const confirmation = await request(`${base}/report`, input);
    expect(confirmation.status).toBe(422);
    expect(confirmation.body.operation).toBe("report");
    expect(confirmation.body.reportInterpretation.parseConfidence).toBe(35);
    expect(confirmation.body.reportInterpretation.claims[0]).toMatchObject({ quote: input.text, judgment: "unknown", confidence: null,
      confidenceQuote: null, reasoning: "none", counterContentIds: [], sourceRelation: "unspecified" });
    expect(confirmation.body.reportInterpretation.claims[0]).not.toHaveProperty("factId");
    expect(confirmation.body.state.report).toBeNull();
    expect(confirmation.body.state.status).toBe("paused");
    expect(confirmation.body.state).not.toHaveProperty("pendingAgentTask");
    const payload = JSON.parse(Buffer.from(confirmation.body.confirmationToken.split(".")[0], "base64url").toString("utf8"));
    expect(JSON.stringify(payload)).not.toContain(input.text);
    expect(JSON.stringify(confirmation.body)).not.toContain("acceptedJudgments");
    expect(provider.calls.filter((item) => item.task === "explain_report_assessment")).toHaveLength(0);
    expect((await request(`${base}/report`, { ...input, confirmationToken: confirmation.body.confirmationToken }, "b")).status).toBe(404);
    expect((await request(`${base}/report`, { ...input, text: `${input.text}追加判断。` })).status).toBe(409);
    const beforeRetry = (await repository.getGame(created.body.id, created.body.ownerUserId))!;
    const refreshed = await request(`${base}/retry`, { idempotencyKey: input.idempotencyKey });
    expect(refreshed.status).toBe(422);
    expect((await repository.getGame(created.body.id, created.body.ownerUserId))!.pendingAgentTask!.progress!.snapshot!.id)
      .toBe(beforeRetry.pendingAgentTask!.progress!.snapshot!.id);
    const confirmedInput = { ...input, confirmationToken: refreshed.body.confirmationToken };
    const completed = await request(`${base}/report`, confirmedInput);
    expect(completed.status).toBe(200);
    expect(completed.body.state.status).toBe("finished");
    expect(completed.body.state.report.score.total).toBeNull();
    expect(completed.body.state.report.feedback).toContain("尚未提出");
    expect(provider.calls.filter((item) => item.task === "parse_final_report")).toHaveLength(1);
    expect(provider.calls.filter((item) => item.task === "explain_report_assessment")).toHaveLength(1);
    const count = provider.calls.length;
    const duplicate = await request(`${base}/report`, confirmedInput);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.state).toEqual(completed.body.state);
    expect(provider.calls).toHaveLength(count);
  });

  it("cancels a waiting report and permits a revised submission without accepting its stale token", async () => {
    const { request, provider } = await start();
    const created = await request("/games", { caseId: CASES[1].id });
    const base = `/games/${created.body.id}`;
    provider.reportConfidence = 30;
    const input = { idempotencyKey: "report-before-edit", text: "水体颜色与鱼群异常应当分别调查，当前材料尚不能直接证明它们有相同原因。" };
    const waiting = await request(`${base}/report`, input);
    expect(waiting.status).toBe(422);
    expect((await request(`${base}/cancel-report`, { idempotencyKey: "foreign-cancel", expectedActionKey: input.idempotencyKey }, "b")).status).toBe(404);
    expect((await request(`${base}/cancel-report`, { idempotencyKey: "stale-cancel-report", expectedActionKey: "previous-report-key" })).status).toBe(409);
    expect((await request(base)).body.generationFailure.retryKey).toBe(input.idempotencyKey);
    const cancelled = await request(`${base}/cancel-report`, { idempotencyKey: "cancel-report-edit", expectedActionKey: input.idempotencyKey });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.state.status).toBe("active");
    expect(cancelled.body.state.report).toBeNull();
    expect(cancelled.body.state.generationFailure).toBeNull();
    const stale = await request(`${base}/report`, { ...input, confirmationToken: waiting.body.confirmationToken });
    expect(stale.status).toBeGreaterThanOrEqual(400);
    provider.reportConfidence = 99;
    const completed = await request(`${base}/report`, { ...input, idempotencyKey: "report-after-edit", text: `${input.text}需要继续核对采样时间。` });
    expect(completed.body.state.status).toBe("finished");
  });

  it("replays reposts and deleted notes without applying their effects again", async () => {
    const { request, provider } = await start();
    const created = await request("/games", { caseId: CASES[0].id });
    const base = `/games/${created.body.id}`;
    const repostInput = { idempotencyKey: "repost-once", contentId: CASES[0].publicLeads![0].contentId, action: "repost" };
    const beforeInteraction = provider.calls.length;
    const repost = await request(`${base}/engagement`, repostInput);
    expect(repost.status).toBe(200);
    expect(repost.body.state.engagements).toHaveLength(1);
    const duplicateRepost = await request(`${base}/engagement`, repostInput);
    expect(duplicateRepost.status).toBe(200);
    expect(duplicateRepost.body.duplicate).toBe(true);
    expect(duplicateRepost.body.state).toEqual(repost.body.state);

    const note = await request(`${base}/notes`, { idempotencyKey: "note-once", text: "这条说法需要核对来源。", linkedContentIds: [repostInput.contentId] });
    expect(note.status).toBe(201);
    const notePath = `${base}/notes/${note.body.state.investigationNotes[0].id}`;
    const deletionInput = { idempotencyKey: "delete-note-once" };
    const deleted = await request(notePath, deletionInput, "a", "DELETE");
    expect(deleted.status).toBe(200);
    expect(deleted.body.state.investigationNotes).toEqual([]);
    const duplicateDeletion = await request(notePath, deletionInput, "a", "DELETE");
    expect(duplicateDeletion.status).toBe(200);
    expect(duplicateDeletion.body.duplicate).toBe(true);
    expect(duplicateDeletion.body.state).toEqual(deleted.body.state);
    expect(provider.calls).toHaveLength(beforeInteraction);
  });

  it("rejects direct saves of unreadable platform posts during harassment while preserving saved and traditional media", async () => {
    const { request, repository } = await start();
    const created = await request("/games", { caseId: CASES[0].id });
    const base = `/games/${created.body.id}`;
    const contentId = CASES[0].publicLeads![0].contentId;
    const current = (await repository.getGame(created.body.id, created.body.ownerUserId))!;
    await repository.saveGame({ gameInstanceId: current.id, ownerUserId: current.ownerUserId,
      expectedStateVersion: current.stateVersion, idempotencyKey: "test-seed-platform-block", actionType: "test_seed", action: {},
      nextState: { ...current, harassment: 75, selfMediaAccess: "blocked", stateVersion: current.stateVersion + 1 } });
    const blocked = await request(base);
    expect(blocked.body.visibleContents.find((item: any) => item.id === contentId).body).toBe("");
    const rejectedSave = await request(`${base}/save-content`, { idempotencyKey: "blocked-save", contentId });
    expect(rejectedSave.status).toBeGreaterThanOrEqual(400);
    expect(rejectedSave.body.error).toContain("平台受冲击期间不能收藏");
    const afterRejectedSave = await request(base);
    expect(afterRejectedSave.body).toEqual(blocked.body);
    expect(afterRejectedSave.body.savedContentIds).not.toContain(contentId);

    const traditional = blocked.body.visibleContents.find((item: any) => item.kind === "tv_news");
    const savedNews = await request(`${base}/save-content`, { idempotencyKey: "save-accessible-news", contentId: traditional.id });
    expect(savedNews.status).toBe(200);
    expect(savedNews.body.state.savedContentIds).toContain(traditional.id);
    expect(savedNews.body.state.visibleContents.find((item: any) => item.id === traditional.id).body).toBe(traditional.body);

    const stored = (await repository.getGame(created.body.id, created.body.ownerUserId))!;
    await repository.saveGame({ gameInstanceId: stored.id, ownerUserId: stored.ownerUserId,
      expectedStateVersion: stored.stateVersion, idempotencyKey: "test-seed-existing-save", actionType: "test_seed", action: {},
      nextState: { ...stored, savedContentIds: [...stored.savedContentIds, contentId], stateVersion: stored.stateVersion + 1 } });
    const preSaved = await request(base);
    expect(preSaved.body.selfMediaAccess).toBe("blocked");
    expect(preSaved.body.visibleContents.find((item: any) => item.id === contentId).body).not.toBe("");
  });
});
