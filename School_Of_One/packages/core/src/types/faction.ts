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
}
