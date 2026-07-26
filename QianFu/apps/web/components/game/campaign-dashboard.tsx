"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DifficultyConfig, PublicWorldState } from "@qianfu/core";
import { Clock3, FileText, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const dateTime = (iso: string) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const campaignTitle = "临江潜线：第三号电台";

export function CampaignDashboard() {
  const [games, setGames] = useState<PublicWorldState[]>([]);
  const [username, setUsername] = useState("正在识别身份");
  const [difficulty, setDifficulty] = useState<DifficultyConfig["id"]>("undercover");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PublicWorldState | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState("");

  const load = async () => {
    try {
      const [me, list] = await Promise.all([api.me(), api.listGames()]);
      setUsername(me.username); setGames(list.games); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法读取战役"); }
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    setBusy(true);
    try { const game = await api.createGame(difficulty); window.location.href = `/games/${game.gameInstanceId}`; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败"); setBusy(false); }
  };

  const closeDelete = () => { if (!busy) { setDeleteTarget(null); setDeleteStep(1); setConfirmation(""); } };
  const remove = async () => {
    if (!deleteTarget || confirmation !== campaignTitle) return;
    setBusy(true); setError("");
    try {
      await api.deleteGame(deleteTarget.gameInstanceId);
      setGames((items) => items.filter((game) => game.gameInstanceId !== deleteTarget.gameInstanceId));
      setDeleteTarget(null); setDeleteStep(1); setConfirmation("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败"); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-ink text-paper">
    <header className="border-b border-line"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-baseline gap-4"><span className="font-serif text-xl tracking-[0.3em]">潜线</span><span className="text-xs text-muted">战役档案室</span></div><div className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-safe" />{username}</div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-5 flex items-center justify-between"><div><h1 className="font-serif text-2xl">我的战役</h1><p className="mt-1 text-sm text-muted">继续尚未结束的潜伏任务</p></div><span className="text-xs text-muted">{games.length} 份档案</span></div>
          {error && <div className="mb-4 border border-alert/60 bg-alert/10 p-3 text-sm text-[#e9a399]">{error}</div>}
          <div className="divide-y divide-line border border-line">
            {games.length === 0 && !error ? <div className="p-10 text-center text-sm text-muted">尚无战役档案</div> : games.map((game) => <div key={game.gameInstanceId} className="grid grid-cols-[minmax(0,1fr)_40px] items-stretch transition-colors hover:bg-paper/[0.03]"><Link href={`/games/${game.gameInstanceId}`} className="grid min-w-0 gap-4 p-5 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-3"><FileText size={17} className="text-copper" /><h2 className="font-serif text-lg">{campaignTitle}</h2><span className="border border-line px-2 py-0.5 text-[10px] text-muted">{game.status === "active" ? "进行中" : "已结算"}</span></div><p className="mt-3 text-sm text-muted">当前位置：{game.currentLocationId} · 警戒 {Math.round(game.personalSuspicion)}%</p></div><div className="flex items-center gap-2 text-xs text-muted"><Clock3 size={14} />{dateTime(game.currentTime)}</div></Link><button title="删除战役" aria-label={`删除${campaignTitle}`} disabled={busy} onClick={() => { setDeleteTarget(game); setDeleteStep(1); setConfirmation(""); }} className="grid w-10 place-items-center border-l border-line text-muted hover:bg-alert/10 hover:text-alert disabled:opacity-40"><Trash2 size={16} /></button></div>)}
          </div>
        </section>
        <aside className="h-fit border border-line bg-panel p-5"><div className="flex items-center gap-2"><Plus size={17} className="text-copper" /><h2 className="font-serif text-lg">新建战役</h2></div><label className="mt-6 block text-xs text-muted" htmlFor="difficulty">难度</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyConfig["id"])} className="mt-2 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-copper"><option value="story">故事模式</option><option value="undercover">潜伏模式</option><option value="iron_curtain">铁幕模式</option></select><div className="mt-5 border-l-2 border-copper/70 pl-3 text-xs leading-6 text-muted">临江，1942。三天内确认一批无线电设备的运输时间、地点与内容。</div><Button className="mt-6 w-full" disabled={busy} onClick={create}>{busy ? "正在建档" : "建立战役档案"}</Button></aside>
      </div>
    </div>
    {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-campaign-title">
      <div className="w-full max-w-md border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-alert">永久删除</p><h2 id="delete-campaign-title" className="mt-2 font-serif text-xl">{deleteStep === 1 ? "确认删除这份战役档案？" : "再次确认"}</h2></div><button aria-label="关闭" disabled={busy} onClick={closeDelete} className="grid h-8 w-8 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        {deleteStep === 1 ? <><p className="mt-5 text-sm leading-7 text-paper/80">删除后，战役状态、行动记录、对话历史和快照都会永久移除，无法恢复。</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={closeDelete}>取消</Button><Button variant="danger" disabled={busy} onClick={() => setDeleteStep(2)}>继续确认</Button></div></> : <><label className="mt-5 block text-sm leading-6 text-paper/80">请输入战役名称以确认：<span className="mt-1 block text-xs text-muted">{campaignTitle}</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-3 h-11 w-full border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-alert" /></label><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={() => { setDeleteStep(1); setConfirmation(""); }}>返回</Button><Button variant="danger" disabled={busy || confirmation !== campaignTitle} onClick={() => void remove()}>{busy ? "正在删除" : "永久删除"}</Button></div></>}
      </div>
    </div>}
  </main>;
}
