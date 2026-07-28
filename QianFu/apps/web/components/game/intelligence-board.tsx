"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameAction, PublicWorldState, RadioMessageFormat, RadioTiming, RadioTransmission } from "@qianfu/core";
import { AlertTriangle, Archive, Check, Clock3, FileText, Link2, Radio, RotateCcw, Send, ShieldAlert, UserRound, X } from "lucide-react";
import { api, type GameContext, type PublicActionResult, type RadioChallenge, type RadioChallengeRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MorseRadioGame } from "@/components/game/morse-radio-game";

const receiptLabels = { pending: "等待回执", confirmed: "完整收到", partial: "部分收到", no_receipt: "未获回执" } as const;
const assessmentLabels = { unverified: "尚未核验", corroborates: "独立印证", contradicts: "存在矛盾", dependent: "同源转述" } as const;

export function IntelligenceBoard({ gameInstanceId, state, context, busy, onAction }: {
  gameInstanceId: string;
  state: PublicWorldState;
  context: GameContext;
  busy: boolean;
  onAction: (action: GameAction) => Promise<PublicActionResult | null>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [format, setFormat] = useState<RadioMessageFormat>("compressed");
  const [codebookId, setCodebookId] = useState<"one_time_pad" | "book_cipher">("one_time_pad");
  const [timing, setTiming] = useState<RadioTiming>("immediate");
  const [challenge, setChallenge] = useState<RadioChallenge | null>(null);
  const [challengeSelection, setChallengeSelection] = useState<RadioChallengeRequest | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [resultTransmission, setResultTransmission] = useState<RadioTransmission | null>(null);
  const [abortedResult, setAbortedResult] = useState(false);
  const radioSites = context.radioSites.filter((site) => site.available && site.discovered);
  const [locationId, setLocationId] = useState(() => radioSites.some((site) => site.id === state.currentLocationId) ? state.currentLocationId : radioSites[0]?.id ?? "");
  const visibleIntel = context.intel.filter((item) => state.intel[item.id]?.knownFields.length > 0);
  const scheduledWindowKnown = (state.intel["radio-window"]?.knownFields.length ?? 0) > 0;

  useEffect(() => {
    if (!radioSites.some((site) => site.id === locationId)) setLocationId(radioSites[0]?.id ?? "");
  }, [locationId, radioSites]);

  const items = useMemo(() => visibleIntel.map((item) => ({
    intelId: item.id,
    fields: state.intel[item.id].knownFields.filter((field) => selected[`${item.id}:${field}`] && !state.intel[item.id].deliveredFields.includes(field)),
  })).filter((item) => item.fields.length > 0), [selected, state, visibleIntel]);
  const fieldCount = items.reduce((total, item) => total + item.fields.length, 0);
  const codebook = state.radio.codebooks.find((item) => item.id === codebookId);
  const estimate = estimateTransmission(state.currentTime, fieldCount, format, codebookId, timing);
  const selectedSite = radioSites.find((site) => site.id === locationId);
  const riskScore = (selectedSite?.baseRisk ?? 20) + (selectedSite?.currentHeat ?? 0) * 0.5 + estimate.operationMinutes / 3 + (timing === "immediate" ? 8 : 0) + (codebookId === "book_cipher" && (codebook?.usageCount ?? 0) > 0 ? 6 : 0);
  const riskLabel = riskScore < 18 ? "较低" : riskScore < 28 ? "中等" : "较高";
  const atSelectedSite = locationId === state.currentLocationId;
  const codebookAvailable = codebook && (codebook.usesRemaining === null || codebook.usesRemaining > 0);
  const selectedWarnings = items.flatMap((item) => item.fields.flatMap((field) => {
    const evidence = state.intel[item.intelId].evidence.filter((entry) => entry.field === field);
    const intel = context.intel.find((entry) => entry.id === item.intelId);
    const label = `${intel?.title ?? item.intelId} · ${intel?.fieldLabels[field] ?? field}`;
    if (evidence.some((entry) => entry.assessment === "contradicts")) return [`${label}存在相互矛盾的说法`];
    if (!evidence.some((entry) => entry.assessment === "corroborates")) return [`${label}尚无独立来源印证`];
    if (evidence.some((entry) => entry.assessment === "dependent")) return [`${label}包含同源转述，不能重复计为核验`];
    return [];
  }));

  const toggle = (intelId: string, field: string) => setSelected((current) => ({ ...current, [`${intelId}:${field}`]: !current[`${intelId}:${field}`] }));
  const prepare = () => {
    if (fieldCount === 0) {
      const defaults: Record<string, boolean> = {};
      for (const item of visibleIntel) for (const field of state.intel[item.id].knownFields) {
        if (!state.intel[item.id].deliveredFields.includes(field)) defaults[`${item.id}:${field}`] = true;
      }
      setSelected(defaults);
    }
    if (radioSites.some((site) => site.id === state.currentLocationId)) setLocationId(state.currentLocationId);
    setOpen(true);
  };
  const selection: RadioChallengeRequest = { items, format, codebookId, timing, locationId };
  const startManual = async () => {
    setChallengeBusy(true);
    setChallengeError("");
    try {
      const result = await api.createRadioChallenge(gameInstanceId, selection);
      setChallengeSelection(selection);
      setChallenge(result);
      setOpen(false);
    } catch (reason) {
      setChallengeError(reason instanceof Error ? reason.message : "无法建立发报连接");
    } finally {
      setChallengeBusy(false);
    }
  };
  const executeRadio = async (action: GameAction) => {
    setChallenge(null);
    setChallengeSelection(null);
    const result = await onAction(action);
    if (!result) return;
    if (action.type === "send_radio_message") {
      setResultTransmission(result.state.radio.transmissions.find((message) => message.id === action.idempotencyKey) ?? null);
      setSelected({});
    } else if (action.type === "abort_radio_message") {
      setAbortedResult(true);
    }
  };
  const prepareRetransmission = (message: RadioTransmission) => {
    const fields: Record<string, boolean> = {};
    for (const item of message.items) for (const field of item.fields) {
      if (!state.intel[item.intelId]?.deliveredFields.includes(field)) fields[`${item.intelId}:${field}`] = true;
    }
    setSelected(fields);
    setFormat("compressed");
    if (radioSites.some((site) => site.id === state.currentLocationId)) setLocationId(state.currentLocationId);
    setOpen(true);
  };

  return <div className="mt-7 border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-medium text-muted"><FileText size={15} />情报板 {visibleIntel.length}/{context.intel.length}</p>{visibleIntel.length > 0 && <div className="flex gap-3"><button onClick={() => setDossierOpen(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-paper"><Archive size={13} />情报档案</button><button onClick={prepare} className="flex items-center gap-1.5 text-xs text-copper hover:text-paper"><Radio size={13} />编制电文</button></div>}</div>
    {visibleIntel.length === 0 ? <p className="mt-3 text-sm leading-6 text-muted">还没有可以记录的情报碎片。</p> : <div className="mt-3 divide-y divide-line">{visibleIntel.map((item) => {
      const intel = state.intel[item.id];
      const remaining = intel.knownFields.filter((field) => !intel.deliveredFields.includes(field));
      return <div key={item.id} className="py-3">
        <div className="flex items-start justify-between gap-2"><p className="text-sm">{item.title}</p><span className="text-[10px] text-muted">{Math.round(intel.confidence * 100)}%</span></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{intel.knownFields.map((field) => {
          const delivered = intel.deliveredFields.includes(field);
          return <button key={field} disabled={delivered} onClick={() => toggle(item.id, field)} className={`flex items-center gap-1 border px-2 py-1 text-[10px] ${delivered ? "border-safe/30 text-safe" : selected[`${item.id}:${field}`] ? "border-copper bg-copper/10 text-paper" : "border-line text-muted"}`}>
            {delivered && <Check size={10} />}{item.fieldLabels[field] ?? field}
          </button>;
        })}</div>
        {remaining.length > 0 && <button disabled={busy} onClick={() => onAction({ type: "transmit_intel", intelId: item.id, method: "courier", durationMinutes: 60, idempotencyKey: crypto.randomUUID() })} className="mt-3 flex items-center gap-1.5 border border-line px-2 py-1.5 text-[11px] text-muted hover:border-copper hover:text-paper disabled:opacity-40"><UserRound size={12} />交通员补送 · 60分</button>}
      </div>;
    })}</div>}

    {state.radio.transmissions.length > 0 && <div className="mt-4 border-t border-line pt-4"><p className="text-[10px] text-muted">最近电文</p>{state.radio.transmissions.slice(-3).reverse().map((message) => { const canRetransmit = (message.receiptStatus === "partial" || message.receiptStatus === "no_receipt") && message.items.some((item) => item.fields.some((field) => !state.intel[item.intelId]?.deliveredFields.includes(field))); return <div key={message.id} className="mt-3 flex items-start justify-between gap-3 text-xs"><span className="min-w-0"><span className="line-clamp-2 text-muted">{message.receiptSummary}</span>{message.mode === "manual" && message.morse && <span className="mt-1 block truncate font-mono text-[10px] text-muted">{message.morse.sequence} · {message.morse.grade === "excellent" ? "优秀" : message.morse.grade === "steady" ? "稳定" : "粗糙"} · {message.morse.errorCount} 处误码</span>}{canRetransmit && <button disabled={busy} onClick={() => prepareRetransmission(message)} className="mt-2 flex items-center gap-1.5 text-[10px] text-copper hover:text-paper"><RotateCcw size={11} />补发未确认字段</button>}</span><span className={message.receiptStatus === "confirmed" ? "shrink-0 text-safe" : message.receiptStatus === "partial" || message.receiptStatus === "no_receipt" ? "shrink-0 text-alert" : "shrink-0 text-copper"}>{receiptLabels[message.receiptStatus]}</span></div>; })}</div>}

    {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="radio-title">
      <div className="my-6 w-full max-w-3xl border border-line bg-ink shadow-2xl">
        <div className="flex items-start justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">第三号电台</p><h2 id="radio-title" className="mt-1 font-serif text-xl">编制并发送电文</h2></div><button aria-label="关闭" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_260px]">
          <div><p className="text-xs text-muted">发送字段</p><div className="mt-3 divide-y divide-line border-y border-line">{visibleIntel.map((item) => <div key={item.id} className="py-3"><p className="text-sm">{item.title}</p><div className="mt-2 flex flex-wrap gap-2">{state.intel[item.id].knownFields.map((field) => {
            const delivered = state.intel[item.id].deliveredFields.includes(field);
            return <label key={field} className={`flex items-center gap-2 text-xs ${delivered ? "text-safe" : "text-paper/80"}`}><input type="checkbox" disabled={delivered} checked={delivered || Boolean(selected[`${item.id}:${field}`])} onChange={() => toggle(item.id, field)} className="h-4 w-4 accent-[#c27b43]" />{item.fieldLabels[field] ?? field}{delivered ? "（已送达）" : ""}</label>;
          })}</div></div>)}</div>{selectedWarnings.length > 0 && <div className="mt-4 border-l-2 border-alert bg-alert/10 px-3 py-2"><p className="flex items-center gap-2 text-xs text-[#efaaa4]"><AlertTriangle size={13} />核验风险</p><ul className="mt-2 space-y-1 text-xs leading-5 text-muted">{selectedWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}</div>
          <div className="space-y-4">
            <Select label="电文形式" value={format} onChange={(value) => setFormat(value as RadioMessageFormat)} options={[{ value: "compressed", label: "压缩摘要" }, { value: "full", label: "完整报码" }]} />
            <Select label="密码本" value={codebookId} onChange={(value) => setCodebookId(value as typeof codebookId)} options={state.radio.codebooks.map((item) => ({ value: item.id, label: item.id === "one_time_pad" ? `一次一密 · 剩余 ${item.usesRemaining ?? 0} 页` : `书本密码 · 已用 ${item.usageCount} 次` }))} />
            <Select label="发送时机" value={timing} onChange={(value) => setTiming(value as RadioTiming)} options={[{ value: "immediate", label: "立即发送" }, { value: "scheduled", label: scheduledWindowKnown ? "等待约定窗口" : "约定窗口（尚未知晓）", disabled: !scheduledWindowKnown }]} />
            <Select label="发报地点" value={locationId} onChange={setLocationId} options={radioSites.map((site) => ({ value: site.id, label: `${site.name} · 热度${Math.round(site.currentHeat)}${site.id === state.currentLocationId ? " · 当前" : ""}` }))} />
            <div className="border-l-2 border-copper bg-copper/[0.06] p-3 text-xs leading-6 text-muted"><p className="flex items-center justify-between"><span>字段</span><span className="text-paper">{fieldCount}</span></p><p className="flex items-center justify-between"><span>预计耗时</span><span className="text-paper">{estimate.totalMinutes} 分钟</span></p><p className="flex items-center justify-between"><span>信号风险</span><span className={riskLabel === "较高" ? "text-alert" : "text-copper"}>{riskLabel}</span></p><p className="flex items-center justify-between"><span>手动上限</span><span className={fieldCount > context.radioMinigame.maxManualFields ? "text-alert" : "text-paper"}>{context.radioMinigame.maxManualFields} 字段</span></p></div>
          </div>
        </div>
        {challengeError && <div className="border-t border-alert/30 bg-alert/10 px-5 py-3 text-xs text-[#efaaa4]">{challengeError}</div>}
        <div className="flex flex-col gap-3 border-t border-line bg-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted">{!atSelectedSite ? <><ShieldAlert size={13} className="text-alert" />需要先前往所选地点</> : timing === "scheduled" ? <><Clock3 size={13} />耗时包含等待下一个收报窗口</> : "立即发送更快，但更容易形成时间规律"}</p><div className="flex flex-wrap justify-end gap-2">{!context.radioMinigame.required && <Button variant="outline" disabled={busy || challengeBusy || fieldCount === 0 || !atSelectedSite || !codebookAvailable || (timing === "scheduled" && !scheduledWindowKnown)} onClick={() => { setOpen(false); void executeRadio({ type: "send_radio_message", items, format, codebookId, timing, locationId, mode: "automatic", durationMinutes: 0, idempotencyKey: crypto.randomUUID() }); }}><Send size={15} />自动发送</Button>}<Button disabled={busy || challengeBusy || fieldCount === 0 || fieldCount > context.radioMinigame.maxManualFields || !atSelectedSite || !codebookAvailable || (timing === "scheduled" && !scheduledWindowKnown)} onClick={() => void startManual()}><Radio size={15} />{challengeBusy ? "校准频率..." : "手动发报"}</Button></div></div>
      </div>
    </div>}

    {challenge && challengeSelection && <MorseRadioGame challenge={challenge} selection={challengeSelection} busy={busy} onCancel={() => { setChallenge(null); setOpen(true); }} onSend={(action) => void executeRadio(action)} onAbort={(interruptionId) => void executeRadio({ type: "abort_radio_message", ...challengeSelection, challengeToken: challenge.token, interruptionId, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })} />}

    {resultTransmission && <RadioResultModal transmission={resultTransmission} context={context} onClose={() => setResultTransmission(null)} />}
    {abortedResult && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4"><section className="w-full max-w-md border border-line bg-ink p-6 text-center"><h2 className="font-serif text-xl">电文已销毁</h2><p className="mt-3 text-sm leading-6 text-muted">本次情报没有发出。清理现场消耗了 10 分钟，短暂信号仍可能被敌方捕捉。</p><Button className="mt-6" onClick={() => setAbortedResult(false)}>返回战役</Button></section></div>}

    {dossierOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="dossier-title">
      <div className="my-6 w-full max-w-4xl border border-line bg-ink shadow-2xl">
        <div className="flex items-start justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">来源与交叉核验</p><h2 id="dossier-title" className="mt-1 font-serif text-xl">情报档案</h2></div><button aria-label="关闭" onClick={() => setDossierOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        <div className="max-h-[72vh] overflow-y-auto p-5">{visibleIntel.map((definition) => {
          const intel = state.intel[definition.id];
          return <section key={definition.id} className="border-b border-line py-5 first:pt-0 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-4"><h3 className="font-serif text-lg">{definition.title}</h3><span className="text-xs text-muted">综合可信度 {Math.round(intel.confidence * 100)}%</span></div>
            <div className="mt-4 space-y-5">{intel.knownFields.map((field) => {
              const evidence = intel.evidence.filter((entry) => entry.field === field);
              const verified = evidence.some((entry) => entry.assessment === "corroborates");
              const conflict = evidence.some((entry) => entry.assessment === "contradicts");
              return <div key={field} className="border-l-2 border-line pl-4"><div className="flex flex-wrap items-center gap-2"><p className="text-sm text-paper">{definition.fieldLabels[field] ?? field}</p><span className={`text-[10px] ${conflict ? "text-alert" : verified ? "text-safe" : "text-copper"}`}>{conflict ? "待消解矛盾" : verified ? "已有独立印证" : "需要独立核验"}</span></div>
                {evidence.length === 0 ? <p className="mt-2 text-xs text-muted">只有字段记录，尚未保存来源证据。</p> : <ol className="mt-3 space-y-3">{evidence.map((entry) => <li key={entry.id} className="text-xs leading-5"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-paper">{entry.sourceLabel}</span><span className={entry.assessment === "contradicts" ? "text-alert" : entry.assessment === "corroborates" ? "text-safe" : "text-copper"}>{assessmentLabels[entry.assessment]}</span><time className="text-muted">{formatEvidenceTime(entry.collectedAt)}</time>{entry.assessment === "dependent" && <span className="flex items-center gap-1 text-muted"><Link2 size={11} />与已有线索同源</span>}</div><p className="mt-1 text-muted">{entry.summary}</p></li>)}</ol>}
              </div>;
            })}</div>
          </section>;
        })}</div>
      </div>
    </div>}
  </div>;
}

function formatEvidenceTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string; disabled?: boolean }> }) {
  return <label className="block text-xs text-muted">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper">{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></label>;
}

function RadioResultModal({ transmission, context, onClose }: { transmission: RadioTransmission; context: GameContext; onClose: () => void }) {
  const performance = transmission.morse;
  const risk = (transmission.signalWeight ?? 0) < 16 ? "较低" : (transmission.signalWeight ?? 0) < 28 ? "中等" : "较高";
  const fields = transmission.items.flatMap((item) => {
    const intel = context.intel.find((entry) => entry.id === item.intelId);
    return item.fields.map((field) => `${intel?.title ?? item.intelId} · ${intel?.fieldLabels[field] ?? field}`);
  });
  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="radio-result-title"><section className="my-6 w-full max-w-2xl border border-line bg-ink shadow-2xl"><header className="flex items-start justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">发送完成</p><h2 id="radio-result-title" className="mt-1 font-serif text-xl">电台清理结果</h2></div><button aria-label="关闭" onClick={onClose} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></header><div className="grid gap-6 p-5 sm:grid-cols-2"><div><p className="text-xs text-muted">已发内容</p><ul className="mt-3 space-y-2 text-sm">{fields.map((field) => <li key={field}>{field}</li>)}</ul>{transmission.retransmissionOfId && <p className="mt-4 flex items-center gap-2 text-xs text-copper"><RotateCcw size={13} />本次为补发电文</p>}</div><div className="border-l-2 border-copper bg-copper/[0.06] p-4 text-xs leading-7 text-muted"><p className="flex justify-between"><span>发送方式</span><span className="text-paper">{transmission.mode === "manual" ? "手动发报" : "自动发送"}</span></p><p className="flex justify-between"><span>实际耗时</span><span className="text-paper">{transmission.durationMinutes} 分钟</span></p><p className="flex justify-between"><span>信号风险</span><span className={risk === "较高" ? "text-alert" : "text-copper"}>{risk}</span></p><p className="flex justify-between"><span>网络暴露变化</span><span className="text-paper">+{(transmission.exposureDelta ?? 0).toFixed(1)}</span></p>{performance && <><p className="flex justify-between"><span>符号准确率</span><span className="text-paper">{Math.round(performance.accuracy * 100)}%</span></p><p className="flex justify-between"><span>节奏稳定度</span><span className="text-paper">{Math.round(performance.timingScore * 100)}%</span></p><p className="flex justify-between"><span>误码</span><span className={performance.errorCount > 0 ? "text-alert" : "text-safe"}>{performance.errorCount} 处</span></p><p className="flex justify-between"><span>操作评价</span><span className="text-paper">{performance.grade === "excellent" ? "优秀" : performance.grade === "steady" ? "稳定" : "粗糙"}</span></p></>}</div></div>{transmission.warningSigns && transmission.warningSigns.length > 0 && <div className="border-t border-line px-5 py-4"><p className="text-xs text-muted">现场迹象</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#c99b79]">{transmission.warningSigns.map((sign) => <li key={sign}>{sign}</li>)}</ul></div>}<footer className="flex justify-end border-t border-line bg-panel px-5 py-4"><Button onClick={onClose}>返回战役</Button></footer></section></div>;
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
