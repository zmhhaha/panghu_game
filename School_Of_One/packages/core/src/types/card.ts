export type CardSource = "preset" | "custom";
export type GameId = "duel-on-mount-hua" | "martial-hegemony";
export type FactionId = string;
export type UserId = string;
export type CardId = string;

export interface CardBase {
  id: CardId;
  factionId: FactionId;
  gameId: GameId;
  name: string;
  subtitle?: string;            // 所属分支（展示用），如"八极拳"
  description: string;          // 招式详细描述（供 LLM 判定用，不展示在 UI）
  verses?: string[];            // 歌诀（古风诗句，竖排展示，每元素一行）
  displacement: number;         // 出招后位移（LLM 判定用）
  source: CardSource;
  artAssetId?: string;          // 招式小人图文件名
  createdAt: string;
  updatedAt?: string;
}

export interface PresetCard extends CardBase {
  source: "preset";
  isStarter: boolean;           // ⭐ 是否起手式（每个门派一张，比武开始前预选）
  keywords: string[];           // 供 AI 语义匹配用
}

export interface CustomCard extends CardBase {
  source: "custom";
  creatorId: string;
  isApproved: boolean;
  originalDescription: string;
  sourceTrainingSessionId?: string;
}
