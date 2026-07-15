/**
 * DuelEngine — 比武战斗核心
 *
 * 用法：
 *   const engine = new DuelEngine(playerAId, playerBId, startingMoveA, startingMoveB);
 *   const { result, newState } = engine.executeRound(cardA, cardB);
 *
 *   // 也可以让 AI 自动选牌
 *   const aiCard = engine.pickAICard(aiHand, newState);
 *   const { result: r2 } = engine.executeRound(playerCard, aiCard);
 */

import type { PresetCard, CardId } from "../types/card.js";

// ── 导出类型 ──────────────────────────────────────────────

export interface DuelState {
  playerAId: string;
  playerBId: string;
  distance: number;
  heartsA: number;
  heartsB: number;
  maxHearts: number;
  startingMoveA: CardId;
  startingMoveB: CardId;
  lastCardA: CardId | null;
  lastCardB: CardId | null;
  round: number;
  status: "in_progress" | "finished";
  winner: "A" | "B" | null;
  history: DuelRoundResult[];
}

export interface DuelRoundResult {
  round: number;
  cardA: PresetCard;
  cardB: PresetCard;
  /** 招式可行性（AI 裁决用，本地模拟则基于位移计算） */
  feasibilityA: number;
  feasibilityB: number;
  /** 是否命中 */
  succeededA: boolean;
  succeededB: boolean;
  /** 结算后的距离 */
  distanceAfter: number;
  damageA: number;
  damageB: number;
  /** 战况描述 */
  narration: string;
}

export interface DuelConfig {
  initialDistance: number;
  maxHearts: number;
  minDistance: number;
  fallResetDistance: number;
  /** 命中率基准值（0-1），越高越容易命中 */
  hitRateBase: number;
  /** 每点位移差带来的命中加成 */
  displacementHitBonus: number;
  /** 基础伤害 */
  baseDamage: number;
  /** 位移转化为伤害的比例 */
  displacementDamageRatio: number;
  /** 摔倒在地时的额外伤害 */
  fallDamage: number;
}

const DEFAULT_CONFIG: DuelConfig = {
  initialDistance: 2.0,
  maxHearts: 10,
  minDistance: 0,
  fallResetDistance: 1.0,
  hitRateBase: 0.5,
  displacementHitBonus: 0.15,
  baseDamage: 1,
  displacementDamageRatio: 2,
  fallDamage: 2,
};

// ── 战斗引擎 ──────────────────────────────────────────────

export class DuelEngine {
  private state: DuelState;
  private config: DuelConfig;

  constructor(
    playerAId: string,
    playerBId: string,
    startingMoveA: CardId,
    startingMoveB: CardId,
    config?: Partial<DuelConfig>,
  ) {
    const c = { ...DEFAULT_CONFIG, ...config };
    this.config = c;
    this.state = {
      playerAId,
      playerBId,
      distance: c.initialDistance,
      heartsA: c.maxHearts,
      heartsB: c.maxHearts,
      maxHearts: c.maxHearts,
      startingMoveA,
      startingMoveB,
      lastCardA: null,
      lastCardB: null,
      round: 0,
      status: "in_progress",
      winner: null,
      history: [],
    };
  }

  /** 获取当前快照（只读拷贝） */
  getState(): Readonly<DuelState> {
    return { ...this.state, history: [...this.state.history] };
  }

  /** 当前回合是否可以出这张牌（距离约束） */
  canPlayCard(card: PresetCard): boolean {
    return card.displacement <= this.state.distance;
  }

  /** AI 自动选牌：优先选位移接近当前距离的牌 */
  pickAICard(hand: PresetCard[]): PresetCard {
    const playable = hand.filter((c) => this.canPlayCard(c));
    if (playable.length === 0) {
      return [...hand].sort((a, b) => a.displacement - b.displacement)[0];
    }
    const sorted = [...playable].sort((a, b) => a.displacement - b.displacement);
    if (sorted.length <= 2) return sorted[sorted.length - 1];
    return sorted[Math.floor(sorted.length / 2)];
  }

  /** 执行一回合 */
  executeRound(cardA: PresetCard, cardB: PresetCard): { result: DuelRoundResult; newState: Readonly<DuelState> } {
    const c = this.config;
    const round = this.state.round + 1;

    // ── 1. 位移结算 ──────────────────────────────────────
    const rawDistance = this.state.distance - cardA.displacement - cardB.displacement;
    const isFall = rawDistance < 0;
    const distanceAfter = isFall ? c.fallResetDistance : Math.max(rawDistance, c.minDistance);

    // ── 2. 命中判定 ──────────────────────────────────────
    const feasibilityA = Math.max(0, Math.min(1, c.hitRateBase + (cardB.displacement - cardA.displacement) * c.displacementHitBonus));
    const feasibilityB = Math.max(0, Math.min(1, c.hitRateBase + (cardA.displacement - cardB.displacement) * c.displacementHitBonus));

    const succeededA = isFall ? Math.random() > 0.3 : Math.random() < feasibilityA;
    const succeededB = isFall ? Math.random() > 0.3 : Math.random() < feasibilityB;

    // ── 3. 伤害计算 ──────────────────────────────────────
    const damageA = succeededA
      ? Math.max(1, c.baseDamage + Math.round(cardA.displacement * c.displacementDamageRatio))
      : 0;
    const damageB = succeededB
      ? Math.max(1, c.baseDamage + Math.round(cardB.displacement * c.displacementDamageRatio))
      : 0;

    const totalDamageA = isFall ? damageA + c.fallDamage : damageA;
    const totalDamageB = isFall ? damageB + c.fallDamage : damageB;

    // ── 4. 更新血量 ──────────────────────────────────────
    const heartsA = Math.max(0, this.state.heartsA - totalDamageB);
    const heartsB = Math.max(0, this.state.heartsB - totalDamageA);

    // ── 5. 战况描述 ──────────────────────────────────────
    const narration = this.buildNarration(
      cardA, cardB, succeededA, succeededB,
      totalDamageA, totalDamageB, isFall, distanceAfter,
    );

    // ── 6. 胜负判定 ──────────────────────────────────────
    let winner: "A" | "B" | null = null;
    let status: "in_progress" | "finished" = "in_progress";
    if (heartsA <= 0 && heartsB <= 0) {
      winner = round % 2 === 0 ? "A" : "B";
      status = "finished";
    } else if (heartsA <= 0) {
      winner = "B";
      status = "finished";
    } else if (heartsB <= 0) {
      winner = "A";
      status = "finished";
    }

    const result: DuelRoundResult = {
      round,
      cardA,
      cardB,
      feasibilityA,
      feasibilityB,
      succeededA,
      succeededB,
      distanceAfter,
      damageA: totalDamageA,
      damageB: totalDamageB,
      narration,
    };

    this.state = {
      ...this.state,
      distance: distanceAfter,
      heartsA,
      heartsB,
      lastCardA: cardA.id,
      lastCardB: cardB.id,
      round,
      status,
      winner,
      history: [...this.state.history, result],
    };

    return { result, newState: this.getState() };
  }

  /** 多回合模拟（AI vs AI 快速战斗） */
  simulate(deckA: PresetCard[], deckB: PresetCard[], maxRounds: number = 20): Readonly<DuelState> {
    let handA = [...deckA];
    let handB = [...deckB];

    for (let i = 0; i < maxRounds; i++) {
      if (this.state.status !== "in_progress") break;
      const cardA = handA[i % handA.length];
      const cardB = handB[i % handB.length];
      this.executeRound(cardA, cardB);
    }

    return this.getState();
  }

  /** 重置比武 */
  reset(): void {
    const c = this.config;
    this.state = {
      playerAId: this.state.playerAId,
      playerBId: this.state.playerBId,
      distance: c.initialDistance,
      heartsA: c.maxHearts,
      heartsB: c.maxHearts,
      maxHearts: c.maxHearts,
      startingMoveA: this.state.startingMoveA,
      startingMoveB: this.state.startingMoveB,
      lastCardA: null,
      lastCardB: null,
      round: 0,
      status: "in_progress",
      winner: null,
      history: [],
    };
  }

  // ── 内部 ──────────────────────────────────────────────

  private buildNarration(
    cardA: PresetCard,
    cardB: PresetCard,
    succeededA: boolean,
    succeededB: boolean,
    damageA: number,
    damageB: number,
    isFall: boolean,
    distanceAfter: number,
  ): string {
    const parts: string[] = [];

    if (succeededA && succeededB) {
      parts.push(`双方同时命中！${cardA.name} 击中对手（${damageA}伤），${cardB.name} 亦命中（${damageB}伤）。`);
    } else if (succeededA) {
      parts.push(`你使出「${cardA.name}」命中对手，造成 ${damageA} 点伤害！`);
      parts.push(!succeededB ? `对方「${cardB.name}」未能命中。` : "");
    } else if (succeededB) {
      parts.push(`对方使出「${cardB.name}」命中，你受到 ${damageB} 点伤害！`);
      parts.push(!succeededA ? `你的「${cardA.name}」未能命中。` : "");
    } else {
      parts.push(`双方招式交错而过，均未命中。`);
    }

    if (isFall) {
      parts.push(`双方相撞摔倒在地！各自额外受到 2 点伤害，距离重置为 ${distanceAfter}m。`);
    } else {
      parts.push(`距离变为 ${distanceAfter.toFixed(1)}m。`);
    }

    return parts.filter(Boolean).join("");
  }
}
