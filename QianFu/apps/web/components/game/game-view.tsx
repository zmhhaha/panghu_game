"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DialogueGoal, DialogueTone, GameEvent, PublicWorldState } from "@qianfu/core";
import {
  ArrowLeft, ChevronRight, Clock3, Download, MapPin,
  MessageSquare, ShieldAlert, Timer, UserRound, UsersRound,
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

const travelMinutes: Record<string, Record<string, number>> = {
  "archive-office": { "radio-office": 10, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 40, "wu-clock-shop": 30 },
  "radio-office": { "archive-office": 10, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 40, "wu-clock-shop": 30 },
  "linjiang-news": { "archive-office": 20, "radio-office": 20, "jianghai-hotel": 20, "third-dock": 30, "wu-clock-shop": 20 },
  "jianghai-hotel": { "archive-office": 20, "radio-office": 20, "linjiang-news": 20, "third-dock": 30, "wu-clock-shop": 20 },
  "third-dock": { "archive-office": 40, "radio-office": 40, "linjiang-news": 30, "jianghai-hotel": 30, "wu-clock-shop": 30 },
  "wu-clock-shop": { "archive-office": 30, "radio-office": 30, "linjiang-news": 20, "jianghai-hotel": 20, "third-dock": 30 },
};

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
      setSelectedNpc((current) => publicContext.characters.some((character) => character.id === current && character.known)
        ? current : publicContext.characters[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "行动失败");
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
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(state.currentTime));

  if (state.status === "finished") return <SettlementReport gameInstanceId={gameInstanceId} />;

  if (state.activeDialogue) {
    const activeNpc = context.characters.find((item) => item.id === state.activeDialogue?.characterId);
    return <DialoguePanel
      state={state}
      npcName={activeNpc?.name ?? state.activeDialogue.characterId}
      npcIdentity={activeNpc?.publicIdentity ?? "身份不明"}
      goal={state.activeDialogue.goal}
      tone={state.activeDialogue.tone}
      busy={busy}
      error={error}
      onSend={(text) => act({ type: "dialogue_turn", sessionId: state.activeDialogue!.id, playerText: text, durationMinutes: 2, idempotencyKey: crypto.randomUUID() })}
      onEnd={() => void act({ type: "dialogue_end", sessionId: state.activeDialogue!.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}
    />;
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
          travelMinutes={travelMinutes[state.currentLocationId] ?? {}} disabled={busy || state.status !== "active"}
          onTravel={(locationId, minutes) => void act({ type: "move", destinationId: locationId, durationMinutes: minutes, idempotencyKey: crypto.randomUUID() })} /></div>
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="outline" className="w-full" disabled={busy || state.status !== "active"}
            onClick={() => void act({ type: "wait", durationMinutes: 10, idempotencyKey: crypto.randomUUID() })}>
            <Timer size={15} />等待 10 分钟
          </Button>
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

        <IntelligenceBoard state={state} context={context} busy={busy} onAction={(action) => void act(action)} />

        <MissionObjectives state={state} context={context} />
      </aside>
    </div>
  </main>;
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <p className="flex items-center gap-2 text-xs font-medium text-muted">{icon}<span>{text}</span></p>;
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div><div className="mb-2 flex justify-between text-xs text-muted"><span>{label}</span><span>{Math.round(bounded)}%</span></div><div className="h-1.5 bg-line"><div className={`h-full ${color}`} style={{ width: `${bounded}%` }} /></div></div>;
}
