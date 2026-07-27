"use client";

import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { api, type PlayerSnapshotSummary } from "@/lib/api";
import type { GameEvent, PublicWorldState } from "@qianfu/core";
import { Button } from "@/components/ui/button";

export function SaveSlotsPanel({ gameInstanceId, state, onLoaded, disabled }: { gameInstanceId: string; state: PublicWorldState; onLoaded: (state: PublicWorldState, events: GameEvent[]) => void; disabled?: boolean }) {
  const [slots, setSlots] = useState<PlayerSnapshotSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = () => api.listSnapshots(gameInstanceId).then((result) => setSlots(result.snapshots)).catch(() => undefined);
  useEffect(() => { void refresh(); }, [gameInstanceId, state.stateVersion]);
  const save = async (slot: 1 | 2) => {
    const existing = slots.find((item) => item.slot === slot && item.savedAt);
    if (existing && !window.confirm(`覆盖槽位 ${slot}？原存档将被替换。`)) return;
    setBusy(true); try { await api.saveSnapshot(gameInstanceId, slot, existing?.label ?? ""); await refresh(); } finally { setBusy(false); }
  };
  const load = async (slot: 1 | 2) => {
    const saved = slots.find((item) => item.slot === slot && item.savedAt); if (!saved) return;
    if (!window.confirm(`加载槽位 ${slot}？保存点之后的所有行动将被丢弃，且无法撤销。`)) return;
    setBusy(true); try { const result = await api.loadSnapshot(gameInstanceId, slot); onLoaded(result.state, result.events); } finally { setBusy(false); }
  };
  return <section className="mt-6 border-t border-line pt-5"><p className="text-xs font-medium text-muted">战役存档</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{([1, 2] as const).map((slot) => { const saved = slots.find((item) => item.slot === slot && item.savedAt); return <div key={slot} className="border border-line bg-panel/30 p-3"><div className="flex items-center justify-between"><span className="text-xs text-paper">槽位 {slot}</span><span className="text-[10px] text-muted">{saved ? new Date(saved.savedAt).toLocaleString("zh-CN") : "空"}</span></div>{saved && <p className="mt-2 truncate text-[11px] text-muted">{saved.label || "未命名"} · {new Date(saved.currentTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>}<div className="mt-3 flex gap-2"><Button variant="outline" disabled={disabled || busy || state.status !== "active"} onClick={() => void save(slot)}><Save size={13} />保存</Button><Button variant="ghost" disabled={disabled || busy || !saved || state.status !== "active"} onClick={() => void load(slot)}><RotateCcw size={13} />加载</Button></div></div>; })}</div></section>;
}
