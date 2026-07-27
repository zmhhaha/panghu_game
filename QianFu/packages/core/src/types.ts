export type GameStatus = "active" | "paused" | "finished" | "abandoned";
export type EndingType =
  | "complete_success"
  | "costly_success"
  | "partial_success"
  | "intelligence_failure"
  | "mission_failure"
  | "network_collapse"
  | "player_terminated";

export type AgentTier = "focus" | "active" | "background" | "dormant";
export type CoverWorkStatus = "awaiting_shift" | "working" | "on_leave" | "unexcused_absence";
export type CoverProfileId = "archive_clerk" | "travelling_merchant" | "freelance_writer";
export type CoverWorkKind = "file_sorting" | "duty_shift" | "submit_report" | "settle_accounts" | "visit_clients" | "stock_check" | "submit_column" | "street_research" | "proofread_copy";
export type LeaveReason = "family" | "health" | "official";
export type RecruitmentTestType = "background_check" | "controlled_leak" | "discipline_check" | "low_risk_task";
export type RecruitmentEvidenceResult = "favorable" | "warning" | "inconclusive";
export type RecruitmentStage = "contact" | "screening" | "ready" | "recruited";

export interface RecruitmentEvidence {
  id: string;
  testType: RecruitmentTestType;
  result: RecruitmentEvidenceResult;
  summary: string;
  observedAt: string;
  plan: RecruitmentPlan;
}

export interface RecruitmentPlan {
  objective: string;
  steps: string;
  safeguards: string;
  abortCondition: string;
}

export interface RecruitmentCase {
  stage: RecruitmentStage;
  completedTestTypes: RecruitmentTestType[];
  evidence: RecruitmentEvidence[];
}

export interface CoverObservation {
  id: string;
  type: "work_completed" | "leave_approved" | "absence_recorded" | "supervisor_check";
  summary: string;
  observedAt: string;
}

export interface CoverState {
  profileId: CoverProfileId;
  workStatus: CoverWorkStatus;
  credibility: number;
  supervisorSuspicion: number;
  consecutiveAbsences: number;
  leaveCount: number;
  completedWorkDates: string[];
  lastAttendanceEvaluatedDate: string | null;
  leaveUntil: string | null;
  leaveReason: LeaveReason | null;
  lastWorkAt: string | null;
  observations: CoverObservation[];
}

export interface DifficultyConfig {
  id: "story" | "undercover" | "iron_curtain";
  intelClarity: number;
  deadlineMultiplier: number;
  enemyResponseSpeed: number;
  npcAutonomy: number;
  recruitEvidenceRate: number;
  deceptionFrequency: number;
  recoveryAllowance: number;
  dialogueAssistLevel: number;
}

export interface LocationDefinition {
  id: string;
  name: string;
  district: string;
  travelMinutes: Record<string, number>;
}

export interface ScheduleEntry {
  startMinute: number;
  endMinute: number;
  locationId: string;
  activity: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  publicIdentity: string;
  hiddenAlignment: "organization" | "enemy" | "neutral" | "variable";
  initialLocationId: string;
  recruitable: boolean;
  schedule: ScheduleEntry[];
  reliability: {
    loyalty: number;
    discipline: number;
    pressureResistance: number;
    courage: number;
    competence: number;
  };
  personality?: {
    traits: string[];
    speechStyle: string;
    values: string[];
    fears: string[];
    verbalHabits: string[];
    sensitiveTopics: string[];
    roleplay?: {
      background: string;
      socialMask: string;
      currentPressure: string;
      conversationalMotives: string[];
      boundaries: string[];
    };
  };
}

export interface DialogueMemory {
  characterId: string;
  summary: string;
  lastPrivateIntent: string | null;
  turns: Array<{ speaker: "player" | "npc"; text: string; at: string }>;
  lastGoal: DialogueGoal | null;
  interactionCount: number;
}

export interface DialogueSession {
  id: string;
  characterId: string;
  goal: DialogueGoal;
  tone: DialogueTone;
  targetIntelId: string | null;
  allocatedMinutes: number;
  elapsedMinutes: number;
  maxTurns: number;
  turnCount: number;
  status: "active" | "completed";
  transcript: Array<{ speaker: "player" | "npc" | "system"; text: string; at: string }>;
}

export interface IntelDefinition {
  id: string;
  title: string;
  truth: "true" | "false" | "partial";
  requiredFields: string[];
  fieldLabels?: Record<string, string>;
  sourceCharacterIds: string[];
  sourceOrigins?: Record<string, string>;
  expiresAt: string;
}

export interface MissionObjective {
  id: string;
  required: boolean;
  deadline: string;
  requiredIntelIds: string[];
  minimumConfidence: number;
  acceptedDeliveryMethods: string[];
  recipientId: string;
}

export interface CampaignLead {
  id: string;
  trigger: "cover_work" | "dialogue_discovery";
  profileId?: CoverProfileId;
  workKind?: CoverWorkKind;
  characterId?: string;
  locationIds: string[];
  characterIds: string[];
  hint: string;
}

export interface CampaignDefinition {
  id: string;
  version: string;
  engineVersion: string;
  name: string;
  startTime: string;
  locations: LocationDefinition[];
  characters: CharacterDefinition[];
  intel: IntelDefinition[];
  objectives: MissionObjective[];
  publicLeads?: CampaignLead[];
}

export interface CharacterState {
  id: string;
  templateId: string;
  locationId: string;
  stress: number;
  suspicionOfPlayer: number;
  familiarity: number;
  privateTrust: number;
  interestDependency: number;
  politicalAffinity: number;
  recruited: boolean;
  recruitmentProgress: number;
  recruitmentCase: RecruitmentCase;
  exposed: boolean;
  agentTier: AgentTier;
}

export interface IntelState {
  id: string;
  knownFields: string[];
  confidence: number;
  collectedSourceIds: string[];
  evidence: IntelEvidence[];
  deliveredFields: string[];
  deliveredAt: string | null;
  deliveryMethod: string | null;
}

export interface CoverProfileDefinition {
  id: CoverProfileId;
  title: string;
  summary: string;
  routineLabel: string;
  startingLocationId: string;
  workLocationIds: string[];
  workHours: { startMinute: number; endMinute: number } | null;
  workKinds: CoverWorkKind[];
  initialContactCharacterIds: string[];
}

export type IntelEvidenceAssessment = "unverified" | "corroborates" | "contradicts" | "dependent";
export type IntelEvidenceSourceType = "testimony" | "document" | "observation" | "comrade_report";

export interface IntelEvidence {
  id: string;
  field: string;
  sourceId: string;
  sourceLabel: string;
  sourceType: IntelEvidenceSourceType;
  upstreamSourceId: string;
  assessment: IntelEvidenceAssessment;
  summary: string;
  collectedAt: string;
}

export type RadioMessageFormat = "compressed" | "full";
export type RadioTiming = "scheduled" | "immediate";
export type RadioReceiptStatus = "pending" | "confirmed" | "partial" | "no_receipt";

export interface RadioCodebookState {
  id: "one_time_pad" | "book_cipher";
  usageCount: number;
  usesRemaining: number | null;
  lastUsedAt: string | null;
}

export interface RadioMessageItem {
  intelId: string;
  fields: string[];
}

export interface RadioTransmission {
  id: string;
  items: RadioMessageItem[];
  format: RadioMessageFormat;
  codebookId: RadioCodebookState["id"];
  timing: RadioTiming;
  locationId: string;
  fieldCount: number;
  durationMinutes: number;
  sentAt: string;
  completedAt: string;
  receiptDueAt: string;
  receiptStatus: RadioReceiptStatus;
  receiptSummary: string;
}

export interface RadioState {
  codebooks: RadioCodebookState[];
  transmissions: RadioTransmission[];
}

export type ComradeTaskKind = "gather_intel" | "verify_intel" | "scout_location";
export type ComradeTaskApproach = "cautious" | "balanced" | "urgent";
export type ComradeTaskStatus = "active" | "completed" | "failed" | "cancelled";

export interface ComradeTask {
  id: string;
  memberId: string;
  kind: ComradeTaskKind;
  targetId: string;
  approach: ComradeTaskApproach;
  status: ComradeTaskStatus;
  assignedAt: string;
  dueAt: string;
  completedAt: string | null;
  report: string | null;
}

export interface NetworkState {
  exposure: number;
  activeMemberIds: string[];
  compromisedMemberIds: string[];
  availableChannels: string[];
  tasks: ComradeTask[];
}

export interface InvestigationEvidence {
  type: "extended_contact" | "covert_observation" | "radio_signal" | "courier_pattern" | "sensitive_notes";
  locationId: string;
  weight: number;
  observedAt: string;
  processed: boolean;
}

export interface EnemyInvestigationState {
  pressure: number;
  locationHeat: Record<string, number>;
  surveillanceLocationIds: string[];
  evidence: InvestigationEvidence[];
  lastActionAt: string | null;
}

export interface ScoreBreakdown {
  mission: number;
  intelligence: number;
  network: number;
  cover: number;
  efficiency: number;
  total: number;
  grade: "S" | "A" | "B" | "C" | "D" | "E";
}

export interface CampaignEnding {
  type: EndingType;
  title: string;
  reasons: string[];
  score: ScoreBreakdown;
}

export interface CampaignReportTimelineEntry {
  eventSeq: number;
  occurredAt: string;
  type: string;
  title: string;
  detail: string;
}

export interface CampaignReportIntelItem {
  id: string;
  title: string;
  fieldLabels: Record<string, string>;
  knownFields: string[];
  deliveredFields?: string[];
  confidence: number;
  deliveredAt: string | null;
  deliveryMethod: string | null;
  actualTruth?: IntelDefinition["truth"];
  evidenceSummary: {
    totalRecords: number;
    corroboratedFields: number;
    conflictingFields: number;
    dependentRecords: number;
  };
}

export interface CampaignReportCharacterItem {
  id: string;
  name: string;
  publicIdentity: string;
  recruited: boolean;
  exposed: boolean;
  outcome: "active" | "compromised";
  actualAlignment?: CharacterDefinition["hiddenAlignment"];
}

export interface CampaignReport {
  schemaVersion: "1.0.0";
  visibility: "owner" | "public";
  reportId: string;
  reportVersion: number;
  gameInstanceId: string;
  campaign: { id: string; version: string; name: string };
  difficulty: { id: DifficultyConfig["id"]; label: string };
  generatedAt: string;
  startedAt: string;
  closedAt: string;
  ending: CampaignEnding;
  summary: string;
  statistics: {
    elapsedMinutes: number;
    actionCount: number;
    dialogueTurns: number;
    deliveredIntel: number;
    recruitedComrades: number;
    discoveredLocations: number;
  };
  finalRisk: {
    personalSuspicion: number;
    networkExposure: number;
    investigationPressure: number;
  };
  coverRecord?: {
    credibility: number;
    supervisorSuspicion: number;
    consecutiveAbsences: number;
    leaveCount: number;
  };
  timeline: CampaignReportTimelineEntry[];
  intel: CampaignReportIntelItem[];
  comrades: CampaignReportCharacterItem[];
}

export interface CampaignReportBundle {
  ownerReport: CampaignReport;
  publicPreview: CampaignReport;
}

export interface CampaignShareSummary {
  shareId: string;
  gameInstanceId: string;
  reportVersion: number;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
}

export interface SharedCampaignReport {
  share: CampaignShareSummary;
  report: CampaignReport;
}

export interface WorldState {
  gameInstanceId: string;
  ownerUserId: string;
  campaignId: string;
  campaignVersion: string;
  engineVersion: string;
  difficulty: DifficultyConfig;
  currentTime: string;
  currentLocationId: string;
  discoveredLocationIds: string[];
  knownCharacterIds: string[];
  resolvedLeadIds?: string[];
  status: GameStatus;
  stateVersion: number;
  lastEventSeq: number;
  playerEnergy: number;
  playerStress: number;
  personalSuspicion: number;
  cover: CoverState;
  characters: Record<string, CharacterState>;
  dialogueMemories: Record<string, DialogueMemory>;
  activeDialogue: DialogueSession | null;
  intel: Record<string, IntelState>;
  network: NetworkState;
  radio: RadioState;
  investigation: EnemyInvestigationState;
  ending: CampaignEnding | null;
  closedAt: string | null;
}

export interface GameEvent<T = unknown> {
  id: string;
  gameInstanceId: string;
  eventSeq: number;
  idempotencyKey: string;
  type: string;
  occurredAt: string;
  payload: T;
}

interface ActionBase {
  idempotencyKey: string;
  durationMinutes: number;
}

export interface MoveAction extends ActionBase {
  type: "move";
  destinationId: string;
}

export interface ObserveAction extends ActionBase {
  type: "observe";
  targetCharacterId: string;
}

export interface WaitAction extends ActionBase {
  type: "wait";
}

export interface RecordIntelAction extends ActionBase {
  type: "record_intel";
  intelId: string;
  fields: string[];
  confidenceDelta: number;
}

export interface TransmitIntelAction extends ActionBase {
  type: "transmit_intel";
  intelId: string;
  method: string;
}

export type DialogueGoal =
  | "small_talk"
  | "build_trust"
  | "probe_attitude"
  | "request_information"
  | "verify_intel"
  | "apply_pressure"
  | "recruit_probe"
  | "long_talk";

export type DialogueTone = "neutral" | "friendly" | "formal" | "urgent" | "threatening";

export interface DialogueAction extends ActionBase {
  type: "dialogue";
  targetCharacterId: string;
  goal: DialogueGoal;
  tone: DialogueTone;
  playerText: string;
  targetIntelId?: string;
  agentOutcome?: {
    visibleSpeech: string;
    privateIntent: string;
    requestedEffects: Array<{ type: string; value: number; reason: string }>;
    provider: "model" | "fallback";
  };
}

export interface DialogueStartAction extends ActionBase {
  type: "dialogue_start";
  targetCharacterId: string;
  goal: DialogueGoal;
  tone: DialogueTone;
  allocatedMinutes: 10 | 20 | 30 | 60;
  targetIntelId?: string;
}

export interface CoverWorkAction extends ActionBase {
  type: "cover_work";
  workKind: CoverWorkKind;
}

export interface RequestLeaveAction extends ActionBase {
  type: "request_leave";
  reason: LeaveReason;
}

export interface DialogueTurnAction extends ActionBase {
  type: "dialogue_turn";
  sessionId: string;
  playerText: string;
  agentOutcome?: DialogueAction["agentOutcome"];
}

export interface DialogueEndAction extends ActionBase {
  type: "dialogue_end";
  sessionId: string;
}

export interface SendRadioMessageAction extends ActionBase {
  type: "send_radio_message";
  items: RadioMessageItem[];
  format: RadioMessageFormat;
  codebookId: RadioCodebookState["id"];
  timing: RadioTiming;
  locationId: string;
}

export interface DelegateComradeTaskAction extends ActionBase {
  type: "delegate_comrade_task";
  memberId: string;
  kind: ComradeTaskKind;
  targetId: string;
  approach: ComradeTaskApproach;
}

export interface CancelComradeTaskAction extends ActionBase {
  type: "cancel_comrade_task";
  taskId: string;
}

export interface RecruitmentTestAction extends ActionBase {
  type: "recruitment_test";
  targetCharacterId: string;
  testType: RecruitmentTestType;
  plan: RecruitmentPlan;
  agentObservation?: string;
}

export interface RecruitCandidateAction extends ActionBase {
  type: "recruit_candidate";
  targetCharacterId: string;
}

export type GameAction = MoveAction | ObserveAction | WaitAction | RecordIntelAction | TransmitIntelAction | CoverWorkAction | RequestLeaveAction | SendRadioMessageAction | DialogueAction | DialogueStartAction | DialogueTurnAction | DialogueEndAction | DelegateComradeTaskAction | CancelComradeTaskAction | RecruitmentTestAction | RecruitCandidateAction;

export interface ActionResult {
  state: WorldState;
  events: GameEvent[];
  narration: string;
  duplicate: boolean;
  npcReply?: string;
  notices: string[];
}
