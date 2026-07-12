export type CardCategory = "attack" | "defense" | "technique" | "ultimate";
export type CardRarity = "common" | "uncommon" | "rare" | "legendary";
export type CardSource = "preset" | "custom";
export type GameId = "duel-on-mount-hua" | "martial-hegemony";
export type FactionId = string;
export type UserId = string;
export type CardId = string;

export interface CardEffect {
  type: "damage" | "heal" | "shield" | "draw" | "buff" | "debuff" | "special";
  target: "self" | "enemy" | "all_enemies" | "all_allies" | "random_enemy";
  value?: number;
  duration?: number;
  condition?: string;
  specialEffectId?: string;
}

export interface CardFigurePose {
  headTilt: number;
  torsoLean: number;
  leftArm: { shoulder: number; elbow: number; wrist: number };
  rightArm: { shoulder: number; elbow: number; wrist: number };
  leftLeg: { hip: number; knee: number; ankle: number };
  rightLeg: { hip: number; knee: number; ankle: number };
  facing: "left" | "right";
}

export interface CardBase {
  id: CardId;
  factionId: FactionId;
  gameId: GameId;
  name: string;
  subtitle?: string;
  category: CardCategory;
  rarity: CardRarity;
  cost: number;
  power: number;
  defense?: number;
  speed?: number;
  effects: CardEffect[];
  description: string;
  artAssetId?: string;
  source: CardSource;
  createdAt: string;
  updatedAt?: string;
  // 武术小人姿态参数
  figurePose?: CardFigurePose;
  // 对决属性
  displacement: number;
  guardArea: string;
  attackArea: string;
  comboStyle?: string;
}

export interface PresetCard extends CardBase {
  source: "preset";
  isStarter: boolean;
  isStartingMove: boolean;
  keywords: string[];
  unlockCondition?: string;
}

export interface CustomCard extends CardBase {
  source: "custom";
  creatorId: UserId;
  isApproved: boolean;
  originalDescription: string;
  sourceTrainingSessionId?: string;
}
