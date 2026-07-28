"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DialogueGoal, DialogueTone, GameEvent, PublicWorldState } from "@qianfu/core";
import {
  ArrowLeft, ChevronRight, Clock3, Download, MapPin,
  BedDouble, MessageSquare, ShieldAlert, Timer, UserRound, UsersRound, X,
} from "lucide-react";
import { api, type GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DialoguePanel } from "@/components/game/dialogue-panel";
import { CityMap } from "@/components/game/city-map";
import { OrganizationNetwork } from "@/components/game/organization-network";
import { RecruitmentDossier } from "@/components/game/recruitment-dossier";
import { IntelligenceBoard } from "@/components/game/intelligence-board";
import { SettlementReport } from "@/components/game/settlement-report";
import { MissionObjectives } from "@/components/game/mission-objectives";
import { ActionTimeline } from "@/components/game/action-timeline";
import { CoverIdentityPanel } from "@/components/game/cover-identity-panel";
import { SaveSlotsPanel } from "@/components/game/save-slots-panel";
import { InterrogationPanel } from "@/components/game/interrogation-panel";
import { CounterintelligencePanel } from "@/components/game/counterintelligence-panel";

const goals: Array<{ id: DialogueGoal; label: string; description: string; duration: 10 | 20 | 30 | 60 }> = [
  { id: "small_talk", label: "寒暄观察", description: "从日常话题观察反应", duration: 10 },
  { id: "build_trust", label: "建立信任", description: "逐步拉近关系", duration: 20 },
  { id: "probe_attitude", label: "试探立场", description: "用侧面话题判断倾向", duration: 20 },
  { id: "verify_intel", label: "核验细节", description: "确认已有情报的可信度", duration: 20 },
  { id: "request_information", label: "索取情报", description: "尝试获得新的情报碎片", duration: 30 },
  { id: "apply_pressure", label: "施加压力", description: "承担风险迫使对方回应", duration: 30 },
  { id: "recruit_probe", label: "试探招募", description: "测试对方是否愿意合作", duration: 30 },
  { id: "long_talk", label: "长谈扩展", description: "投入较长时间深入交谈", duration: 60 },
];

const tones: Array<{ id: DialogueTone; label: string }> = [
  { id: "neutral", label: "平静" }, { id: "friendly", label: "友好" },
  { id: "formal", label: "正式" }, { id: "urgent", label: "急切" }, { id: "threatening", label: "强硬" },
];

type DiscoveryNotice = {
  locations: Array<{ key: string; title: string; detail: string }>;
  characters: Array<{ key: string; title: string; detail: string }>;
};

export function GameView({ gameInstanceId }: { gameInstanceId: string }) {
  const [state, setState] = useState<PublicWorldState | null>(null);
  const [context, setContext] = useState<GameContext | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState("");
  const [goal, setGoal] = useState<DialogueGoal>("small_talk");
  const [tone, setTone] = useState<DialogueTone>("neutral");
  const [targetIntelId, setTargetIntelId] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState(8 * 60);
  const [discoveryNotice, setDiscoveryNotice] = useState<DiscoveryNotice | null>(null);

  const load = async () => {
    try {
      const [game, publicContext, eventLog] = await Promise.all([api.getGame(gameInstanceId), api.getContext(gameInstanceId), api.getEvents(gameInstanceId)]);
      setState(game);
      setContext(publicContext);
      setEvents(eventLog.events);
      setError("");
      setSelectedNpc((current) => publicContext.characters.some((character) => character.id === current && character.known)
        ? current : publicContext.characters[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取战役");
    }
  };

  useEffect(() => { void load(); }, [gameInstanceId]);

  const act = async (action: Parameters<typeof api.act>[1]) => {
    setBusy(true);
    setError("");
    try {
      const result = await api.act(gameInstanceId, action);
      setState(result.state);
      setEvents((items) => [...items, ...result.events]);
      const publicContext = await api.getContext(gameInstanceId);
      setContext(publicContext);
      const notice = buildDiscoveryNotice(result.events, publicContext);
      if (notice.locations.length > 0 || notice.characters.length > 0) setDiscoveryNotice(notice);
      setSelectedNpc((current) => publicContext.characters.some((character) => character.id === current && character.known)
        ? current : publicContext.characters[0]?.id ?? "");
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "行动失败");
      return null;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (goal !== "verify_intel") return;
    const character = context?.characters.find((item) => item.id === selectedNpc);
    const options = context?.intel.filter((intel) => character?.verifiableIntelIds.includes(intel.id)) ?? [];
    setTargetIntelId((current) => options.some((intel) => intel.id === current) ? current : options[0]?.id ?? "");
  }, [goal, selectedNpc, context]);

  if (!state || !context) {
    return <main className="flex min-h-screen items-center justify-center bg-ink text-sm text-muted">
      {error || "正在读取战役档案..."}
    </main>;
  }

  const selectedGoal = goals.find((item) => item.id === goal) ?? goals[0];
  const currentLocation = context.locations.find((location) => location.id === state.currentLocationId)?.name ?? "未知地点";
  const selectedCharacter = context.characters.find((character) => character.id === selectedNpc);
  const verifiableIntel = context.intel.filter((intel) => selectedCharacter?.verifiableIntelIds.includes(intel.id));
  const selectedCandidate = context.recruitmentCandidates.find((candidate) => candidate.id === selectedNpc);
  const formattedTime = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(state.currentTime));
  const canRest = context.rest.available;
  const restDisabledReason = context.rest.reason;

  if (state.status === "finished") return <SettlementReport gameInstanceId={gameInstanceId} />;

  if (state.interrogation?.status === "active") {
    return <InterrogationPanel state={state} busy={busy} error={error} onAction={(action) => void act(action)} />;
  }

  if (state.activeDialogue) {
    const activeNpc = context.characters.find((item) => item.id === state.activeDialogue?.characterId);
    return <>
      <DialoguePanel
        state={state}
        npcName={activeNpc?.name ?? state.activeDialogue.characterId}
        npcIdentity={activeNpc?.publicIdentity ?? "身份不明"}
        goal={state.activeDialogue.goal}
        tone={state.activeDialogue.tone}
        busy={busy}
        error={error}
        onSend={async (text) => { await act({ type: "dialogue_turn", sessionId: state.activeDialogue!.id, playerText: text, durationMinutes: 2, idempotencyKey: crypto.randomUUID() }); }}
        onEnd={() => void act({ type: "dialogue_end", sessionId: state.activeDialogue!.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}
      />
      <DiscoveryModal notice={discoveryNotice} onClose={() => setDiscoveryNotice(null)} />
    </>;
  }

  const startDialogue = () => {
    if (!selectedNpc) return;
    void act({
      type: "dialogue_start", targetCharacterId: selectedNpc, goal, tone,
      targetIntelId: goal === "verify_intel" ? targetIntelId : undefined,
      allocatedMinutes: selectedGoal.duration, durationMinutes: 0, idempotencyKey: crypto.randomUUID(),
    });
  };

  return <main className="min-h-screen bg-ink text-paper">
    <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="返回战役列表" className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><ArrowLeft size={18} /></Link>
          <div className="min-w-0"><h1 className="truncate font-serif text-lg">临江潜线</h1><p className="truncate text-[11px] text-muted">第三号电台 · {state.difficulty.id}</p></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-5">
          <a href={api.exportGame(gameInstanceId)} title="下载当前玩家档案" className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><Download size={17} /></a>
          <div className="flex items-center gap-2 text-sm text-paper"><Clock3 size={16} className="text-copper" /><span>{formattedTime}</span></div>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1480px] gap-0 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
      <aside className="border-b border-line p-4 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:p-5">
        <SectionLabel icon={<MapPin size={14} />} text="行动地点" />
        <div className="mt-3"><CityMap locations={context.locations} currentLocationId={state.currentLocationId}
          travelMinutes={context.locations.find((location) => location.id === state.currentLocationId)?.travelMinutes ?? {}} disabled={busy || state.status !== "active"}
          onTravel={(locationId, minutes) => void act({ type: "move", destinationId: locationId, durationMinutes: minutes, idempotencyKey: crypto.randomUUID() })} /></div>
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="outline" className="w-full" disabled={busy || state.status !== "active"}
            onClick={() => void act({ type: "wait", durationMinutes: 10, idempotencyKey: crypto.randomUUID() })}>
            <Timer size={15} />等待 10 分钟
          </Button>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <select aria-label="休息时长" value={sleepMinutes} onChange={(event) => setSleepMinutes(Number(event.target.value))} className="h-10 min-w-0 border border-line bg-panel px-2 text-xs text-paper outline-none focus:border-copper">
              {Array.from({ length: 23 }, (_, index) => (index + 2) * 30).map((minutes) => <option key={minutes} value={minutes}>{formatSleepDuration(minutes)}</option>)}
            </select>
            <Button variant="outline" disabled={busy || state.status !== "active" || !canRest} title={canRest ? "结束当前行动并休息" : restDisabledReason}
              onClick={() => void act({ type: "rest", sleepMinutes, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}>
              <BedDouble size={15} />休息
            </Button>
          </div>
          <p className={`mt-2 text-[10px] leading-4 ${canRest ? "text-muted" : "text-[#c99b79]"}`}>{canRest ? "当前地点安全，可以选择休息时长。" : restDisabledReason}</p>
        </div>
        <CoverIdentityPanel state={state} busy={busy} onAction={(action) => void act(action)} />
        <SaveSlotsPanel gameInstanceId={gameInstanceId} state={state} disabled={busy} onLoaded={(loadedState, loadedEvents) => { setState(loadedState); setEvents(loadedEvents); void api.getContext(gameInstanceId).then(setContext); setError(""); }} />
      </aside>

      <section className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div><p className="text-xs text-copper">当前场景</p><h2 className="mt-2 font-serif text-2xl sm:text-3xl">{currentLocation}</h2></div>
          <span className="border border-line px-2.5 py-1 text-xs text-muted">{state.status === "active" ? "行动中" : "已结算"}</span>
        </div>

        {error && <div className="mt-4 border-l-2 border-alert bg-alert/10 px-4 py-3 text-sm text-[#efaaa4]">{error}</div>}
        {state.interrogation?.status === "pending" && <div className="mt-4 border-l-2 border-alert bg-alert/10 px-4 py-3 text-sm text-[#efaaa4]">警备处已经发出传唤。盘问将在近期开始，请先整理好公开身份能够解释的行踪和记录。</div>}
        {state.pendingContact?.deferredUntil && Date.parse(state.currentTime) < Date.parse(state.pendingContact.deferredUntil) && <div className="mt-4 border-l-2 border-copper bg-copper/[0.06] px-4 py-3 text-sm text-muted">你已请对方稍后再谈。约定时间到达后，对方会再次询问；继续行动也可能错过回应窗口。</div>}

        <div className="mt-6">
          <SectionLabel icon={<UsersRound size={15} />} text="现场人物" />
          {context.characters.length === 0
            ? <div className="mt-3 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">此刻没有适合接触的人。</div>
            : <div className="mt-3 divide-y divide-line border-y border-line">{context.characters.map((character) => {
                const selected = selectedNpc === character.id;
                return <button key={character.id} disabled={!character.known} onClick={() => setSelectedNpc(character.id)} className={`flex w-full items-center gap-3 px-2 py-3 text-left transition-colors sm:px-3 ${selected ? "bg-copper/10" : "hover:bg-paper/[0.035]"} ${!character.known ? "cursor-not-allowed opacity-60" : ""}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center border ${selected ? "border-copper text-copper" : "border-line text-muted"}`}><UserRound size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm">{character.name}</span><span className="mt-1 block truncate text-xs text-muted">{character.publicIdentity}</span></span>
                  {state.characters[character.id]?.recruited && <span className="text-[10px] text-safe">已联络</span>}
                  {character.known ? <ChevronRight size={15} className={selected ? "text-copper" : "text-muted"} /> : <span className="text-[10px] text-muted">等待引介</span>}
                </button>;
              })}</div>}
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <div className="flex items-center justify-between"><SectionLabel icon={<MessageSquare size={15} />} text="交谈计划" />{selectedCharacter && <span className="text-xs text-muted">对象：{selectedCharacter.name}</span>}</div>
          {selectedCharacter ? <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <label className="text-xs text-muted">交谈目标
                <select value={goal} onChange={(event) => setGoal(event.target.value as DialogueGoal)} className="mt-2 h-11 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper">
                  {goals.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.duration}分钟 / {item.duration / 2}轮</option>)}
                </select>
              </label>
              <label className="text-xs text-muted">表达方式
                <select value={tone} onChange={(event) => setTone(event.target.value as DialogueTone)} className="mt-2 h-11 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper">
                  {tones.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {goal === "verify_intel" && <label className="mt-3 block text-xs text-muted">核验哪份情报
              <select value={targetIntelId} onChange={(event) => setTargetIntelId(event.target.value)} className="mt-2 h-11 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper">
                <option value="">请选择已掌握且对方可能知情的情报</option>
                {verifiableIntel.map((intel) => <option key={intel.id} value={intel.id}>{intel.title}</option>)}
              </select>
            </label>}
            <div className="mt-4 flex flex-col gap-3 border-l-2 border-copper bg-copper/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm">{selectedGoal.label}</p><p className="mt-1 text-xs text-muted">{selectedGoal.description}。每轮 2 分钟，外部事件每 10 分钟结算。</p></div>
              <Button className="shrink-0" disabled={busy || state.status !== "active" || (goal === "verify_intel" && !targetIntelId)} onClick={startDialogue}><MessageSquare size={15} />进入对话</Button>
            </div>
          </div> : <p className="mt-4 text-sm text-muted">先从现场人物中选择交谈对象。</p>}
        </div>

        <RecruitmentDossier candidate={selectedCandidate} visibility={context.visibility} busy={busy} onAction={(action) => void act(action)} />

        <OrganizationNetwork state={state} context={context} busy={busy} onAction={(action) => void act(action)} />

        <ActionTimeline events={events} context={context} />
      </section>

      <aside className="border-t border-line p-4 sm:p-6 lg:min-h-[calc(100vh-4rem)] lg:border-l lg:border-t-0">
        <SectionLabel icon={<ShieldAlert size={15} />} text="风险态势" />
        <div className="mt-4 space-y-4"><Meter label="个人怀疑" value={state.personalSuspicion} color="bg-alert" /><Meter label="调查压力" value={state.investigation.pressure} color="bg-alert" /><Meter label="网络暴露" value={state.network.exposure} color="bg-copper" /><Meter label="行动精力" value={state.playerEnergy} color="bg-safe" /></div>
        {state.investigation.surveillanceLocationIds.length > 0 && <div className="mt-4 border-l-2 border-alert bg-alert/10 px-3 py-2"><p className="text-[10px] text-muted">疑似监视区域</p><p className="mt-1 text-xs leading-5 text-[#efaaa4]">{state.investigation.surveillanceLocationIds.map((id) => context.locations.find((location) => location.id === id)?.name ?? "未知地点").join("、")}</p></div>}

        <CounterintelligencePanel state={state} context={context} busy={busy} onAction={(action) => void act(action)} />

        <IntelligenceBoard gameInstanceId={gameInstanceId} state={state} context={context} busy={busy} onAction={act} />

        <MissionObjectives state={state} context={context} />
      </aside>
    </div>
    <DiscoveryModal notice={discoveryNotice} onClose={() => setDiscoveryNotice(null)} />
    <ProactiveContactModal state={state} context={context} busy={busy} onAction={(action) => void act(action)} />
  </main>;
}

function ProactiveContactModal({ state, context, busy, onAction }: {
  state: PublicWorldState;
  context: GameContext;
  busy: boolean;
  onAction: (action: Parameters<typeof api.act>[1]) => void;
}) {
  const contact = state.pendingContact;
  if (!contact || (contact.deferredUntil && Date.parse(state.currentTime) < Date.parse(contact.deferredUntil))) return null;
  const character = context.characters.find((item) => item.id === contact.characterId);
  const remainingMinutes = Math.max(0, Math.ceil((Date.parse(contact.expiresAt) - Date.parse(state.currentTime)) / 60_000));
  const respond = (decision: "accept" | "defer" | "refuse") => onAction({
    type: "respond_to_contact", contactId: contact.id, decision, durationMinutes: 0, idempotencyKey: crypto.randomUUID(),
  });
  return <div className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="contact-title">
    <section className="my-6 w-full max-w-xl border border-line bg-ink shadow-2xl">
      <header className="border-b border-line bg-panel px-5 py-4"><p className="text-xs text-copper">主控事件 · NPC 主动接触</p><h2 id="contact-title" className="mt-1 font-serif text-xl">{character?.name ?? "有人"}主动找你谈话</h2><p className="mt-1 text-xs text-muted">{character?.publicIdentity ?? "身份待确认"} · 回应窗口剩余约 {remainingMinutes} 分钟</p></header>
      <div className="p-5"><p className="text-xs leading-6 text-muted">{contact.reason}</p><blockquote className="mt-4 border-l-2 border-copper bg-copper/[0.06] px-4 py-3 text-sm leading-7 text-paper/90">“{contact.openingLine}”</blockquote><p className="mt-3 text-[10px] text-muted">接受后进入 {contact.allocatedMinutes} 分钟对话；推迟不会停住世界时间，且只能使用一次。</p></div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-panel px-5 py-4"><Button variant="ghost" disabled={busy} onClick={() => respond("refuse")}>拒绝接触</Button><Button variant="outline" disabled={busy || contact.deferrals >= 1} onClick={() => respond("defer")}>半小时后再谈</Button><Button disabled={busy} onClick={() => respond("accept")}><MessageSquare size={15} />接受谈话</Button></footer>
    </section>
  </div>;
}

function DiscoveryModal({ notice, onClose }: { notice: DiscoveryNotice | null; onClose: () => void }) {
  if (!notice) return null;
  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="discovery-title">
      <section className="my-6 w-full max-w-lg border border-line bg-ink shadow-2xl">
        <header className="flex items-start justify-between border-b border-line bg-panel px-5 py-4">
          <div><p className="text-xs text-copper">行动带来了新的联系</p><h2 id="discovery-title" className="mt-1 font-serif text-xl">新的发现</h2></div>
          <button aria-label="关闭" onClick={onClose} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button>
        </header>
        <div className="divide-y divide-line px-5">
          {[...notice.locations, ...notice.characters].map((item) => <article key={item.key} className="py-4">
            <p className="text-sm text-paper">{item.title}</p>
            <p className="mt-2 text-xs leading-6 text-muted">{item.detail}</p>
          </article>)}
        </div>
        <footer className="flex justify-end border-t border-line bg-panel px-5 py-4"><Button onClick={onClose}>记下线索</Button></footer>
      </section>
    </div>;
}

function buildDiscoveryNotice(events: GameEvent[], context: GameContext): DiscoveryNotice {
  const locations = new Map<string, { key: string; title: string; detail: string }>();
  const characters = new Map<string, { key: string; title: string; detail: string }>();
  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    const hint = typeof payload.hint === "string" && payload.hint.trim() ? payload.hint : "相关信息已经记入行动日志。";
    if (event.type === "location.discovered" || event.type === "location.stage_changed") {
      const id = String(payload.locationId ?? "");
      const stage = String(payload.stage ?? "accessible");
      const fallbackName = context.locations.find((item) => item.id === id)?.name;
      const name = typeof payload.locationName === "string" ? payload.locationName : fallbackName;
      const title = stage === "rumored" ? "获得新的地点传闻" : stage === "located" ? `已确认地点：${name ?? "未知地点"}` : `新地点：${name ?? "未知地点"}`;
      locations.set(id || event.id, { key: `location-${id || event.id}`, title, detail: hint });
    }
    if (event.type === "character.introduced" || event.type === "character.identified") {
      const id = String(payload.characterId ?? "");
      const fallback = context.characters.find((item) => item.id === id);
      const name = typeof payload.characterName === "string" ? payload.characterName : fallback?.name ?? "未知人物";
      const identity = typeof payload.publicIdentity === "string" ? payload.publicIdentity : fallback?.publicIdentity;
      characters.set(id || event.id, { key: `character-${id || event.id}`, title: `新人物：${name}${identity ? `，${identity}` : ""}`, detail: hint });
    }
  }
  return { locations: [...locations.values()], characters: [...characters.values()] };
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <p className="flex items-center gap-2 text-xs font-medium text-muted">{icon}<span>{text}</span></p>;
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div><div className="mb-2 flex justify-between text-xs text-muted"><span>{label}</span><span>{Math.round(bounded)}%</span></div><div className="h-1.5 bg-line"><div className={`h-full ${color}`} style={{ width: `${bounded}%` }} /></div></div>;
}

function formatSleepDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const duration = minutes % 60 ? `${hours} 小时 30 分钟` : `${hours} 小时`;
  return `${duration}休息${minutes < 6 * 60 ? "（恢复较少）" : minutes >= 8 * 60 ? "（充分恢复）" : ""}`;
}
