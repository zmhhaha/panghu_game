"use client";

import { useEffect, useState } from "react";
import type { GameAction, PublicWorldState } from "@qianfu/core";
import { AlertTriangle, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const strategies = [
  { id: "calm", label: "平静陈述", hint: "按事实顺序回答，不主动扩展" },
  { id: "formal", label: "引用公开记录", hint: "依靠考勤、账目或稿件留下的证据" },
  { id: "deflect", label: "含糊回避", hint: "减少细节，但容易加深怀疑" },
  { id: "counter_question", label: "反问施压", hint: "争夺主动权，高怀疑状态下风险很高" },
] as const;

export function InterrogationPanel({ state, interrogator, busy, error, onAction }: {
  state: PublicWorldState;
  interrogator: { name: string; publicIdentity: string } | null;
  busy: boolean;
  error: string;
  onAction: (action: GameAction) => void;
}) {
  const interrogation = state.interrogation;
  const [strategy, setStrategy] = useState<(typeof strategies)[number]["id"]>("calm");
  const [text, setText] = useState("");
  const answerCount = interrogation?.answers.length ?? 0;
  useEffect(() => setText(""), [answerCount]);
  if (!interrogation || interrogation.status !== "active") return null;
  const question = interrogation.questions[answerCount];

  return <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-6">
    <div className="mx-auto max-w-3xl border border-line bg-panel/40">
      <header className="border-b border-line bg-panel px-5 py-5 sm:px-7">
        <p className="flex items-center gap-2 text-xs text-alert"><ShieldAlert size={14} />{interrogator?.publicIdentity ?? "敌方调查人员"}临时问讯</p>
        <h1 className="mt-2 font-serif text-2xl">{interrogator?.name ?? "调查员"}正在核对你的公开身份</h1>
        <p className="mt-3 text-sm leading-6 text-muted">回答会进入同一条时间线。前后说法、公开工作记录和表达策略共同决定盘问结果。</p>
      </header>
      <section className="p-5 sm:p-7">
        <div className="flex items-center justify-between text-xs text-muted"><span>第 {answerCount + 1} 问，共 {interrogation.questions.length} 问</span><span>每次回答 10 分钟</span></div>
        <blockquote className="mt-4 border-l-2 border-alert bg-alert/10 px-4 py-4 font-serif text-lg leading-8">“{question}”</blockquote>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">{strategies.map((item) => <button key={item.id} onClick={() => setStrategy(item.id)} className={`border px-3 py-3 text-left ${strategy === item.id ? "border-copper bg-copper/10" : "border-line hover:border-copper/60"}`}><span className="block text-sm">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{item.hint}</span></button>)}</div>
        <label className="mt-6 block text-xs text-muted">你的回答
          <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={300} rows={5} autoFocus className="mt-2 w-full resize-none border border-line bg-ink px-4 py-3 text-sm leading-6 text-paper outline-none focus:border-copper" placeholder="用你的公开身份解释行踪，并给出可以被核对的细节。" />
        </label>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{text.length < 4 ? "至少输入 4 个字符" : "回答提交后不能撤回"}</span><span>{text.length}/300</span></div>
        {error && <p className="mt-4 flex items-center gap-2 border-l-2 border-alert bg-alert/10 px-3 py-2 text-xs text-alert"><AlertTriangle size={13} />{error}</p>}
      </section>
      <footer className="flex justify-end border-t border-line bg-panel px-5 py-4 sm:px-7"><Button disabled={busy || text.trim().length < 4} onClick={() => onAction({ type: "interrogation_answer", interrogationId: interrogation.id, strategy, playerText: text.trim(), durationMinutes: 10, idempotencyKey: crypto.randomUUID() })}><Send size={15} />提交回答</Button></footer>
    </div>
  </main>;
}
