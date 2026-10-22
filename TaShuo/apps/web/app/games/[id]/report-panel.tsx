"use client";

import type { PublicGameState, ScoreBreakdown } from "@tashuo/core";
import React from "react";
import { FileText, Link2 } from "lucide-react";
import type { ReportInterpretation } from "@/lib/api";

const judgmentLabels = { true: "认为成立", false: "认为不成立", partial: "认为部分成立", unknown: "暂不能判断" } as const;
const reasoningLabels = { observation: "直接观察", mechanism: "机制解释", temporal_only: "仅按时间先后", none: "未说明" } as const;
const sourceRelationLabels = { independent: "认为来源独立", shared: "认为同源", unspecified: "未说明" } as const;

const verdictLabels = { supported: "有据支持", unsupported: "依据不足", contradicted: "与公开证据冲突", reserved: "保留判断", unassessable: "暂无法评价", duplicate: "重复主张" } as const;

const scoreDimensions: Array<{ key: keyof Pick<ScoreBreakdown, "factAccuracy" | "evidenceQuality" | "timelineCausality" | "contradictionHandling" | "confidenceCalibration" | "sourceAnalysis">; label: string; weight: number; description: string }> = [
  { key: "factAccuracy", label: "事实判断", weight: 35, description: "结论是否符合当时已有证据的支持范围" },
  { key: "evidenceQuality", label: "证据质量", weight: 25, description: "引用是否相关，是否能支持这项具体判断" },
  { key: "timelineCausality", label: "时间与因果", weight: 15, description: "是否区分先后顺序、关联和因果机制" },
  { key: "contradictionHandling", label: "反证处理", weight: 10, description: "是否正面处理相冲突的材料与解释" },
  { key: "confidenceCalibration", label: "置信校准", weight: 10, description: "表达的把握程度是否符合证据的强弱" },
  { key: "sourceAnalysis", label: "来源分析", weight: 5, description: "是否识别独立来源和同源转述" },
];

const gameTime = (minute: number) => `第 ${Math.floor(minute / 1440) + 1} 天 ${String(Math.floor(minute % 1440 / 60)).padStart(2, "0")}:${String(Math.floor(minute % 60)).padStart(2, "0")}`;

function ReportEvidenceLink({ id, state, onOpenEvidence }: { id: string; state: PublicGameState; onOpenEvidence: (contentId: string, replyId?: string) => void }) {
  const reply = state.threadComments.find((item) => item.id === id);
  const content = state.visibleContents.find((item) => item.id === (reply?.contentId ?? id));
  const recorded = state.report?.snapshot.evidenceVersions.find((item) => item.id === id);
  const blocked = content && state.selfMediaAccess === "blocked" && content.kind !== "tv_news" && content.kind !== "newspaper" && !state.savedContentIds.includes(content.id);
  const changed = content && !reply && recorded && recorded.versionId !== content.versionId;
  if (!content || blocked || changed) return <span className="report-citation-unavailable">{changed ? "提交时引用的版本暂不可打开" : "引用材料当前不可打开"}</span>;
  return <button type="button" title={recorded ? `提交时版本：${recorded.versionId}` : "打开公开材料"} onClick={() => onOpenEvidence(content.id, reply?.id)}><Link2 size={12} /><span>{reply ? `${reply.displayName}的公开回应 · ${gameTime(reply.publishedAtMinute)}` : content.title}{recorded && <small>提交时的引用版本</small>}</span></button>;
}

export function ReportResult({ state, onOpenEvidence }: { state: PublicGameState; onOpenEvidence: (contentId: string, replyId?: string) => void }) {
  const report = state.report;
  if (!report) return null;
  const { score } = report;
  return <section className="score-result report-result" aria-label="报告评价">
    <span>根据提交时的公开证据评价</span><strong className={score.total === null ? "score-unavailable" : ""}>{score.total === null ? "暂无法评价" : score.total}<small>{score.total === null ? "" : " / 100"}</small></strong>
    <p className="report-score-boundary">评价范围停留在{gameTime(report.snapshot.worldMinute)}。尚不能评价的项目单独标出，不计作零分。</p>
    <dl className="report-dimensions">{scoreDimensions.map((dimension) => <div key={dimension.key}><dt><span>{dimension.label}<small>基准权重 {dimension.weight}%</small></span><p>{dimension.description}</p></dt><dd className={score[dimension.key] === null ? "unavailable" : ""}>{score[dimension.key] === null ? "暂无法评价" : score[dimension.key]}</dd></div>)}</dl>
    <section className="report-coverage" aria-label="调查覆盖"><header><h3>调查覆盖</h3><b>{score.coverage.percentage}%</b></header><p>覆盖情况单列展示，不能用评论次数或表态数量替代调查。</p><dl><div><dt>当时可调查的问题</dt><dd>{score.coverage.availableQuestions}</dd></div><div><dt>报告涉及</dt><dd>{score.coverage.addressedQuestions}</dd></div><div><dt>有依据的结论</dt><dd>{score.coverage.supportedConclusions}</dd></div><div><dt>保留判断</dt><dd>{score.coverage.reservedQuestions}</dd></div><div><dt>尚未核对</dt><dd>{score.coverage.unexaminedQuestions}</dd></div></dl></section>
    <section className="report-claim-feedback" aria-label="逐项判断与依据"><h3>逐项判断与依据</h3>{score.feedback.map((item, index) => <article className={`claim-verdict-${item.verdict}`} key={`${index}-${item.factId ?? "unmapped"}`}><header><h4>{item.statement}</h4><span>{verdictLabels[item.verdict]}</span></header>{item.quote && <blockquote><small>你的报告原文</small>{item.quote}</blockquote>}<ul>{item.reasons.map((reason, reasonIndex) => <li key={`${reason.code}-${reasonIndex}`}><p>{reason.message}</p>{reason.contentIds.length > 0 && <div className="report-citations">{reason.contentIds.map((id) => <ReportEvidenceLink key={id} id={id} state={state} onOpenEvidence={onOpenEvidence} />)}</div>}</li>)}</ul><div className="claim-evidence-summary"><span>引用涉及 {item.independentOriginCount} 个独立源头</span>{item.confidenceRange && <span>证据支持的把握范围 {item.confidenceRange[0]}%—{item.confidenceRange[1]}%</span>}</div>{item.citedContentIds.length > 0 && <details className="claim-cited-list"><summary>查看这项判断的引用</summary><div className="report-citations">{item.citedContentIds.map((id) => <ReportEvidenceLink key={id} id={id} state={state} onOpenEvidence={onOpenEvidence} />)}</div></details>}</article>)}</section>
    {report.feedback && <section className="report-explanation"><h3>复盘解读</h3><p>{report.feedback}</p></section>}
    {report.analysis.unresolvedQuestions.length > 0 && <section className="report-unresolved"><h3>你留下的未决问题</h3><ul>{report.analysis.unresolvedQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul></section>}
    <details className="report-original"><summary>回看已提交的报告</summary><p>{report.text}</p></details>
    <details className="report-snapshot"><summary>本次评价的记录</summary><dl><div><dt>事件版本</dt><dd>{report.snapshot.caseVersion}</dd></div><div><dt>评分规则</dt><dd>{score.ruleVersion}</dd></div><div><dt>证据版本数量</dt><dd>{report.snapshot.evidenceVersions.length}</dd></div></dl></details>
  </section>;
}

export function ReportConfirmation({ interpretation, state, busy, canConfirm, onConfirm, onEdit, onOpenEvidence }: {
  interpretation: ReportInterpretation;
  state: PublicGameState;
  busy: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onOpenEvidence: (contentId: string, replyId?: string) => void;
}) {
  return <section className="report-confirmation" aria-label="核对报告理解">
    <header><FileText size={18} /><div><h2>先核对报告含义</h2><p>以下是对你原文的整理，尚未计分。确认后使用这份报告结算；也可以返回修改。</p></div></header>
    <p className="report-interpretation-summary">{interpretation.summary}</p>
    {interpretation.claims.map((claim, index) => <article className="report-interpretation-claim" key={`${index}-${claim.statement}`}>
      <h3>{index + 1}. {claim.statement}</h3>
      <div className="report-claim-position"><span>{judgmentLabels[claim.judgment]}</span><span>{claim.confidence === null ? "未写明把握" : `把握 ${claim.confidence}%`}</span></div>
      {claim.quote && <blockquote><small>你的报告原文</small>{claim.quote}</blockquote>}
      {claim.confidence !== null && claim.confidenceQuote && <blockquote><small>把握程度的原文依据</small>{claim.confidenceQuote}</blockquote>}
      <p><b>推理方式：</b>{reasoningLabels[claim.reasoning]}</p>
      {claim.reasoningQuote && <p><b>理由：</b>{claim.reasoningQuote}</p>}
      {claim.counterQuote && <p><b>反证或保留：</b>{claim.counterQuote}</p>}
      {claim.counterContentIds.length > 0 && <div className="report-counter-citations"><b>反向材料引用</b><div className="report-citations">{claim.counterContentIds.map((id) => <ReportEvidenceLink key={id} id={id} state={state} onOpenEvidence={onOpenEvidence} />)}</div></div>}
      <p><b>来源关系：</b>{sourceRelationLabels[claim.sourceRelation]}</p>
      {claim.sourceQuote && <p><b>来源判断：</b>{claim.sourceQuote}</p>}
      {claim.citedContentIds.length > 0 && <div className="report-citations">{claim.citedContentIds.map((id) => <ReportEvidenceLink key={id} id={id} state={state} onOpenEvidence={onOpenEvidence} />)}</div>}
    </article>)}
    {interpretation.unresolvedQuestions.length > 0 && <div className="report-unresolved"><h3>仍未解决的问题</h3><ul>{interpretation.unresolvedQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul></div>}
    {interpretation.unmappedClaims.length > 0 && <div className="report-unresolved"><h3>需要你确认的表达</h3><ul>{interpretation.unmappedClaims.map((claim, index) => <li key={index}>{claim}</li>)}</ul></div>}
    <div className="report-confirmation-actions"><button type="button" disabled={busy} onClick={onEdit}>返回修改报告</button><button type="button" className="primary-command compact" disabled={busy || !canConfirm} onClick={onConfirm}>含义正确，确认结算</button></div>
    {!canConfirm && <p className="draft-hint">本机没有原提交快照。请返回修改报告后重新提交，避免确认另一份文字。</p>}
  </section>;
}
