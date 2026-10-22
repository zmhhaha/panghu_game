import { describe, expect, it } from "vitest";
import {
  createInitialGameState, createInvestigationNote, deleteInvestigationNote, pauseGame, publishComment, repostContent, resumeGame, synchronizeGame, toPublicGameState, toggleContentLike,
  eligiblePublicLeads, recordAccountResponse, revealPreparedContent, setTimeScale,
  type CaseDefinition, type GroupReaction, type SpeechFeatures,
} from "../src/index.js";

const definition: CaseDefinition = {
  id: "test-case", version: "1.0.0", title: "测试事件", synopsis: "用于规则测试", durationMinutes: 60, realSecondsPerGameMinute: 2,
  stages: [
    { id: "breaking", name: "引爆", startsAtMinute: 0 },
    { id: "spreading", name: "扩散", startsAtMinute: 10 },
    { id: "polarizing", name: "对立", startsAtMinute: 20 },
    { id: "follow_up", name: "后续", startsAtMinute: 35 },
    { id: "cooling", name: "冷却", startsAtMinute: 50 },
  ],
  facts: [{ id: "fact", statement: "发生了事件", truth: "true", importance: "critical", explanation: "测试" }],
  sources: [{ id: "source", name: "来源", kind: "self_media", publicDescription: "公开账号", agenda: "测试", knownFactIds: ["fact"] }],
  contents: [{ id: "post", sourceId: "source", kind: "post", publishedAtMinute: 0, title: "帖子", body: "内容", claims: [{ factId: "fact", relation: "supports" }], misleadingTechniques: [], commentsEnabled: true, trafficWeight: 8 }],
  groups: [{ id: "group", name: "群体", description: "测试群体", initialFrenzy: 80, attention: 80, exclusivity: 70, dissentSensitivity: 75, mobilization: 70, persistence: 70, narrativeFactIds: ["fact"] }],
};

const speech: SpeechFeatures = { id: "speech", expressionType: "fact", targetIds: ["group"], supportedFactIds: [], deniedFactIds: ["fact"], certainty: 90, aggression: 70, provocation: 80, informationDensity: 70, citedContentIds: [], confidence: 95 };
const reactions: GroupReaction[] = [{ groupId: "group", eventFrenzy: 90, stanceConflict: 95, targetingTendency: 90, reactionIntents: ["quote", "pile_on"], reasonIds: ["narrative_challenged"], replies: [{ accountId: "user-1", displayName: "路人甲", text: "你有依据吗？" }] }];

describe("game engine", () => {
  it("reveals initial content and advances only while active", () => {
    const initial = createInitialGameState(definition, "game-a", "user-a", "2026-01-01T00:00:00.000Z");
    expect(initial.revealedContentIds).toEqual(["post"]);
    const advanced = synchronizeGame(initial, definition, "2026-01-01T00:00:20.000Z");
    expect(advanced.worldMinute).toBe(10);
    const paused = pauseGame(advanced, definition, "2026-01-01T00:00:20.000Z");
    expect(synchronizeGame(paused, definition, "2026-01-01T01:00:00.000Z").worldMinute).toBe(10);
    expect(resumeGame(paused, "2026-01-01T01:00:00.000Z").status).toBe("active");
  });

  it("uses speech and group frenzy to calculate public pressure", () => {
    const initial = createInitialGameState(definition, "game-a", "user-a");
    const next = publishComment(initial, definition, { id: "comment", contentId: "post", text: "这件事就是假的。", speechFeatures: speech, groupReactions: reactions });
    expect(next.exposure).toBeGreaterThan(0);
    expect(next.controversy).toBeGreaterThan(0);
    expect(next.harassment).toBeGreaterThan(0);
    expect(next.comments[0].groupReactions[0].eventFrenzy).toBe(90);
  });

  it("keeps game instances and hidden case knowledge isolated", () => {
    const a = publishComment(createInitialGameState(definition, "game-a", "user-a"), definition, { id: "comment", contentId: "post", text: "评论", speechFeatures: speech, groupReactions: reactions });
    const b = createInitialGameState(definition, "game-b", "user-b");
    expect(b.comments).toHaveLength(0);
    expect(b.exposure).toBe(0);
    expect(toPublicGameState(a, definition)).not.toHaveProperty("groupStates");
    expect(toPublicGameState(a, definition)).not.toHaveProperty("evidence");
    expect(toPublicGameState(a, definition)).not.toHaveProperty("investigationClaims");
    expect(toPublicGameState(a, definition).visibleContents[0]).not.toHaveProperty("claims");
    expect(toPublicGameState(a, definition).visibleContents[0]).not.toHaveProperty("misleadingTechniques");
    expect(toPublicGameState(a, definition).visibleContents[0]).not.toHaveProperty("trafficWeight");
    expect(toPublicGameState(a, definition).comments[0]).not.toHaveProperty("speechFeatures");
  });

  it("stores player notes without linking unrevealed material", () => {
    const initial = createInitialGameState(definition, "game-a", "user-a");
    const noted = createInvestigationNote(initial, { id: "note-a", text: "  现场视频缺少撞击前片段  ", linkedContentIds: ["post", "not-revealed"] });
    expect(noted.investigationNotes).toEqual([{ id: "note-a", text: "现场视频缺少撞击前片段", createdAtMinute: 0, linkedContentIds: ["post"] }]);
    expect(deleteInvestigationNote(noted, "note-a").investigationNotes).toEqual([]);
  });

  it("rejects comments on traditional media even if content is misconfigured", () => {
    const invalidDefinition: CaseDefinition = {
      ...definition,
      contents: [{ ...definition.contents[0], kind: "tv_news", commentsEnabled: true }],
    };
    const initial = createInitialGameState(invalidDefinition, "game-a", "user-a");
    expect(() => publishComment(initial, invalidDefinition, { id: "comment", contentId: "post", text: "评论", speechFeatures: speech, groupReactions: reactions })).toThrow("该内容未开放评论");
  });

  it("records likes and a one-time repost only for platform content", () => {
    const initial = createInitialGameState(definition, "game-a", "user-a");
    const liked = toggleContentLike(initial, definition, "post");
    expect(liked.engagements).toEqual([{ contentId: "post", liked: true, repostedAtMinute: null }]);
    expect(toggleContentLike(liked, definition, "post").engagements[0].liked).toBe(false);
    const reposted = repostContent(liked, definition, "post");
    expect(reposted.engagements[0].repostedAtMinute).toBe(0);
    expect(() => repostContent(reposted, definition, "post")).toThrow();
    const traditional = { ...definition, contents: [{ ...definition.contents[0], id: "tv", kind: "tv_news" as const }] };
    expect(() => toggleContentLike(initial, traditional, "tv")).toThrow();
  });

  it("settles the same cooling boundaries regardless of synchronization frequency", () => {
    const start = "2026-01-01T00:00:00.000Z";
    const initial = createInitialGameState(definition, "game", "user", start);
    initial.harassment = 60;
    initial.controversy = 40;
    let frequent = initial;
    for (let seconds = 1; seconds <= 60; seconds++) frequent = synchronizeGame(frequent, definition, new Date(Date.parse(start) + seconds * 1000).toISOString());
    const single = synchronizeGame(initial, definition, "2026-01-01T00:01:00.000Z");
    expect(frequent.worldMinute).toBe(single.worldMinute);
    expect(frequent.harassment).toBe(51);
    expect(frequent.harassment).toBe(single.harassment);
    expect(frequent.groupStates).toEqual(single.groupStates);
  });

  it("uses 10, 100 and 1000 game seconds per second and settles the old speed before switching", () => {
    const timed = { ...definition, durationMinutes: 10080, realSecondsPerGameMinute: 6 };
    const start = "2026-01-01T00:00:00.000Z";
    for (const scale of [1, 10, 100] as const) {
      const initial = setTimeScale(createInitialGameState(timed, "game", "user", start), timed, scale, start);
      expect(synchronizeGame(initial, timed, "2026-01-01T00:00:10.000Z").worldMinute * 60).toBeCloseTo(100 * scale);
    }
    const switched = setTimeScale(createInitialGameState(timed, "game", "user", start), timed, 10, "2026-01-01T00:00:06.000Z");
    expect(switched.worldMinute).toBe(1);
    expect(synchronizeGame(switched, timed, "2026-01-01T00:00:12.000Z").worldMinute).toBe(11);
  });

  it("stops at an unpublished media task and never exposes its authoring baseline", () => {
    const withNews: CaseDefinition = { ...definition, contents: [...definition.contents, {
      ...definition.contents[0], id: "news", kind: "newspaper", publishedAtMinute: 5, commentsEnabled: false,
      body: "PRIVATE AUTHORING BASELINE", editorial: { materialIds: [], instructions: "写报道" },
    }] };
    let state = synchronizeGame(createInitialGameState(withNews, "game", "user", "2026-01-01T00:00:00.000Z"), withNews, "2026-01-01T00:01:00.000Z");
    expect(state.worldMinute).toBe(5);
    expect(JSON.stringify(toPublicGameState(state, withNews))).not.toContain("PRIVATE AUTHORING BASELINE");
    state.publications = [{ id: "version-1", contentId: "news", caseVersion: "1.0.0", title: "已审核标题", body: "已保存正文", materialIds: [], generatedAt: "now", provider: "test", model: "test", promptVersion: "1" }];
    state = revealPreparedContent(state, withNews);
    expect(toPublicGameState(state, withNews).visibleContents.find((item) => item.id === "news")).toMatchObject({ body: "已保存正文", versionId: "version-1" });
    expect(toPublicGameState(state, withNews)).not.toHaveProperty("publications");
  });

  it("requires earlier disclosures, keeps response provenance and supports a silent scheduled path", () => {
    const interactive: CaseDefinition = { ...definition,
      materials: [{ id: "record", title: "现场记录", text: "只看到了后半段", sourceIds: ["source"], availableAtMinute: 0, originId: "witness" }],
      accounts: [{ id: "witness", displayName: "目击者", sourceId: "source", description: "只能描述所见", knownMaterialIds: ["record"], initialComments: [{ id: "initial", contentId: "post", text: "我在现场", publishedAtMinute: 0 }] }],
      contents: [...definition.contents, { ...definition.contents[0], id: "record-post", publishedAtMinute: 10 }],
      publicLeads: [
        { id: "first", contentId: "post", accountId: "witness", question: "来源", responseGuidance: "说明", responseMaterialIds: ["record"], unlockContentIds: ["record-post"], requiresLeadIds: [], availableAtMinute: 0 },
        { id: "second", contentId: "post", accountId: "witness", question: "范围", responseGuidance: "澄清", responseMaterialIds: [], unlockContentIds: [], requiresLeadIds: ["first"], availableAtMinute: 0 },
      ],
    };
    const initial = createInitialGameState(interactive, "game", "user", "2026-01-01T00:00:00.000Z");
    expect(toPublicGameState(initial, interactive).threadComments[0].id).toBe("initial");
    expect(eligiblePublicLeads(initial, interactive, "post", "witness").map((item) => item.id)).toEqual(["first"]);
    const commented = publishComment(initial, interactive, { id: "question", contentId: "post", parentCommentId: "initial", targetAccountId: "witness", text: "原始记录在哪里", speechFeatures: speech, groupReactions: [] });
    expect(() => recordAccountResponse(commented, interactive, "question", { accountId: "witness", text: "越过前提", leadId: "second", materialIds: [] })).toThrow();
    expect(() => recordAccountResponse(commented, interactive, "question", { accountId: "witness", text: "没有披露授权", leadId: null, materialIds: ["record"] })).toThrow("本轮公开授权");
    const replied = recordAccountResponse(commented, interactive, "question", { accountId: "witness", text: "这是现场记录", leadId: "first", materialIds: ["record"] });
    expect(replied.revealedContentIds).toContain("record-post");
    const projected = toPublicGameState(replied, interactive);
    expect(projected.threadComments.at(-1)).toMatchObject({ parentCommentId: "question", triggeredByCommentId: "question" });
    expect(projected.discoveries[0]).not.toHaveProperty("leadId");
    expect(recordAccountResponse(replied, interactive, "question", { accountId: "witness", text: "重复", leadId: "first", materialIds: [] }).accountReplies).toHaveLength(1);
    expect(synchronizeGame(initial, interactive, "2026-01-01T00:00:20.000Z").revealedContentIds).toContain("record-post");
    expect(initial.discoveries).toHaveLength(0);
  });
});
