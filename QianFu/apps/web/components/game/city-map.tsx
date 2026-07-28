"use client";

import { MapPin } from "lucide-react";

type Location = {
  id: string;
  name: string;
  district: string;
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

const positions: Record<string, { x: number; y: number }> = {
  "archive-office": { x: 28, y: 18 },
  "radio-office": { x: 70, y: 20 },
  "linjiang-news": { x: 51, y: 43 },
  "jianghai-hotel": { x: 76, y: 62 },
  "third-dock": { x: 28, y: 81 },
  "wu-clock-shop": { x: 20, y: 52 },
};

const roads = [
  ["archive-office", "radio-office"], ["archive-office", "linjiang-news"],
  ["archive-office", "wu-clock-shop"], ["radio-office", "linjiang-news"],
  ["radio-office", "jianghai-hotel"], ["linjiang-news", "jianghai-hotel"],
  ["linjiang-news", "wu-clock-shop"], ["wu-clock-shop", "third-dock"],
  ["linjiang-news", "third-dock"], ["jianghai-hotel", "third-dock"],
] as const;

export function CityMap({ locations, currentLocationId, travelMinutes, disabled, onTravel }: {
  locations: Location[];
  currentLocationId: string;
  travelMinutes: Record<string, number>;
  disabled: boolean;
  onTravel: (locationId: string, minutes: number) => void;
}) {
  return <div className="relative aspect-[4/5] min-h-[320px] overflow-hidden border border-line bg-panel">
    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#343b38 1px, transparent 1px), linear-gradient(90deg, #343b38 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
    <div className="absolute left-3 top-3 text-[10px] text-muted">临江市行动图</div>
    <div className="absolute bottom-3 right-3 text-[9px] text-muted">每格约十分钟步程</div>
    {roads.map(([from, to]) => {
      const a = positions[from]; const b = positions[to];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const width = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return <span key={`${from}-${to}`} className="absolute h-px origin-left bg-line" style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${width}%`, transform: `rotate(${angle}deg)` }} />;
    })}
    {locations.map((location) => {
      const position = positions[location.id] ?? { x: 50, y: 50 };
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
