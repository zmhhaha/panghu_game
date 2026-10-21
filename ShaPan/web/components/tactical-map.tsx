"use client";

import { ChevronDown, ChevronUp, Crosshair, Globe2, History, LocateFixed, MapPin, Maximize2, Minimize2, Play, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "./ui/button";
import { BattlefieldTerrain } from "./battlefield-terrain";
import { cn } from "../lib/utils";
import { MAP_CANVAS, MAP_CONTRACT, toCanvasPoint, type MapPoint } from "../lib/map-definition";

export const TACTICAL_MAP_DIMENSIONS = MAP_CANVAS;

export type TacticalUnit = {
  id: string;
  name: string;
  side: "friendly" | "enemy";
  x: number;
  y: number;
  detail: string;
  status: string;
  summary: string;
  symbol: "infantry" | "artillery" | "armor" | "recon" | "hq";
  strength: string;
  morale: string;
  comms: string;
  updatedAtMinute?: number;
  lastReportAtMinute?: number;
  reportSource?: string;
  confidence?: string;
  expiresAtMinute?: number;
  reportedPosition?: MapPoint & { atMinute: number };
  movement?: {
    from?: MapPoint;
    to?: MapPoint;
    route?: MapPoint[];
    label?: string;
    kind?: "order" | "intel" | "fire_support" | "reconnaissance" | "logistics" | "hold";
    confidence?: string;
    phase?: "moving" | "halted" | "completed" | "delayed" | "engaged" | "retreating" | "firing";
    progress?: number;
    segment?: number;
    updatedAtMinute?: number;
    startedAtMinute?: number;
    durationMinutes?: number;
    blockedReason?: string;
  } | null;
};

export type MapLayers = { units: boolean; intel: boolean; orders: boolean; grid: boolean };
export type MapReportFocus = MapPoint & { id: string; unitId: string; atMinute: number; source: string; confidence?: string };
export type MapTarget = MapPoint & { label: string };

type TacticalMapProps = {
  campaignId: string;
  battleStarted: boolean;
  paused: boolean;
  battleEnded?: boolean;
  canStart: boolean;
  clockMinute: number;
  layers: MapLayers;
  units: TacticalUnit[];
  revealedUnitIds: Set<string>;
  selectedUnit: TacticalUnit;
  focusedUnitId?: string | null;
  focusedReport?: MapReportFocus | null;
  selectionRevision?: number;
  visibleReportCount: number;
  onSelectUnit: (unitId: string) => void;
  onClearFocus: () => void;
  onSetRecipient: (unitId: string) => void;
  onStartBattle: () => void;
  onPickTarget?: (target: MapTarget) => void;
};

type View = { center: MapPoint; zoom: number };
type Size = { width: number; height: number };
const HOME = { x: MAP_CANVAS.width / 2, y: MAP_CANVAS.height / 2 };
const COLORS = MAP_CONTRACT.colors;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pointList = (points: MapPoint[]) => points.map((p) => p.x + "," + p.y).join(" ");
const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function clock(minute?: number) {
  if (typeof minute !== "number" || !Number.isFinite(minute)) return "时间不明";
  const value = ((Math.floor(minute) % 1440) + 1440) % 1440;
  return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
}

function reportMinute(unit: TacticalUnit) {
  return unit.reportedPosition?.atMinute ?? unit.lastReportAtMinute ?? unit.updatedAtMinute;
}

function reportAge(unit: TacticalUnit, now: number) {
  const minute = reportMinute(unit);
  return typeof minute === "number" ? Math.max(0, now - minute) : null;
}

function intelState(unit: TacticalUnit, now: number) {
  const age = reportAge(unit, now);
  const confidence = unit.confidence ?? unit.movement?.confidence;
  if (confidence === "过期" || confidence === "stale" || age === null || age >= 60) return "过期";
  return (confidence === "已确认" || confidence === "confirmed") && age < 30 ? "确认" : "推定";
}

function shortName(unit: TacticalUnit) {
  const names: Record<string, string> = { cn31: "31师", cn30: "30师", cn27: "27师", cnart: "集团军炮兵", cnreserve: "预备队", uk1para: "1伞兵旅", uk2para: "2伞兵营", ukairland: "1机降旅", ukrecon: "空降侦察", ukart: "师属炮兵", jpseya: "濑谷支队？", jparmor: "日军战车？", deinf: "德军步兵？", de9ss: "德军装甲？" };
  return names[unit.id] ?? unit.name.replace(/^第/, "").slice(0, 8);
}

function constrainedView(view: View, size: Size, scale: number): View {
  const halfWidth = size.width / (2 * scale);
  const halfHeight = size.height / (2 * scale);
  return {
    ...view,
    center: {
      x: halfWidth >= MAP_CANVAS.width / 2 ? HOME.x : clamp(view.center.x, halfWidth - 24 / scale, MAP_CANVAS.width - halfWidth + 24 / scale),
      y: halfHeight >= MAP_CANVAS.height / 2 ? HOME.y : clamp(view.center.y, halfHeight - 24 / scale, MAP_CANVAS.height - halfHeight + 24 / scale),
    },
  };
}

function Glyph({ symbol, color }: { symbol: TacticalUnit["symbol"]; color: string }) {
  return <g stroke={color} fill="none" strokeWidth="1.5">
    <rect x="-8" y="-6" width="16" height="12" />
    {symbol === "infantry" ? <path d="M-8-6 L8 6 M8-6 L-8 6" /> : symbol === "armor" ? <ellipse rx="6" ry="3.5" /> : symbol === "artillery" ? <circle r="2.5" fill={color} /> : symbol === "recon" ? <path d="M-7 5 L7-5" /> : <path d="M-8 6 V17 M-7-5 L5-5 L5 2 L-7 2" />}
  </g>;
}

// Only group symbols in screen space. Report coordinates never change with layout.
function markerGroups(units: TacticalUnit[], scale: number) {
  const parents = units.map((_, index) => index);
  const find = (index: number): number => parents[index] === index ? index : (parents[index] = find(parents[index]));
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const a = toCanvasPoint(units[i]);
    const b = toCanvasPoint(units[j]);
    if (units[i].side === units[j].side && Math.abs(a.x - b.x) * scale < 83 && Math.abs(a.y - b.y) * scale < 45) parents[find(j)] = find(i);
  }
  const groups = new Map<number, TacticalUnit[]>();
  units.forEach((unit, index) => groups.set(find(index), [...(groups.get(find(index)) ?? []), unit]));
  return [...groups.values()].map((members) => {
    members.sort((a, b) => a.id.localeCompare(b.id));
    const points = members.map(toCanvasPoint);
    return { id: members.map((unit) => unit.id).join("/"), members, center: { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length } };
  });
}

type MarkerGroup = ReturnType<typeof markerGroups>[number];

function expandedCounterOffset(group: MarkerGroup, unit: TacticalUnit, index: number, scale: number) {
  const point = toCanvasPoint(unit);
  const columns = Math.max(1, Math.min(3, group.members.length, Math.floor((MAP_CANVAS.width * scale - 8) / 90)));
  const rows = Math.ceil(group.members.length / columns);
  const halfWidth = ((columns - 1) * 45 + 44) / scale;
  const halfHeight = ((rows - 1) * 24 + 22) / scale;
  const center = { x: clamp(group.center.x, halfWidth, MAP_CANVAS.width - halfWidth), y: clamp(group.center.y - 28 / scale, halfHeight, MAP_CANVAS.height - halfHeight) };
  return { x: (center.x - point.x) * scale + (index % columns - (columns - 1) / 2) * 90, y: (center.y - point.y) * scale + (Math.floor(index / columns) - (rows - 1) / 2) * 48 };
}

function boundedCounterOffset(point: MapPoint, scale: number, offset = { x: 0, y: 0 }) {
  return {
    x: (clamp(point.x + offset.x / scale, 44 / scale, MAP_CANVAS.width - 44 / scale) - point.x) * scale,
    y: (clamp(point.y + offset.y / scale, 22 / scale, MAP_CANVAS.height - 22 / scale) - point.y) * scale,
  };
}

function OperationalOverlays({ units, layers, focusId, scale, now, showHistory, showEstimates, markerId }: { units: TacticalUnit[]; layers: MapLayers; focusId: string | null; scale: number; now: number; showHistory: boolean; showEstimates: boolean; markerId: string }) {
  const halo = { stroke: "#e2d8b6", strokeWidth: 3 / scale, paintOrder: "stroke" as const };
  return <g pointerEvents="none" aria-label="根据已送达战报标绘的行动与敌情">
    <defs>
      <marker id={markerId} markerUnits="userSpaceOnUse" markerWidth={11 / scale} markerHeight={11 / scale} refX="10" refY="6" viewBox="0 0 12 12" orient="auto"><path d="M1 1 L11 6 L1 11 Z" fill={COLORS.friendly} /></marker>
    </defs>
    {units.map((unit) => {
      const current = toCanvasPoint(unit);
      const selected = unit.id === focusId;
      const opacity = focusId && !selected ? .35 : 1;
      if (unit.side === "enemy") {
        if (!layers.intel) return null;
        const confidence = intelState(unit, now);
        const age = reportAge(unit, now) ?? 90;
        const radius = (confidence === "确认" ? 16 : 28) + Math.min(80, age * .7);
        const color = confidence === "过期" ? COLORS.staleIntel : COLORS.enemy;
        // This is a last-observation area. Never read the hostile's hidden route.
        return <g key={unit.id} opacity={opacity * (confidence === "过期" ? .42 : .75)}>
          <ellipse cx={current.x} cy={current.y} rx={radius} ry={radius * .72} fill={color} fillOpacity=".09" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeDasharray={confidence === "确认" ? undefined : confidence === "过期" ? "2 7" : "6 5"} />
          {selected ? <text x={current.x} y={current.y + radius * .72 + 14 / scale} textAnchor="middle" fontSize={10 / scale} fill={color} {...halo}>{confidence + " · 报 " + clock(reportMinute(unit)) + " · 范围随时效扩大"}</text> : null}
        </g>;
      }
      const movement = unit.movement;
      if (!layers.orders || !movement) return null;
      const route = movement.route?.length ? movement.route.map(toCanvasPoint) : [movement.from ? toCanvasPoint(movement.from) : current, movement.to ? toCanvasPoint(movement.to) : current];
      const segment = clamp(movement.segment ?? 0, 0, Math.max(0, route.length - 2));
      const remaining = [current, ...route.slice(segment + 1)];
      const target = movement.to ? toCanvasPoint(movement.to) : remaining[remaining.length - 1];
      const completed = movement.phase === "completed";
      const engaged = movement.phase === "engaged" || /^(局部交战|正在交战|交战中)$/.test(unit.status);
      const halted = movement.phase === "delayed" || movement.phase === "halted";
      const next = remaining[1];
      const travelled = [...route.slice(0, segment + 1), current];
      const estimate = [current];
      if (showEstimates && selected && !completed && !engaged && !halted && movement.kind !== "fire_support" && movement.kind !== "hold" && movement.durationMinutes) {
        const totalDistance = route.slice(1).reduce((sum, point, index) => sum + distance(route[index], point), 0);
        let budget = totalDistance * (reportAge(unit, now) ?? 0) / Math.max(1, movement.durationMinutes);
        for (const point of remaining.slice(1)) {
          const previous = estimate[estimate.length - 1];
          const length = distance(previous, point);
          if (budget <= 0) break;
          if (budget < length) { estimate.push({ x: previous.x + (point.x - previous.x) * budget / length, y: previous.y + (point.y - previous.y) * budget / length }); break; }
          estimate.push(point);
          budget -= length;
        }
      }
      const estimatedPosition = estimate[estimate.length - 1];
      const line = { fill: "none", stroke: COLORS.friendly, vectorEffect: "non-scaling-stroke" as const };
      return <g key={unit.id} opacity={opacity}>
        {showHistory && selected && travelled.length > 1 ? <polyline points={pointList(travelled)} {...line} strokeWidth="1.4" opacity=".32" /> : null}
        {estimate.length > 1 && distance(current, estimatedPosition) * scale > 10 ? <g opacity=".65">
          <polyline points={pointList(estimate)} {...line} strokeWidth="1.5" strokeDasharray="2 5" />
          <g transform={"translate(" + estimatedPosition.x + " " + estimatedPosition.y + ") scale(" + 1 / scale + ")"}>
            <path d="M0-7 L7 0 L0 7 L-7 0 Z" fill="#e2d8b6" stroke={COLORS.friendly} strokeWidth="1.8" />
            <text x="11" y="4" fontSize="9" fill={COLORS.friendly} stroke="#e2d8b6" strokeWidth="3" paintOrder="stroke">推算位置 · 待回报</text>
          </g>
        </g> : null}
        {movement.kind === "fire_support" && !completed ? <g stroke={COLORS.fireSupport} fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke">
          {selected ? <path d={"M" + current.x + " " + current.y + " L" + target.x + " " + target.y} strokeDasharray="9 6" vectorEffect="non-scaling-stroke" /> : null}
          <circle cx={target.x} cy={target.y} r={15 / scale} vectorEffect="non-scaling-stroke" />
          <path d={"M" + (target.x - 22 / scale) + " " + target.y + " H" + (target.x + 22 / scale) + " M" + target.x + " " + (target.y - 22 / scale) + " V" + (target.y + 22 / scale)} vectorEffect="non-scaling-stroke" />
          {selected ? <text x={target.x + 24 / scale} y={target.y - 16 / scale} fontSize={10 / scale} fill={COLORS.fireSupport} stroke="none">火力目标</text> : null}
        </g> : engaged ? <g transform={"translate(" + current.x + " " + current.y + ") scale(" + 1 / scale + ")"}>
          <path d="M-18-27 L-7-16 M-7-27 L-18-16 M-22-13 Q0-37 22-13" fill="none" stroke={COLORS.enemy} strokeWidth="2.5" />
          {selected ? <text y="-35" textAnchor="middle" fontSize="10" fill={COLORS.enemy}>交战报告</text> : null}
        </g> : movement.kind === "hold" ? <path d={"M" + (current.x - 20 / scale) + " " + (current.y - 25 / scale) + " v" + (-7 / scale) + " h" + (40 / scale) + " v" + (7 / scale)} {...line} strokeWidth="2.5" /> : halted ? <g transform={"translate(" + current.x + " " + current.y + ") scale(" + 1 / scale + ")"}>
          <path d="M-5-31 v10 M5-31 v10" stroke={COLORS.staleIntel} strokeWidth="3" />
          {selected ? <text y="-39" textAnchor="middle" fontSize="10" fill={COLORS.staleIntel}>{movement.blockedReason || "停止 / 延误"}</text> : null}
        </g> : !completed && next && distance(current, next) > 1 ? <>
          {selected && remaining.length > 2 ? <polyline points={pointList(remaining.slice(1))} {...line} strokeWidth="1.7" strokeDasharray="7 6" opacity=".65" /> : null}
          <polyline points={pointList([current, selected ? next : { x: current.x + (next.x - current.x) * Math.min(1, 48 / scale / distance(current, next)), y: current.y + (next.y - current.y) * Math.min(1, 48 / scale / distance(current, next)) }])} {...line} strokeWidth="2.6" strokeDasharray={movement.phase === "retreating" ? "6 4" : undefined} markerEnd={"url(#" + markerId + ")"} />
          {selected ? <g transform={"translate(" + target.x + " " + target.y + ") scale(" + 1 / scale + ")"}>
            <circle r="6" fill="#e2d8b6" stroke={COLORS.friendly} strokeWidth="1.7" />
            <text x="10" y="-9" fontSize="10" fill={COLORS.friendly} stroke="#e2d8b6" strokeWidth="3" paintOrder="stroke">{movement.label || "任务目标"}</text>
          </g> : null}
        </> : null}
      </g>;
    })}
  </g>;
}

export function TacticalMap({ campaignId, battleStarted, paused, battleEnded = false, canStart, clockMinute, layers, units, revealedUnitIds, selectedUnit, focusedUnitId = null, focusedReport = null, selectionRevision = 0, visibleReportCount, onSelectUnit, onClearFocus, onSetRecipient, onStartBattle, onPickTarget }: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState<Size>({ width: 900, height: 720 });
  const [view, setView] = useState<View>({ center: HOME, zoom: 1 });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEstimates, setShowEstimates] = useState(false);
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState<MapTarget | null>(null);
  const [cursor, setCursor] = useState<MapPoint | null>(null);
  const [panning, setPanning] = useState(false);
  const gesture = useRef<{ start: MapPoint; center: MapPoint; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, MapPoint>());
  const pinch = useRef<{ distance: number; zoom: number; anchor: MapPoint } | null>(null);
  const previousSelected = useRef({ id: selectedUnit.id, revision: selectionRevision });
  const markerId = "march-" + useId().replace(/:/g, "");
  const clipId = markerId + "-extent";
  const fitScale = Math.max(.05, Math.min(size.width / MAP_CANVAS.width, size.height / MAP_CANVAS.height));
  const scale = fitScale * view.zoom;
  const translation = { x: size.width / 2 - view.center.x * scale, y: size.height / 2 - view.center.y * scale };
  const knownUnits = useMemo(() => battleStarted ? units.filter((unit) => {
    if (!revealedUnitIds.has(unit.id) || !Number.isFinite(unit.x) || !Number.isFinite(unit.y)) return false;
    if (unit.side === "friendly") return true;
    return (unit.expiresAtMinute === undefined || clockMinute <= unit.expiresAtMinute) && (reportAge(unit, clockMinute) ?? 120) < 120;
  }) : [], [battleStarted, units, revealedUnitIds, clockMinute]);
  const visibleUnits = useMemo(() => knownUnits.filter((unit) => layers.units && (unit.side === "friendly" || layers.intel)), [knownUnits, layers.units, layers.intel]);
  const groups = useMemo(() => markerGroups(visibleUnits, scale), [visibleUnits, scale]);
  const labelObstacles = useMemo(() => groups.flatMap((group) => {
    const open = group.members.length === 1 || expandedCluster === group.id || group.members.some((unit) => unit.id === focusId);
    if (!open) {
      const offset = boundedCounterOffset(group.center, scale);
      return [{ x: group.center.x + (offset.x - 44) / scale, y: group.center.y + (offset.y - 22) / scale, width: 88 / scale, height: 44 / scale }];
    }
    return group.members.map((unit, index) => {
      const point = toCanvasPoint(unit);
      const offset = boundedCounterOffset(point, scale, group.members.length > 1 ? expandedCounterOffset(group, unit, index, scale) : undefined);
      return { x: point.x + (offset.x - 44) / scale, y: point.y + (offset.y - 22) / scale, width: 88 / scale, height: 44 / scale };
    });
  }), [groups, expandedCluster, focusId, scale]);
  const selectedKnown = revealedUnitIds.has(selectedUnit.id);
  const hasReports = battleStarted && visibleReportCount > 0;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setView({ center: HOME, zoom: 1 });
    setFocusId(null);
    setPanelOpen(false);
    setPanelExpanded(false);
    setExpandedCluster(null);
    setTarget(null);
    setPicking(false);
  }, [campaignId]);

  useEffect(() => {
    if (!focusedUnitId) return;
    setFocusId(focusedUnitId);
    setPanelOpen(true);
    setPanelExpanded(false);
    const unit = units.find((item) => item.id === focusedUnitId);
    const point = focusedReport ?? (unit && revealedUnitIds.has(unit.id) ? unit : null);
    if (point) setView((previous) => { const zoom = Math.max(1.7, previous.zoom); return constrainedView({ center: toCanvasPoint(point), zoom }, size, fitScale * zoom); });
    // Focus follows a deliberate selection, never every incoming position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedUnitId, focusedReport?.id]);

  useEffect(() => {
    if (previousSelected.current.id === selectedUnit.id && previousSelected.current.revision === selectionRevision) return;
    previousSelected.current = { id: selectedUnit.id, revision: selectionRevision };
    setPanelExpanded(false);
    if (!revealedUnitIds.has(selectedUnit.id)) { setFocusId(null); setPanelOpen(false); return; }
    setFocusId(selectedUnit.id);
    setPanelOpen(true);
    if (!focusedUnitId) setView((previous) => { const zoom = Math.max(1.7, previous.zoom); return constrainedView({ center: toCanvasPoint(selectedUnit), zoom }, size, fitScale * zoom); });
    // A roster selection is a camera action; subsequent reports do not move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit.id, selectionRevision]);

  useEffect(() => {
    setView((previous) => constrainedView(previous, size, fitScale * previous.zoom));
  }, [size.width, size.height, fitScale]);

  function clearFocus() {
    setFocusId(null);
    setPanelOpen(false);
    setPanelExpanded(false);
    setExpandedCluster(null);
    setTarget(null);
    setPicking(false);
    onClearFocus();
  }

  const clearRef = useRef(clearFocus);
  clearRef.current = clearFocus;
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (expanded) setExpanded(false);
      else clearRef.current();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [expanded]);

  function mapPoint(clientX: number, clientY: number): MapPoint | null {
    const matrix = worldRef.current?.getScreenCTM();
    if (!matrix || !svgRef.current) return null;
    const point = svgRef.current.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const result = point.matrixTransform(matrix.inverse());
    return { x: result.x, y: result.y };
  }

  function changeZoom(nextZoom: number, anchor = view.center, screen?: MapPoint) {
    const zoom = clamp(nextZoom, 1, 5);
    const nextScale = fitScale * zoom;
    const center = screen ? { x: anchor.x - (screen.x - size.width / 2) / nextScale, y: anchor.y - (screen.y - size.height / 2) / nextScale } : anchor;
    setView(constrainedView({ center, zoom }, size, nextScale));
  }

  // Native non-passive listener keeps wheel zoom from also scrolling the page.
  const wheelRef = useRef<(event: WheelEvent) => void>();
  wheelRef.current = (event) => {
    event.preventDefault();
    const anchor = mapPoint(event.clientX, event.clientY);
    const bounds = svgRef.current?.getBoundingClientRect();
    if (anchor && bounds) changeZoom(view.zoom * Math.exp(-event.deltaY * .0015), anchor, { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handle = (event: WheelEvent) => wheelRef.current?.(event);
    svg.addEventListener("wheel", handle, { passive: false });
    return () => svg.removeEventListener("wheel", handle);
  }, []);

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const anchor = mapPoint(midpoint.x, midpoint.y);
      if (anchor) pinch.current = { distance: Math.max(1, distance(a, b)), zoom: view.zoom, anchor };
      if (gesture.current) gesture.current.moved = true;
    } else gesture.current = { start: { x: event.clientX, y: event.clientY }, center: view.center, moved: false };
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const point = mapPoint(event.clientX, event.clientY);
    setCursor(point && point.x >= 0 && point.x <= MAP_CANVAS.width && point.y >= 0 && point.y <= MAP_CANVAS.height ? { x: Math.round(point.x / MAP_CANVAS.width * 100), y: Math.round(point.y / MAP_CANVAS.height * 100) } : null);
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const bounds = svgRef.current!.getBoundingClientRect();
      changeZoom(pinch.current.zoom * distance(a, b) / pinch.current.distance, pinch.current.anchor, { x: (a.x + b.x) / 2 - bounds.left, y: (a.y + b.y) / 2 - bounds.top });
      return;
    }
    if (!gesture.current || pinch.current) return;
    const dx = event.clientX - gesture.current.start.x;
    const dy = event.clientY - gesture.current.start.y;
    if (Math.hypot(dx, dy) > 5) { gesture.current.moved = true; setPanning(true); }
    if (gesture.current.moved) setView(constrainedView({ ...view, center: { x: gesture.current.center.x - dx / scale, y: gesture.current.center.y - dy / scale } }, size, scale));
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const moved = gesture.current?.moved || Boolean(pinch.current);
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved && event.type !== "pointercancel") {
      const point = mapPoint(event.clientX, event.clientY);
      if (point && point.x >= 0 && point.y >= 0 && point.x <= MAP_CANVAS.width && point.y <= MAP_CANVAS.height) {
        if (picking) setTarget({ x: Math.round(point.x / MAP_CANVAS.width * 100), y: Math.round(point.y / MAP_CANVAS.height * 100), label: "指定地域" });
        else clearFocus();
      }
    }
    if (!pointers.current.size) { gesture.current = null; pinch.current = null; setPanning(false); }
  }

  function selectUnit(unit: TacticalUnit) {
    setFocusId(unit.id);
    setPanelOpen(true);
    setPanelExpanded(false);
    onClearFocus();
    onSelectUnit(unit.id);
  }

  function pickAnchor(anchor: MapPoint & { label: string }) {
    setTarget({ x: anchor.x, y: anchor.y, label: anchor.label });
    setPicking(false);
  }

  function renderCounter(unit: TacticalUnit, proposedOffset = { x: 0, y: 0 }) {
    const point = toCanvasPoint(unit);
    const offset = boundedCounterOffset(point, scale, proposedOffset);
    const color = unit.side === "friendly" ? COLORS.friendly : intelState(unit, clockMinute) === "过期" ? COLORS.staleIntel : COLORS.enemy;
    const active = focusId === unit.id;
    const minute = reportMinute(unit);
    return <g key={unit.id}>
      {(offset.x || offset.y) ? <path d={"M" + point.x + " " + point.y + " l" + offset.x / scale + " " + offset.y / scale} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity=".6" vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
      {unit.side === "friendly" ? <circle cx={point.x} cy={point.y} r={2.5 / scale} fill={color} pointerEvents="none" /> : null}
      <g transform={"translate(" + (point.x + offset.x / scale) + " " + (point.y + offset.y / scale) + ") scale(" + 1 / scale + ")"} role="button" tabIndex={0} aria-label={unit.name + "，最后报告 " + clock(minute)} style={{ cursor: "pointer" }} opacity={focusId && !active ? .5 : 1} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectUnit(unit); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectUnit(unit); } }}>
        <title>{unit.name + " · " + (unit.side === "friendly" ? "最后报告位置" : "情报推定中心") + " " + Math.round(unit.x) + "," + Math.round(unit.y) + " · " + clock(minute) + " · " + unit.status}</title>
        <rect x="-39" y="-17" width="78" height="35" rx="1" fill="#e2d8b6" stroke={color} strokeWidth={active ? 2.8 : 1.6} strokeDasharray={unit.side === "enemy" ? "4 3" : undefined} />
        {active ? <rect x="-43" y="-21" width="86" height="43" fill="none" stroke={color} strokeWidth="1" opacity=".5" /> : null}
        <g transform="translate(-26 -4)">{unit.side === "friendly" ? <Glyph symbol={unit.symbol} color={color} /> : <text y="4" textAnchor="middle" fontSize="16" fill={color}>?</text>}</g>
        <text x="-12" y="-1" fontSize={shortName(unit).length > 5 ? 8 : 10} fontWeight="700" fill={color}>{shortName(unit)}</text>
        <text x="0" y="12" textAnchor="middle" fontSize="8" fill={color}>{unit.side === "enemy" ? intelState(unit, clockMinute) + " · " : "报 "}{clock(minute)}</text>
      </g>
    </g>;
  }

  return <div ref={containerRef} className={cn("tactical-map relative flex-1 overflow-hidden bg-[#c6bfa1]", expanded ? "fixed inset-3 z-[100] shadow-2xl" : "min-h-[560px] min-[900px]:min-h-0")} data-map-version={MAP_CONTRACT.version}>
    <svg ref={svgRef} className={cn("absolute inset-0 h-full w-full touch-none", picking ? "cursor-crosshair" : panning ? "cursor-grabbing" : "cursor-grab")} viewBox={"0 0 " + size.width + " " + size.height} preserveAspectRatio="xMidYMid meet" role="group" aria-label="可缩放作战地图，拖动平移，滚轮或双指缩放" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); if (!pointers.current.size) { gesture.current = null; pinch.current = null; setPanning(false); } }} onDoubleClick={(event) => { const point = mapPoint(event.clientX, event.clientY); if (point) changeZoom(view.zoom * 1.5, point); }}>
      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><rect width={MAP_CANVAS.width} height={MAP_CANVAS.height} /></clipPath></defs>
      <g ref={worldRef} transform={"translate(" + translation.x + " " + translation.y + ") scale(" + scale + ")"} clipPath={"url(#" + clipId + ")"}>
        <BattlefieldTerrain campaignId={campaignId} grid={layers.grid} detail={view.zoom >= 1.5} renderScale={scale} labelObstacles={labelObstacles} onPickAnchor={pickAnchor} />
        <OperationalOverlays units={knownUnits} layers={layers} focusId={focusId} scale={scale} now={clockMinute} showHistory={showHistory} showEstimates={showEstimates} markerId={markerId} />
        {groups.map((group) => {
          if (group.members.length === 1) return renderCounter(group.members[0]);
          const open = expandedCluster === group.id || group.members.some((unit) => unit.id === focusId);
          if (open) return <g key={group.id}>{group.members.map((unit, index) => {
            return renderCounter(unit, expandedCounterOffset(group, unit, index, scale));
          })}</g>;
          const color = group.members[0].side === "friendly" ? COLORS.friendly : COLORS.enemy;
          const offset = boundedCounterOffset(group.center, scale);
          const center = { x: group.center.x + offset.x / scale, y: group.center.y + offset.y / scale };
          return <g key={group.id}>
            {group.members.map((unit) => { const position = toCanvasPoint(unit); return <g key={unit.id} pointerEvents="none"><path d={"M" + position.x + " " + position.y + " L" + center.x + " " + center.y} stroke={color} opacity=".4" strokeWidth="1" vectorEffect="non-scaling-stroke" /><circle cx={position.x} cy={position.y} r={2 / scale} fill={color} /></g>; })}
            <g transform={"translate(" + center.x + " " + center.y + ") scale(" + 1 / scale + ")"} role="button" tabIndex={0} aria-label={group.members.length + "支部队，展开列表"} style={{ cursor: "pointer" }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setExpandedCluster(group.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpandedCluster(group.id); } }}>
              <rect x="-39" y="-21" width="78" height="35" fill="#d6cba5" stroke={color} strokeWidth="1.5" />
              <rect x="-43" y="-17" width="78" height="35" fill="#e2d8b6" stroke={color} strokeWidth="1.7" />
              <text x="-4" y="-2" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{group.members.length + (group.members[0].side === "friendly" ? " 支己方部队" : " 条敌情")}</text>
              <text x="-4" y="12" textAnchor="middle" fontSize="8" fill={color}>点击展开 · 位置见引线</text>
            </g>
          </g>;
        })}
        {focusedReport ? <g transform={"translate(" + toCanvasPoint(focusedReport).x + " " + toCanvasPoint(focusedReport).y + ") scale(" + 1 / scale + ")"} pointerEvents="none">
          <circle r="28" fill="none" stroke="#876532" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M-34 0 H-23 M23 0 H34 M0-34 V-23 M0 23 V34" stroke="#876532" strokeWidth="2" />
          <text y="-40" textAnchor="middle" fill="#634b28" fontSize="10" stroke="#e2d8b6" strokeWidth="3" paintOrder="stroke">{"报告位置 · " + clock(focusedReport.atMinute)}</text>
        </g> : null}
        {target ? <g transform={"translate(" + toCanvasPoint(target).x + " " + toCanvasPoint(target).y + ") scale(" + 1 / scale + ")"} pointerEvents="none"><path d="M0 6 V-26 L20-20 L0-14" stroke="#725329" strokeWidth="2" fill="#cda764" /><circle cy="7" r="4" fill="#725329" /></g> : null}
      </g>
    </svg>

    <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 border border-[#545c4d] bg-[#e2d8b6]/95 p-1 text-[#354039] shadow-lg" aria-label="地图视图控制">
      <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-black/10 disabled:opacity-30" onClick={() => changeZoom(view.zoom * 1.3)} disabled={view.zoom >= 5} title="放大地图" aria-label="放大地图"><ZoomIn size={16} /></button>
      <span className="text-center font-mono text-[9px]">{Math.round(view.zoom * 100)}%</span>
      <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-black/10 disabled:opacity-30" onClick={() => changeZoom(view.zoom / 1.3)} disabled={view.zoom <= 1} title="缩小地图" aria-label="缩小地图"><ZoomOut size={16} /></button>
      <button type="button" className="flex h-8 w-8 items-center justify-center border-t border-[#545c4d]/30 hover:bg-black/10" onClick={() => setView({ center: HOME, zoom: 1 })} title="适应全图" aria-label="适应全图"><RotateCcw size={15} /></button>
      <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-black/10 disabled:opacity-30" disabled={!selectedKnown} onClick={() => { setFocusId(selectedUnit.id); setPanelOpen(true); changeZoom(Math.max(2, view.zoom), toCanvasPoint(selectedUnit)); }} title="定位选中部队最后报告位置" aria-label="定位选中部队"><LocateFixed size={16} /></button>
      <button type="button" className={cn("flex h-8 w-8 items-center justify-center hover:bg-black/10", showHistory && "bg-[#b7a271]/50")} onClick={() => setShowHistory((value) => !value)} title="选中部队已报告的行军轨迹" aria-label="切换已行轨迹" aria-pressed={showHistory}><History size={15} /></button>
      <button type="button" className={cn("flex h-8 w-8 items-center justify-center text-[10px] hover:bg-black/10", showEstimates && "bg-[#b7a271]/50")} onClick={() => setShowEstimates((value) => !value)} title="按最后报告路线推算选中部队位置，不代表已确认位置" aria-label="切换推算位置" aria-pressed={showEstimates}>推算</button>
      <button type="button" className={cn("flex h-8 w-8 items-center justify-center hover:bg-black/10 disabled:opacity-30", picking && "bg-[#b7a271]/50")} disabled={!battleStarted || battleEnded} onClick={() => { setPicking((value) => !value); setTarget(null); }} title="从地图选取军令目标" aria-label="选取军令目标" aria-pressed={picking}><MapPin size={15} /></button>
      <button type="button" className="flex h-8 w-8 items-center justify-center border-t border-[#545c4d]/30 hover:bg-black/10" onClick={() => setExpanded((value) => !value)} title={expanded ? "恢复地图尺寸" : "展开地图"} aria-label={expanded ? "恢复地图尺寸" : "展开地图"}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
    </div>

    {selectedKnown && panelOpen ? <div className={cn("absolute left-3 top-3 z-20 border border-[#4b544c] bg-[#172019]/95 p-2 text-paper shadow-xl", panelExpanded ? "w-[min(276px,calc(100%-5rem))]" : "w-[min(228px,calc(100%-5rem))]")}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPanelExpanded((value) => !value)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={panelExpanded} aria-controls="selected-unit-details">
          <span className="min-w-0 flex-1"><b className="block truncate text-xs">{selectedUnit.name}</b><span className="mt-1 block text-[9px] text-muted">{"最后报告 " + clock(reportMinute(selectedUnit)) + " · " + Math.round(selectedUnit.x) + "," + Math.round(selectedUnit.y)}</span></span>
          {panelExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button type="button" onClick={clearFocus} className="p-1 text-muted hover:text-paper" title="关闭部队信息" aria-label="关闭部队信息"><X size={13} /></button>
      </div>
      {panelExpanded ? <div id="selected-unit-details">
        <p className="mt-3 text-[10px] text-copper">{selectedUnit.side === "friendly" ? "己方报告" : "敌情" + intelState(selectedUnit, clockMinute)} · {selectedUnit.reportSource || selectedUnit.comms} · {reportAge(selectedUnit, clockMinute) === null ? "报告时间不明" : reportAge(selectedUnit, clockMinute) + "分钟前"}</p>
        <p className="mt-2 text-xs leading-5 text-paper/85">{selectedUnit.summary}</p>
        <dl className="mt-3 grid grid-cols-3 border-y border-line py-2 text-xs"><div><dt className="text-[9px] text-muted">兵力</dt><dd className="mt-1">{selectedUnit.strength}</dd></div><div><dt className="text-[9px] text-muted">士气</dt><dd className="mt-1">{selectedUnit.morale}</dd></div><div><dt className="text-[9px] text-muted">通信</dt><dd className="mt-1">{selectedUnit.comms}</dd></div></dl>
        <p className="mt-2 text-[10px] leading-5 text-muted">{selectedUnit.status}{selectedUnit.movement?.blockedReason ? " · " + selectedUnit.movement.blockedReason : ""}</p>
        {selectedUnit.side === "friendly" ? <button type="button" onClick={() => { onSetRecipient(selectedUnit.id); setExpanded(false); }} className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-blueMark/60 bg-blueMark/15 text-xs"><Crosshair size={13} />设为命令对象</button> : null}
        {focusedReport ? <p className="mt-2 text-[9px] leading-4 text-copper">地图圆环为所选战报当时的位置；部队框为最新已知报告。</p> : null}
      </div> : null}
    </div> : null}

    {target || picking ? <div className="absolute bottom-20 left-3 z-30 max-w-[calc(100%-5rem)] border border-[#695735] bg-[#e2d8b6]/95 p-3 text-xs text-[#354039] shadow-lg">
      {target ? <><p className="font-bold">{target.label + " · 坐标 " + target.x + "," + target.y}</p><p className="mt-1 text-[10px]">填入草稿后，仍需确认军令并发送。</p><div className="mt-2 flex gap-2"><button type="button" disabled={!battleStarted || battleEnded || !onPickTarget} onClick={() => { onPickTarget?.(target); setTarget(null); setExpanded(false); }} className="border border-[#695735] px-3 py-1 disabled:opacity-40">填入军令</button><button type="button" onClick={() => { setTarget(null); setPicking(false); }} className="px-2 py-1">取消</button></div></> : <p>点击地图选取目标，或点击地名。Esc 取消。</p>}
    </div> : null}

    {!battleStarted ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#111613]/65 px-5 backdrop-blur-[1px]"><div className="w-full max-w-md border border-copper/70 bg-panel/95 p-6 text-center shadow-2xl"><p className="text-[10px] text-copper">战前待命</p><h3 className="mt-3 text-2xl font-bold">作战时钟尚未启动</h3><p className="mt-3 text-sm leading-6 text-muted">开始战役后，各部队报告与敌情将按通信延迟逐步抵达。地图只标绘指挥所已经收到的情报。</p><Button className="mt-5" variant="copper" disabled={!canStart} onClick={onStartBattle}><Play size={15} />开始战役</Button></div></div> : !hasReports ? <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><div className="border border-[#4e5a4c]/60 bg-[#e2d8b6]/95 px-5 py-3 text-xs font-bold text-[#3e493f]">等待第一批战场回报</div></div> : null}
    {battleStarted && (expanded || paused) ? <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap border border-copper/60 bg-panel/95 px-3 py-1.5 text-[10px] text-paper shadow-lg">{clock(clockMinute) + " · " + (battleEnded ? "战役结束" : paused ? "战役暂停 · 可研判与下令" : "战役进行中")}</div> : null}

    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border border-[#3b433c] bg-[#172019]/95 px-3 py-2 text-[9px] text-paper shadow-lg">
      <span className="flex items-center gap-1"><i className="h-2 w-3 border-2 border-blueMark" />己方报告</span>
      <span className="flex items-center gap-1"><i className="h-2 w-4 rounded-full border border-dashed border-alert" />敌情范围</span>
      <span className="hidden items-center gap-1 sm:flex"><i className="w-4 border-t-2 border-blueMark" />报告时行动</span>
      <span className="hidden items-center gap-1 sm:flex"><i className="w-4 border-t border-dashed border-blueMark" />后续计划</span>
      <span className="ml-auto font-mono text-muted">{cursor ? cursor.x + "," + cursor.y : "0–100 作战网格"}</span>
      <button type="button" onClick={() => { clearFocus(); setView({ center: HOME, zoom: 1 }); }} className="flex items-center gap-1 border border-copper/60 px-2 py-1 text-copper hover:bg-copper/15" title="清除聚焦并适应全图，显示全部已知态势"><Globe2 size={12} />全局态势</button>
    </div>
    <span className="pointer-events-none absolute bottom-[66px] right-3 text-[9px] text-[#354039]">{picking ? "选取军令目标" : "拖动平移 · 滚轮 / 双指缩放"}</span>
  </div>;
}
