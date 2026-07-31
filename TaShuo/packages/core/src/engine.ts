import { randomUUID } from "node:crypto";
import type {
  CaseDefinition, ContentDefinition, EvidenceEntry, FinalReport, GameEvent, GameState,
  GroupReaction, InvestigationNote, PlatformEngagement, PublicCaseSummary, PublicGameState, ReportAnalysis, ScoreBreakdown, SpeechFeatures,
} from "./types.js";

const clamp = (value: number, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));

function appendEvent(state: GameState, type: GameEvent["type"], payload: Record<string, unknown>): void {
  state.lastEventSequence += 1;
  state.events.push({ id: randomUUID(), sequence: state.lastEventSequence, type, gameMinute: state.worldMinute, payload });
}

function revealDueContent(state: GameState, definition: CaseDefinition): void {
  const revealed = new Set(state.revealedContentIds);
  for (const content of definition.contents) {
    if (content.publishedAtMinute <= state.worldMinute && !revealed.has(content.id)) {
      state.revealedContentIds.push(content.id);
      revealed.add(content.id);
      appendEvent(state, "content_revealed", { contentId: content.id });
    }
  }
}

function updateAccess(state: GameState): void {
  state.selfMediaAccess = state.harassment >= 70 ? "blocked" : state.harassment >= 35 ? "degraded" : "available";
}

function decayPressure(state: GameState, elapsedMinutes: number): void {
  const intervals = Math.floor(elapsedMinutes / 10);
  if (intervals <= 0) return;
  state.harassment = clamp(state.harassment - intervals * 3);
  state.controversy = clamp(state.controversy - intervals);
  for (const group of Object.values(state.groupStates)) {
    group.eventFrenzy = clamp(group.eventFrenzy - intervals);
    group.lastUpdatedMinute = state.worldMinute;
  }
  updateAccess(state);
}

export function createInitialGameState(
  definition: CaseDefinition,
  gameInstanceId: string,
  ownerUserId: string,
  now = new Date().toISOString(),
): GameState {
  const state: GameState = {
    id: gameInstanceId,
    ownerUserId,
    caseId: definition.id,
    caseVersion: definition.version,
    status: "active",
    timeScale: 1,
    worldMinute: 0,
    lastResumedAt: now,
    stateVersion: 1,
    lastEventSequence: 0,
    revealedContentIds: [],
    savedContentIds: [],
    comments: [],
    engagements: [],
    groupStates: Object.fromEntries(definition.groups.map((group) => [group.id, {
      id: group.id,
      name: group.name,
      eventFrenzy: group.initialFrenzy,
      attention: group.attention,
      exclusivity: group.exclusivity,
      dissentSensitivity: group.dissentSensitivity,
      mobilization: group.mobilization,
      persistence: group.persistence,
      lastUpdatedMinute: 0,
    }])),
    exposure: 0,
    controversy: 0,
    harassment: 0,
    selfMediaAccess: "available",
    evidence: [],
    investigationNotes: [],
    report: null,
    events: [],
  };
  revealDueContent(state, definition);
  return state;
}

export function synchronizeGame(state: GameState, definition: CaseDefinition, now = new Date().toISOString()): GameState {
  const next = structuredClone(state);
  next.timeScale ??= 1;
  if (next.status !== "active" || !next.lastResumedAt) return next;
  const elapsedSeconds = Math.max(0, (Date.parse(now) - Date.parse(next.lastResumedAt)) / 1000);
  const elapsedMinutes = (elapsedSeconds / definition.realSecondsPerGameMinute) * next.timeScale;
  if (elapsedMinutes <= 0) return next;
  const previousMinute = next.worldMinute;
  next.worldMinute = Math.min(definition.durationMinutes, next.worldMinute + elapsedMinutes);
  next.lastResumedAt = now;
  decayPressure(next, next.worldMinute - previousMinute);
  revealDueContent(next, definition);
  if (next.worldMinute >= definition.durationMinutes) {
    next.status = "awaiting_report";
    next.lastResumedAt = null;
  }
  next.stateVersion += 1;
  return next;
}

export function pauseGame(state: GameState, definition: CaseDefinition, now = new Date().toISOString()): GameState {
  const next = synchronizeGame(state, definition, now);
  if (next.status !== "active") return next;
  next.status = "paused";
  next.lastResumedAt = null;
  next.stateVersion += 1;
  appendEvent(next, "paused", {});
  return next;
}

export function resumeGame(state: GameState, now = new Date().toISOString()): GameState {
  const next = structuredClone(state);
  if (next.status !== "paused") return next;
  next.status = "active";
  next.lastResumedAt = now;
  next.stateVersion += 1;
  appendEvent(next, "resumed", {});
  return next;
}

export function setTimeScale(state: GameState, definition: CaseDefinition, timeScale: GameState["timeScale"], now = new Date().toISOString()): GameState {
  const next = synchronizeGame(state, definition, now);
  if (next.status === "finished" || next.status === "awaiting_report") return next;
  if (next.timeScale === timeScale) return next;
  next.timeScale = timeScale;
  next.stateVersion += 1;
  appendEvent(next, "time_scale_changed", { timeScale });
  return next;
}

export function saveContent(state: GameState, contentId: string): GameState {
  const next = structuredClone(state);
  if (!next.revealedContentIds.includes(contentId)) throw new Error("内容尚未公开");
  if (!next.savedContentIds.includes(contentId)) next.savedContentIds.push(contentId);
  next.stateVersion += 1;
  return next;
}

export function publishComment(
  state: GameState,
  definition: CaseDefinition,
  input: { id: string; contentId: string; text: string; speechFeatures: SpeechFeatures; groupReactions: GroupReaction[] },
): GameState {
  const next = structuredClone(state);
  if (next.status === "finished") throw new Error("事件调查已经完成");
  if (next.selfMediaAccess === "blocked") throw new Error("自媒体平台正在受冲击，暂时无法发表评论");
  const content = definition.contents.find((item) => item.id === input.contentId);
  if (!content || !next.revealedContentIds.includes(content.id)) throw new Error("评论目标不存在或尚未公开");
  if (content.kind === "tv_news" || content.kind === "newspaper" || !content.commentsEnabled) throw new Error("该内容未开放评论");
  if (!input.text.trim()) throw new Error("评论不能为空");
  if (next.comments.some((comment) => comment.id === input.id)) return next;

  const reactions = input.groupReactions.filter((reaction) => next.groupStates[reaction.groupId]);
  const divisor = Math.max(1, reactions.length);
  const averageFrenzy = reactions.reduce((sum, item) => sum + clamp(item.eventFrenzy), 0) / divisor;
  const averageConflict = reactions.reduce((sum, item) => sum + clamp(item.stanceConflict), 0) / divisor;
  const averageTargeting = reactions.reduce((sum, item) => sum + clamp(item.targetingTendency), 0) / divisor;
  const forwarding = reactions.reduce((sum, item) => sum + (item.reactionIntents.includes("quote") ? 8 : 0) + (item.reactionIntents.includes("pile_on") ? 12 : 0), 0);
  const exposureGain = Math.max(1, Math.round((content.trafficWeight * 6 + input.speechFeatures.informationDensity * 0.12 + forwarding) * (0.5 + averageFrenzy / 100)));
  const controversyGain = Math.round((averageConflict / 100) * ((input.speechFeatures.certainty + input.speechFeatures.provocation + input.speechFeatures.aggression) / 3) * (0.4 + averageFrenzy / 100) * 0.35);
  const harassmentGain = Math.round(((next.exposure + exposureGain) / 100) * (averageFrenzy / 100) * (averageTargeting / 100) * 28 + input.speechFeatures.aggression * 0.04);

  next.exposure = clamp(next.exposure + exposureGain);
  next.controversy = clamp(next.controversy + controversyGain);
  next.harassment = clamp(next.harassment + harassmentGain);
  for (const reaction of reactions) {
    const group = next.groupStates[reaction.groupId];
    group.eventFrenzy = clamp(Math.max(group.eventFrenzy, reaction.eventFrenzy) + (reaction.reactionIntents.includes("pile_on") ? 3 : 0));
    group.lastUpdatedMinute = next.worldMinute;
  }
  updateAccess(next);
  next.comments.push({
    id: input.id,
    contentId: content.id,
    text: input.text.trim(),
    publishedAtMinute: next.worldMinute,
    speechFeatures: input.speechFeatures,
    groupReactions: reactions,
    exposureGain,
    controversyGain,
    harassmentGain,
  });
  next.stateVersion += 1;
  appendEvent(next, "comment_published", { commentId: input.id, contentId: content.id, exposureGain, controversyGain, harassmentGain });
  return next;
}

function platformContent(state: GameState, definition: CaseDefinition, contentId: string): ContentDefinition {
  const content = definition.contents.find((item) => item.id === contentId);
  if (!content || !state.revealedContentIds.includes(contentId)) throw new Error("内容不存在或尚未公开");
  if (content.kind === "tv_news" || content.kind === "newspaper") throw new Error("传统媒体内容不支持平台互动");
  return content;
}

export function toggleContentLike(state: GameState, definition: CaseDefinition, contentId: string): GameState {
  const next = structuredClone(state);
  platformContent(next, definition, contentId);
  next.engagements ??= [];
  const current = next.engagements.find((item) => item.contentId === contentId);
  const liked = !current?.liked;
  if (current) current.liked = liked;
  else next.engagements.push({ contentId, liked, repostedAtMinute: null });
  next.exposure = clamp(next.exposure + (liked ? 1 : -1));
  next.stateVersion += 1;
  appendEvent(next, "content_liked", { contentId, liked });
  return next;
}

export function repostContent(state: GameState, definition: CaseDefinition, contentId: string): GameState {
  const next = structuredClone(state);
  const content = platformContent(next, definition, contentId);
  next.engagements ??= [];
  const current = next.engagements.find((item) => item.contentId === contentId);
  if (current?.repostedAtMinute !== null && current?.repostedAtMinute !== undefined) throw new Error("这条内容已经转发过");
  if (current) current.repostedAtMinute = next.worldMinute;
  else next.engagements.push({ contentId, liked: false, repostedAtMinute: next.worldMinute });
  next.exposure = clamp(next.exposure + Math.max(2, Math.round(content.trafficWeight * 1.8)));
  next.controversy = clamp(next.controversy + Math.max(1, Math.round(content.trafficWeight / 5)));
  next.stateVersion += 1;
  appendEvent(next, "content_reposted", { contentId });
  return next;
}

export function setEvidence(state: GameState, entry: EvidenceEntry): GameState {
  const next = structuredClone(state);
  const index = next.evidence.findIndex((item) => item.factId === entry.factId);
  const normalized = { ...entry, confidence: clamp(entry.confidence) };
  if (index >= 0) next.evidence[index] = normalized;
  else next.evidence.push(normalized);
  next.stateVersion += 1;
  appendEvent(next, "evidence_updated", { factId: entry.factId });
  return next;
}

export function createInvestigationNote(state: GameState, note: Pick<InvestigationNote, "id" | "text" | "linkedContentIds">): GameState {
  const next = structuredClone(state);
  next.investigationNotes ??= [];
  const text = note.text.trim();
  if (!text) throw new Error("调查笔记不能为空");
  const visible = new Set(next.revealedContentIds);
  const linkedContentIds = [...new Set(note.linkedContentIds)].filter((id) => visible.has(id));
  if (next.investigationNotes.some((item) => item.id === note.id)) return next;
  next.investigationNotes.push({ id: note.id, text, linkedContentIds, createdAtMinute: next.worldMinute });
  next.stateVersion += 1;
  appendEvent(next, "note_created", { noteId: note.id, linkedContentIds });
  return next;
}

export function deleteInvestigationNote(state: GameState, noteId: string): GameState {
  const next = structuredClone(state);
  next.investigationNotes ??= [];
  const index = next.investigationNotes.findIndex((item) => item.id === noteId);
  if (index < 0) throw new Error("调查笔记不存在");
  next.investigationNotes.splice(index, 1);
  next.stateVersion += 1;
  appendEvent(next, "note_deleted", { noteId });
  return next;
}

function scoreReport(definition: CaseDefinition, analysis: ReportAnalysis): ScoreBreakdown {
  const criticalFacts = definition.facts.filter((fact) => fact.importance === "critical" && fact.truth !== "unknowable");
  let accurate = 0;
  let evidence = 0;
  let calibration = 0;
  for (const fact of criticalFacts) {
    const claim = analysis.claims.find((item) => item.factId === fact.id);
    if (!claim) continue;
    if (claim.judgment === fact.truth) accurate += 1;
    if (claim.citedContentIds.length > 0) evidence += Math.min(1, claim.citedContentIds.length / 2);
    const expectedConfidence = claim.judgment === fact.truth ? 80 : 20;
    calibration += 1 - Math.min(1, Math.abs(claim.confidence - expectedConfidence) / 100);
  }
  const divisor = Math.max(1, criticalFacts.length);
  const factAccuracy = Math.round((accurate / divisor) * 100);
  const evidenceQuality = Math.round((evidence / divisor) * 100);
  const confidenceCalibration = Math.round((calibration / divisor) * 100);
  return { factAccuracy, evidenceQuality, confidenceCalibration, total: Math.round(factAccuracy * 0.6 + evidenceQuality * 0.25 + confidenceCalibration * 0.15) };
}

export function submitReport(state: GameState, definition: CaseDefinition, text: string, analysis: ReportAnalysis, now = new Date().toISOString()): GameState {
  const next = structuredClone(state);
  if (next.status === "finished") return next;
  if (!text.trim()) throw new Error("调查报告不能为空");
  const report: FinalReport = { text: text.trim(), analysis, score: scoreReport(definition, analysis), submittedAt: now };
  next.report = report;
  next.status = "finished";
  next.lastResumedAt = null;
  next.stateVersion += 1;
  appendEvent(next, "report_submitted", { score: report.score.total });
  return next;
}

export function currentStage(definition: CaseDefinition, minute: number) {
  return [...definition.stages].reverse().find((stage) => stage.startsAtMinute <= minute) ?? definition.stages[0];
}

export function toPublicCaseSummary(definition: CaseDefinition): PublicCaseSummary {
  return { id: definition.id, version: definition.version, title: definition.title, synopsis: definition.synopsis, durationMinutes: definition.durationMinutes };
}

export function toPublicGameState(state: GameState, definition: CaseDefinition): PublicGameState {
  const { groupStates: _groupStates, events: _events, evidence: _evidence, ...publicState } = structuredClone(state);
  const visible = new Set(state.revealedContentIds);
  return {
    ...publicState,
    durationMinutes: definition.durationMinutes,
    investigationNotes: publicState.investigationNotes ?? [],
    currentStage: currentStage(definition, state.worldMinute),
    engagements: publicState.engagements ?? [],
    visibleContents: definition.contents.filter((item) => visible.has(item.id)).sort((a, b) => b.publishedAtMinute - a.publishedAtMinute).map((item) => ({ ...item, claims: [] })),
    sources: definition.sources.map(({ id, name, kind, publicDescription }) => ({ id, name, kind, publicDescription })),
  };
}

export function findContent(definition: CaseDefinition, contentId: string): ContentDefinition | null {
  return definition.contents.find((item) => item.id === contentId) ?? null;
}
