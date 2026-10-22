import { describe, expect, it } from "vitest";
import {
  createInitialGameState, createReportSnapshot, revealPreparedContent, scoreReport, submitReport, toPublicGameState,
  type CaseDefinition, type GameState, type ReportAnalysis, type ReportAnalysisClaim,
} from "../src/index.js";

const definition: CaseDefinition = {
  id: "assessment-event", version: "2.0.0", title: "公开证据评估", synopsis: "评分测试", durationMinutes: 200, realSecondsPerGameMinute: 6,
  stages: [{ id: "breaking", name: "引爆", startsAtMinute: 0 }],
  facts: [
    { id: "observed", statement: "设备撞上展架。", truth: "true", importance: "critical", explanation: "PRIVATE_AUTHOR_EXPLANATION" },
    { id: "network-cause", statement: "网络异常直接导致碰撞。", truth: "false", importance: "critical", explanation: "PRIVATE_MECHANISM" },
    { id: "hidden", statement: "FUTURE_FACT_STATEMENT", truth: "true", importance: "critical", explanation: "FUTURE_EXPLANATION" },
    { id: "unresolved", statement: "幕后动机已经可以确定。", truth: "unknowable", importance: "supporting", explanation: "PRIVATE_UNKNOWN_REASON" },
  ],
  sources: [{ id: "source", name: "公开发布者", kind: "self_media", publicDescription: "现场材料", agenda: "PRIVATE_AGENDA", knownFactIds: ["observed", "hidden"] }],
  contents: [
    { id: "record-a", title: "原始影像", body: "镜头记录设备撞上展架。", evidenceOriginIds: ["camera-a"] },
    { id: "mirror", title: "影像转载", body: "转载同一影像。", evidenceOriginIds: ["camera-a"] },
    { id: "record-b", title: "另一部相机", body: "另一机位记录碰撞。", evidenceOriginIds: ["camera-b"] },
    { id: "time-record", title: "时间记录", body: "断网在先，碰撞在后。", evidenceOriginIds: ["clock-record"] },
    { id: "rumor", title: "网上说法", body: "有人称影像是合成的，还说自己知道幕后动机。", evidenceOriginIds: ["online-rumor"] },
    { id: "irrelevant", title: "天气记录", body: "当天下雨。", evidenceOriginIds: ["weather-station"] },
    { id: "mechanism", title: "控制记录", body: "网络不发送方向指令，控制日志给出独立的故障路径。", evidenceOriginIds: ["controller-log"], publishedAtMinute: 100 },
    { id: "future", title: "FUTURE_TITLE", body: "FUTURE_BODY", evidenceOriginIds: ["future-origin"], publishedAtMinute: 150 },
  ].map((item) => ({ sourceId: "source", kind: "post" as const, publishedAtMinute: 0, claims: [], misleadingTechniques: [], commentsEnabled: true, trafficWeight: 5, ...item })),
  groups: [],
  reportRubric: [
    { factId: "observed", kind: "observation", evidence: [
      { contentId: "record-a", originIds: ["camera-a"], role: "record" },
      { contentId: "mirror", originIds: ["camera-a"], role: "record" },
      { contentId: "record-b", originIds: ["camera-b"], role: "record" },
      { contentId: "rumor", originIds: ["online-rumor"], role: "claim" },
    ], routes: ["record-a", "mirror", "record-b"].map((id) => ({ id: `observed-${id}`, contentIds: [id], acceptedJudgments: ["true" as const], confidenceRange: [75, 95] as [number, number], explanation: "原始现场影像直接支持碰撞发生。" })), counterContentIds: ["rumor"] },
    { factId: "network-cause", kind: "causal", evidence: [
      { contentId: "time-record", originIds: ["clock-record"], role: "context" },
      { contentId: "mechanism", originIds: ["controller-log"], role: "record" },
    ], routes: [{ id: "causal-records", contentIds: ["time-record", "mechanism"], acceptedJudgments: ["false"], confidenceRange: [80, 98], explanation: "控制通道与实际指令记录共同排除这条直接因果。" }] },
    { factId: "hidden", kind: "observation", evidence: [{ contentId: "future", originIds: ["future-origin"], role: "record" }],
      routes: [{ id: "hidden-route", contentIds: ["future"], acceptedJudgments: ["true"], confidenceRange: [80, 95], explanation: "FUTURE_ROUTE_EXPLANATION" }] },
    { factId: "unresolved", kind: "observation", evidence: [{ contentId: "rumor", originIds: ["online-rumor"], role: "claim" }], routes: [] },
  ],
};

const claim = (changes: Partial<ReportAnalysisClaim> = {}): ReportAnalysisClaim => ({ factId: "observed", judgment: "true", confidence: 90,
  confidenceQuote: null,
  quote: "原始影像证明设备撞上展架。", citedContentIds: ["record-a"], reasoning: "observation", reasoningQuote: "影像连续记录了碰撞动作。",
  counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null, ...changes });
const analysis = (...claims: ReportAnalysisClaim[]): ReportAnalysis => ({ summary: "依公开材料判断。", claims, unresolvedQuestions: [], parseConfidence: 95, unmappedClaims: [] });
const initial = () => createInitialGameState(definition, "game", "user", "2026-01-01T00:00:00.000Z");
const snapshot = () => createReportSnapshot(initial(), definition, "2026-01-01T00:00:00.000Z");

describe("evidence-bounded report scoring", () => {
  it("freezes only readable public evidence and complete routes without hidden answers", () => {
    const frozen = snapshot();
    expect(frozen.id).toBeTruthy();
    expect(frozen.rules.find((rule) => rule.factId === "network-cause")?.routes).toEqual([]);
    expect(frozen.rules.some((rule) => rule.factId === "hidden")).toBe(false);
    expect(JSON.stringify(frozen)).not.toMatch(/FUTURE_|PRIVATE_|"truth"|knownFactIds/);
    expect(frozen.evidenceVersions.find((entry) => entry.id === "record-a")?.versionId).toBe("2.0.0:record-a:1");
  });

  it("accepts a sufficient single record and does not award extra evidence points for same-origin reposts", () => {
    const frozen = snapshot();
    const one = scoreReport(frozen, analysis(claim()));
    const reposts = scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "mirror", "mirror"] })));
    expect(one.factAccuracy).toBe(100);
    expect(one.evidenceQuality).toBe(100);
    expect(reposts.evidenceQuality).toBe(one.evidenceQuality);
    expect(reposts.total).toBe(one.total);
    expect(reposts.feedback[0].independentOriginCount).toBe(1);
    expect(scoreReport(frozen, analysis(claim({ citedContentIds: ["record-b"] }))).total).toBe(one.total);
  });

  it("rejects unrelated and unavailable citations even when the guessed conclusion is publicly correct", () => {
    const result = scoreReport(snapshot(), analysis(claim({ citedContentIds: ["irrelevant", "future", "missing"] })));
    expect(result.factAccuracy).toBe(100);
    expect(result.evidenceQuality).toBe(0);
    expect(result.confidenceCalibration).toBe(0);
    expect(result.feedback[0].verdict).toBe("unsupported");
    expect(result.feedback[0].reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["citation_unrelated", "citation_unavailable", "citation_chain_incomplete"]));
    expect(JSON.stringify(result)).not.toContain("FUTURE_BODY");
  });

  it("does not reward a hidden-answer guess or evaluate it using author truth", () => {
    const result = scoreReport(snapshot(), analysis(claim({ factId: "hidden", quote: "我猜幕后事情已经确定。", citedContentIds: [], confidence: 99 })));
    expect(result.factAccuracy).toBeNull();
    expect(result.evidenceQuality).toBe(0);
    expect(result.total).toBe(0);
    expect(result.feedback[0]).toMatchObject({ factId: null, statement: "我猜幕后事情已经确定。", verdict: "unassessable" });
    expect(JSON.stringify(result)).not.toMatch(/FUTURE_|PRIVATE_/);
  });

  it("gives partial record credit only for its declared support direction", () => {
    const frozen = snapshot();
    const rule = frozen.rules.find((entry) => entry.factId === "observed")!;
    rule.routes = [];
    rule.evidence.find((entry) => entry.contentId === "record-a")!.supportsJudgments = ["true"];
    const supported = scoreReport(frozen, analysis(claim({ confidence: 30 })));
    const opposed = scoreReport(frozen, analysis(claim({ judgment: "false", confidence: 30 })));
    expect(supported.evidenceQuality).toBe(50);
    expect(opposed.evidenceQuality).toBe(0);
    expect(opposed.feedback[0].reasons.some((reason) => reason.code === "no_supporting_evidence")).toBe(true);
    delete rule.evidence.find((entry) => entry.contentId === "record-a")!.supportsJudgments;
    expect(scoreReport(frozen, analysis(claim())).evidenceQuality).toBe(0);
  });

  it("preserves early uncertainty and separates available-but-unexamined evidence from incorrect claims", () => {
    const report = analysis(claim({ factId: "network-cause", judgment: "unknown", confidence: null, citedContentIds: ["time-record"], quote: "只有先后时间，仍不能判断原因。", reasoning: "temporal_only" }));
    const early = scoreReport(snapshot(), report);
    const laterState = revealPreparedContent({ ...initial(), worldMinute: 100 }, definition);
    const later = scoreReport(createReportSnapshot(laterState, definition), report);
    expect(early.factAccuracy).toBeNull();
    expect(later.factAccuracy).toBeNull();
    expect(early.total).toBeNull();
    expect(later.feedback[0].verdict).toBe("reserved");
    expect(early.feedback[0].reasons.some((reason) => reason.code === "available_evidence_gap")).toBe(false);
    expect(later.feedback[0].reasons.some((reason) => reason.code === "available_evidence_gap")).toBe(true);
    expect(later.coverage.supportedConclusions).toBe(0);
  });

  it("never gives empty or all-unknown reports a full score", () => {
    expect(scoreReport(snapshot(), analysis()).total).toBeNull();
    const result = scoreReport(snapshot(), analysis(claim({ judgment: "unknown", confidence: null, citedContentIds: [], reasoningQuote: null })));
    expect(result.total).toBeNull();
    expect(result.factAccuracy).toBeNull();
    expect(result.coverage.percentage).toBe(0);
    expect(result.coverage.reservedQuestions).toBe(1);
    expect(result.coverage.supportedConclusions).toBe(0);
  });

  it("uses evidence ranges and leaves unexpressed confidence unscored", () => {
    const frozen = snapshot();
    expect(scoreReport(frozen, analysis(claim({ confidence: null }))).confidenceCalibration).toBeNull();
    expect(scoreReport(frozen, analysis(claim({ confidence: 76 }))).confidenceCalibration).toBe(100);
    expect(scoreReport(frozen, analysis(claim({ confidence: 94 }))).confidenceCalibration).toBe(100);
    const overstated = scoreReport(frozen, analysis(claim({ confidence: 99 })));
    expect(overstated.confidenceCalibration).toBeLessThan(100);
    expect(overstated.feedback[0].confidenceRange).toEqual([75, 95]);
    const unknown = scoreReport(frozen, analysis(claim({ factId: "unresolved", confidence: 95, citedContentIds: ["rumor"] })));
    expect(unknown.factAccuracy).toBeNull();
    expect(unknown.confidenceCalibration).toBe(0);
  });

  it("distinguishes a verified mechanism from a mere ordering of events", () => {
    const frozen = createReportSnapshot(revealPreparedContent({ ...initial(), worldMinute: 100 }, definition), definition);
    const common = { factId: "network-cause", judgment: "false" as const, citedContentIds: ["time-record", "mechanism"], confidence: 90 };
    const temporal = scoreReport(frozen, analysis(claim({ ...common, reasoning: "temporal_only", reasoningQuote: "断网在碰撞前，所以不是原因。" })));
    const mechanism = scoreReport(frozen, analysis(claim({ ...common, reasoning: "mechanism", reasoningQuote: "控制通道不能接收方向帧，封存日志还给出了实际指令来源。" })));
    expect(temporal.timelineCausality).toBeLessThan(mechanism.timelineCausality!);
    expect(temporal.total).toBeLessThan(mechanism.total!);
    expect(temporal.feedback[0].reasons.some((reason) => reason.code === "sequence_is_not_causation")).toBe(true);
    expect(mechanism.timelineCausality).toBe(100);
  });

  it("deduplicates claims and citations and exposes contradictory repeated judgments", () => {
    const frozen = snapshot();
    const single = scoreReport(frozen, analysis(claim()));
    const duplicates = scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "record-a"] }), claim()));
    expect(duplicates.total).toBe(single.total);
    expect(duplicates.coverage).toEqual(single.coverage);
    expect(duplicates.feedback[1].verdict).toBe("duplicate");
    const conflict = scoreReport(frozen, analysis(claim({ judgment: "unknown" }), claim()));
    expect(conflict.factAccuracy).toBe(0);
    expect(conflict.total).not.toBeNull();
    expect(conflict.feedback[0].reasons.some((reason) => reason.code === "conflicting_claims")).toBe(true);
  });

  it("requires an explicit response to acquired counterevidence without penalizing unread material", () => {
    const untouched = scoreReport(snapshot(), analysis(claim()));
    expect(untouched.contradictionHandling).toBeNull();
    const frozen = createReportSnapshot({ ...initial(), savedContentIds: ["rumor"] }, definition);
    const ignored = scoreReport(frozen, analysis(claim()));
    const addressed = scoreReport(frozen, analysis(claim({ counterContentIds: ["rumor"], counterQuote: "合成说法没有原始素材，与连续影像冲突。" })));
    expect(ignored.contradictionHandling).toBe(0);
    expect(ignored.feedback[0].reasons.find((reason) => reason.code === "counterevidence_unaddressed")?.contentIds).toEqual(["rumor"]);
    expect(addressed.contradictionHandling).toBe(100);
  });

  it("assesses actual source lineage instead of counting articles or inventing independence", () => {
    const frozen = snapshot();
    const same = scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "mirror"], sourceRelation: "independent", sourceQuote: "两家媒体独立拍到了碰撞。" })));
    expect(same.sourceAnalysis).toBe(0);
    expect(same.feedback[0].reasons.some((reason) => reason.code === "source_relationship_unsupported")).toBe(true);
    expect(scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "mirror"], sourceRelation: "shared", sourceQuote: "它们转载同一机位。" }))).sourceAnalysis).toBe(100);
    expect(scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "record-b"], sourceRelation: "independent", sourceQuote: "分别来自两部相机。" }))).sourceAnalysis).toBe(100);
    frozen.rules[0].evidence.forEach((entry) => { entry.originIds = []; });
    expect(scoreReport(frozen, analysis(claim({ citedContentIds: ["record-a", "record-b"], sourceRelation: "independent", sourceQuote: "文章不同就是独立。" }))).sourceAnalysis).toBe(0);
  });

  it("recognizes two original records inside one article while rejecting overlapping reposts as independent", () => {
    const extended = structuredClone(definition);
    extended.contents.push({ ...extended.contents[0], id: "combined-records", title: "两个机位的公开比对", body: "同篇报道分别引用两部相机的原始记录。", evidenceOriginIds: ["camera-a", "camera-b"] });
    extended.reportRubric![0].evidence.push({ contentId: "combined-records", originIds: ["camera-a", "camera-b"], role: "record", supportsJudgments: ["true"] });
    extended.reportRubric![0].routes.push({ id: "two-camera-comparison", contentIds: ["combined-records"], acceptedJudgments: ["true"], confidenceRange: [80, 98], explanation: "两个独立机位都记录了碰撞。" });
    const frozen = createReportSnapshot(createInitialGameState(extended, "game", "user"), extended);
    const singleArticle = scoreReport(frozen, analysis(claim({ citedContentIds: ["combined-records"], sourceRelation: "independent", sourceQuote: "这篇报道引用的两部相机提供了独立记录。" })));
    expect(singleArticle.sourceAnalysis).toBe(100);
    expect(singleArticle.feedback[0].independentOriginCount).toBe(2);
    const overlapping = scoreReport(frozen, analysis(claim({ citedContentIds: ["combined-records", "record-a"], sourceRelation: "independent", sourceQuote: "这两篇是互相独立的印证。" })));
    expect(overlapping.feedback[0].independentOriginCount).toBe(2);
    expect(overlapping.sourceAnalysis).toBe(0);
    expect(overlapping.feedback[0].reasons.some((reason) => reason.code === "source_relationship_unsupported")).toBe(true);
    expect(scoreReport(frozen, analysis(claim({ citedContentIds: ["combined-records", "record-a"], sourceRelation: "shared", sourceQuote: "两篇有一个共同机位，不能把转载再算作独立记录。" }))).sourceAnalysis).toBe(100);
  });

  it("keeps scores and stored versions stable after future evidence or authoring text changes", () => {
    const editable = structuredClone(definition);
    const state = createInitialGameState(editable, "game", "user");
    const frozen = createReportSnapshot(state, editable);
    const report = analysis(claim());
    const expected = scoreReport(frozen, report);
    editable.contents[0].body = "后来改写的正文";
    editable.reportRubric![0].routes[0].acceptedJudgments = ["false"];
    editable.facts[0].truth = "false";
    const futureState = revealPreparedContent({ ...state, worldMinute: 200 }, editable);
    expect(scoreReport(frozen, report)).toEqual(expected);
    expect(frozen.evidence.find((entry) => entry.id === "record-a")?.text).toBe("镜头记录设备撞上展架。");
    const completed = submitReport(futureState, editable, "我的最终判断以当时已经取得的材料为限。", report, "2026-01-02T00:00:00.000Z", frozen);
    expect(completed.report!.score).toEqual(expected);
    expect(completed.report!.snapshot.id).toBe(frozen.id);
    expect(completed.report!.snapshot.worldMinute).toBe(0);
  });

  it("keeps pending scoring rules private and returns only public-safe final metadata and reasons", () => {
    const state = initial();
    const frozen = snapshot();
    state.pendingAgentTask = { id: "report", operation: "report", actionKey: "report-key", action: {}, resumeStatus: "active", leaseUntil: "2099-01-01T00:00:00.000Z", progress: { snapshot: frozen } };
    const pending = toPublicGameState(state, definition);
    expect(pending).not.toHaveProperty("pendingAgentTask");
    expect(JSON.stringify(pending)).not.toContain("acceptedJudgments");
    const completed = submitReport(state, definition, "我认为原始影像足以确认设备撞倒展架。", analysis(claim()), undefined, frozen);
    const projected = toPublicGameState(completed, definition);
    expect(projected.report!.snapshot).not.toHaveProperty("rules");
    expect(projected.report!.snapshot).not.toHaveProperty("evidence");
    expect(JSON.stringify(projected)).not.toMatch(/acceptedJudgments|FUTURE_|PRIVATE_|"truth"/);
    expect(projected.report!.score.feedback[0].statement).toBe("设备撞上展架。");
  });

  it("retains the private scoring snapshot after task completion and storage without exposing it", () => {
    const state = initial();
    expect(state.reportAssessmentSnapshot).toBeNull();
    expect(toPublicGameState(state, definition)).not.toHaveProperty("reportAssessmentSnapshot");
    const frozen = createReportSnapshot(state, definition);
    state.pendingAgentTask = { id: "report-task", operation: "report", actionKey: "report-once", action: {}, resumeStatus: "active", leaseUntil: "2099-01-01T00:00:00.000Z", progress: { snapshot: frozen } };
    const completed = submitReport(state, definition, "根据原始记录可以确认发生了碰撞。", analysis(claim()), undefined, frozen);
    completed.pendingAgentTask = null;
    const restored = JSON.parse(JSON.stringify(completed)) as GameState;
    expect(restored.reportAssessmentSnapshot).toEqual(frozen);
    expect(scoreReport(restored.reportAssessmentSnapshot!, restored.report!.analysis)).toEqual(restored.report!.score);
    frozen.rules[0].routes = [];
    frozen.evidence[0].text = "后来被改写的外部对象";
    expect(scoreReport(completed.reportAssessmentSnapshot!, completed.report!.analysis)).toEqual(completed.report!.score);
    expect(completed.reportAssessmentSnapshot!.evidence[0].text).not.toBe(frozen.evidence[0].text);
    const projected = toPublicGameState(restored, definition);
    expect(projected).not.toHaveProperty("reportAssessmentSnapshot");
    expect(projected).not.toHaveProperty("pendingAgentTask");
    expect(JSON.stringify(projected)).not.toMatch(/acceptedJudgments|supportsJudgments|FUTURE_|PRIVATE_/);
    expect(projected.report!.snapshot.id).toBe(restored.reportAssessmentSnapshot!.id);
  });

  it("excludes blocked unsaved platform posts and unpublished drafts while preserving readable records", () => {
    const extended: CaseDefinition = { ...definition, contents: [...definition.contents,
      { ...definition.contents[0], id: "broadcast", kind: "tv_news", commentsEnabled: false },
      { ...definition.contents[0], id: "unpublished-news", kind: "newspaper", body: "PRIVATE_UNPUBLISHED_DRAFT", editorial: { materialIds: [], instructions: "待成稿" } },
    ] };
    const state = createInitialGameState(extended, "game", "user");
    state.selfMediaAccess = "blocked";
    state.savedContentIds = ["record-a"];
    const frozen = createReportSnapshot(state, extended);
    expect(frozen.evidence.map((entry) => entry.id).sort()).toEqual(["broadcast", "record-a"]);
    expect(frozen.rules.map((rule) => rule.factId)).toEqual(["observed"]);
    expect(JSON.stringify(frozen)).not.toContain("PRIVATE_UNPUBLISHED_DRAFT");
  });

  it("freezes the actual published version and public reply without granting unused authorized sources", () => {
    const extended: CaseDefinition = { ...definition,
      materials: [
        { id: "used-material", title: "镜头记录", text: "PRIVATE_MATERIAL_BODY", availableAtMinute: 0, sourceIds: ["source"], originId: "camera-a" },
        { id: "unused-material", title: "其他机位", text: "PRIVATE_UNUSED_BODY", availableAtMinute: 0, sourceIds: ["source"], originId: "camera-b" },
      ],
      contents: [...definition.contents, { ...definition.contents[0], id: "published-news", kind: "tv_news", commentsEnabled: false,
        evidenceOriginIds: ["camera-a", "camera-b"], editorial: { materialIds: ["used-material", "unused-material"], instructions: "根据授权材料撰写" } }],
    };
    let state = createInitialGameState(extended, "game", "user");
    state.publications = [{ id: "immutable-publication-id", contentId: "published-news", caseVersion: "2.0.0", title: "实际刊登标题", body: "实际刊登正文，仅引用第一机位。",
      materialIds: ["used-material"], generatedAt: "now", provider: "test", model: "test", promptVersion: "1" }];
    state.accountReplies = [{ id: "public-reply", contentId: "record-a", parentCommentId: "player-question", accountId: "account", displayName: "发布者", text: "我的拍摄范围只有现场这一侧。",
      publishedAtMinute: 0, role: "account", triggeredByCommentId: "player-question", materialIds: ["used-material"], leadId: null }];
    state = revealPreparedContent(state, extended);
    const frozen = createReportSnapshot(state, extended);
    expect(frozen.evidence.find((entry) => entry.id === "published-news")).toMatchObject({ versionId: "immutable-publication-id", title: "实际刊登标题", text: "实际刊登正文，仅引用第一机位。", originIds: ["camera-a"] });
    expect(frozen.evidence.find((entry) => entry.id === "public-reply")).toMatchObject({ kind: "reply", originIds: ["camera-a"], text: "我的拍摄范围只有现场这一侧。" });
    expect(JSON.stringify(frozen)).not.toMatch(/PRIVATE_MATERIAL_BODY|PRIVATE_UNUSED_BODY/);
    state.publications![0].body = "稍后改动";
    state.accountReplies![0].text = "稍后回复";
    expect(frozen.evidence.find((entry) => entry.id === "public-reply")!.text).toBe("我的拍摄范围只有现场这一侧。");
    expect(frozen.evidence.find((entry) => entry.id === "published-news")!.text).toBe("实际刊登正文，仅引用第一机位。");
  });
});
