"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CampaignCatalogEntry, DifficultyConfig, PublicWorldState } from "@qianfu/core";
import { COVER_PROFILES } from "@qianfu/core/cover-profiles";
import { BriefcaseBusiness, Clock3, FileText, PenLine, Plus, ShieldCheck, Store, Trash2, X } from "lucide-react";
import { api, type CampaignListItem } from "@/lib/api";
import { Button } from "@/components/ui/button";

const dateTime = (iso: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
export function CampaignDashboard() {
  const [games, setGames] = useState<CampaignListItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignCatalogEntry[]>([]);
  const [campaignKey, setCampaignKey] = useState("");
  const [username, setUsername] = useState("正在识别身份");
  const [difficulty, setDifficulty] = useState<DifficultyConfig["id"]>("undercover");
  const [coverProfileId, setCoverProfileId] = useState<PublicWorldState["cover"]["profileId"]>("archive_clerk");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampaignListItem | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState("");

  const load = async () => {
    try {
      const [me, list, catalog] = await Promise.all([api.me(), api.listGames(), api.listCampaigns()]);
      setUsername(me.username); setGames(list.games); setCampaigns(catalog.campaigns);
      setCampaignKey((current) => catalog.campaigns.some((campaign) => `${campaign.id}@${campaign.version}` === current)
        ? current : catalog.campaigns[0] ? `${catalog.campaigns[0].id}@${catalog.campaigns[0].version}` : "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法读取战役"); }
  };
  useEffect(() => { void load(); }, []);

  const selectedCampaign = campaigns.find((campaign) => `${campaign.id}@${campaign.version}` === campaignKey) ?? campaigns[0];
  const availableProfiles = COVER_PROFILES.filter((profile) => selectedCampaign?.coverProfileIds.includes(profile.id));
  useEffect(() => {
    if (selectedCampaign && !selectedCampaign.coverProfileIds.includes(coverProfileId)) {
      setCoverProfileId(selectedCampaign.coverProfileIds[0] ?? "archive_clerk");
    }
  }, [coverProfileId, selectedCampaign]);

  const create = async () => {
    if (!selectedCampaign) { setError("当前没有可建立的战役"); return; }
    setBusy(true);
    try { const game = await api.createGame(selectedCampaign, difficulty, coverProfileId); window.location.href = `/games/${game.gameInstanceId}`; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败"); setBusy(false); }
  };

  const closeDelete = () => { if (!busy) { setDeleteTarget(null); setDeleteStep(1); setConfirmation(""); } };
  const remove = async () => {
    if (!deleteTarget || confirmation !== deleteTarget.campaignName) return;
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
            {games.length === 0 && !error ? <div className="p-10 text-center text-sm text-muted">尚无战役档案</div> : games.map((game) => <div key={game.gameInstanceId} className="grid grid-cols-[minmax(0,1fr)_40px] items-stretch transition-colors hover:bg-paper/[0.03]"><Link href={`/games/${game.gameInstanceId}`} className="grid min-w-0 gap-4 p-5 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-3"><FileText size={17} className="text-copper" /><h2 className="font-serif text-lg">{game.campaignName}</h2><span className="border border-line px-2 py-0.5 text-[10px] text-muted">{game.status === "active" ? "进行中" : "已结算"}</span></div><p className="mt-3 text-sm text-muted">当前位置：{game.currentLocationName} · 警戒 {Math.round(game.personalSuspicion)}%</p></div><div className="flex items-center gap-2 text-xs text-muted"><Clock3 size={14} />{dateTime(game.currentTime)}</div></Link><button title="删除战役" aria-label={`删除${game.campaignName}`} disabled={busy} onClick={() => { setDeleteTarget(game); setDeleteStep(1); setConfirmation(""); }} className="grid w-10 place-items-center border-l border-line text-muted hover:bg-alert/10 hover:text-alert disabled:opacity-40"><Trash2 size={16} /></button></div>)}
          </div>
        </section>
        <aside className="h-fit border border-line bg-panel p-5">
          <div className="flex items-center gap-2"><Plus size={17} className="text-copper" /><h2 className="font-serif text-lg">新建战役</h2></div>
          <p className="mt-5 text-xs text-muted">选择战役</p>
          <div className="mt-2 divide-y divide-line border-y border-line">{campaigns.map((campaign) => {
            const selected = `${campaign.id}@${campaign.version}` === campaignKey;
            return <button key={`${campaign.id}@${campaign.version}`} onClick={() => setCampaignKey(`${campaign.id}@${campaign.version}`)} className={`w-full px-2 py-3 text-left transition-colors ${selected ? "bg-copper/10" : "hover:bg-paper/[0.035]"}`}>
              <span className="block text-sm">{campaign.name}</span><span className="mt-1 block text-[10px] text-muted">{campaign.setting} · {campaign.objectiveCount} 项连续任务</span>
            </button>;
          })}</div>
          {selectedCampaign && <div className="mt-4 border-l-2 border-copper/70 pl-3 text-xs leading-6 text-muted">{selectedCampaign.summary}<span className="mt-1 block text-[10px] text-paper/65">预计 {selectedCampaign.estimatedDays} 个游戏日</span></div>}
          <p className="mt-5 text-xs leading-5 text-muted">选择一份公开履历。它决定你能合理出现在哪里，以及必须如何解释自己的行踪；不会揭示任何人物的真实立场。</p>
          <div className="mt-3 space-y-2">{availableProfiles.map((profile) => { const Icon = profile.id === "travelling_merchant" ? Store : profile.id === "freelance_writer" ? PenLine : BriefcaseBusiness; const selected = profile.id === coverProfileId; return <button key={profile.id} onClick={() => setCoverProfileId(profile.id)} className={`w-full border p-3 text-left transition-colors ${selected ? "border-copper bg-copper/10" : "border-line hover:border-paper/40"}`}><span className="flex items-center gap-2 text-sm"><Icon size={15} className="text-copper" />{profile.title}</span><span className="mt-1 block text-[11px] leading-5 text-muted">{profile.summary}</span><span className="mt-1 block text-[10px] text-paper/70">约束：{profile.routineLabel}</span></button>; })}</div>
          <label className="mt-5 block text-xs text-muted" htmlFor="difficulty">难度</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyConfig["id"])} className="mt-2 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-copper"><option value="story">引导模式</option><option value="undercover">潜伏模式</option><option value="iron_curtain">铁幕模式</option></select>
          <Button className="mt-6 w-full" disabled={busy || !selectedCampaign} onClick={create}>{busy ? "正在建档" : "建立战役档案"}</Button>
        </aside>
      </div>
    </div>
    {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-campaign-title">
      <div className="w-full max-w-md border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-alert">永久删除</p><h2 id="delete-campaign-title" className="mt-2 font-serif text-xl">{deleteStep === 1 ? "确认删除这份战役档案？" : "再次确认"}</h2></div><button aria-label="关闭" disabled={busy} onClick={closeDelete} className="grid h-8 w-8 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        {deleteStep === 1 ? <><p className="mt-5 text-sm leading-7 text-paper/80">删除后，战役状态、行动记录、对话历史和快照都会永久移除，无法恢复。</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={closeDelete}>取消</Button><Button variant="danger" disabled={busy} onClick={() => setDeleteStep(2)}>继续确认</Button></div></> : <><label className="mt-5 block text-sm leading-6 text-paper/80">请输入战役名称以确认：<span className="mt-1 block text-xs text-muted">{deleteTarget.campaignName}</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-3 h-11 w-full border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-alert" /></label><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={() => { setDeleteStep(1); setConfirmation(""); }}>返回</Button><Button variant="danger" disabled={busy || confirmation !== deleteTarget.campaignName} onClick={() => void remove()}>{busy ? "正在删除" : "永久删除"}</Button></div></>}
      </div>
    </div>}
  </main>;
}
