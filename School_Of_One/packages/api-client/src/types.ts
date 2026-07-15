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
  moves: string[];
  distance: number;
}

export interface ComboJudgeResponse {
  feasible: boolean;
  comboName: string;
  description: string;
  totalDamage: number;
  difficulty: number;
  explanation: string;
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
