"use client";

import { useId } from "react";
import {
  campaignMap,
  MAP_CANVAS,
  toCanvasPoint,
  type MapAnchor,
  type MapArea,
  type MapPoint,
} from "../lib/map-definition";

type BattlefieldTerrainProps = {
  campaignId: string;
  grid: boolean;
  detail: boolean;
  /** Uniform viewport scale, used to keep geographic labels readable on screen. */
  renderScale?: number;
  /** Counter bounds in canvas coordinates; only text may move around these. */
  labelObstacles?: Array<{ x: number; y: number; width: number; height: number }>;
  onPickAnchor?: (anchor: MapAnchor) => void;
};

const INK = "#5b5947";
const PAPER = "#e0d6b6";

function pointList(points: MapPoint[]) {
  return points.map((point) => {
    const p = toCanvasPoint(point);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function areaCenter(area: MapArea) {
  const sum = area.points.reduce((value, point) => ({ x: value.x + point.x, y: value.y + point.y }), { x: 0, y: 0 });
  return toCanvasPoint({ x: sum.x / area.points.length, y: sum.y / area.points.length });
}

type LabelPlacement = { anchor: MapAnchor; displayLabel: string; x: number; y: number; fontSize: number; align: "start" | "end" | "middle" };

function compactLabel(anchor: MapAnchor) {
  const names: Record<string, string> = {
    "tz-city-center": "台儿庄",
    "tz-north-gate": "北门",
    "tz-east-gate": "东门",
    "tz-west-gate": "西门",
    "tz-south-gate": "南门",
    "tz-bridge": "运河桥",
    "tz-bridge-north": "北桥头",
    "tz-bridge-south": "南桥头",
    "tz-south-assembly": "南岸集结区",
    "ar-bridge": "公路桥",
    "ar-bridge-north": "北桥头",
    "ar-bridge-south": "南桥头",
  };
  if (names[anchor.id]) return names[anchor.id];
  const chinese = anchor.label.split("·").map((part) => part.trim()).find((part) => /[\u4e00-\u9fff]/.test(part));
  return chinese || anchor.label;
}

function readableFont(base: number, minimum: number, maximum: number, scale: number) {
  return Math.max(minimum / scale, Math.min(base, maximum / scale));
}

/** Move text only: physical feature coordinates and the army overlays never move. */
function labelPlacements(anchors: MapAnchor[], detail: boolean, scale: number, obstacles: NonNullable<BattlefieldTerrainProps["labelObstacles"]>): LabelPlacement[] {
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = [
    { x: 28, y: 24, width: 350, height: 64 },
    { x: MAP_CANVAS.width - 76, y: 28, width: 50, height: 68 },
    ...obstacles,
  ];
  const result: LabelPlacement[] = [];
  const candidates = anchors
    .filter((anchor) => anchor.kind !== "defence-line")
    .filter((anchor) => detail || anchor.major || ["city", "bridge", "landing-zone"].includes(anchor.kind))
    .filter((anchor) => scale >= 0.6 || (anchor.kind === "city" && !anchor.label.includes("门")) || anchor.kind === "bridge" || anchor.kind === "landing-zone")
    .sort((a, b) => Number(Boolean(b.major)) - Number(Boolean(a.major)) || a.id.localeCompare(b.id));

  for (const anchor of candidates) {
    const point = toCanvasPoint(anchor);
    const displayLabel = !detail || scale < 0.6 ? compactLabel(anchor) : anchor.label;
    const fontSize = anchor.major ? readableFont(16, 11, 22, scale) : readableFont(12, 9, 16, scale);
    const width = Math.max(36 / scale, displayLabel.length * fontSize * 0.95);
    const height = fontSize + 4 / scale;
    const choices: Array<{ dx: number; dy: number; align: "start" | "end" | "middle" }> = [
      { dx: 12 / scale, dy: -12 / scale, align: "start" },
      { dx: -12 / scale, dy: -12 / scale, align: "end" },
      { dx: 12 / scale, dy: (height * scale + 10) / scale, align: "start" },
      { dx: -12 / scale, dy: (height * scale + 10) / scale, align: "end" },
      { dx: 0, dy: -30 / scale, align: "middle" },
      { dx: 0, dy: (height * scale + 25) / scale, align: "middle" },
    ];
    let best: { x: number; y: number; align: "start" | "end" | "middle"; box: typeof occupied[number]; score: number } | undefined;
    for (const choice of choices) {
      const x = point.x + choice.dx;
      const y = point.y + choice.dy;
      const left = x - (choice.align === "end" ? width : choice.align === "middle" ? width / 2 : 0);
      const box = { x: left - 4 / scale, y: y - height, width: width + 8 / scale, height: height + 5 / scale };
      const outside = Math.max(0, 22 - box.x) + Math.max(0, box.x + box.width - MAP_CANVAS.width + 22)
        + Math.max(0, 20 - box.y) + Math.max(0, box.y + box.height - MAP_CANVAS.height + 28);
      const overlap = occupied.reduce((sum, other) => sum + Math.max(0, Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x))
        * Math.max(0, Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y)), 0);
      const score = overlap + outside * 100;
      if (!best || score < best.score) best = { x, y, align: choice.align, box, score };
    }
    if (best) {
      occupied.push(best.box);
      result.push({ anchor, displayLabel, x: best.x, y: best.y, fontSize, align: best.align });
    }
  }
  return result;
}

function CoordinateGrid({ scale }: { scale: number }) {
  const ticks = Array.from({ length: 21 }, (_, index) => index * 5);
  const fontSize = readableFont(11, 9, 12, scale);
  return (
    <g aria-label="作战坐标网格，横纵坐标均为零至一百" pointerEvents="none">
      {ticks.map((value) => {
        const point = toCanvasPoint({ x: value, y: value });
        const major = value % 10 === 0;
        return <g key={value}>
          <path d={`M${point.x} 0 V${MAP_CANVAS.height} M0 ${point.y} H${MAP_CANVAS.width}`} fill="none" stroke="#6c8279" strokeWidth={major ? 0.8 : 0.45} vectorEffect="non-scaling-stroke" opacity={major ? 0.32 : 0.16} />
          {major ? <g fill="#586e68" fontSize={fontSize} fontFamily="Georgia, serif" paintOrder="stroke" stroke={PAPER} strokeWidth={2.5 / scale}>
            <text x={Math.max(6 / scale, Math.min(MAP_CANVAS.width - 6 / scale, point.x))} y={13 / scale} textAnchor={value === 0 ? "start" : value === 100 ? "end" : "middle"}>{value}</text>
            <text x={Math.max(6 / scale, Math.min(MAP_CANVAS.width - 6 / scale, point.x))} y={MAP_CANVAS.height - 7 / scale} textAnchor={value === 0 ? "start" : value === 100 ? "end" : "middle"}>{value}</text>
            {value > 0 && value < 100 ? <>
              <text x={7 / scale} y={point.y + 4 / scale}>{value}</text>
              <text x={MAP_CANVAS.width - 7 / scale} y={point.y + 4 / scale} textAnchor="end">{value}</text>
            </> : null}
          </g> : null}
        </g>;
      })}
    </g>
  );
}

/** Terrain is a group inside the shared viewport, never a separately stretched SVG. */
export function BattlefieldTerrain({ campaignId, grid, detail, renderScale = 1, labelObstacles = [], onPickAnchor }: BattlefieldTerrainProps) {
  const map = campaignMap(campaignId);
  const asia = campaignId === "taierzhuang";
  const prefix = `terrain-${useId().replace(/:/g, "")}`;
  const ids = { woods: `${prefix}-woods`, fields: `${prefix}-fields`, town: `${prefix}-town`, paper: `${prefix}-paper` };
  const riverPoints = pointList(map.river.points);
  const riverWidth = (map.river.width / 100) * MAP_CANVAS.height;
  const scale = Math.max(0.05, renderScale);
  const labels = labelPlacements(map.anchors, detail, scale, labelObstacles);
  const riverLabelPoint = toCanvasPoint(map.river.points[Math.min(1, map.river.points.length - 1)]);
  const subtitle = scale < 0.6 ? `${map.subtitle.split("·").slice(0, 2).join("·")} · 地形示意` : map.subtitle;

  return (
    <g data-terrain-campaign={campaignId} style={{ fontFamily: asia ? '"KaiTi", "FangSong", serif' : '"Georgia", "Noto Serif SC", serif' }}>
      <defs>
        <pattern id={ids.paper} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.55" fill="#8c805e" opacity="0.13" />
          <path d="M7 9h2" stroke="#fff6dc" strokeWidth="0.6" opacity="0.3" />
        </pattern>
        <pattern id={ids.woods} width="26" height="25" patternUnits="userSpaceOnUse">
          <path d="M8 17l5-10 5 10z M13 17v4" fill="none" stroke="#657451" strokeWidth="1" opacity="0.65" />
        </pattern>
        <pattern id={ids.fields} width="42" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <path d="M0 0H42V30 M14 0V30 M28 0V30" fill="none" stroke="#8a9162" strokeWidth="0.7" opacity="0.4" />
        </pattern>
        <pattern id={ids.town} width="34" height="30" patternUnits="userSpaceOnUse">
          <path d="M4 4h9v8H4z M19 5h10v7H19z M5 18h9v8H5z M20 17h8v9H20z" fill="#8b8069" opacity="0.5" />
        </pattern>
      </defs>
      <rect width={MAP_CANVAS.width} height={MAP_CANVAS.height} fill={PAPER} />
      <rect width={MAP_CANVAS.width} height={MAP_CANVAS.height} fill={`url(#${ids.paper})`} pointerEvents="none" />

      {/* Polygon textures describe the supplied feature, without inventing roads or contour elevations. */}
      {map.areas.map((area) => {
        const walledTown = asia && area.kind === "town" && area.label.includes("台儿庄");
        const fill = area.kind === "woods" ? "#acb08a" : area.kind === "town" ? "#c4b696" : area.kind === "landing" ? "#d4cda5" : "#d3cba7";
        const texture = area.kind === "woods" ? ids.woods : area.kind === "town" ? ids.town : ids.fields;
        return <g key={area.id}>
          <polygon points={pointList(area.points)} fill={fill} stroke={walledTown ? "#776d55" : area.kind === "landing" ? "#8a8063" : "#a9a181"} strokeWidth={walledTown ? 5 : 0.8} strokeDasharray={area.kind === "landing" ? "7 5" : undefined} strokeLinejoin="round" />
          <polygon points={pointList(area.points)} fill={`url(#${texture})`} opacity={area.kind === "town" && !detail ? 0.5 : 1} pointerEvents="none" />
          {walledTown ? <polygon points={pointList(area.points)} fill="none" stroke={PAPER} strokeWidth="1.2" strokeDasharray="2 7" pointerEvents="none" /> : null}
        </g>;
      })}

      <g aria-label={map.river.name} fill="none" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none">
        <polyline points={riverPoints} stroke="#7a9189" strokeWidth={riverWidth + 4} opacity="0.76" />
        <polyline points={riverPoints} stroke="#aabdb2" strokeWidth={riverWidth} />
        <polyline points={riverPoints} stroke="#d3ded0" strokeWidth={Math.max(2, riverWidth - 8)} opacity="0.45" />
      </g>

      <g fill="none" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none">
        {map.roads.map((road) => <g key={road.id}>
          <polyline points={pointList(road.points)} stroke={road.kind === "major" ? "#9b846a" : "#a89776"} strokeWidth={road.kind === "major" ? 7 : 3.6} />
          <polyline points={pointList(road.points)} stroke="#e9ddbc" strokeWidth={road.kind === "major" ? 4 : 1.7} />
        </g>)}
        {map.railways.map((railway) => <g key={railway.id}>
          <polyline points={pointList(railway.points)} stroke="#6c6556" strokeWidth="2" />
          <polyline points={pointList(railway.points)} stroke="#6c6556" strokeWidth="7" strokeDasharray="1.5 6" />
        </g>)}
      </g>

      {/* Bridge deck endpoints are the very same bridgeheads used by route planning. */}
      {map.bridges.map((bridge) => {
        const north = map.anchors.find((anchor) => anchor.id === bridge.north);
        const south = map.anchors.find((anchor) => anchor.id === bridge.south);
        if (!north || !south) return null;
        const a = toCanvasPoint(north);
        const b = toCanvasPoint(south);
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const rotation = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        return <g key={bridge.id} transform={`translate(${a.x} ${a.y}) rotate(${rotation})`} pointerEvents="none">
          <rect x="-2" y="-7" width={length + 4} height="14" fill="#e7d9b6" stroke="#5e5948" strokeWidth="1.6" />
          <path d={`M-3 -8H${length + 3} M-3 8H${length + 3}`} fill="none" stroke="#595343" strokeWidth="2" />
          {Array.from({ length: Math.max(2, Math.floor(length / 12)) }, (_, index) => <path key={index} d={`M${index * 12 + 5} -7V7`} stroke="#80745a" strokeWidth="0.8" />)}
        </g>;
      })}

      {grid ? <CoordinateGrid scale={scale} /> : null}

      <g fill={INK} pointerEvents="none" paintOrder="stroke" stroke={PAPER} strokeWidth={3 / scale} strokeLinejoin="round">
        <text x={riverLabelPoint.x + 20} y={riverLabelPoint.y + 5 / scale} fill="#506f72" fontSize={readableFont(16, 11, 20, scale)} fontStyle="italic" letterSpacing={2 / scale}>{map.river.name}</text>
        {detail ? map.areas.filter((area) => area.kind === "woods" && area.label).map((area) => {
          const center = areaCenter(area);
          return <text key={area.id} x={center.x} y={center.y} fontSize={readableFont(11, 9, 15, scale)} textAnchor="middle" fill="#697253">{area.label}</text>;
        }) : null}
      </g>

      {labels.map(({ anchor, displayLabel, x, y, fontSize, align }) => {
        const point = toCanvasPoint(anchor);
        const clickable = Boolean(onPickAnchor);
        const gate = asia && anchor.label.includes("门") && anchor.kind === "city";
        return <g key={anchor.id} data-map-anchor={anchor.id} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
          aria-label={`${anchor.label}，坐标${anchor.x},${anchor.y}${clickable ? "，点击作为军令目标" : ""}`}
          style={clickable ? { cursor: "pointer" } : undefined}
          onPointerDown={clickable ? (event) => event.stopPropagation() : undefined}
          onClick={clickable ? (event) => { event.stopPropagation(); onPickAnchor?.(anchor); } : undefined}
          onKeyDown={clickable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPickAnchor?.(anchor); } } : undefined}>
          <title>{anchor.label} · 坐标 {anchor.x}, {anchor.y}</title>
          <circle cx={point.x} cy={point.y} r={10 / scale} fill="transparent" />
          {gate ? <rect x={point.x - 5} y={point.y - 5} width="10" height="10" fill="#eee2bf" stroke={INK} strokeWidth="1.5" /> : anchor.kind === "landing-zone" ? <circle cx={point.x} cy={point.y} r="5" fill="none" stroke="#776c55" strokeWidth="1.4" strokeDasharray="2 2" /> : <circle cx={point.x} cy={point.y} r={anchor.major ? 3 : 2} fill={PAPER} stroke={INK} strokeWidth="1.2" />}
          {Math.abs(y - point.y) > 27 / scale ? <path d={`M${point.x} ${point.y}L${x} ${y - 7 / scale}`} stroke="#8c8065" strokeWidth="0.7" vectorEffect="non-scaling-stroke" opacity="0.65" pointerEvents="none" /> : null}
          <text x={x} y={y} textAnchor={align} fill={INK} fontSize={fontSize} fontWeight={anchor.major ? 700 : 400} paintOrder="stroke" stroke={PAPER} strokeWidth={3 / scale} strokeLinejoin="round">{displayLabel}</text>
        </g>;
      })}

      <g pointerEvents="none">
        <rect x="26" y="24" width="340" height="57" rx="1" fill={PAPER} opacity="0.92" />
        <text x="34" y="47" fill={INK} fontSize="22" fontWeight="700" letterSpacing="3">{map.title}</text>
        <text x="35" y="68" fill="#7a735d" fontSize={readableFont(11, 8, 14, scale)} paintOrder="stroke" stroke={PAPER} strokeWidth={2 / scale}>{subtitle}</text>
        <g transform={`translate(${MAP_CANVAS.width - 56} 40)`} fill={INK}>
          <path d="M0 36L9 0L18 36L9 27Z" />
          <path d="M9 0V27L18 36Z" fill={PAPER} stroke={INK} strokeWidth="0.7" />
          <text x="9" y="52" textAnchor="middle" fontSize="12">北 N</text>
        </g>
        <text x="30" y={MAP_CANVAS.height - 24 / scale} fill="#746b54" fontSize={readableFont(10, 8, 12, scale)} paintOrder="stroke" stroke={PAPER} strokeWidth={2.5 / scale}>0—100 作战坐标 · 地形示意，非测绘比例图</text>
      </g>
    </g>
  );
}
