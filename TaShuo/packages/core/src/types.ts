export type SourceKind = "tv" | "newspaper" | "self_media" | "official" | "resident";
export type ContentKind = "tv_news" | "newspaper" | "post" | "short_video" | "official_notice";
export type MisleadingTechnique =
  | "fabrication"
  | "selective_context"
  | "causal_reversal"
  | "time_mismatch"
  | "subject_substitution"
  | "certainty_inflation"
  | "headline_mismatch"
  | "edited_context"
  | "circular_citation"
  | "outdated_fact";

export interface CaseStage {
  id: "breaking" | "spreading" | "polarizing" | "follow_up" | "cooling";
  name: string;
  startsAtMinute: number;
}

export interface CaseFact {
  id: string;
  statement: string;
  truth: "true" | "false" | "partial" | "unknowable";
  importance: "critical" | "supporting";
  explanation: string;
}

export interface SourceDefinition {
  id: string;
  name: string;
  kind: SourceKind;
  publicDescription: string;
  agenda: string;
  knownFactIds: string[];
}

export interface ContentClaim {
  factId: string;
  relation: "supports" | "denies" | "speculates";
}

export interface ContentDefinition {
  id: string;
  sourceId: string;
  kind: ContentKind;
  publishedAtMinute: number;
  title: string;
  body: string;
  claims: ContentClaim[];
  misleadingTechniques: MisleadingTechnique[];
  commentsEnabled: boolean;
  trafficWeight: number;
}

export interface GroupDefinition {
  id: string;
  name: string;
  description: string;
  initialFrenzy: number;
  attention: number;
  exclusivity: number;
  dissentSensitivity: number;
  mobilization: number;
  persistence: number;
  narrativeFactIds: string[];
}

export interface CaseDefinition {
  id: string;
  version: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
  realSecondsPerGameMinute: number;
  stages: CaseStage[];
  facts: CaseFact[];
  sources: SourceDefinition[];
  contents: ContentDefinition[];
  groups: GroupDefinition[];
}

export interface SpeechFeatures {
  id: string;
  expressionType: "fact" | "inference" | "question" | "sarcasm" | "emotion";
  targetIds: string[];
  supportedFactIds: string[];
  deniedFactIds: string[];
  certainty: number;
  aggression: number;
  provocation: number;
  informationDensity: number;
  citedContentIds: string[];
  confidence: number;
}

export type ReactionIntent = "like" | "reply" | "challenge" | "quote" | "report" | "pile_on";

export interface GroupReaction {
  groupId: string;
  eventFrenzy: number;
  stanceConflict: number;
  targetingTendency: number;
  reactionIntents: ReactionIntent[];
  reasonIds: string[];
  replies: Array<{ accountId: string; displayName: string; text: string }>;
}

export interface GroupRuntimeState extends Omit<GroupDefinition, "initialFrenzy" | "narrativeFactIds" | "description"> {
  eventFrenzy: number;
  lastUpdatedMinute: number;
}

export interface PlayerComment {
  id: string;
  contentId: string;
  text: string;
  publishedAtMinute: number;
  speechFeatures: SpeechFeatures;
  groupReactions: GroupReaction[];
  exposureGain: number;
  controversyGain: number;
  harassmentGain: number;
}

export interface EvidenceEntry {
  factId: string;
  judgment: "true" | "false" | "partial" | "unknown";
  confidence: number;
  supportingContentIds: string[];
  opposingContentIds: string[];
  note: string;
}

export interface InvestigationNote {
  id: string;
  text: string;
  createdAtMinute: number;
  linkedContentIds: string[];
}

export interface PlatformEngagement {
  contentId: string;
  liked: boolean;
  repostedAtMinute: number | null;
}

export interface ReportAnalysisClaim {
  factId: string;
  judgment: EvidenceEntry["judgment"];
  confidence: number;
  citedContentIds: string[];
}

export interface ReportAnalysis {
  summary: string;
  claims: ReportAnalysisClaim[];
  unresolvedQuestions: string[];
}

export interface ScoreBreakdown {
  factAccuracy: number;
  evidenceQuality: number;
  confidenceCalibration: number;
  total: number;
}

export interface FinalReport {
  text: string;
  analysis: ReportAnalysis;
  score: ScoreBreakdown;
  submittedAt: string;
}

export interface GameEvent {
  id: string;
  sequence: number;
  type: "content_revealed" | "paused" | "resumed" | "time_scale_changed" | "comment_published" | "content_liked" | "content_reposted" | "evidence_updated" | "note_created" | "note_deleted" | "report_submitted";
  gameMinute: number;
  payload: Record<string, unknown>;
}

export interface GameState {
  id: string;
  ownerUserId: string;
  caseId: string;
  caseVersion: string;
  status: "active" | "paused" | "awaiting_report" | "finished";
  timeScale: 1 | 10 | 100;
  worldMinute: number;
  lastResumedAt: string | null;
  stateVersion: number;
  lastEventSequence: number;
  revealedContentIds: string[];
  savedContentIds: string[];
  comments: PlayerComment[];
  engagements: PlatformEngagement[];
  groupStates: Record<string, GroupRuntimeState>;
  exposure: number;
  controversy: number;
  harassment: number;
  selfMediaAccess: "available" | "degraded" | "blocked";
  evidence: EvidenceEntry[];
  investigationNotes: InvestigationNote[];
  report: FinalReport | null;
  events: GameEvent[];
}

export interface PublicCaseSummary {
  id: string;
  version: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
}

export interface PublicGameState extends Omit<GameState, "groupStates" | "events" | "evidence"> {
  durationMinutes: number;
  currentStage: CaseStage;
  visibleContents: ContentDefinition[];
  sources: Array<Pick<SourceDefinition, "id" | "name" | "kind" | "publicDescription">>;
}
