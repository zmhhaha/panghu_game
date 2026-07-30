"use client";

import { MapPin } from "lucide-react";

type Location = {
  id: string;
  name: string;
  district: string;
  travelMinutes: Record<string, number>;
  mapPosition?: { x: number; y: number };
  discovered: boolean;
  stage: "unknown" | "rumored" | "located" | "accessible" | "compromised";
  hint: string | null;
};

const stageLabel: Record<Location["stage"], string> = {
  unknown: "等待事件",
  rumored: "已有传闻",
  located: "尚无进入理由",
  accessible: "可以前往",
  compromised: "已封锁",
};

type PositionedLocation = Location & { position: { x: number; y: number } };

function fallbackPosition(index: number, count: number) {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: columns === 1 ? 50 : 16 + column * (68 / (columns - 1)),
    y: rows === 1 ? 50 : 16 + row * (68 / (rows - 1)),
  };
}

function buildRoads(locations: PositionedLocation[]) {
  const roads = new Map<string, [PositionedLocation, PositionedLocation]>();
  for (const location of locations) {
    const nearest = locations
      .filter((candidate) => candidate.id !== location.id)
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.position.x - location.position.x, candidate.position.y - location.position.y),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 2);
    for (const { candidate } of nearest) {
      const key = [location.id, candidate.id].sort().join(":");
      roads.set(key, [location, candidate]);
    }
  }
  return [...roads.values()];
}

export function CityMap({ locations, currentLocationId, travelMinutes, disabled, onTravel }: {
  locations: Location[];
  currentLocationId: string;
  travelMinutes: Record<string, number>;
  disabled: boolean;
  onTravel: (locationId: string, minutes: number) => void;
}) {
  const positionedLocations: PositionedLocation[] = locations.map((location, index) => ({
    ...location,
    position: location.mapPosition ?? fallbackPosition(index, locations.length),
  }));
  const roads = buildRoads(positionedLocations);
  return <div className="relative aspect-[4/5] min-h-[320px] overflow-hidden border border-line bg-panel">
    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#343b38 1px, transparent 1px), linear-gradient(90deg, #343b38 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
    {roads.map(([from, to]) => {
      const a = from.position; const b = to.position;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const width = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return <span key={`${from.id}-${to.id}`} className="absolute h-px origin-left bg-line" style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${width}%`, transform: `rotate(${angle}deg)` }} />;
    })}
    {positionedLocations.map((location) => {
      const position = location.position;
      const current = location.id === currentLocationId;
      const minutes = travelMinutes[location.id];
      const accessible = location.stage === "accessible";
      const status = current ? "当前位置" : accessible && minutes ? `${minutes} 分钟` : stageLabel[location.stage];
      const title = current ? "当前位置" : location.hint ?? (accessible && minutes ? `前往 ${location.name}，约 ${minutes} 分钟` : status);
      return <button key={location.id} title={title}
        disabled={disabled || current || !minutes || !location.discovered}
        onClick={() => minutes && onTravel(location.id, minutes)}
        className="group absolute z-10 w-[92px] -translate-x-1/2 -translate-y-1/2 text-center disabled:cursor-default"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}>
        <span className={`mx-auto grid h-8 w-8 place-items-center border transition-colors ${current ? "border-copper bg-copper text-ink" : accessible ? "border-line bg-ink text-muted group-hover:border-copper group-hover:text-copper" : location.stage === "rumored" || location.stage === "located" ? "border-dashed border-copper/60 bg-ink text-copper" : "border-dashed border-line bg-ink text-muted"}`}><MapPin size={15} /></span>
        <span className={`mt-1 block text-[11px] leading-4 ${current ? "font-medium text-paper" : "text-muted group-hover:text-paper"}`}>{location.name}</span>
        <span className="block min-h-3 text-[9px] text-muted">{status}</span>
      </button>;
    })}
  </div>;
}
