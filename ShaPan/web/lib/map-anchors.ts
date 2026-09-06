import type { MapPoint } from "./map-definition";

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
  /** IDs of terrain features that a route is allowed to use from this point. */
  connectsTo?: string[];
};

export const CAMPAIGN_ANCHORS: Record<string, MapAnchor[]> = {
  taierzhuang: [
    { id: "tz-city-center", label: "台儿庄城中心", kind: "city", x: 50.6, y: 43.0, connectsTo: ["tz-city-road-north", "tz-city-road-east", "tz-city-road-south"] },
    { id: "tz-north-gate", label: "台儿庄北门", kind: "city", x: 50.0, y: 25.5, connectsTo: ["tz-city-road-north"] },
    { id: "tz-east-gate", label: "台儿庄东门", kind: "city", x: 77.2, y: 44.0, connectsTo: ["tz-city-road-east"] },
    { id: "tz-south-gate", label: "台儿庄南门", kind: "city", x: 56.0, y: 69.0, connectsTo: ["tz-city-road-south", "tz-south-bank"] },
    { id: "tz-south-bank", label: "运河南岸", kind: "river-bank", x: 55.0, y: 78.5, connectsTo: ["tz-bridge-south"] },
    { id: "tz-bridge-south", label: "台儿庄桥南桥头", kind: "bridge-head", x: 55.8, y: 75.0, connectsTo: ["tz-bridge", "tz-south-bank"] },
    { id: "tz-bridge", label: "台儿庄桥", kind: "bridge", x: 55.8, y: 71.8, connectsTo: ["tz-bridge-north", "tz-bridge-south"] },
    { id: "tz-bridge-north", label: "台儿庄桥北桥头", kind: "bridge-head", x: 55.6, y: 68.5, connectsTo: ["tz-bridge", "tz-city-road-south"] },
    { id: "tz-west-road", label: "西侧道路节点", kind: "road", x: 21.0, y: 53.0, connectsTo: ["tz-city-road-west"] },
    { id: "tz-east-road", label: "东侧道路节点", kind: "road", x: 86.0, y: 52.0, connectsTo: ["tz-city-road-east"] },
    { id: "tz-rail-crossing", label: "台枣支线交叉点", kind: "rail", x: 83.0, y: 44.0, connectsTo: ["tz-east-road"] },
    { id: "tz-south-assembly", label: "城南增援集结区", kind: "assembly-area", x: 23.8, y: 84.5, connectsTo: ["tz-south-bank"] },
    { id: "tz-defence-line", label: "城南防御线", kind: "defence-line", x: 47.0, y: 65.5 },
  ],
  arnhem: [
    { id: "ar-arnhem-city", label: "阿纳姆市区", kind: "city", x: 82.0, y: 24.0, connectsTo: ["ar-bridge-north", "ar-east-road"] },
    { id: "ar-oosterbeek", label: "奥斯特贝克", kind: "city", x: 46.8, y: 44.5, connectsTo: ["ar-west-road", "ar-bridge-road"] },
    { id: "ar-bridge-north", label: "公路桥北桥头", kind: "bridge-head", x: 87.8, y: 41.0, connectsTo: ["ar-bridge", "ar-arnhem-city"] },
    { id: "ar-bridge", label: "阿纳姆公路桥", kind: "bridge", x: 87.7, y: 73.5, connectsTo: ["ar-bridge-north", "ar-bridge-south"] },
    { id: "ar-bridge-south", label: "公路桥南桥头", kind: "bridge-head", x: 87.5, y: 79.0, connectsTo: ["ar-bridge", "ar-bridge-road"] },
    { id: "ar-river-north", label: "下莱茵河北岸", kind: "river-bank", x: 67.0, y: 70.0, connectsTo: ["ar-bridge-north"] },
    { id: "ar-river-south", label: "下莱茵河南岸", kind: "river-bank", x: 67.0, y: 82.0, connectsTo: ["ar-bridge-south"] },
    { id: "ar-bridge-road", label: "桥区公路节点", kind: "road", x: 70.0, y: 51.0, connectsTo: ["ar-bridge-south", "ar-oosterbeek"] },
    { id: "ar-west-road", label: "奥斯特贝克西侧道路", kind: "road", x: 30.0, y: 50.0, connectsTo: ["ar-oosterbeek"] },
    { id: "ar-rail-crossing", label: "铁路交叉点", kind: "rail", x: 52.0, y: 36.0, connectsTo: ["ar-oosterbeek"] },
    { id: "ar-dz-x", label: "DZ X", kind: "landing-zone", x: 16.8, y: 20.0, connectsTo: ["ar-west-road"] },
    { id: "ar-lz-s", label: "LZ S", kind: "landing-zone", x: 15.0, y: 85.0, connectsTo: ["ar-west-road"] },
    { id: "ar-defence-line", label: "桥区阻击线", kind: "defence-line", x: 80.0, y: 50.0 },
  ],
};

export function anchorsForCampaign(campaignId: string) {
  return CAMPAIGN_ANCHORS[campaignId] ?? [];
}

export function anchorForCampaign(campaignId: string, anchorId: string) {
  return anchorsForCampaign(campaignId).find((anchor) => anchor.id === anchorId) ?? null;
}
