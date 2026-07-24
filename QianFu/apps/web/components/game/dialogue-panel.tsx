"use client";

import { useState } from "react";
import type { DialogueGoal, DialogueTone, PublicWorldState } from "@qianfu/core";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DialoguePanel({ state, npcName, goal, tone, busy, onSend, onEnd }: {
  state: PublicWorldState; npcName: string; goal: DialogueGoal; tone: DialogueTone; busy: boolean;
  onSend: (text: string) => void; onEnd: () => void; onBack: () => void;
}) {
  const [text, setText] = useState("");
  const session = state.activeDialogue;
  if (!session) return null;

  return <main className="min-h-screen bg-ink text-paper">
    <header className="border-b border-line"><div className="mx-auto max-w-3xl px-5 py-4">
      <h1 className="font-serif text-xl">与 {npcName} 交谈</h1>
      <p className="text-xs text-muted">{goal} · {tone} · 每轮 2 分钟</p>
    </div></header>
    <section className="mx-auto max-w-3xl p-5">
      <div className="min-h-[420px] space-y-4 border border-line bg-panel p-5">
        {session.transcript.length === 0
          ? <p className="text-sm text-muted">对话已经开始，最多 {session.maxTurns} 轮。外部事件每 10 分钟结算一次。</p>
          : session.transcript.map((turn, index) => <p key={index} className={turn.speaker === "npc" ? "text-paper" : "text-copper"}>
              <span className="mr-3 text-[10px] text-muted">{turn.speaker === "npc" ? npcName : "你"}</span>{turn.text}
            </p>)}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>剩余 {session.maxTurns - session.turnCount} 轮 · 已用 {session.elapsedMinutes} / {session.allocatedMinutes} 分钟</span>
        <button onClick={onEnd} disabled={busy} className="text-copper">退出对话</button>
      </div>
      {session.status === "active" && <div className="mt-3 flex gap-2">
        <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} className="min-h-20 flex-1 border border-line bg-ink p-3 text-sm" placeholder="输入这一轮要说的话" />
        <Button disabled={busy || !text.trim()} onClick={() => { onSend(text.trim()); setText(""); }}><Send size={15} />发送这一轮</Button>
      </div>}
    </section>
  </main>;
}
