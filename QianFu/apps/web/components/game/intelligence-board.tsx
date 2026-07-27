"use client";

import { useMemo, useState } from "react";
import type { GameAction, PublicWorldState, RadioMessageFormat, RadioTiming } from "@qianfu/core";
import { Check, Clock3, FileText, Radio, Send, ShieldAlert, UserRound, X } from "lucide-react";
import type { GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";

const radioSiteRisk: Record<string, number> = { "wu-clock-shop": 4, "jianghai-hotel": 10, "radio-office": 18 };
const receiptLabels = { pending: "等待回执", confirmed: "完整收到", partial: "部分收到", no_receipt: "未获回执" } as const;

export function IntelligenceBoard({ state, context, busy, onAction }: {
  state: PublicWorldState;
  context: GameContext;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<RadioMessageFormat>("compressed");
  const [codebookId, setCodebookId] = useState<"one_time_pad" | "book_cipher">("one_time_pad");
  const [timing, setTiming] = useState<RadioTiming>("immediate");
  const radioSites = context.locations.filter((location) => location.discovered && location.id in radioSiteRisk);
  const [locationId, setLocationId] = useState(() => radioSiteRisk[state.currentLocationId] !== undefined ? state.currentLocationId : radioSites[0]?.id ?? "");
  const visibleIntel = context.intel.filter((item) => state.intel[item.id]?.knownFields.length > 0);
  const scheduledWindowKnown = (state.intel["radio-window"]?.knownFields.length ?? 0) > 0;

  const items = useMemo(() => visibleIntel.map((item) => ({
    intelId: item.id,
    fields: state.intel[item.id].knownFields.filter((field) => selected[`${item.id}:${field}`] && !state.intel[item.id].deliveredFields.includes(field)),
  })).filter((item) => item.fields.length > 0), [selected, state, visibleIntel]);
  const fieldCount = items.reduce((total, item) => total + item.fields.length, 0);
  const codebook = state.radio.codebooks.find((item) => item.id === codebookId);
  const estimate = estimateTransmission(state.currentTime, fieldCount, format, codebookId, timing);
  const riskScore = (radioSiteRisk[locationId] ?? 20) + estimate.operationMinutes / 3 + (timing === "immediate" ? 8 : 0) + (codebookId === "book_cipher" && (codebook?.usageCount ?? 0) > 0 ? 6 : 0);
  const riskLabel = riskScore < 18 ? "较低" : riskScore < 28 ? "中等" : "较高";
  const atSelectedSite = locationId === state.currentLocationId;
  const codebookAvailable = codebook && (codebook.usesRemaining === null || codebook.usesRemaining > 0);

  const toggle = (intelId: string, field: string) => setSelected((current) => ({ ...current, [`${intelId}:${field}`]: !current[`${intelId}:${field}`] }));
  const prepare = () => {
    if (fieldCount === 0) {
      const defaults: Record<string, boolean> = {};
      for (const item of visibleIntel) for (const field of state.intel[item.id].knownFields) {
        if (!state.intel[item.id].deliveredFields.includes(field)) defaults[`${item.id}:${field}`] = true;
      }
      setSelected(defaults);
    }
    if (radioSiteRisk[state.currentLocationId] !== undefined) setLocationId(state.currentLocationId);
    setOpen(true);
  };

  return <div className="mt-7 border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-medium text-muted"><FileText size={15} />情报板 {visibleIntel.length}/{context.intel.length}</p>{visibleIntel.length > 0 && <button onClick={prepare} className="flex items-center gap-1.5 text-xs text-copper hover:text-paper"><Radio size={13} />编制电文</button>}</div>
    {visibleIntel.length === 0 ? <p className="mt-3 text-sm leading-6 text-muted">还没有可以记录的情报碎片。</p> : <div className="mt-3 divide-y divide-line">{visibleIntel.map((item) => {
      const intel = state.intel[item.id];
      const remaining = intel.knownFields.filter((field) => !intel.deliveredFields.includes(field));
      return <div key={item.id} className="py-3">
        <div className="flex items-start justify-between gap-2"><p className="text-sm">{item.title}</p><span className="text-[10px] text-muted">{Math.round(intel.confidence * 100)}%</span></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{intel.knownFields.map((field) => {
          const delivered = intel.deliveredFields.includes(field);
          return <button key={field} disabled={delivered} onClick={() => toggle(item.id, field)} className={`flex items-center gap-1 border px-2 py-1 text-[10px] ${delivered ? "border-safe/30 text-safe" : selected[`${item.id}:${field}`] ? "border-copper bg-copper/10 text-paper" : "border-line text-muted"}`}>
            {delivered && <Check size={10} />}{field}
          </button>;
        })}</div>
        {remaining.length > 0 && <button disabled={busy} onClick={() => onAction({ type: "transmit_intel", intelId: item.id, method: "courier", durationMinutes: 60, idempotencyKey: crypto.randomUUID() })} className="mt-3 flex items-center gap-1.5 border border-line px-2 py-1.5 text-[11px] text-muted hover:border-copper hover:text-paper disabled:opacity-40"><UserRound size={12} />交通员补送 · 60分</button>}
      </div>;
    })}</div>}

    {state.radio.transmissions.length > 0 && <div className="mt-4 border-t border-line pt-4"><p className="text-[10px] text-muted">最近电文</p>{state.radio.transmissions.slice(-3).reverse().map((message) => <div key={message.id} className="mt-2 flex items-start justify-between gap-3 text-xs"><span className="line-clamp-2 text-muted">{message.receiptSummary}</span><span className={message.receiptStatus === "confirmed" ? "shrink-0 text-safe" : message.receiptStatus === "partial" || message.receiptStatus === "no_receipt" ? "shrink-0 text-alert" : "shrink-0 text-copper"}>{receiptLabels[message.receiptStatus]}</span></div>)}</div>}

    {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="radio-title">
      <div className="my-6 w-full max-w-3xl border border-line bg-ink shadow-2xl">
        <div className="flex items-start justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">第三号电台</p><h2 id="radio-title" className="mt-1 font-serif text-xl">编制并发送电文</h2></div><button aria-label="关闭" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_260px]">
          <div><p className="text-xs text-muted">发送字段</p><div className="mt-3 divide-y divide-line border-y border-line">{visibleIntel.map((item) => <div key={item.id} className="py-3"><p className="text-sm">{item.title}</p><div className="mt-2 flex flex-wrap gap-2">{state.intel[item.id].knownFields.map((field) => {
            const delivered = state.intel[item.id].deliveredFields.includes(field);
            return <label key={field} className={`flex items-center gap-2 text-xs ${delivered ? "text-safe" : "text-paper/80"}`}><input type="checkbox" disabled={delivered} checked={delivered || Boolean(selected[`${item.id}:${field}`])} onChange={() => toggle(item.id, field)} className="h-4 w-4 accent-[#c27b43]" />{field}{delivered ? "（已送达）" : ""}</label>;
          })}</div></div>)}</div></div>
          <div className="space-y-4">
            <Select label="电文形式" value={format} onChange={(value) => setFormat(value as RadioMessageFormat)} options={[{ value: "compressed", label: "压缩摘要" }, { value: "full", label: "完整报码" }]} />
            <Select label="密码本" value={codebookId} onChange={(value) => setCodebookId(value as typeof codebookId)} options={state.radio.codebooks.map((item) => ({ value: item.id, label: item.id === "one_time_pad" ? `一次一密 · 剩余 ${item.usesRemaining ?? 0} 页` : `书本密码 · 已用 ${item.usageCount} 次` }))} />
            <Select label="发送时机" value={timing} onChange={(value) => setTiming(value as RadioTiming)} options={[{ value: "immediate", label: "立即发送" }, { value: "scheduled", label: scheduledWindowKnown ? "等待约定窗口" : "约定窗口（尚未知晓）", disabled: !scheduledWindowKnown }]} />
            <Select label="发报地点" value={locationId} onChange={setLocationId} options={radioSites.map((site) => ({ value: site.id, label: `${site.name}${site.id === state.currentLocationId ? " · 当前" : ""}` }))} />
            <div className="border-l-2 border-copper bg-copper/[0.06] p-3 text-xs leading-6 text-muted"><p className="flex items-center justify-between"><span>字段</span><span className="text-paper">{fieldCount}</span></p><p className="flex items-center justify-between"><span>预计耗时</span><span className="text-paper">{estimate.totalMinutes} 分钟</span></p><p className="flex items-center justify-between"><span>信号风险</span><span className={riskLabel === "较高" ? "text-alert" : "text-copper"}>{riskLabel}</span></p></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line bg-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted">{!atSelectedSite ? <><ShieldAlert size={13} className="text-alert" />需要先前往所选地点</> : timing === "scheduled" ? <><Clock3 size={13} />耗时包含等待下一个收报窗口</> : "立即发送更快，但更容易形成时间规律"}</p><Button disabled={busy || fieldCount === 0 || !atSelectedSite || !codebookAvailable || (timing === "scheduled" && !scheduledWindowKnown)} onClick={() => { setOpen(false); onAction({ type: "send_radio_message", items, format, codebookId, timing, locationId, durationMinutes: 0, idempotencyKey: crypto.randomUUID() }); }}><Send size={15} />发送电文</Button></div>
      </div>
    </div>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string; disabled?: boolean }> }) {
  return <label className="block text-xs text-muted">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper">{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></label>;
}

function estimateTransmission(currentTime: string, fieldCount: number, format: RadioMessageFormat, codebookId: "one_time_pad" | "book_cipher", timing: RadioTiming) {
  const encoding = codebookId === "one_time_pad" ? 20 : 10;
  const transmission = Math.max(10, Math.ceil(fieldCount / (format === "compressed" ? 4 : 2)) * 10);
  const operationMinutes = encoding + transmission + 10;
  if (timing === "immediate") return { operationMinutes, totalMinutes: operationMinutes };
  const date = new Date(currentTime);
  const minute = date.getUTCHours() * 60 + date.getUTCMinutes();
  const windows = [600, 900, 1260];
  const next = windows.find((window) => window >= minute);
  const wait = next === undefined ? 1440 - minute + windows[0] : next - minute;
  return { operationMinutes, totalMinutes: operationMinutes + wait };
}
