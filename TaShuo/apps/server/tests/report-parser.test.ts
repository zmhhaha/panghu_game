import { REPORT_SCORING_VERSION, type ReportAnalysis, type ReportAssessmentSnapshot } from "@tashuo/core";
import { describe, expect, it } from "vitest";
import { AgentOrchestrator } from "../src/agents/orchestrator.js";
import type { AgentProvider } from "../src/agents/provider.js";

const text = "依据公开画面，现场留有记录；内部原因仍不能确定。";
const snapshot: ReportAssessmentSnapshot = {
  id: "snapshot-a", caseId: "event-a", caseVersion: "2.1.0", ruleVersion: REPORT_SCORING_VERSION,
  worldMinute: 10, stateVersion: 4, capturedAt: "2026-10-22T00:00:00.000Z", evidenceVersions: [{ id: "post-a", versionId: "version-a" }],
  evidence: [{ id: "post-a", contentId: "post-a", kind: "content", versionId: "version-a", title: "公开片段", text: "碰撞后的公开画面。",
    sourceId: "source-a", publishedAtMinute: 0, originIds: ["private-origin-marker"], acquired: false }],
  rules: [{ factId: "recorded", statement: "现场存在画面记录", kind: "observation",
    evidence: [{ contentId: "post-a", originIds: ["private-origin-marker"], role: "record", supportsJudgments: ["true"] }],
    routes: [{ id: "private-route-marker", contentIds: ["post-a"], acceptedJudgments: ["true"], confidenceRange: [80, 99], explanation: "private-rule-explanation" }] }],
};
const parsed = (): ReportAnalysis => ({ summary: "确认有画面，对原因保留判断", parseConfidence: 95, unmappedClaims: [], unresolvedQuestions: ["内部原因"],
  claims: [{ factId: "recorded", judgment: "true", confidence: null, confidenceQuote: null, citedContentIds: ["post-a"], quote: "现场留有记录",
    reasoning: "observation", reasoningQuote: "依据公开画面", counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }] });
function fixture(result: unknown) {
  const calls: Array<{ system: string; input: Record<string, any> }> = [];
  const provider: AgentProvider = { name: "test-only", model: "test-only", async complete(system, input) { calls.push({ system, input: JSON.parse(input) }); return result; } };
  return { agents: new AgentOrchestrator(provider), calls };
}

describe("evidence-bounded report interpretation", () => {
  it("sends actual frozen public text but no private scoring routes or source graph to the parser", async () => {
    const { agents, calls } = fixture(parsed());
    const result = await agents.analyzeReport(snapshot, text);
    expect(result.claims[0].confidence).toBeNull();
    expect(result.parseConfidence).toBe(95);
    expect(calls[0].input.publicEvidence[0]).toMatchObject({ body: snapshot.evidence[0].text, versionId: "version-a" });
    expect(calls[0].input.canonicalClaims).toEqual([{ id: "recorded", statement: "现场存在画面记录" }]);
    for (const forbidden of ["private-origin-marker", "private-route-marker", "private-rule-explanation", "acceptedJudgments", "confidenceRange"])
      expect(JSON.stringify(calls)).not.toContain(forbidden);
  });

  it.each([
    ["unknown fact", { factId: "hidden-fact" }, "尚未公开"],
    ["future citation", { citedContentIds: ["future-record"] }, "不可读取"],
    ["invented quotation", { reasoningQuote: "我调查了内部数据库" }, "不存在"],
    ["inferred mechanism", { reasoning: "mechanism", reasoningQuote: null }, "原文依据"],
    ["unquoted counter", { counterContentIds: ["post-a"], counterQuote: null }, "原文依据"],
    ["inferred independence", { sourceRelation: "independent", sourceQuote: null }, "原文依据"],
    ["invented confidence", { confidence: 95, confidenceQuote: null }, "原文依据"],
    ["non-numeric confidence quote", { confidence: 95, confidenceQuote: "现场留有记录" }, "原文依据"],
  ])("rejects %s instead of silently repairing the report", async (_name, modification, message) => {
    const analysis = parsed();
    Object.assign(analysis.claims[0], modification);
    await expect(fixture(analysis).agents.analyzeReport(snapshot, text)).rejects.toThrow(message as string);
  });

  it("requires unmapped claims to quote the submitted report too", async () => {
    const analysis = parsed();
    analysis.unmappedClaims = ["这是模型自行补充的其他指控"];
    await expect(fixture(analysis).agents.analyzeReport(snapshot, text)).rejects.toThrow("不存在");
  });

  it.each(["我的把握是95%", "我的置信度为95", "对此我有９５％的把握"])("preserves an explicitly quoted numeric confidence: %s", async (quote) => {
    const analysis = parsed();
    analysis.claims[0].confidence = 95;
    analysis.claims[0].confidenceQuote = quote;
    const report = `${text}${quote}。`;
    expect((await fixture(analysis).agents.analyzeReport(snapshot, report)).claims[0].confidence).toBe(95);
    analysis.claims[0].confidence = 85;
    await expect(fixture(analysis).agents.analyzeReport(snapshot, report)).rejects.toThrow("对应数值");
  });
});
