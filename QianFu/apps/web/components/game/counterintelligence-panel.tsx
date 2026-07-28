"use client";

import { useMemo, useState } from "react";
import { Eye, FileCheck2, Footprints, PackageMinus, Route } from "lucide-react";
import type { GameAction, PublicWorldState } from "@qianfu/core";
import type { GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";

const icons = { check_tail: Footprints, reinforce_cover: FileCheck2, plant_decoy: Route, relocate_materials: PackageMinus } as const;

export function CounterintelligencePanel({ state, context, busy, onAction }: {
  state: PublicWorldState;
  context: GameContext;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [targetLocationId, setTargetLocationId] = useState("");
  const targets = useMemo(() => context.locations.filter((location) => location.discovered && location.id !== state.currentLocationId), [context.locations, state.currentLocationId]);
  const chosenTarget = targets.some((location) => location.id === targetLocationId) ? targetLocationId : targets[0]?.id ?? "";
  return <section className="mt-6 border-t border-line pt-5">
    <p className="flex items-center gap-2 text-xs font-medium text-muted"><Eye size={15} />反侦察行动</p>
    <div className="mt-3 space-y-3">{context.countermeasures.map((option) => {
      const Icon = icons[option.kind];
      const missingTarget = option.requiresTarget && !chosenTarget;
      return <article key={option.kind} className="border-l-2 border-line pl-3">
        <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs text-paper"><Icon size={13} className="text-copper" />{option.label}</p><p className="mt-1 text-[10px] leading-5 text-muted">{option.description}</p></div><span className="shrink-0 text-[10px] text-muted">{option.durationMinutes} 分钟</span></div>
        {option.requiresTarget && <select aria-label="假行程目标地点" value={chosenTarget} onChange={(event) => setTargetLocationId(event.target.value)} className="mt-2 h-9 w-full border border-line bg-panel px-2 text-xs text-paper outline-none focus:border-copper">
          {targets.length === 0 && <option value="">没有其他已解锁地点</option>}
          {targets.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>}
        <div className="mt-2 flex items-center justify-between gap-3"><span className={`text-[10px] ${option.available ? "text-safe" : "text-[#c99b79]"}`}>{option.reason}</span><Button variant="ghost" className="h-8 px-2 text-xs" disabled={busy || !option.available || missingTarget} onClick={() => onAction({
          type: "countermeasure", kind: option.kind, targetLocationId: option.requiresTarget ? chosenTarget : undefined,
          durationMinutes: option.durationMinutes, idempotencyKey: crypto.randomUUID(),
        })}>执行</Button></div>
      </article>;
    })}</div>
  </section>;
}
