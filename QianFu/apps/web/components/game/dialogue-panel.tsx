"use client";

import { useEffect, useRef, useState } from "react";
import type { DialogueGoal, DialogueTone, PublicWorldState } from "@qianfu/core";
import { DIALOGUE_TEXT_LIMITS } from "@qianfu/core/dialogue";
import { Clock3, LogOut, Send, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const goalLabels: Record<DialogueGoal, string> = {
  small_talk: "寒暄观察", build_trust: "建立信任", probe_attitude: "试探立场",
  verify_intel: "核验细节", request_information: "索取情报", apply_pressure: "施加压力",
  recruit_probe: "试探招募", long_talk: "长谈扩展",
};
const toneLabels: Record<DialogueTone, string> = {
  neutral: "平静", friendly: "友好", formal: "正式", urgent: "急切", threatening: "强硬",
};

export function DialoguePanel({ state, npcName, npcIdentity, goal, tone, busy, error, onSend, onEnd }: {
  state: PublicWorldState;
  npcName: string;
  npcIdentity: string;
  goal: DialogueGoal;
  tone: DialogueTone;
  busy: boolean;
  error: string;
  onSend: (text: string) => Promise<void>;
  onEnd: () => void;
}) {
  const [text, setText] = useState("");
  const [pendingTurn, setPendingTurn] = useState<{ text: string; transcriptLength: number } | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const session = state.activeDialogue;
  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [session?.transcript.length, pendingTurn]);
  if (!session) return null;

  const activeGoal = session.goal ?? goal;
  const activeTone = session.tone ?? tone;
  const completed = session.status === "completed";
  const textLimit = DIALOGUE_TEXT_LIMITS[activeGoal];
  const remainingTurns = Math.max(0, session.maxTurns - session.turnCount);
  const remainingMinutes = Math.max(0, session.allocatedMinutes - session.elapsedMinutes);
  const npcInitiated = session.initiatedBy === "npc";
  const currentMinute = new Date(state.currentTime).getUTCMinutes();
  const untilWorldTick = 10 - (currentMinute % 10 || 10);
  const showPendingTurn = pendingTurn !== null && session.transcript.length === pendingTurn.transcriptLength;
  const send = async () => {
    const message = text.trim();
    if (!message || busy || completed) return;
    setPendingTurn({ text: message, transcriptLength: session.transcript.length });
    setText("");
    await onSend(message);
    setPendingTurn(null);
  };

  return <main className="flex min-h-screen flex-col bg-ink text-paper">
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-copper text-copper"><UserRound size={17} /></span>
          <div className="min-w-0"><h1 className="truncate font-serif text-lg">{npcName}</h1><p className="truncate text-xs text-muted">{npcIdentity}</p></div>
        </div>
        <button onClick={onEnd} disabled={busy} className="flex h-9 items-center gap-2 px-2 text-sm text-muted hover:text-paper disabled:opacity-40"><LogOut size={16} />{completed ? "结束对话" : "提前结束"}</button>
      </div>
    </header>

    <div className="border-b border-line bg-ink">
      <div className={`mx-auto grid w-full max-w-5xl grid-cols-2 gap-px bg-line ${npcInitiated ? "" : "sm:grid-cols-4"}`}>
        {!npcInitiated && <StatusItem label="交谈目标" value={goalLabels[activeGoal]} />}
        {!npcInitiated && <StatusItem label="表达方式" value={toneLabels[activeTone]} />}
        <StatusItem label="剩余时间" value={`${remainingMinutes} 分钟`} />
        <StatusItem label="剩余轮次" value={`${remainingTurns} 轮`} />
      </div>
    </div>

    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><Clock3 size={13} className="text-copper" />每轮推进 2 分钟</span>
        <span className="flex items-center gap-1.5"><ShieldAlert size={13} />距离下一次世界结算约 {untilWorldTick || 10} 分钟</span>
      </div>

      <div className="min-h-[420px] flex-1 border-y border-line py-4">
        {session.transcript.length === 0 && !showPendingTurn ? <div className="flex min-h-[360px] items-center justify-center text-center"><div><p className="font-serif text-lg">谈话开始了</p><p className="mt-2 text-sm text-muted">先说第一句话。对方会根据自己的记忆和立场回应。</p></div></div>
          : <div className="space-y-5">{session.transcript.map((turn, index) => <DialogueBubble key={`${turn.at}-${index}`} speaker={turn.speaker} text={turn.text} npcName={npcName} />)}
            {showPendingTurn && <><DialogueBubble speaker="player" text={pendingTurn.text} npcName={npcName} /><div className="flex justify-start">
              <div className="min-w-44 border-l-2 border-line bg-panel px-4 py-3">
                <p className="mb-1 text-[10px] text-muted">{npcName}</p>
                <div className="flex items-center gap-2 text-sm text-muted"><span>{npcName}正在斟酌</span><span className="inline-flex w-6 justify-between" aria-hidden="true"><i className="h-1 w-1 animate-pulse bg-copper" /><i className="h-1 w-1 animate-pulse bg-copper [animation-delay:150ms]" /><i className="h-1 w-1 animate-pulse bg-copper [animation-delay:300ms]" /></span></div>
              </div>
            </div></>}<div ref={transcriptEnd} /></div>}
      </div>

      {error && <div className="mt-3 border-l-2 border-alert bg-alert/10 px-4 py-2 text-sm text-[#efaaa4]">{error}</div>}

      {completed ? <div className="mt-4 flex flex-col items-center justify-between gap-3 border border-copper/40 bg-copper/[0.06] px-4 py-4 sm:flex-row">
        <div><p className="text-sm text-paper">交谈时间已到</p><p className="mt-1 text-xs text-muted">对方没有继续开口。你可以回看记录，然后结束这次对话。</p></div>
        <Button disabled={busy} onClick={onEnd}><LogOut size={15} />结束对话</Button>
      </div> : <div className="mt-4 border border-line bg-panel p-3">
        <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={textLimit}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
          className="min-h-24 w-full resize-none bg-transparent p-1 text-sm leading-6 text-paper outline-none placeholder:text-muted"
          placeholder={`输入这一轮要说的话，最多 ${textLimit} 个字符...`} />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[11px] text-muted">{text.length}/{textLimit} · Enter 发送</span>
          <Button disabled={busy || !text.trim()} onClick={() => void send()}><Send size={15} />发送这一轮</Button>
        </div>
      </div>}
    </section>
  </main>;
}

function DialogueBubble({ speaker, text, npcName }: { speaker: "player" | "npc" | "system"; text: string; npcName: string }) {
  if (speaker === "system") {
    return <div className="mx-auto max-w-2xl border-y border-alert/30 bg-alert/[0.07] px-4 py-3 text-center text-xs leading-6 text-[#efaaa4]">{text}</div>;
  }
  return <div className={`flex ${speaker === "player" ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[82%] px-4 py-3 sm:max-w-[70%] ${speaker === "player" ? "border-r-2 border-copper bg-copper/[0.07]" : "border-l-2 border-line bg-panel"}`}>
      <p className="mb-1 text-[10px] text-muted">{speaker === "player" ? "你" : npcName}</p>
      <p className="text-sm leading-7">{text}</p>
    </div>
  </div>;
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return <div className="bg-ink px-4 py-3"><p className="text-[10px] text-muted">{label}</p><p className="mt-1 text-sm text-paper">{value}</p></div>;
}
