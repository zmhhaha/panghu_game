import type { ReportAnalysis } from "@tashuo/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReportConfirmationToken, verifyReportConfirmationToken } from "../src/report-confirmation-token.js";

const analysis: ReportAnalysis = { summary: "尚未理解确定结论", claims: [], unresolvedQuestions: [], parseConfidence: 35, unmappedClaims: [] };
const context = { ownerUserId: "user-a", gameInstanceId: "game-a", actionKey: "report-a", snapshotId: "snapshot-a", text: "这是玩家的私有报告正文。", analysis };
afterEach(() => vi.useRealTimers());

describe("report confirmation binding", () => {
  it("binds owner, instance, request, snapshot, original text and parsed interpretation without embedding them", () => {
    const token = createReportConfirmationToken(context, "secret");
    expect(() => verifyReportConfirmationToken(token, context, "secret")).not.toThrow();
    for (const changed of [
      { ownerUserId: "user-b" }, { gameInstanceId: "game-b" }, { actionKey: "report-b" }, { snapshotId: "snapshot-b" },
      { text: `${context.text}改动` }, { analysis: { ...analysis, parseConfidence: 95 } },
    ]) expect(() => verifyReportConfirmationToken(token, { ...context, ...changed }, "secret")).toThrow("不匹配");
    const payload = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
    expect(payload).not.toContain(context.text);
    expect(payload).not.toContain(analysis.summary);
    expect(() => verifyReportConfirmationToken(token, context, "other-secret")).toThrow("无效");
    expect(() => verifyReportConfirmationToken(`${token}.extra`, context, "secret")).toThrow("无效");
  });

  it("expires without silently authorizing a waiting report", () => {
    vi.useFakeTimers();
    const token = createReportConfirmationToken(context, "secret");
    vi.advanceTimersByTime(15 * 60_000);
    expect(() => verifyReportConfirmationToken(token, context, "secret")).toThrow("已过期");
  });

  it("survives JSONB object-key reordering at every depth while binding array order and values", () => {
    const parsed: ReportAnalysis = { ...analysis, claims: [{ factId: "visible-fact", judgment: "unknown", confidence: null, confidenceQuote: null,
      quote: "尚不能判断", citedContentIds: ["record-a", "record-b"], reasoning: "none", reasoningQuote: null,
      counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }] };
    const original = { ...context, analysis: parsed };
    const token = createReportConfirmationToken(original, "secret");
    const reverseObjectKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reverseObjectKeys);
      if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]));
      return value;
    };
    const stored = reverseObjectKeys(parsed) as ReportAnalysis;
    expect(JSON.stringify(stored)).not.toBe(JSON.stringify(parsed));
    expect(() => verifyReportConfirmationToken(token, { ...context, analysis: stored }, "secret")).not.toThrow();
    stored.claims[0].citedContentIds.reverse();
    expect(() => verifyReportConfirmationToken(token, { ...context, analysis: stored }, "secret")).toThrow("不匹配");
    stored.claims[0].citedContentIds.reverse();
    stored.claims[0].judgment = "true";
    expect(() => verifyReportConfirmationToken(token, { ...context, analysis: stored }, "secret")).toThrow("不匹配");
  });
});
