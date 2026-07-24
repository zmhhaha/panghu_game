"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DialogueGoal, DialogueTone, PublicWorldState } from "@qianfu/core";
import { ArrowLeft, Clock3, FileText, MapPin, MessageSquare, Radio, ShieldAlert, UserRound } from "lucide-react";
import { api, type GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DialoguePanel } from "@/components/game/dialogue-panel";

const fallbackLocations = [
  ["archive-office", "机要楼档案科"], ["radio-office", "电讯科"], ["linjiang-news", "临江日报社"],
  ["jianghai-hotel", "江海饭店"], ["third-dock", "三号码头"], ["wu-clock-shop", "老吴钟表店"],
] as const;

const travelMinutes: Record<string, Record<string, number>> = {
  "archive-office": { "radio-office": 10, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 40, "wu-clock-shop": 30 },
  "radio-office": { "archive-office": 10, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 40, "wu-clock-shop": 30 },
  "linjiang-news": { "archive-office": 20, "radio-office": 20, "jianghai-hotel": 20, "third-dock": 30, "wu-clock-shop": 20 },
  "jianghai-hotel": { "archive-office": 20, "radio-office": 20, "linjiang-news": 20, "third-dock": 30, "wu-clock-shop": 20 },
  "third-dock": { "archive-office": 40, "radio-office": 40, "linjiang-news": 30, "jianghai-hotel": 30, "wu-clock-shop": 30 },
  "wu-clock-shop": { "archive-office": 30, "radio-office": 30, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 30 },
};

const goals: { id: DialogueGoal; label: string; duration: number }[] = [
  { id: "small_talk", label: "寒暄观察", duration: 10 },
  { id: "build_trust", label: "建立信任", duration: 20 },
  { id: "probe_attitude", label: "试探立场", duration: 20 },
  { id: "request_information", label: "索取情报", duration: 30 },
  { id: "verify_intel", label: "核验细节", duration: 20 },
  { id: "apply_pressure", label: "施加压力", duration: 30 },
  { id: "recruit_probe", label: "试探招募", duration: 30 },
  { id: "long_talk", label: "长谈扩展", duration: 60 },
];

const toneLabels: Record<DialogueTone, string> = { neutral: "平静", friendly: "友好", formal: "正式", urgent: "急切", threatening: "强硬" };

export function GameView({ gameInstanceId }: { gameInstanceId: string }) {
  const router = useRouter();
  const [state, setState] = useState<PublicWorldState | null>(null);
  const [context, setContext] = useState<GameContext | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState("");
  const [goal, setGoal] = useState<DialogueGoal>("small_talk");
  const [tone, setTone] = useState<DialogueTone>("neutral");
  const [playerText, setPlayerText] = useState(" ");
  const [dialogueTranscript, setDialogueTranscript] = useState<Array<{ speaker: "player" | "npc"; text: string }>>([]);

  const load = async () => {
    try {
      const [game, publicContext] = await Promise.all([api.getGame(gameInstanceId), api.getContext(gameInstanceId)]);
      setState(game); setContext(publicContext); setError("");
      setSelectedNpc((current) => publicContext.characters.some((character) => character.id === current) ? current : publicContext.characters[0]?.id ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法读取战役"); }
  };
  useEffect(() => { void load(); }, [gameInstanceId]);
  useEffect(() => { setDialogueTranscript([]); }, [selectedNpc]);

  const act = async (action: Parameters<typeof api.act>[1]) => {
    setBusy(true); setError("");
    try {
      const result = await api.act(gameInstanceId, action);
      setState(result.state); setLog((items) => [result.npcReply ? `NPC：${result.npcReply}` : result.narration, ...items].slice(0, 8));
      if (action.type === "dialogue") setDialogueTranscript((items) => [...items, { speaker: "player" as const, text: action.playerText }, ...(result.npcReply ? [{ speaker: "npc" as const, text: result.npcReply }] : [])].slice(-12));
      const publicContext = await api.getContext(gameInstanceId);
      setContext(publicContext);
      setSelectedNpc((current) => publicContext.characters.some((character) => character.id === current) ? current : publicContext.characters[0]?.id ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "行动失败"); }
    finally { setBusy(false); }
  };

  if (!state || !context) return <main className="flex min-h-screen items-center justify-center bg-ink text-muted">{error || "正在调取战役档案"}</main>;
  const currentLocation = context.locations.find((location) => location.id === state.currentLocationId)?.name ?? "未知地点";
  const time = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(state.currentTime));
  const selectedGoal = goals.find((item) => item.id === goal) ?? goals[0];
  const visibleIntel = context.intel.filter((item) => state.intel[item.id]?.knownFields.length > 0);

  if (state.activeDialogue?.status === "active") return <DialoguePanel state={state} npcName={context.characters.find((item) => item.id === state.activeDialogue?.characterId)?.name ?? state.activeDialogue.characterId} goal={state.activeDialogue.goal} tone={state.activeDialogue.tone} busy={busy} onSend={(text) => void act({ type: "dialogue_turn", sessionId: state.activeDialogue!.id, playerText: text, durationMinutes: 2, idempotencyKey: crypto.randomUUID() })} onEnd={() => void act({ type: "dialogue_end", sessionId: state.activeDialogue!.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })} onBack={() => undefined} />;

  const submitDialogue = () => {
    if (!selectedNpc) return;
    if (!state.activeDialogue || state.activeDialogue.status !== "active") {
      void act({ type: "dialogue_start", targetCharacterId: selectedNpc, goal, tone, allocatedMinutes: selectedGoal.duration as 10 | 20 | 30 | 60, durationMinutes: 0, idempotencyKey: crypto.randomUUID() });
      setPlayerText("");
      return;
    }
    if (!playerText.trim()) return;
    void act({ type: "dialogue_turn", sessionId: state.activeDialogue.id, playerText: playerText.trim(), durationMinutes: 2, idempotencyKey: crypto.randomUUID() });
    setPlayerText("");
  };

  return <main className="min-h-screen bg-ink text-paper">
    <header className="border-b border-line"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4"><Link href="/" aria-label="返回战役列表" className="text-muted hover:text-paper"><ArrowLeft size={18} /></Link><div className="text-center"><h1 className="font-serif tracking-[0.18em]">临江潜线</h1><p className="mt-1 text-[10px] text-muted">{state.gameInstanceId}</p></div><div className="flex items-center gap-3 text-sm text-copper"><a href={api.exportGame(gameInstanceId)} className="text-muted hover:text-paper" aria-label="下载私人战报"><FileText size={16} /></a><span className="flex items-center gap-2"><Clock3 size={16} />{time}</span></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[250px_minmax(480px,1fr)_330px]">
      <aside className="border border-line bg-panel p-4"><p className="text-xs tracking-[0.18em] text-muted">行动地点</p><div className="mt-4 space-y-1">{(context.locations.length ? context.locations : fallbackLocations.map(([id, name]) => ({ id, name, district: "" }))).map((location) => { const minutes = travelMinutes[state.currentLocationId]?.[location.id]; return <button key={location.id} disabled={busy || state.status !== "active" || location.id === state.currentLocationId || !minutes} onClick={() => minutes && void act({ type: "move", destinationId: location.id, durationMinutes: minutes, idempotencyKey: crypto.randomUUID() })} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-muted hover:bg-paper/5 hover:text-paper disabled:text-copper"><span>{location.name}</span>{minutes && location.id !== state.currentLocationId && <span className="text-[10px]">{minutes}分</span>}</button>; })}</div><div className="mt-6 border-t border-line pt-4"><Button variant="outline" className="w-full" disabled={busy || state.status !== "active"} onClick={() => void act({ type: "wait", durationMinutes: 10, idempotencyKey: crypto.randomUUID() })}>等待十分钟</Button></div></aside>
      <section className="min-h-[680px] border border-line bg-[#1d1a17] p-6"><div className="flex items-start justify-between border-b border-line pb-5"><div><p className="flex items-center gap-2 text-xs text-copper"><MapPin size={14} /> 当前场景</p><h2 className="mt-2 font-serif text-3xl">{currentLocation}</h2></div><span className="border border-line px-2 py-1 text-xs text-muted">{state.status === "active" ? "行动中" : "已结算"}</span></div>
        {error && <div className="mt-4 border border-alert/60 bg-alert/10 p-3 text-sm text-[#e9a399]">{error}</div>}
        <div className="mt-6"><p className="flex items-center gap-2 text-xs tracking-[0.14em] text-muted"><UserRound size={15} /> 现场人物</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{context.characters.length === 0 ? <p className="text-sm text-muted">此刻没有适合接触的人。</p> : context.characters.map((character) => <button key={character.id} onClick={() => setSelectedNpc(character.id)} className={`border p-3 text-left transition-colors ${selectedNpc === character.id ? "border-copper bg-copper/10" : "border-line hover:border-paper/40"}`}><p className="text-sm">{character.name}{state.characters[character.id]?.recruited && <span className="ml-2 text-[10px] text-safe">已联络</span>}</p><p className="mt-1 text-xs text-muted">{character.publicIdentity}{character.recruitable ? " · 可观察" : ""}</p></button>)}</div></div>
        <div className="mt-7 border-t border-line pt-5"><div className="flex items-center gap-2"><MessageSquare size={15} className="text-copper" /><p className="text-xs tracking-[0.14em] text-muted">交谈</p></div>{selectedNpc ? <div className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><select value={goal} onChange={(event) => setGoal(event.target.value as DialogueGoal)} className="h-10 rounded-md border border-line bg-ink px-3 text-sm text-paper"><option disabled value="">选择交谈目标</option>{goals.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.duration}分</option>)}</select><select value={tone} onChange={(event) => setTone(event.target.value as DialogueTone)} className="h-10 rounded-md border border-line bg-ink px-3 text-sm text-paper">{Object.entries(toneLabels).map(([id, label]) => <option key={id} value={id}>{label}语气</option>)}</select></div><textarea value={playerText} maxLength={500} onChange={(event) => setPlayerText(event.target.value)} placeholder="输入你准备说的话" className="min-h-24 w-full resize-y rounded-md border border-line bg-ink p-3 text-sm leading-6 text-paper outline-none placeholder:text-muted focus:border-copper" /><div className="flex items-center justify-between"><span className="text-[11px] text-muted">{playerText.length}/500 · 本轮耗时 {selectedGoal.duration} 分钟</span><Button disabled={busy || state.status !== "active" || !playerText.trim()} onClick={submitDialogue}>完成交谈</Button></div></div> : <p className="mt-3 text-sm text-muted">先选择一个现场人物。</p>}</div>
        {log.length > 0 && <div className="mt-7 border-l-2 border-copper/70 pl-4"><p className="text-xs text-muted">行动记录</p>{log.slice(0, 3).map((entry, index) => <p key={`${entry}-${index}`} className="mt-2 text-sm leading-7">{entry}</p>)}</div>}
      </section>
      <aside className="space-y-4"><section className="border border-line bg-panel p-4"><p className="flex items-center gap-2 text-xs tracking-[0.14em] text-muted"><ShieldAlert size={15} /> 风险状态</p><div className="mt-5 space-y-4"><Meter label="个人怀疑" value={state.personalSuspicion} color="bg-alert" /><Meter label="网络暴露" value={state.network.exposure} color="bg-copper" /><Meter label="精力" value={state.playerEnergy} color="bg-safe" /></div></section><section className="border border-line bg-panel p-4"><p className="flex items-center gap-2 text-xs tracking-[0.14em] text-muted"><FileText size={15} /> 情报板</p>{visibleIntel.length === 0 ? <p className="mt-4 text-sm leading-7 text-muted">还没有可记录的情报碎片。</p> : <div className="mt-4 space-y-3">{visibleIntel.map((item) => { const intel = state.intel[item.id]; return <div key={item.id} className="border-l-2 border-copper/70 pl-3"><p className="text-sm">{item.title}</p><p className="mt-1 text-xs text-muted">字段 {intel.knownFields.join("、")} · 置信度 {Math.round(intel.confidence * 100)}%</p>{!intel.deliveredAt && <div className="mt-2 flex gap-2"><button disabled={busy || state.status !== "active"} onClick={() => void act({ type: "transmit_intel", intelId: item.id, method: "radio", durationMinutes: 30, idempotencyKey: crypto.randomUUID() })} className="flex items-center gap-1 border border-line px-2 py-1 text-[11px] text-muted hover:border-copper hover:text-paper disabled:opacity-50"><Radio size={12} />电台 30分</button><button disabled={busy || state.status !== "active"} onClick={() => void act({ type: "transmit_intel", intelId: item.id, method: "courier", durationMinutes: 60, idempotencyKey: crypto.randomUUID() })} className="flex items-center gap-1 border border-line px-2 py-1 text-[11px] text-muted hover:border-copper hover:text-paper disabled:opacity-50"><UserRound size={12} />交通员 60分</button></div>}</div>; })}</div>}<p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs text-copper"><Radio size={14} />已知 {visibleIntel.length} / {context.intel.length} 项</p></section><section className="border border-line bg-panel p-4"><p className="text-xs tracking-[0.14em] text-muted">核心任务</p><p className="mt-3 text-sm leading-7 text-paper/70">三天内确认无线电设备的运输时间、地点与内容，并在截止前送出。</p></section></aside>
    </div>
  </main>;
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className="mb-2 flex justify-between text-xs text-muted"><span>{label}</span><span>{Math.round(value)}%</span></div><div className="h-1 bg-line"><div className={`h-1 ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}
