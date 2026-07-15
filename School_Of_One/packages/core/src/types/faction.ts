export interface SubStyle {
  id: string;
  name: string;
  description: string;
  cardIds: string[]; // 该分支下的卡牌 ID
}

export interface Faction {
  id: string;
  name: string;
  englishName: string;
  description: string;
  playStyle: string;
  strength: string;
  weakness: string;
  primaryColor: string;
  secondaryColor: string;
  emblemAssetId?: string;
  masterName: string;
  masterPersonality: string;
  startingMoveId: string;
  startingMoveName: string;
  sortOrder: number;
  group: "shaolin" | "wudang" | "northern" | "southern"; // 所属师门
  subStyles: SubStyle[]; // 该师门下的分支拳种
}
