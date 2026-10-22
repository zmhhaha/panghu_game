import type {
  FactAssessmentRule, ReportAnalysis, ReportAnalysisClaim, ReportAssessmentSnapshot,
  ReportClaimFeedback, ReportEvidenceSnapshot, ScoreBreakdown,
} from "./types.js";

export const REPORT_SCORING_VERSION = "evidence-bounded-1";

const unique = <T>(items: T[]) => [...new Set(items)];
const bounded = (value: number) => Math.max(0, Math.min(100, value));
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
const hasText = (value: string | null | undefined) => Boolean(value?.trim());

function closestRange(ranges: Array<[number, number]>, confidence: number): [number, number] {
  const distance = ([low, high]: [number, number]) => Math.max(low - confidence, confidence - high, 0);
  return [...ranges].sort((a, b) => distance(a) - distance(b) || a[0] - b[0] || a[1] - b[1])[0];
}

function evidenceRole(rule: FactAssessmentRule, evidence: ReportEvidenceSnapshot) {
  const direct = rule.evidence.find((entry) => entry.contentId === evidence.id);
  if (direct) return direct.role;
  // Replies can document a source's stated limits, but do not silently become the full attached record.
  if (evidence.kind === "reply" && evidence.originIds.some((origin) => rule.evidence.some((entry) => entry.originIds.includes(origin)))) return "context";
  return null;
}

function originsFor(rule: FactAssessmentRule, evidence: ReportEvidenceSnapshot): string[] {
  const declared = rule.evidence.find((entry) => entry.contentId === evidence.id)?.originIds;
  return unique(declared ? declared.filter((id) => evidence.originIds.includes(id)) : evidence.originIds);
}

function supportsJudgment(rule: FactAssessmentRule, evidence: ReportEvidenceSnapshot, judgment: ReportAnalysisClaim["judgment"]): boolean {
  const entry = rule.evidence.find((item) => item.contentId === evidence.id);
  if (!entry || entry.role === "claim" || judgment === "unknown") return false;
  const supported = entry.supportsJudgments ?? rule.routes.filter((route) => route.contentIds.includes(entry.contentId)).flatMap((route) => route.acceptedJudgments);
  return supported.includes(judgment);
}

/** Pure, public-safe output. Never consults hidden truth, live game state, or future publications. */
export function scoreReport(snapshot: ReportAssessmentSnapshot, analysis: ReportAnalysis): ScoreBreakdown {
  if (snapshot.ruleVersion !== REPORT_SCORING_VERSION) throw new Error("报告评分规则版本不匹配");
  const evidenceById = new Map(snapshot.evidence.map((item) => [item.id, item]));
  const rules = new Map(snapshot.rules.map((item) => [item.factId, item]));
  const grouped = new Map<string, ReportAnalysisClaim[]>();
  for (const claim of analysis.claims) grouped.set(claim.factId, [...(grouped.get(claim.factId) ?? []), claim]);
  const values = { factAccuracy: [] as number[], evidenceQuality: [] as number[], timelineCausality: [] as number[],
    contradictionHandling: [] as number[], confidenceCalibration: [] as number[], sourceAnalysis: [] as number[] };
  const feedback: ReportClaimFeedback[] = [];
  let addressedQuestions = 0;
  let supportedConclusions = 0;
  let reservedQuestions = 0;
  let assertedClaims = 0;

  for (const [factId, claims] of grouped) {
    const claim = claims.find((entry) => entry.judgment !== "unknown") ?? claims[0];
    const rule = rules.get(factId);
    const citedIds = unique(claim.citedContentIds);
    const cited = citedIds.flatMap((id) => evidenceById.has(id) ? [evidenceById.get(id)!] : []);
    const relevant = rule ? cited.filter((item) => evidenceRole(rule, item)) : [];
    const originGroups = rule ? relevant.map((item) => originsFor(rule, item)) : [];
    const originCount = unique(originGroups.flat()).length;
    const item: ReportClaimFeedback = { factId: rule ? factId : null, statement: rule?.statement ?? claim.quote, quote: claim.quote,
      verdict: claim.judgment === "unknown" ? "reserved" : "unassessable", citedContentIds: citedIds,
      independentOriginCount: originCount, confidenceRange: null, reasons: [] };
    const reason = (code: string, message: string, contentIds: string[] = []) => item.reasons.push({ code, message, contentIds: unique(contentIds) });
    const conflicting = claims.some((other) => other.judgment !== claim.judgment);
    const isUnknown = claim.judgment === "unknown";
    const citedSet = new Set(citedIds);
    const completeRoutes = rule?.routes.filter((route) => route.contentIds.length > 0 && route.contentIds.every((id) => citedSet.has(id))) ?? [];
    const supportingRoutes = completeRoutes.filter((route) => route.acceptedJudgments.includes(claim.judgment as "true" | "false" | "partial"));
    const publiclySupported = rule?.routes.some((route) => route.acceptedJudgments.includes(claim.judgment as "true" | "false" | "partial")) ?? false;
    const supporting = !conflicting && supportingRoutes.length > 0;
    const relevantIds = relevant.map((entry) => entry.id);
    const invalidIds = citedIds.filter((id) => !evidenceById.has(id));
    const unrelatedIds = cited.filter((entry) => !relevantIds.includes(entry.id)).map((entry) => entry.id);

    if (rule && relevant.length > 0 && (hasText(claim.reasoningQuote) || hasText(claim.counterQuote) || hasText(claim.sourceQuote) || !isUnknown)) addressedQuestions += 1;
    if (rule && isUnknown) reservedQuestions += 1;
    if (!isUnknown) assertedClaims += 1;
    if (invalidIds.length) reason("citation_unavailable", "这些引用不在提交时可读取的材料快照中，不能作为本次判断依据。", invalidIds);
    if (unrelatedIds.length) reason("citation_unrelated", "这些材料没有支持该主张的证据关系；出现相似话题不等于能够证明结论。", unrelatedIds);
    if (conflicting) reason("conflicting_claims", "报告对同一问题给出了相互冲突的判断，需要先澄清自己的结论。", citedIds);

    if (isUnknown) {
      reason("judgment_reserved", "你保留了判断；本次不会把未下结论当作事实错误。", relevantIds);
      if (rule?.routes.length && !supporting) reason("available_evidence_gap", "提交时已有可继续核对的材料，尚未完成的核验单列在调查覆盖中。", unique(rule.routes.flatMap((route) => route.contentIds)));
    } else if (!rule || !rule.routes.length) {
      item.verdict = "unassessable";
      reason("not_publicly_resolvable", "提交时的公开证据尚不能核验这个确定结论；不会要求你猜中尚未公开的事实。", relevantIds);
    } else if (!publiclySupported || conflicting) {
      item.verdict = "contradicted";
      values.factAccuracy.push(0);
      reason("public_evidence_conflict", "这一判断与提交时已具备完整核验路径的公开材料不一致。", unique(rule.routes.flatMap((route) => route.contentIds)));
    } else {
      values.factAccuracy.push(100);
      item.verdict = supporting ? "supported" : "unsupported";
      if (supporting) {
        supportedConclusions += 1;
        reason("supported_route", supportingRoutes[0].explanation, supportingRoutes[0].contentIds);
      } else reason("citation_chain_incomplete", "结论方向可由当时公开材料核验，但报告所引用的材料尚未形成完整证据链。", relevantIds);
    }

    if (!isUnknown) {
      const directional = rule ? relevant.filter((entry) => supportsJudgment(rule, entry, claim.judgment)) : [];
      const supportRatio = citedIds.length ? directional.length / citedIds.length : 0;
      const hasRecord = directional.some((entry) => evidenceRole(rule!, entry) === "record");
      let evidenceScore = supporting ? 100 * supportRatio : hasRecord ? 50 * supportRatio : directional.length ? 25 * supportRatio : 0;
      if (conflicting) evidenceScore = Math.min(evidenceScore, 25);
      if (rule?.kind === "causal" && claim.reasoning === "temporal_only") evidenceScore = Math.min(evidenceScore, 50);
      values.evidenceQuality.push(evidenceScore);
      if (!directional.length) reason("no_supporting_evidence", "所引材料没有提供支持这一判断方向的有效证据；相关记录、他人主张和结论支持需要区分。", citedIds);

      if (rule?.kind === "causal") {
        if (claim.reasoning === "mechanism" && hasText(claim.reasoningQuote)) {
          values.timelineCausality.push(supporting ? 100 : relevant.length ? 40 : 0);
          if (!supporting) reason("mechanism_unverified", "提出了机制解释，但引用尚不足以核验这条因果链。", relevantIds);
        } else {
          values.timelineCausality.push(claim.reasoning === "temporal_only" && relevant.length ? 20 : 0);
          reason(claim.reasoning === "temporal_only" ? "sequence_is_not_causation" : "causal_reasoning_missing",
            claim.reasoning === "temporal_only" ? "先后或同时发生只能确定时间关系，不能单独建立或排除因果。" : "这是因果判断，报告尚未给出可核验的连接机制。", relevantIds);
        }
      }

      if (claim.confidence !== null && Number.isFinite(claim.confidence)) {
        const ranges: Array<[number, number]> = supporting ? supportingRoutes.map((route) => route.confidenceRange)
          : [hasRecord ? [0, 40] : directional.length ? [0, 25] : [0, 20]];
        item.confidenceRange = closestRange(ranges, claim.confidence);
        const [low, high] = item.confidenceRange;
        const deviation = Math.max(low - claim.confidence, claim.confidence - high, 0);
        values.confidenceCalibration.push(bounded(100 - deviation * 2));
        reason(deviation ? "confidence_outside_support" : "confidence_matches_support",
          deviation ? `你写明的置信度超出了所引证据支持的 ${low}–${high}% 范围。` : `你写明的置信度处于所引证据支持的 ${low}–${high}% 范围内。`, relevantIds);
      } else reason("confidence_unspecified", "你没有明确给出确定程度，这一主张不计置信度校准分。", []);
    }

    if (rule) {
      const acquiredCounters = (rule.counterContentIds ?? []).filter((id) => evidenceById.get(id)?.acquired || citedSet.has(id) || claim.counterContentIds.includes(id));
      if (acquiredCounters.length && !isUnknown) {
        const addressed = hasText(claim.counterQuote) ? acquiredCounters.filter((id) => claim.counterContentIds.includes(id)) : [];
        values.contradictionHandling.push(100 * addressed.length / acquiredCounters.length);
        const missing = acquiredCounters.filter((id) => !addressed.includes(id));
        reason(missing.length ? "counterevidence_unaddressed" : "counterevidence_addressed",
          missing.length ? "已取得或引用的相反材料尚未在报告中得到具体回应。" : "报告明确回应了已取得的相反材料。", missing.length ? missing : addressed);
      }
    }

    if (claim.sourceRelation !== "unspecified") {
      const sharesOrigin = originGroups.some((origins, index) => originGroups.slice(index + 1).some((other) => origins.some((id) => other.includes(id))));
      // A single report may contain several independent original records. Extra
      // articles that reuse any of those roots must still not count as independent.
      const independent = originCount >= 2 && originGroups.every((origins) => origins.length > 0) && !sharesOrigin;
      const correct = hasText(claim.sourceQuote) && (claim.sourceRelation === "shared" ? sharesOrigin : independent);
      values.sourceAnalysis.push(correct ? 100 : 0);
      reason(correct ? "source_relationship_supported" : "source_relationship_unsupported",
        correct ? "报告对来源依赖的说明与材料出处一致。" : claim.sourceRelation === "independent" && sharesOrigin
          ? "这些引用存在共同原始来源，不能把转载数量当作独立印证。" : "现有出处不足以支持报告所称的来源关系。", relevantIds);
    }
    feedback.push(item);
    for (const duplicate of claims.filter((entry) => entry !== claim)) feedback.push({ factId: rule ? factId : null, statement: rule?.statement ?? duplicate.quote, quote: duplicate.quote, verdict: "duplicate",
      citedContentIds: unique(duplicate.citedContentIds), independentOriginCount: 0, confidenceRange: null,
      reasons: [{ code: "duplicate_fact", message: "同一问题只计分一次；重复表述或重复引用不会增加得分。", contentIds: unique(duplicate.citedContentIds) }] });
  }

  for (const quote of unique(analysis.unmappedClaims)) feedback.push({ factId: null, statement: quote, quote, verdict: "unassessable", citedContentIds: [],
    independentOriginCount: 0, confidenceRange: null, reasons: [{ code: "unmapped_claim", message: "这段表述未对应到可核验的问题，不据此猜测你的结论或评分。", contentIds: [] }] });
  const scores = { factAccuracy: average(values.factAccuracy), evidenceQuality: average(values.evidenceQuality),
    timelineCausality: average(values.timelineCausality), contradictionHandling: average(values.contradictionHandling),
    confidenceCalibration: average(values.confidenceCalibration), sourceAnalysis: average(values.sourceAnalysis) };
  const weights = { factAccuracy: 35, evidenceQuality: 25, timelineCausality: 15, contradictionHandling: 10, confidenceCalibration: 10, sourceAnalysis: 5 };
  let numerator = 0;
  let denominator = 0;
  for (const dimension of Object.keys(weights) as Array<keyof typeof weights>) if (scores[dimension] !== null) {
    numerator += scores[dimension]! * weights[dimension];
    denominator += weights[dimension];
  }
  return { ...scores, total: assertedClaims && denominator ? Math.round(numerator / denominator) : null,
    ruleVersion: snapshot.ruleVersion,
    coverage: { availableQuestions: rules.size, addressedQuestions, supportedConclusions, reservedQuestions,
      unexaminedQuestions: Math.max(0, rules.size - addressedQuestions), percentage: rules.size ? Math.round(addressedQuestions / rules.size * 100) : 0 },
    feedback };
}
