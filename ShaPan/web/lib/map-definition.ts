/**
 * Authoritative runtime map contract.
 * All battlefield data uses normalized 0-100 coordinates and this canvas.
 * Terrain SVG and overlays must use the same viewBox.
 */
export const MAP_CANVAS = { width: 900, height: 720 } as const;

export type MapPoint = { x: number; y: number };

export function toCanvasPoint(point: MapPoint) {
  return {
    x: (point.x / 100) * MAP_CANVAS.width,
    y: (point.y / 100) * MAP_CANVAS.height,
  };
}

export const MAP_CONTRACT = {
  version: "runtime-map-v2",
  coordinateSystem: "normalized-100-top-left",
  layers: ["terrain", "grid", "historical", "orders", "intel", "units", "interaction"],
  colors: {
    friendly: "#2e6ea4",
    enemy: "#a9493f",
    staleIntel: "#7b7065",
    fireSupport: "#b46a35",
  },
} as const;
