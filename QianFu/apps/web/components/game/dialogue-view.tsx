"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DialogueGoal, DialogueTone, PublicWorldState } from "@qianfu/core";
import { ArrowLeft, Send } from "lucide-react";
import { api, type GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";

const goals: Array<{ id: DialogueGoal; label: string; minutes: 10 | 20 | 30 | 60 }> = [
  { id: "small_talk", label: "寒暄观察", minutes: 10 }, { id: "build_trust", label: "建立信任", minutes: 20 },
  { id: "probe_attitude", label: "试探立场", minutes: 20 }, { id: "request_information", label: "索取情报", minutes: 30 },
  { id: "verify_intel", label: "核验细节", minutes: 20 }, { id: "apply_pressure", label: "施加压力", minutes: 30 }, { id: "recruit_probe", label: "试探招募", minutes: 30 },
];

export function DialogueView({ gameInstanceId, characterId }: { gameInstanceId: string; characterId: string }) {
  const [state, setState] = useState<PublicWorldState | null>(null); const [context, setContext] = useState<GameContext | null>(null);
  const [goal, setGoal] = useState<DialogueGoal>("small_talk"); const [tone] = useState<DialogueTone>("neutral"); const [text, setText] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const npc = context?.characters.find((item) => item.id === characterId);
  const load = async () => { try { const [game, ctx] = await Promise.all([api.getGame(gameInstanceId), api.getContext(gameInstanceId)]); setState(game); setContext(ctx); } catch (e) { setError(e instanceof Error ? e.message : "无法读取战役"); } };
  useEffect(() => { void load(); }, [gameInstanceId]);
  const act = async (action: Parameters<typeof api.act>[1]) => { setBusy(true); setError(""); try { const result = await api.act(gameInstanceId, action); setState(result.state); setText(""); } catch (e) { setError(e instanceof Error ? e.message : "对话行动失败"); } finally { setBusy(false); } };
  const session = state?.activeDialogue;
  const start = () => void act({ type: "dialogue_start", targetCharacterId: characterId, goal, tone, allocatedMinutes: goals.find((item) => item.id === goal)?.minutes ?? 10, durationMinutes: 0, idempotencyKey: crypto.randomUUID() });
  const send = () => { if (!session || !text.trim()) return; void act({ type: "dialogue_turn", sessionId: session.id, playerText: text.trim(), durationMinutes: 10, idempotencyKey: crypto.randomUUID() }); };
  if (!state || !context) return <main className="flex min-h-screen items-center justify-center bg-ink text-muted">{error || "正在读取对话"}</main>;
  return <main className="min-h-screen bg-ink text-paper"><header className="border-b border-line"><div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4"><Link href={`/games/${gameInstanceId}`} className="text-muted"><ArrowLeft size={18} /></Link><div><h1 className="font-serif text-xl">与 {npc?.name ?? characterId} 交谈</h1><p className="text-xs text-muted">{npc?.publicIdentity}</p></div></div></header><section className="mx-auto max-w-3xl p-5"><div className="min-h-[420px] space-y-4 border border-line bg-panel p-5">{session?.transcript.length ? session.transcript.map((turn, i) => <p key={i} className={turn.speaker === "npc" ? "text-paper" : "text-copper"}><span className="mr-3 text-[10px] text-muted">{turn.speaker === "npc" ? npc?.name : "你"}</span>{turn.text}</p>) : <p className="text-sm text-muted">选择这次交谈的目标。每轮消耗 10 分钟，达到上限后会话自动结束。</p>}</div>{error && <p className="mt-3 text-sm text-alert">{error}</p>}{!session || session.status === "completed" ? <div className="mt-4 flex gap-3"><select value={goal} onChange={(e) => setGoal(e.target.value as DialogueGoal)} className="h-10 flex-1 border border-line bg-ink px-3 text-sm">{goals.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.minutes} 分钟 / {item.minutes / 10} 轮</option>)}</select><Button disabled={busy} onClick={start}>开始对话</Button></div> : <div className="mt-4"><p className="mb-2 text-xs text-muted">剩余 {session.maxTurns - session.turnCount} 轮 · 已用 {session.elapsedMinutes} 分钟</p><div className="flex gap-2"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} className="min-h-20 flex-1 border border-line bg-ink p-3 text-sm" placeholder="输入这一轮要说的话" /><Button disabled={busy || !text.trim()} onClick={send}><Send size={15} />发送</Button></div></div>}</section></main>;
}
