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
  sourceCharacterIds: string[];
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
  exposed: boolean;
  agentTier: AgentTier;
}

export interface IntelState {
  id: string;
  knownFields: string[];
  confidence: number;
  collectedSourceIds: string[];
  deliveredAt: string | null;
  deliveryMethod: string | null;
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
  knownFields: string[];
  confidence: number;
  deliveredAt: string | null;
  deliveryMethod: string | null;
  actualTruth?: IntelDefinition["truth"];
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
  status: GameStatus;
  stateVersion: number;
  lastEventSeq: number;
  playerEnergy: number;
  playerStress: number;
  personalSuspicion: number;
  characters: Record<string, CharacterState>;
  dialogueMemories: Record<string, DialogueMemory>;
  activeDialogue: DialogueSession | null;
  intel: Record<string, IntelState>;
  network: NetworkState;
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

export type GameAction = MoveAction | ObserveAction | WaitAction | RecordIntelAction | TransmitIntelAction | DialogueAction | DialogueStartAction | DialogueTurnAction | DialogueEndAction | DelegateComradeTaskAction | CancelComradeTaskAction;

export interface ActionResult {
  state: WorldState;
  events: GameEvent[];
  narration: string;
  duplicate: boolean;
  npcReply?: string;
  notices: string[];
}
