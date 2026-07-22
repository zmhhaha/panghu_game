/**
 * api-client 专用类型
 * 和 AI Agent 通信的请求/响应结构
 */

// ── Duel Judge ────────────────────────────────────────────

export interface DuelJudgeRequest {
  moveA: string;
  moveB: string;
  distance: number;
  cardA?: string | null;
  cardB?: string | null;
  round?: number;
}

export interface DuelJudgeResponse {
  round: number;
  cardA: string;
  cardB: string;
  feasibilityA: number;
  feasibilityB: number;
  succeededA: boolean;
  succeededB: boolean;
  distanceAfter: number;
  damageA: number;
  damageB: number;
  narration: string;
  explanation: string;
  provider: string;
}

// ── Combo Judge ───────────────────────────────────────────

export interface ComboJudgeRequest {
  moveA: string;
  moveB: string;
}

export interface ComboJudgeResponse {
  moveA: string;
  moveB: string;
  feasibility: number;
  difficulty: string;
  key_limitation: string;
  improvement_suggestion: string;
  analysis: {
    moveA_end_state: Record<string, string>;
    moveB_requirements: Record<string, string>;
    feasibility_analysis: Record<string, { score: number; reason: string }>;
  };
  provider: string;
}

// ── Training Ground ───────────────────────────────────────

export interface TrainingSessionStartRequest {
  factionId: string;
}

export interface TrainingSessionStartResponse {
  sessionId: string;
  factionName: string;
  masterName: string;
  maxRounds: number;
}

export interface TrainingRoundRequest {
  sessionId: string;
  description: string;
}

export interface TrainingRoundResponse {
  roundNum: number;
  masterFeedback: string;
  matchedCardId: string;
  matchedCardName: string;
  confidence: number;
  matchReason: string;
  recommendedSubstyle: string;
  completed: boolean;
}

export interface TrainingMatchRequest {
  sessionId: string;
}

export interface TrainingMatchResponse {
  finalCardId: string;
  finalCardName: string;
  finalConfidence: number;
  matchExplanation: string;
  masterSummary: string;
  substyleName: string;
  totalRounds: number;
}

// ── 用户 / 卡组 / 对战记录 ───────────────────────────────

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface DeckResponse {
  id: string;
  userId: string;
  name: string;
  starterCardId: string;
  cardIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DuelRecordResponse {
  id: string;
  userId: string;
  opponent: string;
  winner: string;
  rounds: number;
  playerHearts: number;
  aiHearts: number;
  history: unknown[];
  createdAt: string;
}

export interface TrainingSessionResponse {
  id: string;
  userId: string;
  factionId: string | null;
  masterName: string | null;
  rounds: number;
  matchedCardId: string | null;
  createdAt: string;
}

/** POST /api/v1/training/complete 响应 */
export interface TrainingCompleteResponse {
  success: boolean;
  matched: boolean;
  finalCardId: string;
  finalCardName: string;
  finalConfidence: number;
  masterSummary: string;
  substyleName: string;
  totalRounds: number;
  cardDescription?: string;
  cardDisplacement?: number;
  trainingType?: string;
}

/** POST /api/training/hermit/start 响应 */
export interface HermitStartResponse {
  sessionId: string;
  factionName: string;
  masterName: string;
  maxRounds: number;
  trainingType: string;
}

/** GET /api/v1/cards/custom 响应中的卡牌对象 */
export interface CustomCardResponse {
  id: string;
  userId: string;
  cardId: string;
  name: string;
  factionId: string;
  gameId: string;
  description: string;
  displacement: number;
  isApproved: boolean;
  originalDescription: string;
  sourceTrainingSessionId: string | null;
  createdAt: string;
}
