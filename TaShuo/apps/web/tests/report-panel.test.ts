import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FinalReport, PublicGameState } from "@tashuo/core";
import { ReportConfirmation, ReportResult } from "../app/games/[id]/report-panel";
import { api, type ReportInterpretation } from "../lib/api";

function fixture(): PublicGameState {
  const report: FinalReport = {
    text: "这份公开记录只覆盖一个时段，尚不能外推整个事件。",
    submittedAt: "2026-10-22T00:00:00.000Z",
    analysis: { summary: "玩家保留时段外的判断。", claims: [], parseConfidence: 90, unresolvedQuestions: [], unmappedClaims: [] },
    snapshot: { id: "snapshot-1", caseId: "test", caseVersion: "1", ruleVersion: "1", worldMinute: 60, stateVersion: 5, capturedAt: "2026-10-22T00:00:00.000Z", evidenceVersions: [{ id: "notice", versionId: "notice-v1" }] },
    score: {
      factAccuracy: null, evidenceQuality: null, timelineCausality: null, contradictionHandling: null, confidenceCalibration: null, sourceAnalysis: null, total: null, ruleVersion: "1",
      coverage: { availableQuestions: 1, addressedQuestions: 0, supportedConclusions: 0, reservedQuestions: 0, unexaminedQuestions: 1, percentage: 0 },
      feedback: [{ factId: "public-question", statement: "这份记录能否覆盖整个事件", quote: "尚不能外推整个事件", verdict: "reserved", citedContentIds: ["notice"], independentOriginCount: 1, confidenceRange: null, reasons: [{ code: "scope", message: "记录只覆盖一个时段。", contentIds: ["notice"] }] }],
    },
    feedback: "这次保留判断对应一个明确的观测缺口。",
  };
  return {
    id: "game-1", ownerUserId: "player-1", caseId: "test", caseVersion: "1", status: "finished", timeScale: 1,
    worldMinute: 60, lastResumedAt: null, stateVersion: 5, lastEventSequence: 0, revealedContentIds: ["notice"],
    comments: [], engagements: [], investigationNotes: [], exposure: 0, controversy: 0, harassment: 0,
    discoveries: [], generationFailure: null, agentBusy: false, durationMinutes: 10_080,
    currentStage: { id: "breaking", name: "公开讨论", startsAtMinute: 0 }, sources: [],
    report, threadComments: [], savedContentIds: [], selfMediaAccess: "available",
    visibleContents: [{ id: "notice", sourceId: "public-account", kind: "post", publishedAtMinute: 30, title: "公开记录", body: "这个时段的公开记录。", commentsEnabled: true, versionId: "notice-v1" }],
  };
}

const resultHtml = (state: PublicGameState) => renderToStaticMarkup(React.createElement(ReportResult, { state, onOpenEvidence: () => undefined }));

test("unassessable dimensions and total stay unassessable while coverage remains separate", () => {
  const html = resultHtml(fixture());
  assert.equal((html.match(/暂无法评价/g) ?? []).length, 7);
  assert.ok(!html.includes(" / 100"));
  for (const label of ["事实判断", "证据质量", "时间与因果", "反证处理", "置信校准", "来源分析", "调查覆盖"]) assert.ok(html.includes(label));
  assert.ok(html.includes("尚未核对"));
});

test("claim feedback preserves the player's words and separates the model debrief", () => {
  const html = resultHtml(fixture());
  assert.ok(html.includes("这份记录能否覆盖整个事件"));
  assert.ok(html.includes("尚不能外推整个事件"));
  assert.ok(html.includes("记录只覆盖一个时段。"));
  assert.ok(html.includes("复盘解读"));
  assert.ok(html.includes("提交时版本：notice-v1"));
});

test("an unavailable or changed evidence version cannot masquerade as the submitted citation", () => {
  const state = fixture();
  state.visibleContents[0].versionId = "notice-v2";
  assert.ok(resultHtml(state).includes("提交时引用的版本暂不可打开"));
  assert.ok(!resultHtml(state).includes('title="提交时版本：notice-v1"'));
  state.visibleContents[0].versionId = "notice-v1";
  state.selfMediaAccess = "blocked";
  assert.ok(resultHtml(state).includes("引用材料当前不可打开"));
  state.savedContentIds = ["notice"];
  assert.ok(resultHtml(state).includes('title="提交时版本：notice-v1"'));
});

test("confirmation exposes uncertain interpretation without inventing confidence", () => {
  const interpretation: ReportInterpretation = { summary: "请核对时段含义。", parseConfidence: 40, unresolvedQuestions: ["其他时段发生了什么？"], unmappedClaims: [], claims: [{ statement: "是否可以外推", quote: "尚不能外推", judgment: "unknown", confidence: null, confidenceQuote: null, citedContentIds: ["notice"], reasoning: "none", reasoningQuote: null, counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }] };
  const html = renderToStaticMarkup(React.createElement(ReportConfirmation, { interpretation, state: fixture(), busy: false, canConfirm: false, onConfirm: () => undefined, onEdit: () => undefined, onOpenEvidence: () => undefined }));
  assert.ok(html.includes("未写明把握"));
  assert.ok(!html.includes("null%"));
  assert.ok(html.includes("本机没有原提交快照"));
  assert.match(html, /disabled="">含义正确，确认结算/);
});

test("an interpreted confidence value displays the player's exact confidence wording", () => {
  const interpretation: ReportInterpretation = { summary: "玩家对观测时段作了有限判断。", parseConfidence: 50, unresolvedQuestions: [], unmappedClaims: [], claims: [{ statement: "记录所述时段确有异常", quote: "我有80%把握认为那个时段确有异常。", judgment: "true", confidence: 80, confidenceQuote: "我有80%把握", citedContentIds: ["notice"], reasoning: "observation", reasoningQuote: "记录直接描述了那个时段的异常", counterContentIds: [], counterQuote: null, sourceRelation: "unspecified", sourceQuote: null }] };
  const html = renderToStaticMarkup(React.createElement(ReportConfirmation, { interpretation, state: fixture(), busy: false, canConfirm: true, onConfirm: () => undefined, onEdit: () => undefined, onOpenEvidence: () => undefined }));
  assert.ok(html.includes("把握 80%"));
  assert.ok(html.includes("把握程度的原文依据</small>我有80%把握"));
  assert.ok(!html.includes("未写明把握"));
});

test("confirmation shows the reasoning and source interpretation plus opposing citations", () => {
  const interpretation: ReportInterpretation = { summary: "玩家提出时间关联，同时引用反向记录。", parseConfidence: 40, unresolvedQuestions: [], unmappedClaims: [], claims: [{ statement: "前一变化是否导致异常", quote: "因为更早发生，所以我怀疑有关，但原始记录并未证明机制。", judgment: "partial", confidence: null, confidenceQuote: null, citedContentIds: [], reasoning: "temporal_only", reasoningQuote: "因为更早发生", counterContentIds: ["notice"], counterQuote: "原始记录并未证明机制", sourceRelation: "shared", sourceQuote: "两篇转述都来自同一份记录" }] };
  const html = renderToStaticMarkup(React.createElement(ReportConfirmation, { interpretation, state: fixture(), busy: false, canConfirm: true, onConfirm: () => undefined, onEdit: () => undefined, onOpenEvidence: () => undefined }));
  assert.ok(html.includes("仅按时间先后"));
  assert.ok(html.includes("认为同源"));
  assert.ok(html.includes("反向材料引用"));
  assert.ok(html.includes("公开记录"));
});

test("report confirmation reuses the original submission key and exact text", async (context) => {
  const requests: Record<string, unknown>[] = [];
  context.mock.method(globalThis, "fetch", async (_path: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ state: fixture() }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const submission = { idempotencyKey: "same-report-key", text: "这是保留原文与引用、等待确认的调查报告。" };
  await api.report("game-1", submission);
  await api.report("game-1", submission, "confirmation-token");
  assert.deepEqual(requests[0], submission);
  assert.deepEqual(requests[1], { ...submission, confirmationToken: "confirmation-token" });
});

test("canceling a report identifies the original task so a stale tab cannot cancel a newer report", async (context) => {
  let requestBody: Record<string, unknown> | undefined;
  context.mock.method(globalThis, "fetch", async (_path: string, init: RequestInit) => {
    requestBody = JSON.parse(String(init.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ error: "任务已变化" }), { status: 409, headers: { "Content-Type": "application/json" } });
  });
  await assert.rejects(api.cancelReport("game-1", "original-report-key"), /任务已变化/);
  assert.equal(requestBody?.expectedActionKey, "original-report-key");
  assert.equal(typeof requestBody?.idempotencyKey, "string");
  assert.notEqual(requestBody?.idempotencyKey, "original-report-key");
});
