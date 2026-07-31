"use client";

import type { PublicCaseSummary, PublicGameState } from "@tashuo/core";
import { Activity, Archive, ArrowUpRight, Clock3, FileSearch, FolderOpen, LogOut, Radio, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function CaseDesk() {
  const [cases, setCases] = useState<PublicCaseSummary[]>([]);
  const [games, setGames] = useState<PublicGameState[]>([]);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [me, caseResult, gameResult] = await Promise.all([api.me(), api.cases(), api.games()]);
      setUsername(me.username); setCases(caseResult.cases); setGames(gameResult.games); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "加载失败"); }
  };

  useEffect(() => { void load(); }, []);

  const create = async (caseId: string) => {
    setBusy(caseId);
    try { const game = await api.createGame(caseId); window.location.assign(`/games/${game.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败"); setBusy(null); }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try { await api.deleteGame(id); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败"); }
    finally { setBusy(null); }
  };

  return <main className="case-hub">
    <header className="hub-topbar">
      <div className="brand-lockup"><span className="brand-mark hub-brand">它说</span><span className="brand-sub">PUBLIC SIGNAL DESK / 公开信息调查台</span></div>
      <div className="hub-account"><span className="online-dot" /> <span>{username || "正在确认身份"}</span><a className="icon-button" href="/oauth2/sign_out" title="退出登录"><LogOut size={17} /></a></div>
    </header>

    {error && <div className="error-banner hub-error">{error}</div>}

    <div className="hub-layout">
      <section className="case-stage">
        <div className="stage-heading"><div><p><Radio size={14} /> LIVE CASES</p><h1>正在发酵的事件</h1></div><div className="stage-count"><strong>0{cases.length}</strong><span>可调查卷宗</span></div></div>
        <div className="case-files" aria-label="可调查事件">
          {cases.map((item, index) => <article className={`case-file file-${index + 1}`} key={item.id}>
            <div className="folder-tab">CASE / 0{index + 1}</div>
            <div className="file-stamp">公开来源<br />持续更新</div>
            <div className="file-header"><span><Activity size={13} /> 舆情活跃</span><span><Clock3 size={13} /> 约 {Math.ceil(item.durationMinutes / 1_440)} 天事件跨度</span></div>
            <div className="file-content"><p className="file-label">事件简报</p><h2>{item.title}</h2><p>{item.synopsis}</p></div>
            <div className="file-footer"><span>电视 / 报纸 / 平台动态</span><button disabled={busy !== null} onClick={() => void create(item.id)}>{busy === item.id ? "正在建立卷宗" : "进入事件"}<ArrowUpRight size={17} /></button></div>
          </article>)}
        </div>
        <div className="desk-status"><span><span className="online-dot" />世界时钟在线</span><span>信息只按公开时间进入</span><span>所有调查记录自动保存</span></div>
      </section>

      <aside className="archive-cabinet">
        <div className="cabinet-heading"><div><Archive size={18} /><span><strong>个人档案柜</strong><small>PRIVATE ARCHIVE</small></span></div><b>{String(games.length).padStart(2, "0")}</b></div>
        <div className="cabinet-body">{games.length ? games.map((game, index) => <div className="cabinet-file" key={game.id}>
          <a href={`/games/${game.id}`}><span className="cabinet-number">{String(index + 1).padStart(2, "0")}</span><span className={`status-dot ${game.status}`} /><span className="cabinet-copy"><strong>{cases.find((item) => item.id === game.caseId)?.title ?? game.caseId}</strong><small>{game.currentStage.name} · 第 {Math.floor(game.worldMinute / 1_440) + 1} 天</small><em>{game.status === "finished" ? `调查完成 / ${game.report?.score.total ?? 0} 分` : game.status === "paused" ? "调查暂停" : "调查进行中"}</em></span><ArrowUpRight size={16} /></a>
          <button disabled={busy !== null} onClick={() => void remove(game.id)} title="删除档案"><Trash2 size={14} /></button>
        </div>) : <div className="empty-cabinet"><FolderOpen size={30} /><strong>档案柜为空</strong><span>打开左侧卷宗后，调查记录会收存在这里。</span></div>}</div>
        <div className="cabinet-footer"><FileSearch size={14} />仅显示当前登录用户的档案</div>
      </aside>
    </div>
  </main>;
}
