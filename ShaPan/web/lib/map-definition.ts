import battlefieldMaps from "../../shared/battlefield-maps.json";

/** Geometry is shared with the simulation; percentages always start at top left. */
export type MapPoint = { x: number; y: number };

export type MapAnchorKind =
  | "city"
  | "bridge"
  | "bridge-head"
  | "river-bank"
  | "road"
  | "rail"
  | "landing-zone"
  | "defence-line"
  | "assembly-area";

export type MapAnchor = MapPoint & {
  id: string;
  label: string;
  kind: MapAnchorKind;
  aliases?: string[];
  major?: boolean;
  /** Adjacent anchor IDs, derived from the same edges used by pathfinding. */
  connectsTo?: string[];
};

export type MapRoad = {
  id: string;
  points: MapPoint[];
  kind: "major" | "minor";
};

export type MapArea = {
  id: string;
  kind: "town" | "woods" | "fields" | "landing";
  label: string;
  points: MapPoint[];
};

export type CampaignMapDefinition = {
  id: string;
  title: string;
  subtitle: string;
  river: { name: string; points: MapPoint[]; width: number };
  roads: MapRoad[];
  bridges: Array<{ id: string; north: string; south: string; anchorId: string }>;
  anchors: MapAnchor[];
  edges: Array<{ from: string; to: string; kind?: string; cost?: number }>;
  areas: MapArea[];
  railways: Array<{ id: string; points: MapPoint[] }>;
  defaultTargets: Record<string, string>;
  initialPositions: Record<string, MapPoint>;
  retreatAnchorId: string;
};

type BattlefieldMapFile = {
  version: string;
  canvas: { width: number; height: number };
  campaigns: Record<string, CampaignMapDefinition>;
};

const definitions = battlefieldMaps as BattlefieldMapFile;

export const MAP_CANVAS = definitions.canvas;
export const CAMPAIGN_MAPS = definitions.campaigns;

export function campaignMap(campaignId: string): CampaignMapDefinition {
  const definition = CAMPAIGN_MAPS[campaignId];
  if (!definition) throw new Error(`Unknown battlefield map: ${campaignId}`);
  return definition;
}

export function initialPositionForCampaign(campaignId: string, unitId: string): MapPoint | undefined {
  return campaignMap(campaignId).initialPositions[unitId];
}

export function toCanvasPoint(point: MapPoint) {
  return {
    x: (point.x / 100) * MAP_CANVAS.width,
    y: (point.y / 100) * MAP_CANVAS.height,
  };
}

export const MAP_CONTRACT = {
  version: definitions.version,
  coordinateSystem: "normalized-100-top-left",
  layers: ["terrain", "grid", "historical", "orders", "intel", "units", "interaction"],
  colors: {
    friendly: "#2e6ea4",
    enemy: "#a9493f",
    staleIntel: "#7b7065",
    fireSupport: "#b46a35",
  },
} as const;
