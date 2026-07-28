"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleStop, Radio, Send, ShieldAlert, Trash2, Undo2, Volume2, VolumeX } from "lucide-react";
import type { GameAction } from "@qianfu/core";
import type { RadioChallenge, RadioChallengeRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";

type SoundMode = "radio" | "clean" | "muted";

export function MorseRadioGame({ challenge, selection, busy, onCancel, onSend, onAbort }: {
  challenge: RadioChallenge;
  selection: RadioChallengeRequest;
  busy: boolean;
  onCancel: () => void;
  onSend: (action: GameAction) => void;
  onAbort: (interruptionId: string) => void;
}) {
  const expected = useMemo(() => [...challenge.sequence].filter((symbol): symbol is "." | "-" => symbol === "." || symbol === "-"), [challenge.sequence]);
  const [inputs, setInputs] = useState<Array<{ symbol: "." | "-"; offsetMs: number }>>([]);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [interruptionDecisions, setInterruptionDecisions] = useState<Array<{ interruptionId: string; decision: "pause" | "force" }>>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [soundMode, setSoundMode] = useState<SoundMode>("radio");
  const audioRef = useRef<AudioContext | null>(null);
  const activeInterruption = challenge.interruptions.find((item) => inputs.length >= item.atSymbol && !interruptionDecisions.some((decision) => decision.interruptionId === item.id));
  const complete = inputs.length >= expected.length && !activeInterruption && interruptionDecisions.length === challenge.interruptions.length;

  const playTone = useCallback((symbol: "." | "-") => {
    if (soundMode === "muted") return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioRef.current ?? new AudioContextClass();
    audioRef.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = soundMode === "radio" ? "square" : "sine";
    oscillator.frequency.value = 700;
    const duration = symbol === "." ? 0.1 : 0.3;
    const start = context.currentTime;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(soundMode === "radio" ? 0.08 : 0.12, start + 0.008);
    gain.gain.setValueAtTime(soundMode === "radio" ? 0.08 : 0.12, start + Math.max(0.01, duration - 0.015));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }, [soundMode]);

  const inputSymbol = useCallback((symbol: "." | "-") => {
    if (startedAt === null || complete || activeInterruption) return;
    playTone(symbol);
    setInputs((current) => [...current, { symbol, offsetMs: Math.max(0, Date.now() - startedAt) }]);
  }, [activeInterruption, complete, playTone, startedAt]);

  const undo = useCallback(() => {
    if (inputs.length === 0) return;
    setInputs((current) => current.slice(0, -1));
    setCorrectionCount((count) => count + 1);
  }, [inputs.length]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === "." || event.key.toLowerCase() === "j") { event.preventDefault(); inputSymbol("."); }
      if (event.key === "-" || event.key.toLowerCase() === "k") { event.preventDefault(); inputSymbol("-"); }
      if (event.key === "Backspace") { event.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [inputSymbol, undo]);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const start = () => {
    setInputs([]);
    setCorrectionCount(0);
    setInterruptionDecisions([]);
    setStartedAt(Date.now());
  };
  const activeIndex = Math.min(inputs.length, expected.length - 1);
  const focusStart = Math.max(0, activeIndex - 1);
  const focusEnd = focusStart + challenge.config.focusWindow;
  const correctCount = inputs.reduce((count, input, index) => count + (input.symbol === expected[index] ? 1 : 0), 0);
  const interference = challenge.config.interference === "heavy" && inputs.length > 0 && inputs.length % 7 === 0
    ? "耳机中掠过一阵杂波" : challenge.config.interference === "light" && inputs.length > 0 && inputs.length % 11 === 0 ? "信号轻微起伏" : "频率稳定";

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#101312] text-paper" role="dialog" aria-modal="true" aria-labelledby="morse-title">
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <button aria-label="返回电文编制" onClick={onCancel} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><ArrowLeft size={18} /></button>
        <div className="text-center"><p className="text-[10px] text-copper">第三号电台</p><h2 id="morse-title" className="font-serif text-lg">摩尔斯发报</h2></div>
        <div className="flex items-center gap-1">
          <button title="电台音色" aria-label="电台音色" onClick={() => setSoundMode("radio")} className={`grid h-9 w-9 place-items-center ${soundMode === "radio" ? "text-copper" : "text-muted"}`}><Radio size={16} /></button>
          <button title="纯净按键音" aria-label="纯净按键音" onClick={() => setSoundMode("clean")} className={`grid h-9 w-9 place-items-center ${soundMode === "clean" ? "text-copper" : "text-muted"}`}><Volume2 size={16} /></button>
          <button title="静音" aria-label="静音" onClick={() => setSoundMode("muted")} className={`grid h-9 w-9 place-items-center ${soundMode === "muted" ? "text-copper" : "text-muted"}`}><VolumeX size={16} /></button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0">
          <div className="flex items-center justify-between text-xs text-muted"><span>报码序列</span><span>{inputs.length}/{expected.length}</span></div>
          <div className="mt-3 min-h-40 border-y border-line bg-ink px-3 py-5 font-mono text-xl leading-10 sm:px-5">
            {expected.map((symbol, index) => <span key={index} className={`mr-2 inline-block w-4 text-center transition-colors ${index < inputs.length ? inputs[index].symbol === symbol ? "text-safe" : "text-alert" : index === inputs.length ? "bg-copper text-ink" : index >= focusStart && index < focusEnd ? "text-paper" : "text-muted/45"}`}>{symbol}</span>)}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs"><span className={interference === "频率稳定" ? "text-muted" : "text-copper"}>{interference}</span><span className="text-muted">十分钟检查 {challenge.checksPerformed} 次 · 修正 {correctionCount}/{challenge.config.correctionAllowance}</span></div>

          {startedAt === null ? <div className="mt-8 flex justify-center"><Button onClick={start}><Radio size={15} />开始发报</Button></div> : <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6">
            <button disabled={complete} onClick={() => inputSymbol(".")} className="h-28 border border-line bg-panel text-center hover:border-copper active:bg-copper/10 disabled:opacity-40"><span className="block font-mono text-4xl">·</span><span className="mt-2 block text-xs text-muted">点 · J</span></button>
            <button disabled={complete} onClick={() => inputSymbol("-")} className="h-28 border border-line bg-panel text-center hover:border-copper active:bg-copper/10 disabled:opacity-40"><span className="block font-mono text-4xl">−</span><span className="mt-2 block text-xs text-muted">划 · K</span></button>
          </div>}
          {startedAt !== null && <div className="mt-4 flex justify-center"><button disabled={inputs.length === 0} onClick={undo} className="flex h-9 items-center gap-2 px-3 text-xs text-muted hover:text-paper disabled:opacity-30"><Undo2 size={14} />撤回上一键</button></div>}
        </section>

        <aside className="border-l-2 border-copper bg-copper/[0.06] p-4">
          <p className="text-xs text-copper">电文内容</p>
          <div className="mt-3 space-y-3">{challenge.content.map((item) => <div key={item.intelId}><p className="text-sm">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.fields.join("、")}</p></div>)}</div>
          <div className="mt-5 border-t border-line pt-4 text-xs leading-6 text-muted"><p className="flex justify-between"><span>形式</span><span className="text-paper">{selection.format === "compressed" ? "压缩摘要" : "完整报码"}</span></p><p className="flex justify-between"><span>节拍</span><span className="text-paper">{challenge.config.unitMs} ms</span></p><p className="flex justify-between"><span>正确键</span><span className="text-paper">{correctCount}/{inputs.length}</span></p><p className="flex justify-between"><span>途中处置</span><span className="text-paper">{interruptionDecisions.length}/{challenge.interruptions.length}</span></p></div>
        </aside>
      </div>

      {activeInterruption && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4"><section className="w-full max-w-lg border border-alert/50 bg-ink shadow-2xl"><header className="border-b border-line bg-alert/10 px-5 py-4"><p className="flex items-center gap-2 text-xs text-alert"><ShieldAlert size={15} />发报第 {activeInterruption.gameMinute} 分钟</p><h3 className="mt-2 font-serif text-xl">{activeInterruption.title}</h3></header><div className="p-5"><p className="text-sm leading-7 text-muted">{activeInterruption.description}</p><div className="mt-6 grid gap-3"><button onClick={() => setInterruptionDecisions((current) => [...current, { interruptionId: activeInterruption.id, decision: "pause" }])} className="border border-line px-4 py-3 text-left hover:border-copper"><span className="block text-sm">停机监听</span><span className="mt-1 block text-xs text-muted">增加 10 分钟，降低当前信号暴露</span></button><button onClick={() => setInterruptionDecisions((current) => [...current, { interruptionId: activeInterruption.id, decision: "force" }])} className="border border-line px-4 py-3 text-left hover:border-alert"><span className="block text-sm">强行继续</span><span className="mt-1 block text-xs text-muted">保持速度，但增加误码和测向风险</span></button><button disabled={busy} onClick={() => onAbort(activeInterruption.id)} className="flex h-11 items-center justify-center gap-2 text-sm text-alert hover:bg-alert/10 disabled:opacity-40"><Trash2 size={15} />销毁电文并撤离</button></div></div></section></div>}

      {complete && <footer className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-sm text-safe"><CircleStop size={16} />报码输入完成，等待发送</p><Button disabled={busy} onClick={() => onSend({ type: "send_radio_message", ...selection, mode: "manual", challengeToken: challenge.token, attempt: { inputs, correctionCount, interruptionDecisions }, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}><Send size={15} />发送并清理电台</Button></footer>}
    </main>
  </div>;
}
