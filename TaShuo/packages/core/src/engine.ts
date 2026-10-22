import { randomUUID } from "node:crypto";
import type {
  CaseDefinition, ContentDefinition, EvidenceEntry, FinalReport, GameEvent, GameState,
  GroupReaction, InvestigationNote, PlatformEngagement, PublicCaseSummary, PublicGameState, ReportAnalysis, SpeechFeatures,
  PublicContent, PublicThreadComment, CommentInput, AccountResponse, ReportAssessmentSnapshot, ReportEvidenceSnapshot,
} from "./types.js";
import { REPORT_SCORING_VERSION, scoreReport } from "./scoring.js";

const clamp = (value: number, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));

function appendEvent(state: GameState, type: GameEvent["type"], payload: Record<string, unknown>): void {
  state.lastEventSequence += 1;
  state.events.push({ id: randomUUID(), sequence: state.lastEventSequence, type, gameMinute: state.worldMinute, payload });
}

function revealDueContent(state: GameState, definition: CaseDefinition): void {
  const revealed = new Set(state.revealedContentIds);
  const unlocked = new Set(state.discoveries?.flatMap((item) => item.contentIds) ?? []);
  for (const content of [...definition.contents].sort((a, b) => a.publishedAtMinute - b.publishedAtMinute)) {
    const ready = !content.editorial || state.publications?.some((item) => item.contentId === content.id);
    if (ready && (content.publishedAtMinute <= state.worldMinute || unlocked.has(content.id)) && !revealed.has(content.id)) {
      state.revealedContentIds.push(content.id);
      revealed.add(content.id);
      appendEvent(state, "content_revealed", { contentId: content.id });
      state.events[state.events.length - 1].gameMinute = unlocked.has(content.id) ? state.worldMinute : content.publishedAtMinute;
    }
  }
}

function updateAccess(state: GameState): void {
  state.selfMediaAccess = state.harassment >= 70 ? "blocked" : state.harassment >= 35 ? "degraded" : "available";
}

function decayPressure(state: GameState, previousMinute: number): void {
  // Settle elapsed boundaries, preserving partial intervals between client polls.
  const intervals = Math.floor((state.worldMinute + 1e-8) / 10) - Math.floor((previousMinute + 1e-8) / 10);
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
    reportAssessmentSnapshot: null,
    events: [],
    publications: [],
    accountReplies: [],
    discoveries: [],
    pendingAgentTask: null,
  };
  revealDueContent(state, definition);
  return state;
}

export function synchronizeGame(state: GameState, definition: CaseDefinition, now = new Date().toISOString()): GameState {
  const next = structuredClone(state);
  next.timeScale ??= 1;
  if (next.status !== "active" || !next.lastResumedAt || next.pendingAgentTask) return next;
  const elapsedSeconds = Math.max(0, (Date.parse(now) - Date.parse(next.lastResumedAt)) / 1000);
  const elapsedMinutes = (elapsedSeconds / definition.realSecondsPerGameMinute) * next.timeScale;
  if (elapsedMinutes <= 0) return next;
  const previousMinute = next.worldMinute;
  const nextUnwritten = definition.contents.filter((item) => item.editorial && !next.publications?.some((draft) => draft.contentId === item.id))
    .reduce((minute, item) => Math.min(minute, Math.max(next.worldMinute, item.publishedAtMinute)), definition.durationMinutes);
  next.worldMinute = Math.min(definition.durationMinutes, next.worldMinute + elapsedMinutes, nextUnwritten);
  next.lastResumedAt = now;
  decayPressure(next, previousMinute);
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
  if (next.status !== "paused" || next.pendingAgentTask) return next;
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

export function saveContent(state: GameState, contentId: string, definition?: CaseDefinition): GameState {
  const next = structuredClone(state);
  if (!next.revealedContentIds.includes(contentId)) throw new Error("内容尚未公开");
  const content = definition?.contents.find((item) => item.id === contentId);
  if (next.selfMediaAccess === "blocked" && !next.savedContentIds.includes(contentId) && content?.kind !== "tv_news" && content?.kind !== "newspaper") throw new Error("平台受冲击期间不能收藏尚不可读的材料");
  if (!next.savedContentIds.includes(contentId)) next.savedContentIds.push(contentId);
  next.stateVersion += 1;
  return next;
}

export function publishComment(
  state: GameState,
  definition: CaseDefinition,
  input: CommentInput & { id: string; speechFeatures: SpeechFeatures; groupReactions: GroupReaction[] },
): GameState {
  const next = structuredClone(state);
  if (next.status === "finished") throw new Error("事件调查已经完成");
  if (next.selfMediaAccess === "blocked") throw new Error("自媒体平台正在受冲击，暂时无法发表评论");
  const content = definition.contents.find((item) => item.id === input.contentId);
  if (!content || !next.revealedContentIds.includes(content.id)) throw new Error("评论目标不存在或尚未公开");
  if (content.kind === "tv_news" || content.kind === "newspaper" || !content.commentsEnabled) throw new Error("该内容未开放评论");
  if (!input.text.trim()) throw new Error("评论不能为空");
  validateCommentTarget(next, definition, input);
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
    parentCommentId: input.parentCommentId,
    targetAccountId: input.targetAccountId,
    citedContentIds: input.citedContentIds ?? [],
  });
  next.stateVersion += 1;
  appendEvent(next, "comment_published", { commentId: input.id, contentId: content.id, exposureGain, controversyGain, harassmentGain });
  return next;
}

function platformContent(state: GameState, definition: CaseDefinition, contentId: string): ContentDefinition {
  const content = definition.contents.find((item) => item.id === contentId);
  if (!content || !state.revealedContentIds.includes(contentId)) throw new Error("内容不存在或尚未公开");
  if (content.kind === "tv_news" || content.kind === "newspaper") throw new Error("传统媒体内容不支持平台互动");
  if (state.selfMediaAccess === "blocked") throw new Error("自媒体平台正在受冲击，暂时无法互动");
  if (state.pendingAgentTask) throw new Error("当前任务正在处理，请稍候再互动");
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

export function createReportSnapshot(state: GameState, definition: CaseDefinition, now = new Date().toISOString()): ReportAssessmentSnapshot {
  if (state.caseId !== definition.id || state.caseVersion !== definition.version) throw new Error("报告快照与事件版本不匹配");
  const acquired = new Set([...state.savedContentIds, ...state.investigationNotes.flatMap((item) => item.linkedContentIds),
    ...state.comments.flatMap((item) => item.citedContentIds ?? []), ...state.evidence.flatMap((item) => [...item.supportingContentIds, ...item.opposingContentIds])]);
  const readable = publicContents(state, definition).filter((item) => state.selfMediaAccess !== "blocked" || item.kind === "tv_news" || item.kind === "newspaper" || state.savedContentIds.includes(item.id));
  const contentIds = new Set(readable.map((item) => item.id));
  const evidence: ReportEvidenceSnapshot[] = readable.map((item) => {
    const source = definition.contents.find((entry) => entry.id === item.id)!;
    const materialIds = state.publications?.find((entry) => entry.contentId === item.id)?.materialIds ?? source.editorial?.materialIds ?? [];
    const materialOrigins = definition.materials?.filter((entry) => materialIds.includes(entry.id)).map((entry) => entry.originId) ?? [];
    const origins = source.editorial ? materialOrigins : source.evidenceOriginIds ?? materialOrigins;
    return { id: item.id, contentId: item.id, kind: "content", versionId: item.versionId, title: item.title, text: item.body,
      sourceId: item.sourceId, publishedAtMinute: item.publishedAtMinute, originIds: [...new Set(origins)], acquired: acquired.has(item.id) };
  });
  for (const reply of publicThread(state, definition).filter((item) => item.role !== "player" && contentIds.has(item.contentId))) {
    const materialIds = state.accountReplies?.find((entry) => entry.id === reply.id)?.materialIds ?? [];
    const origins = definition.materials?.filter((item) => materialIds.includes(item.id)).map((item) => item.originId) ?? [];
    evidence.push({ id: reply.id, contentId: reply.contentId, kind: "reply", versionId: `${definition.version}:${reply.id}:1`,
      title: `${reply.displayName}的公开回复`, text: reply.text, sourceId: definition.accounts?.find((account) => account.id === reply.accountId)?.sourceId ?? null,
      publishedAtMinute: reply.publishedAtMinute, originIds: [...new Set(origins)], acquired: acquired.has(reply.id) });
  }
  const rules = (definition.reportRubric ?? []).flatMap((rule) => {
    const availableEvidence = rule.evidence.filter((entry) => contentIds.has(entry.contentId));
    const fact = definition.facts.find((item) => item.id === rule.factId);
    if (!availableEvidence.length || !fact) return [];
    return [{ ...rule, statement: fact.statement, evidence: availableEvidence,
      routes: rule.routes.filter((route) => route.contentIds.length > 0 && route.contentIds.every((id) => contentIds.has(id))),
      counterContentIds: (rule.counterContentIds ?? []).filter((id) => contentIds.has(id)) }];
  });
  return structuredClone({ id: randomUUID(), caseId: definition.id, caseVersion: definition.version, ruleVersion: REPORT_SCORING_VERSION,
    worldMinute: state.worldMinute, stateVersion: state.stateVersion, capturedAt: now,
    evidenceVersions: evidence.map(({ id, versionId }) => ({ id, versionId })), evidence, rules });
}

export function submitReport(state: GameState, definition: CaseDefinition, text: string, analysis: ReportAnalysis, now = new Date().toISOString(), assessmentSnapshot?: ReportAssessmentSnapshot): GameState {
  const next = structuredClone(state);
  if (next.status === "finished") return next;
  if (!text.trim()) throw new Error("调查报告不能为空");
  const frozen = assessmentSnapshot ?? createReportSnapshot(state, definition, now);
  if (frozen.caseId !== state.caseId || frozen.caseVersion !== state.caseVersion) throw new Error("报告快照与事件版本不匹配");
  const { evidence: _evidence, rules: _rules, ...metadata } = frozen;
  const report: FinalReport = { text: text.trim(), analysis: structuredClone(analysis), score: scoreReport(frozen, analysis), submittedAt: now, snapshot: structuredClone(metadata) };
  next.report = report;
  next.reportAssessmentSnapshot = structuredClone(frozen);
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
  const { groupStates: _groupStates, events: _events, evidence: _evidence, publications: _publications,
    accountReplies: _accountReplies, discoveries: _discoveries, reportAssessmentSnapshot: _reportAssessmentSnapshot,
    pendingAgentTask: task, comments, ...publicState } = structuredClone(state);
  const stalled = task && (task.failure || Date.parse(task.leaseUntil) <= Date.now());
  return {
    ...publicState,
    comments: comments.map(({ speechFeatures: _speech, groupReactions: _reactions, ...comment }) => comment),
    threadComments: publicThread(state, definition),
    discoveries: (state.discoveries ?? []).map(({ leadId: _leadId, ...item }) => ({ ...item, contentIds: item.contentIds.filter((id) => state.revealedContentIds.includes(id)) })),
    generationFailure: stalled ? { message: task.failure ?? "上次处理未完成，可以继续原任务。", operation: task.operation, retryKey: task.actionKey } : null,
    agentBusy: Boolean(task && !stalled),
    durationMinutes: definition.durationMinutes,
    investigationNotes: publicState.investigationNotes ?? [],
    currentStage: currentStage(definition, state.worldMinute),
    engagements: publicState.engagements ?? [],
    visibleContents: publicContents(state, definition).map((item) => state.selfMediaAccess === "blocked" && item.kind !== "tv_news" && item.kind !== "newspaper" && !state.savedContentIds.includes(item.id) ? { ...item, body: "" } : item),
    sources: definition.sources.map(({ id, name, kind, publicDescription }) => ({ id, name, kind, publicDescription })),
  };
}

export function publicContents(state: GameState, definition: CaseDefinition): PublicContent[] {
  return definition.contents.filter((item) => state.revealedContentIds.includes(item.id))
    .flatMap((item): PublicContent[] => {
      const publication = state.publications?.find((draft) => draft.contentId === item.id);
      if (item.editorial && !publication) return [];
      const discovery = state.discoveries?.find((lead) => lead.contentIds.includes(item.id));
      return [{ id: item.id, sourceId: item.sourceId, kind: item.kind,
        publishedAtMinute: discovery ? Math.min(item.publishedAtMinute, discovery.discoveredAtMinute) : item.publishedAtMinute,
        title: publication?.title ?? item.title, body: publication?.body ?? item.body,
        commentsEnabled: item.kind !== "tv_news" && item.kind !== "newspaper" && item.commentsEnabled,
        versionId: publication?.id ?? `${definition.version}:${item.id}:1` }];
    }).sort((a, b) => b.publishedAtMinute - a.publishedAtMinute);
}

export function publicThread(state: GameState, definition: CaseDefinition): PublicThreadComment[] {
  const visible = new Set(publicContents(state, definition).map((item) => item.id));
  const thread: PublicThreadComment[] = (definition.accounts ?? []).flatMap((account) => account.initialComments
    .filter((comment) => visible.has(comment.contentId) && comment.publishedAtMinute <= state.worldMinute)
    .map((comment) => ({ ...comment, accountId: account.id, displayName: account.displayName, parentCommentId: null, role: "account" as const })));
  for (const comment of state.comments) {
    thread.push({ id: comment.id, contentId: comment.contentId, text: comment.text, accountId: "player", displayName: "你", role: "player", parentCommentId: comment.parentCommentId ?? null, publishedAtMinute: comment.publishedAtMinute });
    for (const [groupIndex, group] of comment.groupReactions.entries()) for (const [index, reply] of group.replies.entries()) {
      thread.push({ id: `${comment.id}:crowd:${groupIndex}:${index}`, contentId: comment.contentId, parentCommentId: comment.id,
        accountId: `crowd:${group.groupId}:${reply.accountId}`, displayName: reply.displayName, text: reply.text,
        publishedAtMinute: comment.publishedAtMinute, role: "crowd", triggeredByCommentId: comment.id });
    }
  }
  thread.push(...(state.accountReplies ?? []).map(({ leadId: _leadId, materialIds: _materialIds, ...reply }) => reply));
  return thread.filter((item) => visible.has(item.contentId) && (state.selfMediaAccess !== "blocked" || state.savedContentIds.includes(item.contentId)))
    .sort((a, b) => a.publishedAtMinute - b.publishedAtMinute);
}

export function validateCommentTarget(state: GameState, definition: CaseDefinition, input: CommentInput): void {
  const content = definition.contents.find((item) => item.id === input.contentId);
  if (!content || !state.revealedContentIds.includes(content.id)) throw new Error("评论目标不存在或尚未公开");
  if (!content.commentsEnabled || content.kind === "tv_news" || content.kind === "newspaper") throw new Error("该内容未开放评论");
  if (state.selfMediaAccess === "blocked") throw new Error("自媒体平台正在受冲击，暂时无法发表评论");
  const parent = input.parentCommentId ? publicThread(state, definition).find((item) => item.id === input.parentCommentId && item.contentId === content.id) : undefined;
  if (input.parentCommentId && !parent) throw new Error("回复楼层不存在或不可见");
  if (input.targetAccountId && !(definition.accounts ?? []).some((account) => account.id === input.targetAccountId &&
    (parent?.accountId === account.id || account.sourceId === content.sourceId || account.initialComments.some((item) => item.contentId === content.id && item.publishedAtMinute <= state.worldMinute)))) throw new Error("目标账号未参与该公开讨论");
  if (input.citedContentIds?.some((id) => !publicContents(state, definition).some((item) => item.id === id))) throw new Error("引用材料尚未公开");
}

export function eligiblePublicLeads(state: GameState, definition: CaseDefinition, contentId: string, accountId: string) {
  const found = new Set(state.discoveries?.map((item) => item.leadId) ?? []);
  return (definition.publicLeads ?? []).filter((lead) => lead.contentId === contentId && lead.accountId === accountId && !found.has(lead.id)
    && lead.availableAtMinute <= state.worldMinute && (lead.expiresAtMinute === undefined || lead.expiresAtMinute > state.worldMinute)
    && lead.requiresLeadIds.every((id) => found.has(id)));
}

export function recordAccountResponse(state: GameState, definition: CaseDefinition, commentId: string, response: AccountResponse): GameState {
  const next = structuredClone(state);
  const comment = next.comments.find((item) => item.id === commentId);
  const account = definition.accounts?.find((item) => item.id === response.accountId);
  if (!comment || !account) throw new Error("公开回复缺少对应评论或账号");
  if (next.accountReplies?.some((item) => item.triggeredByCommentId === commentId)) return next;
  const lead = response.leadId ? eligiblePublicLeads(next, definition, comment.contentId, account.id).find((item) => item.id === response.leadId) : null;
  if (response.leadId && !lead) throw new Error("公开补充条件未满足");
  const disclosedMaterialIds = new Set([
    ...(lead?.responseMaterialIds ?? []),
    ...(next.accountReplies ?? []).filter((item) => item.accountId === account.id).flatMap((item) => item.materialIds),
  ]);
  if (response.materialIds.some((id) => !disclosedMaterialIds.has(id))) throw new Error("账号引用超出本轮公开授权");
  if (response.materialIds.some((id) => !account.knownMaterialIds.includes(id) || !definition.materials?.some((item) => item.id === id && item.availableAtMinute <= next.worldMinute && account.sourceId && item.sourceIds.includes(account.sourceId)))) throw new Error("账号引用超出知情范围");
  const responseId = `${commentId}:account`;
  next.accountReplies ??= [];
  next.accountReplies.push({ id: responseId, contentId: comment.contentId, parentCommentId: commentId, accountId: account.id,
    displayName: account.displayName, text: response.text, publishedAtMinute: next.worldMinute, role: "account", triggeredByCommentId: commentId,
    leadId: response.leadId, materialIds: response.materialIds });
  if (lead) {
    next.discoveries ??= [];
    next.discoveries.push({ id: `${commentId}:discovery`, leadId: lead.id, commentId, responseCommentId: responseId, contentIds: [...lead.unlockContentIds], discoveredAtMinute: next.worldMinute });
    revealDueContent(next, definition);
  }
  next.stateVersion += 1;
  appendEvent(next, "public_response", { commentId, responseCommentId: responseId, contentIds: lead?.unlockContentIds ?? [] });
  return next;
}

export function revealPreparedContent(state: GameState, definition: CaseDefinition): GameState {
  const next = structuredClone(state);
  revealDueContent(next, definition);
  return next;
}

export function findContent(definition: CaseDefinition, contentId: string): ContentDefinition | null {
  return definition.contents.find((item) => item.id === contentId) ?? null;
}
