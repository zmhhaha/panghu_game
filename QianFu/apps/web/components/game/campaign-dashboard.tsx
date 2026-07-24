"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DifficultyConfig, PublicWorldState } from "@qianfu/core";
import { Clock3, FileText, Plus, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const dateTime = (iso: string) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function CampaignDashboard() {
  const [games, setGames] = useState<PublicWorldState[]>([]);
  const [username, setUsername] = useState("正在识别身份");
  const [difficulty, setDifficulty] = useState<DifficultyConfig["id"]>("undercover");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  return <main className="min-h-screen bg-ink text-paper">
    <header className="border-b border-line"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-baseline gap-4"><span className="font-serif text-xl tracking-[0.3em]">潜线</span><span className="text-xs text-muted">战役档案室</span></div><div className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-safe" />{username}</div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-5 flex items-center justify-between"><div><h1 className="font-serif text-2xl">我的战役</h1><p className="mt-1 text-sm text-muted">继续尚未结束的潜伏任务</p></div><span className="text-xs text-muted">{games.length} 份档案</span></div>
          {error && <div className="mb-4 border border-alert/60 bg-alert/10 p-3 text-sm text-[#e9a399]">{error}</div>}
          <div className="divide-y divide-line border border-line">
            {games.length === 0 && !error ? <div className="p-10 text-center text-sm text-muted">尚无战役档案</div> : games.map((game) => <Link key={game.gameInstanceId} href={`/games/${game.gameInstanceId}`} className="grid gap-4 p-5 transition-colors hover:bg-paper/[0.03] sm:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-3"><FileText size={17} className="text-copper" /><h2 className="font-serif text-lg">临江潜线：第三号电台</h2><span className="border border-line px-2 py-0.5 text-[10px] text-muted">{game.status === "active" ? "进行中" : "已结算"}</span></div><p className="mt-3 text-sm text-muted">当前位置：{game.currentLocationId} · 警戒 {Math.round(game.personalSuspicion)}%</p></div><div className="flex items-center gap-2 text-xs text-muted"><Clock3 size={14} />{dateTime(game.currentTime)}</div></Link>)}
          </div>
        </section>
        <aside className="h-fit border border-line bg-panel p-5"><div className="flex items-center gap-2"><Plus size={17} className="text-copper" /><h2 className="font-serif text-lg">新建战役</h2></div><label className="mt-6 block text-xs text-muted" htmlFor="difficulty">难度</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyConfig["id"])} className="mt-2 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-copper"><option value="story">故事模式</option><option value="undercover">潜伏模式</option><option value="iron_curtain">铁幕模式</option></select><div className="mt-5 border-l-2 border-copper/70 pl-3 text-xs leading-6 text-muted">临江，1942。三天内确认一批无线电设备的运输时间、地点与内容。</div><Button className="mt-6 w-full" disabled={busy} onClick={create}>{busy ? "正在建档" : "建立战役档案"}</Button></aside>
      </div>
    </div>
  </main>;
}
