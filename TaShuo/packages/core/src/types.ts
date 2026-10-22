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
  editorial?: { materialIds: string[]; instructions: string };
  evidenceOriginIds?: string[];
}

export interface SourceMaterial {
  id: string;
  title: string;
  text: string;
  availableAtMinute: number;
  sourceIds: string[];
  originId: string;
}

export interface AccountDefinition {
  id: string;
  displayName: string;
  sourceId?: string;
  description: string;
  knownMaterialIds: string[];
  initialComments: Array<{ id: string; contentId: string; text: string; publishedAtMinute: number }>;
}

export interface PublicLeadDefinition {
  id: string;
  contentId: string;
  accountId: string;
  question: string;
  responseGuidance: string;
  responseMaterialIds: string[];
  unlockContentIds: string[];
  requiresLeadIds: string[];
  availableAtMinute: number;
  expiresAtMinute?: number;
}

export interface PublicationRecord {
  id: string;
  contentId: string;
  caseVersion: string;
  title: string;
  body: string;
  materialIds: string[];
  generatedAt: string;
  provider: string;
  model: string;
  promptVersion: string;
}

export interface PublicThreadComment {
  id: string;
  contentId: string;
  parentCommentId: string | null;
  accountId: string;
  displayName: string;
  text: string;
  publishedAtMinute: number;
  role: "player" | "account" | "crowd";
  triggeredByCommentId?: string;
}

export interface AccountResponse {
  accountId: string;
  text: string;
  leadId: string | null;
  materialIds: string[];
}

export interface PublicDiscovery {
  id: string;
  commentId: string;
  responseCommentId: string;
  contentIds: string[];
  discoveredAtMinute: number;
}

export interface CommentInput {
  contentId: string;
  text: string;
  parentCommentId?: string;
  targetAccountId?: string;
  citedContentIds?: string[];
}

/** Server-only resumable work. Never project inputs or role memory to a client. */
export interface PendingAgentTask {
  id: string;
  operation: "publication" | "comment" | "report";
  actionKey: string;
  action: Record<string, unknown>;
  resumeStatus: "active" | "paused" | "awaiting_report";
  leaseUntil: string;
  confirmationVersion?: number;
  confirmed?: boolean;
  commentId?: string;
  failure?: string;
  progress?: { speech?: SpeechFeatures; reactions?: GroupReaction[]; response?: AccountResponse | null; report?: ReportAnalysis;
    snapshot?: ReportAssessmentSnapshot; reportScore?: ScoreBreakdown; reportFeedback?: string };
}

export interface GenerationFailure {
  message: string;
  operation: "publication" | "comment" | "report";
  retryKey: string;
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
  materials?: SourceMaterial[];
  accounts?: AccountDefinition[];
  publicLeads?: PublicLeadDefinition[];
  reportRubric?: FactAssessmentRule[];
}

export interface FactAssessmentRule {
  factId: string;
  kind: "observation" | "causal" | "source";
  evidence: Array<{ contentId: string; originIds: string[]; role: "record" | "context" | "claim"; supportsJudgments?: Array<"true" | "false" | "partial"> }>;
  routes: Array<{ id: string; contentIds: string[]; acceptedJudgments: Array<"true" | "false" | "partial">; confidenceRange: [number, number]; explanation: string }>;
  counterContentIds?: string[];
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
  parentCommentId?: string;
  targetAccountId?: string;
  citedContentIds?: string[];
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
  confidence: number | null;
  confidenceQuote: string | null;
  citedContentIds: string[];
  quote: string;
  reasoning: "observation" | "mechanism" | "temporal_only" | "none";
  reasoningQuote: string | null;
  counterContentIds: string[];
  counterQuote: string | null;
  sourceRelation: "independent" | "shared" | "unspecified";
  sourceQuote: string | null;
}

export interface ReportAnalysis {
  summary: string;
  claims: ReportAnalysisClaim[];
  unresolvedQuestions: string[];
  parseConfidence: number;
  unmappedClaims: string[];
}

export interface ReportSnapshotMetadata {
  id: string;
  caseId: string;
  caseVersion: string;
  ruleVersion: string;
  worldMinute: number;
  stateVersion: number;
  capturedAt: string;
  evidenceVersions: Array<{ id: string; versionId: string }>;
}

export interface ReportEvidenceSnapshot {
  id: string;
  contentId: string;
  kind: "content" | "reply";
  versionId: string;
  title: string;
  text: string;
  sourceId: string | null;
  publishedAtMinute: number;
  originIds: string[];
  acquired: boolean;
}

/** Private scoring inputs, frozen when report processing starts. Never return rules to clients. */
export interface ReportAssessmentSnapshot extends ReportSnapshotMetadata {
  evidence: ReportEvidenceSnapshot[];
  rules: Array<FactAssessmentRule & { statement: string }>;
}

export interface ReportCoverage {
  availableQuestions: number;
  addressedQuestions: number;
  supportedConclusions: number;
  reservedQuestions: number;
  unexaminedQuestions: number;
  percentage: number;
}

export interface ReportClaimFeedback {
  factId: string | null;
  statement: string;
  quote: string;
  verdict: "supported" | "unsupported" | "contradicted" | "reserved" | "unassessable" | "duplicate";
  citedContentIds: string[];
  independentOriginCount: number;
  confidenceRange: [number, number] | null;
  reasons: Array<{ code: string; message: string; contentIds: string[] }>;
}

export interface ScoreBreakdown {
  factAccuracy: number | null;
  evidenceQuality: number | null;
  timelineCausality: number | null;
  contradictionHandling: number | null;
  confidenceCalibration: number | null;
  sourceAnalysis: number | null;
  total: number | null;
  ruleVersion: string;
  coverage: ReportCoverage;
  feedback: ReportClaimFeedback[];
}

export interface FinalReport {
  text: string;
  analysis: ReportAnalysis;
  score: ScoreBreakdown;
  submittedAt: string;
  snapshot: ReportSnapshotMetadata;
  feedback?: string;
}

export interface GameEvent {
  id: string;
  sequence: number;
  type: "content_revealed" | "paused" | "resumed" | "time_scale_changed" | "comment_published" | "content_liked" | "content_reposted" | "evidence_updated" | "note_created" | "note_deleted" | "report_submitted" | "public_response";
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
  /** Server-only frozen evidence and rules, retained after the pending report task ends. */
  reportAssessmentSnapshot: ReportAssessmentSnapshot | null;
  events: GameEvent[];
  publications?: PublicationRecord[];
  accountReplies?: Array<PublicThreadComment & { materialIds: string[]; leadId: string | null }>;
  discoveries?: Array<PublicDiscovery & { leadId: string }>;
  pendingAgentTask?: PendingAgentTask | null;
}

export interface PublicCaseSummary {
  id: string;
  version: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
}

export type PublicContent = Pick<ContentDefinition, "id" | "sourceId" | "kind" | "publishedAtMinute" | "title" | "body" | "commentsEnabled"> & { versionId: string };

export interface PublicGameState extends Omit<GameState, "groupStates" | "events" | "evidence" | "publications" | "accountReplies" | "discoveries" | "pendingAgentTask" | "reportAssessmentSnapshot" | "comments"> {
  comments: Array<Omit<PlayerComment, "speechFeatures" | "groupReactions">>;
  threadComments: PublicThreadComment[];
  discoveries: PublicDiscovery[];
  generationFailure: GenerationFailure | null;
  agentBusy: boolean;
  durationMinutes: number;
  currentStage: CaseStage;
  visibleContents: PublicContent[];
  sources: Array<Pick<SourceDefinition, "id" | "name" | "kind" | "publicDescription">>;
}
