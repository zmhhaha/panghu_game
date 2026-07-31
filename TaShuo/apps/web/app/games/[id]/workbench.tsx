"use client";

import type { ContentDefinition, PlatformEngagement, PublicGameState, SpeechFeatures } from "@tashuo/core";
import { ArrowLeft, BadgeCheck, Bookmark, Check, CircleAlert, Clock3, FileText, Heart, Link2, Maximize2, MessageSquare, MoreHorizontal, Newspaper, PanelRightOpen, Pause, Pin, Play, Plus, Radio, RefreshCw, Repeat2, Search, Send, Share2, ShieldAlert, StickyNote, Trash2, Tv, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "@/lib/api";

type SideTab = "board" | "report";

const kindLabel: Record<ContentDefinition["kind"], string> = { tv_news: "电视新闻", newspaper: "报纸", post: "贴文", short_video: "短视频描述", official_notice: "公开账号" };
const isPlatformContent = (content: ContentDefinition) => content.kind === "post" || content.kind === "short_video" || content.kind === "official_notice";
const eventTime = (minute: number) => {
  const day = Math.floor(minute / 1_440) + 1;
  const clock = minute % 1_440;
  return `第 ${day} 天 ${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
};

function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return <button className={`icon-button media-save ${saved ? "saved" : ""}`} onClick={onSave} title="钉到调查简报板">{saved ? <Check size={17} /> : <Bookmark size={17} />}</button>;
}

function ContentPresentation({ content, sourceName, saved, engagement, onSave, onEngage, onComment }: { content: ContentDefinition; sourceName: string; saved: boolean; engagement?: PlatformEngagement; onSave: () => void; onEngage: (action: "like" | "repost") => void; onComment: () => void }) {
  if (content.kind === "tv_news") return <div className="tv-broadcast">
    <div className="tv-frame"><div className="tv-screen">
      <div className="tv-channel"><span>澄江</span>新闻</div><div className="tv-live">直播</div>
      <div className="tv-scene"><div className="studio-map" /><div className="anchor"><span /><div /></div><div className="anchor-desk" /></div>
      <div className="tv-lower-third"><small>正在播报</small><strong>{content.title}</strong></div>
      <div className="tv-ticker"><b>快讯</b><span>{content.body}</span></div>
    </div><div className="tv-controls"><Volume2 size={14} /><span className="tv-progress"><i /></span><Maximize2 size={14} /></div></div>
    <div className="broadcast-caption"><div><strong>{sourceName}</strong><span>{eventTime(content.publishedAtMinute)} 播出</span></div><SaveButton saved={saved} onSave={onSave} /></div>
  </div>;

  if (content.kind === "newspaper") return <div className="newspaper-reader">
    <div className="paper-toolbar"><span>报纸影印版</span><SaveButton saved={saved} onSave={onSave} /></div>
    <article className="newspaper-page"><header><div className="paper-date">{eventTime(content.publishedAtMinute)} · 本地版</div><div className="paper-masthead">{sourceName}</div><div className="paper-rule"><span>关注事实，也记录争议</span><b>第 01 版</b></div></header><p className="paper-section">调查 · 城市</p><h1>{content.title}</h1><div className="paper-byline">本报记者 整理报道</div><div className="paper-copy">{content.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>
  </div>;

  if (content.kind === "short_video") return <div className="short-video-app">
    <div className="phone-feed"><div className={`video-stage ${content.id.includes("river") ? "river-scene" : "demo-scene"}`}><div className="video-status"><span>推荐</span><b>现场</b></div><div className="scene-shape one" /><div className="scene-shape two" /><div className="video-description"><strong>@{sourceName}</strong><h1>{content.title}</h1><p>{content.body}</p></div><div className="video-actions"><button className={engagement?.liked ? "active" : ""} onClick={() => onEngage("like")}><Heart size={22} />赞同</button><button onClick={onComment}><MessageSquare size={22} />评论</button><button className={engagement?.repostedAtMinute !== null && engagement?.repostedAtMinute !== undefined ? "active" : ""} disabled={engagement?.repostedAtMinute !== null && engagement?.repostedAtMinute !== undefined} onClick={() => onEngage("repost")}><Share2 size={22} />转发</button><SaveButton saved={saved} onSave={onSave} /></div></div></div>
  </div>;

  return <div className={`social-reader ${content.kind === "official_notice" ? "official" : ""}`}>
    <div className="social-appbar"><b>公开动态</b><MoreHorizontal size={19} /></div><article className="social-post"><header><div className="social-avatar">{sourceName.slice(0, 1)}</div><div><strong>{sourceName}{content.kind === "official_notice" && <BadgeCheck size={14} />}</strong><span>{eventTime(content.publishedAtMinute)} · 公开发布</span></div><SaveButton saved={saved} onSave={onSave} /></header><h1>{content.title}</h1><p>{content.body}</p><div className="social-stats"><span>{engagement?.repostedAtMinute !== null && engagement?.repostedAtMinute !== undefined ? "已由你转发" : "正在传播"}</span><span>公开可见</span></div><div className="social-actions"><button className={engagement?.liked ? "active" : ""} onClick={() => onEngage("like")}><Heart size={15} />赞同</button><button onClick={onComment}><MessageSquare size={15} />评论</button><button className={engagement?.repostedAtMinute !== null && engagement?.repostedAtMinute !== undefined ? "active" : ""} disabled={engagement?.repostedAtMinute !== null && engagement?.repostedAtMinute !== undefined} onClick={() => onEngage("repost")}><Repeat2 size={15} />转发</button></div></article>
  </div>;
}

export function GameWorkbench({ gameId }: { gameId: string }) {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"all" | "traditional" | "platform">("all");
  const [sideTab, setSideTab] = useState<SideTab>("board");
  const [boardOpen, setBoardOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [reportText, setReportText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ token: string; features: SpeechFeatures; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.game(gameId);
      const requestedId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("content");
      setState(next); setSelectedId((current) => current ?? (requestedId && next.visibleContents.some((item) => item.id === requestedId) ? requestedId : next.visibleContents[0]?.id ?? null)); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "加载失败"); }
  }, [gameId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (state?.status !== "active") return;
    const timer = window.setInterval(async () => {
      try { const result = await api.sync(gameId); setState(result.state); }
      catch { /* Explicit actions display errors; passive sync retries. */ }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameId, state?.status]);

  const selected = state?.visibleContents.find((item) => item.id === selectedId) ?? null;
  const sources = useMemo(() => new Map(state?.sources.map((item) => [item.id, item]) ?? []), [state?.sources]);
  const filtered = state?.visibleContents.filter((item) => channel === "all" || (channel === "traditional" ? item.kind === "tv_news" || item.kind === "newspaper" : isPlatformContent(item))) ?? [];
  const selectedBlocked = Boolean(state?.selfMediaAccess === "blocked" && selected && isPlatformContent(selected));
  const selectedEngagement = state?.engagements.find((item) => item.contentId === selected?.id);

  const toggleClock = async () => {
    if (!state || state.status === "finished" || state.status === "awaiting_report") return;
    setBusy("clock");
    try { const result = state.status === "paused" ? await api.resume(gameId) : await api.pause(gameId); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); }
    finally { setBusy(""); }
  };

  const changeTimeScale = async (timeScale: 1 | 10 | 100) => {
    if (!state || state.status === "finished" || state.status === "awaiting_report" || state.timeScale === timeScale) return;
    setBusy("speed");
    try { const result = await api.timeScale(gameId, timeScale); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "鏃堕棿閫熷害璁剧疆澶辫触"); }
    finally { setBusy(""); }
  };

  const saveSelected = async () => {
    if (!selected || !state) return;
    setBusy("save");
    try { const result = await api.saveContent(gameId, selected.id); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "收藏失败"); }
    finally { setBusy(""); }
  };

  const engage = async (action: "like" | "repost") => {
    if (!selected || !state) return;
    setBusy(`engage-${action}`);
    try { const result = await api.engage(gameId, selected.id, action); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "互动失败"); }
    finally { setBusy(""); }
  };

  const focusComment = () => document.getElementById("public-comment-composer")?.focus();

  const sendComment = async (token?: string) => {
    if (!selected || !commentText.trim()) return;
    setBusy("comment"); setError("");
    try {
      const result = await api.comment(gameId, selected.id, commentText.trim(), token);
      setState(result.state); setCommentText(""); setConfirmation(null);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422 && reason.payload.confirmationToken) {
        setConfirmation({ token: String(reason.payload.confirmationToken), features: reason.payload.speechFeatures as SpeechFeatures, text: commentText.trim() });
      } else { setError(reason instanceof Error ? reason.message : "评论失败"); await load(); }
    } finally { setBusy(""); }
  };

  const createNote = async () => {
    if (!state || !noteText.trim()) return;
    const linkedContentIds = selected && state.savedContentIds.includes(selected.id) ? [selected.id] : [];
    setBusy("note");
    try { const result = await api.createNote(gameId, noteText.trim(), linkedContentIds); setState(result.state); setNoteText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "笔记保存失败"); }
    finally { setBusy(""); }
  };

  const deleteNote = async (noteId: string) => {
    setBusy(`note-${noteId}`);
    try { const result = await api.deleteNote(gameId, noteId); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "笔记删除失败"); }
    finally { setBusy(""); }
  };

  const submitFinalReport = async () => {
    if (reportText.trim().length < 20) { setError("报告至少需要 20 个字"); return; }
    setBusy("report");
    try { const result = await api.report(gameId, reportText); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "报告提交失败"); await load(); }
    finally { setBusy(""); }
  };

  if (!state) return <main className="loading-screen"><RefreshCw className="spin" />{error || "正在打开个人档案"}</main>;

  const selectedComments = selected ? state.comments.filter((item) => item.contentId === selected.id) : [];
  return <main className="workbench">
    <header className="workbench-topbar">
      <a className="icon-button" href="/" title="返回事件目录"><ArrowLeft size={18} /></a>
      <div className="case-title"><span className="brand-mark small">它说</span><div><strong>{state.currentStage.name}</strong><span>{eventTime(state.worldMinute)} · 至第 {Math.ceil(state.durationMinutes / 1_440)} 天结束</span></div></div>
      <div className="pressure-strip">
        <span title="评论被看见的范围">曝光 <b>{state.exposure}</b></span>
        <span title="发言引起的冲突程度">争议 <b>{state.controversy}</b></span>
        <span className={state.harassment >= 35 ? "warning" : ""} title="围攻和举报压力">网暴 <b>{state.harassment}</b></span>
      </div>
      <button className={`board-toggle ${boardOpen ? "active" : ""}`} onClick={() => setBoardOpen((open) => !open)} aria-expanded={boardOpen} title="打开调查简报板"><PanelRightOpen size={16} /><span>简报板</span><b>{state.savedContentIds.length + state.investigationNotes.length}</b></button>
      <div className="speed-control"><button className={state.timeScale === 1 ? "active" : ""} onClick={() => void changeTimeScale(1)} disabled={busy === "speed"}>一档</button><button className={state.timeScale === 10 ? "active" : ""} onClick={() => void changeTimeScale(10)} disabled={busy === "speed"}>二档</button><button className={state.timeScale === 100 ? "active" : ""} onClick={() => void changeTimeScale(100)} disabled={busy === "speed"}>三档</button></div>`r`n      <button className="clock-button" disabled={busy === "clock" || state.status === "finished" || state.status === "awaiting_report"} onClick={() => void toggleClock()} title={state.status === "paused" ? "恢复时间" : "暂停时间"}>{state.status === "paused" ? <Play size={16} /> : <Pause size={16} />}<span>{state.status === "paused" ? "继续" : "暂停"}</span></button>
    </header>

    {error && <div className="workbench-error"><CircleAlert size={16} />{error}<button onClick={() => setError("")} title="关闭"><X size={15} /></button></div>}
    {state.selfMediaAccess !== "available" && <div className={`platform-alert ${state.selfMediaAccess}`}><ShieldAlert size={16} />{state.selfMediaAccess === "blocked" ? "自媒体平台遭到集中冲击，暂时只能查看电视、报纸和已收藏内容。" : "大量通知和围攻内容正在影响自媒体检索。"}</div>}

    <div className="workbench-grid">
      <aside className="feed-panel">
        <div className="feed-tools"><div className="segmented"><button className={channel === "all" ? "active" : ""} onClick={() => setChannel("all")}>全部</button><button className={channel === "traditional" ? "active" : ""} onClick={() => setChannel("traditional")}>新闻</button><button className={channel === "platform" ? "active" : ""} onClick={() => setChannel("platform")}>平台</button></div><Search size={16} /></div>
        <div className="feed-list">{filtered.map((item) => {
          const source = sources.get(item.sourceId); const blocked = state.selfMediaAccess === "blocked" && isPlatformContent(item) && !state.savedContentIds.includes(item.id);
          return <button key={item.id} className={`feed-item ${selectedId === item.id ? "selected" : ""}`} onClick={() => setSelectedId(item.id)}><span className="feed-kind">{item.kind === "tv_news" ? <Tv size={14} /> : item.kind === "newspaper" ? <Newspaper size={14} /> : <Radio size={14} />}{kindLabel[item.kind]}</span><strong>{blocked ? "内容暂时无法打开" : item.title}</strong><small>{source?.name} · {eventTime(item.publishedAtMinute)}</small></button>;
        })}</div>
      </aside>

      <section className="reader-panel">
        {selected ? <>{selectedBlocked && !state.savedContentIds.includes(selected.id) ? <div className="blocked-reader"><ShieldAlert size={34} /><h2>平台连接被围攻流量阻断</h2><p>等待世界时间流逝后再尝试，或查看电视、报纸和已经收藏的材料。</p></div> : <>
          <ContentPresentation content={selected} sourceName={sources.get(selected.sourceId)?.name ?? "未知来源"} saved={state.savedContentIds.includes(selected.id)} engagement={selectedEngagement} onSave={() => void saveSelected()} onEngage={(action) => void engage(action)} onComment={focusComment} />
          {selected.commentsEnabled && isPlatformContent(selected) && <section className={`comment-section ${selected.kind === "short_video" ? "video-comments" : "platform-comments"}`}><div className="comment-heading"><h2><MessageSquare size={16} />公开评论区</h2><span>{selectedComments.length} 次你的发言</span></div>
            {selectedComments.map((comment) => <div className="comment-thread" key={comment.id}><div className="player-comment"><b>你</b><p>{comment.text}</p><small>曝光 +{comment.exposureGain} · 争议 +{comment.controversyGain} · 网暴 +{comment.harassmentGain}</small></div>{comment.groupReactions.flatMap((reaction) => reaction.replies).map((reply, index) => <div className="agent-reply" key={`${comment.id}-${reply.accountId}-${index}`}><b>{reply.displayName}</b><p>{reply.text}</p></div>)}</div>)}
            {confirmation && <div className="confirmation-box"><strong>确认系统对这句话的理解</strong><p>{confirmation.features.expressionType} · 确定性 {confirmation.features.certainty} · 挑衅性 {confirmation.features.provocation}</p><div><button onClick={() => setConfirmation(null)}>修改原文</button><button className="primary-command compact" onClick={() => void sendComment(confirmation.token)}>确认发布</button></div></div>}
            <div className="comment-composer"><textarea id="public-comment-composer" value={commentText} onChange={(event) => setCommentText(event.target.value)} disabled={state.status !== "active" || busy === "comment"} maxLength={1000} placeholder={state.status === "paused" ? "恢复时间后才能发布评论" : "公开发表评论，其他账号可以引用、截图和转发"} /><button className="send-button" disabled={!commentText.trim() || busy === "comment" || state.status !== "active"} onClick={() => void sendComment()} title="发表评论">{busy === "comment" ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}</button></div>
          </section>}
        </>}</> : <div className="empty-reader"><FileText size={32} />从左侧选择一条公开信息</div>}
      </section>

      <button className={`drawer-backdrop ${boardOpen ? "open" : ""}`} onClick={() => setBoardOpen(false)} aria-label="关闭调查简报板" />
      <aside className={`evidence-panel board-drawer ${boardOpen ? "open" : ""}`} aria-hidden={!boardOpen}>
        <div className="evidence-tabs"><button className={sideTab === "board" ? "active" : ""} onClick={() => setSideTab("board")}>调查简报板</button><button className={sideTab === "report" ? "active" : ""} onClick={() => setSideTab("report")}>最终报告</button><button className="drawer-close" onClick={() => setBoardOpen(false)} title="关闭"><X size={17} /></button></div>
        {sideTab === "board" ? <div className="board-scroll">
          <div className="board-summary"><span><Pin size={14} />材料 {state.savedContentIds.length}</span><span><StickyNote size={14} />笔记 {state.investigationNotes.length}</span></div>
          <section className="board-section"><div className="board-section-title"><h2>已钉材料</h2><span>按发布时间排列</span></div>
            <div className="pinned-grid">{state.savedContentIds.length ? state.savedContentIds.map((contentId) => { const item = state.visibleContents.find((content) => content.id === contentId); if (!item) return null; return <button className={`pinned-card ${selectedId === item.id ? "active" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}><Pin size={13} /><small>{eventTime(item.publishedAtMinute)} · {sources.get(item.sourceId)?.name}</small><strong>{item.title}</strong></button>; }) : <div className="board-empty"><Pin size={20} /><span>阅读材料时点击书签，它才会出现在这里。</span></div>}</div>
          </section>
          <section className="board-section"><div className="board-section-title"><h2>调查笔记</h2><span>只记录你的判断</span></div>
            <div className="note-composer">{selected && state.savedContentIds.includes(selected.id) && <span><Link2 size={12} />关联：{selected.title}</span>}<textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={2000} placeholder="写下矛盾、待核实点或暂时无法确定的部分" /><button className="primary-command compact" disabled={!noteText.trim() || busy === "note"} onClick={() => void createNote()}>{busy === "note" ? <RefreshCw className="spin" size={15} /> : <Plus size={15} />}钉上便签</button></div>
            <div className="note-stack">{state.investigationNotes.map((note, index) => <article className={`board-note tone-${index % 3}`} key={note.id}><div><small>第 {note.createdAtMinute} 分钟</small><button disabled={busy === `note-${note.id}`} onClick={() => void deleteNote(note.id)} title="移除笔记"><Trash2 size={13} /></button></div><p>{note.text}</p>{note.linkedContentIds.map((contentId) => { const item = state.visibleContents.find((content) => content.id === contentId); return item ? <button className="note-link" key={contentId} onClick={() => setSelectedId(contentId)}><Link2 size={11} />{item.title}</button> : null; })}</article>)}</div>
          </section>
        </div> : <div className="report-pane">{state.report ? <div className="score-result"><span>最终评分</span><strong>{state.report.score.total}</strong><dl><div><dt>事实准确</dt><dd>{state.report.score.factAccuracy}</dd></div><div><dt>证据质量</dt><dd>{state.report.score.evidenceQuality}</dd></div><div><dt>置信校准</dt><dd>{state.report.score.confidenceCalibration}</dd></div></dl><p>{state.report.analysis.summary}</p></div> : <><textarea value={reportText} onChange={(event) => setReportText(event.target.value)} placeholder="根据简报板陈述你认为发生的事实、依据、反证和仍无法确定的部分。" /><button className="primary-command" disabled={busy === "report" || reportText.trim().length < 20} onClick={() => void submitFinalReport()}>{busy === "report" ? <RefreshCw className="spin" size={16} /> : <FileText size={16} />}提交报告</button></>}</div>}
      </aside>
    </div>
  </main>;
}
