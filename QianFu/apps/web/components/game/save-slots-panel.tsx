"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save, X } from "lucide-react";
import { api, type PlayerSnapshotSummary } from "@/lib/api";
import type { GameEvent, PublicWorldState } from "@qianfu/core";
import { Button } from "@/components/ui/button";

export function SaveSlotsPanel({ gameInstanceId, state, onLoaded, disabled }: {
  gameInstanceId: string;
  state: PublicWorldState;
  onLoaded: (state: PublicWorldState, events: GameEvent[]) => void;
  disabled?: boolean;
}) {
  const [slots, setSlots] = useState<PlayerSnapshotSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => setSlots((await api.listSnapshots(gameInstanceId)).snapshots);

  useEffect(() => { void refresh().catch(() => undefined); }, [gameInstanceId, state.stateVersion]);

  const save = async (slot: 1 | 2) => {
    const existing = slots.find((item) => item.slot === slot && item.savedAt);
    if (existing && !window.confirm(`覆盖存档槽位 ${slot}？原存档将被替换。`)) return;
    setBusy(true); setError("");
    try {
      await api.saveSnapshot(gameInstanceId, slot, existing?.label ?? "");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "保存存档失败"); } finally { setBusy(false); }
  };

  const load = async (slot: 1 | 2) => {
    const saved = slots.find((item) => item.slot === slot && item.savedAt);
    if (!saved) return;
    if (!window.confirm(`加载槽位 ${slot}？保存点之后的所有行动将被丢弃，且无法撤销。`)) return;
    setBusy(true); setError("");
    try {
      const result = await api.loadSnapshot(gameInstanceId, slot);
      onLoaded(result.state, result.events);
      setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "加载存档失败"); } finally { setBusy(false); }
  };

  return <section className="mt-6 border-t border-line pt-5">
    <Button variant="outline" className="w-full" disabled={disabled} onClick={() => { setError(""); setOpen(true); void refresh().catch(() => undefined); }}><Save size={15} />存档与读档</Button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="save-slots-title">
      <div className="w-full max-w-xl border border-line bg-ink shadow-2xl">
        <div className="flex items-start justify-between border-b border-line bg-panel px-5 py-4">
          <div><p className="text-xs text-copper">战役时间线</p><h2 id="save-slots-title" className="mt-1 font-serif text-xl">存档与读档</h2></div>
          <button aria-label="关闭" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button>
        </div>
        <div className="p-5">
          <p className="text-xs leading-5 text-muted">每场战役可保留两个时间线位置。读档会丢弃该保存点之后的行动。</p>
          {error && <p className="mt-3 border-l-2 border-alert bg-alert/10 px-3 py-2 text-xs text-[#efaaa4]">{error}</p>}
          <div className="mt-4 space-y-3">{([1, 2] as const).map((slot) => {
            const saved = slots.find((item) => item.slot === slot && item.savedAt);
            return <div key={slot} className="border border-line bg-panel/30 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-paper">槽位 {slot}</p><span className="text-[10px] text-muted">{saved ? new Date(saved.savedAt).toLocaleString("zh-CN") : "空槽位"}</span></div>
              <p className="mt-2 text-xs text-muted">{saved ? `${saved.label || "未命名存档"} · 游戏时间 ${new Date(saved.currentTime).toLocaleString("zh-CN", { timeZone: "UTC" })}` : "尚未保存时间线位置"}</p>
              <div className="mt-4 flex gap-2"><Button variant="outline" disabled={disabled || busy || state.status !== "active"} onClick={() => void save(slot)}><Save size={14} />保存至此</Button><Button variant="ghost" disabled={disabled || busy || !saved || state.status !== "active"} onClick={() => void load(slot)}><RotateCcw size={14} />读取此档</Button></div>
            </div>;
          })}</div>
        </div>
      </div>
    </div>}
  </section>;
}
