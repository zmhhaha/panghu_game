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
  transcript: Array<{ speaker: "player" | "npc"; text: string; at: string }>;
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

export interface NetworkState {
  exposure: number;
  activeMemberIds: string[];
  compromisedMemberIds: string[];
  availableChannels: string[];
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

export const DIALOGUE_TEXT_LIMITS: Record<DialogueGoal, number> = {
  small_talk: 80,
  build_trust: 140,
  probe_attitude: 120,
  verify_intel: 160,
  request_information: 180,
  apply_pressure: 140,
  recruit_probe: 180,
  long_talk: 300,
};

export const DIALOGUE_MAX_TEXT_LENGTH = 300;

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

export type GameAction = MoveAction | ObserveAction | WaitAction | RecordIntelAction | TransmitIntelAction | DialogueAction | DialogueStartAction | DialogueTurnAction | DialogueEndAction;

export interface ActionResult {
  state: WorldState;
  events: GameEvent[];
  narration: string;
  duplicate: boolean;
  npcReply?: string;
}
