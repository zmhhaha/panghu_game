export interface DuelState {
  playerAId: string;
  playerBId: string;
  distance: number;
  heartsA: number;
  heartsB: number;
  startingMoveA: string;
  startingMoveB: string;
  lastCardA: string | null;
  lastCardB: string | null;
  round: number;
  status: "in_progress" | "finished";
  history: DuelRound[];
}

export interface DuelRound {
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
}
