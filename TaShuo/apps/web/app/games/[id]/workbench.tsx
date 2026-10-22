"use client";

import type { PublicContent, PublicThreadComment, PlatformEngagement, PublicGameState, SpeechFeatures } from "@tashuo/core";
import { ArrowLeft, BadgeCheck, Bookmark, Check, CircleAlert, Clock3, FileText, Heart, Link2, Maximize2, MessageSquare, MoreHorizontal, Newspaper, PanelRightOpen, Pause, Pin, Play, Plus, Radio, RefreshCw, Repeat2, Search, Send, Share2, ShieldAlert, StickyNote, Trash2, Tv, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, type CommentSubmission, type ReportSubmission, type ReportInterpretation } from "@/lib/api";
import { ReportConfirmation, ReportResult } from "./report-panel";

type SideTab = "board" | "report";

const kindLabel: Record<PublicContent["kind"], string> = { tv_news: "电视新闻", newspaper: "报纸", post: "贴文", short_video: "短视频描述", official_notice: "公开账号" };
const isPlatformContent = (content: PublicContent) => content.kind === "post" || content.kind === "short_video" || content.kind === "official_notice";
const eventTime = (minute: number) => {
  const day = Math.floor(minute / 1_440) + 1;
  const clock = Math.floor(minute) % 1_440;
  return `第 ${day} 天 ${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
};

function orderedThread(comments: PublicThreadComment[]) {
  const ids = new Set(comments.map((comment) => comment.id));
  const visited = new Set<string>();
  const result: PublicThreadComment[] = [];
  const append = (comment: PublicThreadComment) => {
    if (visited.has(comment.id)) return;
    visited.add(comment.id); result.push(comment);
    comments.filter((reply) => reply.parentCommentId === comment.id).forEach(append);
  };
  comments.filter((comment) => !comment.parentCommentId || !ids.has(comment.parentCommentId)).forEach(append);
  comments.forEach(append);
  return result;
}

function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return <button className={`icon-button media-save ${saved ? "saved" : ""}`} onClick={onSave} title="钉到调查简报板">{saved ? <Check size={17} /> : <Bookmark size={17} />}</button>;
}

function ContentPresentation({ content, sourceName, saved, engagement, onSave, onEngage, onComment }: { content: PublicContent; sourceName: string; saved: boolean; engagement?: PlatformEngagement; onSave: () => void; onEngage: (action: "like" | "repost") => void; onComment: () => void }) {
  if (content.kind === "tv_news") return <div className="tv-broadcast">
    <div className="tv-frame"><div className="tv-screen">
      <div className="tv-channel"><span>{sourceName}</span></div><div className="tv-live">直播</div>
      <div className="tv-scene"><div className="studio-map" /><div className="anchor"><span /><div /></div><div className="anchor-desk" /></div>
      <div className="tv-lower-third"><small>正在播报</small><strong>{content.title}</strong></div>
      <div className="tv-ticker"><b>快讯</b><span>{content.body}</span></div>
    </div><div className="tv-controls"><Volume2 size={14} /><span className="tv-progress"><i /></span><Maximize2 size={14} /></div></div>
    <div className="broadcast-caption"><div><strong>{sourceName}</strong><span>{eventTime(content.publishedAtMinute)} 播出</span></div><SaveButton saved={saved} onSave={onSave} /></div>
    <section className="tv-transcript">
      <header><span>NEWS TRANSCRIPT</span><b>{eventTime(content.publishedAtMinute)}</b></header>
      <h2>{content.title}</h2>
      {content.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [citedContentIds, setCitedContentIds] = useState<string[]>([]);
  const [draftReadyFor, setDraftReadyFor] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<CommentSubmission | null>(null);
  const [savedReplyIds, setSavedReplyIds] = useState<string[]>([]);
  const [importedNoteIds, setImportedNoteIds] = useState<string[]>([]);
  const [noteText, setNoteText] = useState("");
  const [reportText, setReportText] = useState("");
  const [pendingReport, setPendingReport] = useState<ReportSubmission | null>(null);
  const [reportConfirmation, setReportConfirmation] = useState<{ token: string; interpretation: ReportInterpretation } | null>(null);
  const [reportStorageReady, setReportStorageReady] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ token: string; features: SpeechFeatures; text: string } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    try {
      const next = await api.game(gameId);
      const requestedId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("content");
      setState(next); setSelectedId((current) => current ?? (requestedId && next.visibleContents.some((item) => item.id === requestedId) ? requestedId : next.visibleContents[0]?.id ?? null));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "加载失败"); }
  }, [gameId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (busy || (state?.status !== "active" && !state?.agentBusy)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const current = stateRef.current;
        const next = current?.agentBusy ? await api.game(gameId) : (await api.sync(gameId)).state;
        if (!stopped) setState(next);
      } catch (reason) { if (!stopped) setError(reason instanceof Error ? reason.message : "状态同步失败，请重试"); }
      if (!stopped) timer = setTimeout(poll, 1000);
    };
    timer = setTimeout(poll, 1000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [gameId, state?.status, state?.agentBusy, busy]);

  useEffect(() => {
    if (!selectedId) return;
    setDraftReadyFor(null);
    try {
      const saved = JSON.parse(localStorage.getItem(`tashuo:${gameId}:draft:${selectedId}`) ?? "{}") as { text?: string; replyToId?: string | null; citedContentIds?: string[] };
      setCommentText(typeof saved.text === "string" ? saved.text : "");
      setReplyToId(typeof saved.replyToId === "string" ? saved.replyToId : null);
      setCitedContentIds(Array.isArray(saved.citedContentIds) ? saved.citedContentIds.filter((id) => typeof id === "string") : []);
    } catch { setCommentText(""); setReplyToId(null); setCitedContentIds([]); }
    setDraftReadyFor(selectedId);
  }, [gameId, selectedId]);

  useEffect(() => {
    if (!selectedId || draftReadyFor !== selectedId) return;
    try { localStorage.setItem(`tashuo:${gameId}:draft:${selectedId}`, JSON.stringify({ text: commentText, replyToId, citedContentIds })); } catch { /* Draft stays available in this tab. */ }
  }, [gameId, selectedId, draftReadyFor, commentText, replyToId, citedContentIds]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tashuo:${gameId}:pending-comment`);
      if (saved) setPendingSubmission(JSON.parse(saved) as CommentSubmission);
      setReportText(localStorage.getItem(`tashuo:${gameId}:report-draft`) ?? "");
      const savedReport = localStorage.getItem(`tashuo:${gameId}:pending-report`);
      if (savedReport) {
        const parsed = JSON.parse(savedReport) as ReportSubmission;
        if (typeof parsed.idempotencyKey === "string" && typeof parsed.text === "string") {
          setPendingReport(parsed); setReportText(parsed.text);
        }
      }
    } catch { /* A malformed local draft never triggers a submission. */ }
    setReportStorageReady(true);
  }, [gameId]);

  useEffect(() => {
    if (!reportStorageReady) return;
    try {
      if (pendingReport) localStorage.setItem(`tashuo:${gameId}:pending-report`, JSON.stringify(pendingReport));
      else localStorage.removeItem(`tashuo:${gameId}:pending-report`);
    } catch { /* Keep the original submission in memory for explicit retries. */ }
  }, [gameId, pendingReport, reportStorageReady]);

  useEffect(() => {
    if (!state?.report) return;
    setPendingReport(null); setReportConfirmation(null);
  }, [state?.report]);

  useEffect(() => {
    try {
      if (pendingSubmission) localStorage.setItem(`tashuo:${gameId}:pending-comment`, JSON.stringify(pendingSubmission));
      else localStorage.removeItem(`tashuo:${gameId}:pending-comment`);
    } catch { /* Server retains the authoritative pending task. */ }
  }, [gameId, pendingSubmission]);

  useEffect(() => {
    if (!state || !pendingSubmission || busy || state.agentBusy || state.generationFailure) return;
    const published = state.comments.some((comment) => !pendingSubmission.previousCommentIds?.includes(comment.id) && comment.contentId === pendingSubmission.contentId && comment.text === pendingSubmission.text && (comment.parentCommentId ?? null) === (pendingSubmission.parentCommentId ?? null));
    if (!published) return;
    if (selectedId === pendingSubmission.contentId) { setCommentText(""); setReplyToId(null); setCitedContentIds([]); }
    try { localStorage.removeItem(`tashuo:${gameId}:draft:${pendingSubmission.contentId}`); } catch { /* Keep the authoritative published reply. */ }
    setPendingSubmission(null); setConfirmation(null);
  }, [state, pendingSubmission, busy, selectedId, gameId]);

  const selected = state?.visibleContents.find((item) => item.id === selectedId) ?? null;
  const sources = useMemo(() => new Map(state?.sources.map((item) => [item.id, item]) ?? []), [state?.sources]);
  const filtered = [...(state?.visibleContents.filter((item) => channel === "all" || (channel === "traditional" ? item.kind === "tv_news" || item.kind === "newspaper" : isPlatformContent(item))) ?? [])].sort((left, right) => right.publishedAtMinute - left.publishedAtMinute);
  const selectedBlocked = Boolean(state?.selfMediaAccess === "blocked" && selected && isPlatformContent(selected));
  const selectedEngagement = state?.engagements.find((item) => item.contentId === selected?.id);

  const toggleClock = async () => {
    if (!state || state.agentBusy || state.generationFailure || state.status === "finished" || state.status === "awaiting_report") return;
    setBusy("clock");
    try { const result = state.status === "paused" ? await api.resume(gameId) : await api.pause(gameId); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); }
    finally { setBusy(""); }
  };

  const changeTimeScale = async (timeScale: 1 | 10 | 100) => {
    if (!state || state.agentBusy || state.generationFailure || state.status === "finished" || state.status === "awaiting_report" || state.timeScale === timeScale) return;
    setBusy("speed");
    try { const result = await api.timeScale(gameId, timeScale); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "时间速度设置失败"); }
    finally { setBusy(""); }
  };

  const saveSelected = async () => {
    if (!selected || !state || state.agentBusy) return;
    setBusy("save");
    try { const result = await api.saveContent(gameId, selected.id); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "收藏失败"); }
    finally { setBusy(""); }
  };

  const engage = async (action: "like" | "repost") => {
    if (!selected || !state || state.agentBusy || state.generationFailure || state.status !== "active") return;
    setBusy(`engage-${action}`);
    try { const result = await api.engage(gameId, selected.id, action); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "互动失败"); }
    finally { setBusy(""); }
  };

  const focusComment = () => document.getElementById("public-comment-composer")?.focus();

  const acceptTaskState = (next: PublicGameState, submission = pendingSubmission) => {
    setState(next);
    const published = submission && !next.generationFailure && !next.agentBusy && next.comments.some((comment) => !submission.previousCommentIds?.includes(comment.id) && comment.contentId === submission.contentId && comment.text === submission.text && (comment.parentCommentId ?? null) === (submission.parentCommentId ?? null));
    if (published) {
      if (selectedId === submission.contentId) { setCommentText(""); setReplyToId(null); setCitedContentIds([]); }
      try { localStorage.removeItem(`tashuo:${gameId}:draft:${submission.contentId}`); } catch { /* In-memory draft is already cleared. */ }
      setPendingSubmission(null); setConfirmation(null);
    }
  };

  const taskError = async (reason: unknown, submission = pendingSubmission) => {
    if (reason instanceof ApiError && reason.status === 422 && reason.payload.confirmationToken && reason.payload.operation === "report") {
      if (reason.payload.state) setState(reason.payload.state as PublicGameState);
      setReportConfirmation({ token: String(reason.payload.confirmationToken), interpretation: reason.payload.reportInterpretation as ReportInterpretation });
      setSideTab("report"); setBoardOpen(true);
    } else if (reason instanceof ApiError && reason.status === 422 && reason.payload.confirmationToken) {
      if (reason.payload.state) setState(reason.payload.state as PublicGameState);
      setConfirmation({ token: String(reason.payload.confirmationToken), features: reason.payload.speechFeatures as SpeechFeatures, text: submission?.text ?? commentText.trim() });
    } else { setError(reason instanceof Error ? reason.message : "处理失败，请重试原任务"); await load(); }
  };

  const sendComment = async (token?: string) => {
    if (!selected || state?.agentBusy || busy) return;
    const parent = state?.threadComments.find((item) => item.id === replyToId);
    const submission = pendingSubmission ?? { idempotencyKey: crypto.randomUUID(), contentId: selected.id, text: commentText.trim(), parentCommentId: parent?.id, targetAccountId: parent?.role === "account" ? parent.accountId : undefined, citedContentIds, previousCommentIds: state?.comments.map((comment) => comment.id) ?? [] };
    if (!submission.text || (!token && state?.status !== "active")) return;
    setPendingSubmission(submission); setBusy("comment"); setError("");
    try {
      const result = await api.comment(gameId, submission, token);
      acceptTaskState(result.state, submission);
    } catch (reason) { await taskError(reason, submission); }
    finally { setBusy(""); }
  };

  const retryTask = async () => {
    setBusy("retry"); setError("");
    try { const result = await api.retry(gameId, state?.generationFailure?.retryKey ?? pendingSubmission?.idempotencyKey ?? ""); acceptTaskState(result.state); }
    catch (reason) { await taskError(reason); }
    finally { setBusy(""); }
  };

  const editPendingComment = async () => {
    setBusy("cancel-comment"); setError("");
    try { const result = await api.cancelComment(gameId); setState(result.state); setPendingSubmission(null); setConfirmation(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "暂时无法修改原文"); }
    finally { setBusy(""); }
  };

  const editPendingReport = async () => {
    const expectedActionKey = pendingReport?.idempotencyKey ?? (state?.generationFailure?.operation === "report" ? state.generationFailure.retryKey : undefined);
    if (!expectedActionKey) { setError("无法确认要修改的报告，请刷新后再试。"); return; }
    setBusy("cancel-report"); setError("");
    try {
      const result = await api.cancelReport(gameId, expectedActionKey);
      setState(result.state);
      if (pendingReport) updateReportDraft(pendingReport.text);
      setPendingReport(null); setReportConfirmation(null); setSideTab("report"); setBoardOpen(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "报告暂时无法修改，请稍后重试"); }
    finally { setBusy(""); }
  };

  const saveReply = async (reply: PublicThreadComment) => {
    if (!state || busy || savedReplyIds.includes(reply.id)) return;
    setBusy(`reply-${reply.id}`);
    try {
      if (!state.savedContentIds.includes(reply.contentId)) await api.saveContent(gameId, reply.contentId);
      const content = state.visibleContents.find((item) => item.id === reply.contentId);
      const text = `公开评论引用（未核验公开说法）\n${reply.displayName} · ${eventTime(reply.publishedAtMinute)}\n评论 ${reply.id} · 材料版本 ${content?.versionId ?? "未知"}\n${reply.text}`;
      const result = await api.createNote(gameId, text, [reply.contentId]);
      setState(result.state); setSavedReplyIds((ids) => [...ids, reply.id]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "回应保存失败"); }
    finally { setBusy(""); }
  };

  const quoteSelection = async () => {
    if (!selected || !state || busy || state.agentBusy) return;
    const selection = window.getSelection();
    const media = document.getElementById("current-publication");
    const text = selection?.toString().trim();
    if (!text || !selection?.anchorNode || !selection.focusNode || !media?.contains(selection.anchorNode) || !media.contains(selection.focusNode)) { setError("请先在当前报道正文中选中要保存的原文。"); return; }
    if (text.length > 1500) { setError("每条引用请控制在 1500 字以内，可以分段保存。"); return; }
    setBusy("quote");
    try {
      if (!state.savedContentIds.includes(selected.id)) await api.saveContent(gameId, selected.id);
      const result = await api.createNote(gameId, `材料原文引用（待核验）\n${sources.get(selected.sourceId)?.name ?? "公开来源"} · ${eventTime(selected.publishedAtMinute)}\n${selected.title} · 版本 ${selected.versionId}\n${text}`, [selected.id]);
      setState(result.state); setSideTab("board"); setBoardOpen(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "原文引用保存失败"); }
    finally { setBusy(""); }
  };

  const updateReportDraft = (text: string) => {
    setReportText(text);
    try { localStorage.setItem(`tashuo:${gameId}:report-draft`, text); } catch { /* Keep the editable draft in memory. */ }
  };

  const importNotes = () => {
    if (!state) return;
    const notes = state.investigationNotes.filter((note) => !importedNoteIds.includes(note.id));
    updateReportDraft([reportText.trim(), ...notes.map((note) => `${note.text}${note.linkedContentIds.length ? `\n关联材料：${note.linkedContentIds.map((id) => { const content = state.visibleContents.find((item) => item.id === id); return content ? `${content.title} [${content.id}]` : id; }).join("；")}` : ""}`)].filter(Boolean).join("\n\n"));
    setImportedNoteIds((ids) => [...ids, ...notes.map((note) => note.id)]);
  };

  const createNote = async () => {
    if (!state || state.agentBusy || busy || !noteText.trim()) return;
    const linkedContentIds = selected && state.savedContentIds.includes(selected.id) ? [selected.id] : [];
    setBusy("note");
    try { const result = await api.createNote(gameId, noteText.trim(), linkedContentIds); setState(result.state); setNoteText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "笔记保存失败"); }
    finally { setBusy(""); }
  };

  const deleteNote = async (noteId: string) => {
    if (!state || state.agentBusy || busy) return;
    setBusy(`note-${noteId}`);
    try { const result = await api.deleteNote(gameId, noteId); setState(result.state); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "笔记删除失败"); }
    finally { setBusy(""); }
  };

  const submitFinalReport = async (token?: string) => {
    if (!state || state.agentBusy || busy || state.report || (state.generationFailure && !token)) return;
    const submission = pendingReport ?? { idempotencyKey: crypto.randomUUID(), text: reportText.trim() };
    if (submission.text.length < 20) { setError("报告至少需要 20 个字"); return; }
    setPendingReport(submission); setBusy("report"); setError("");
    try { const result = await api.report(gameId, submission, token); setState(result.state); }
    catch (reason) { await taskError(reason); }
    finally { setBusy(""); }
  };

  const openReportEvidence = (contentId: string, replyId?: string) => {
    setSelectedId(contentId); setChannel("all"); setBoardOpen(false);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(replyId ? `comment-${replyId}` : "current-publication");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target && replyId) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
    });
  };

  if (!state) return <main className="loading-screen"><RefreshCw className="spin" />{error || "正在打开个人档案"}</main>;

  const selectedComments = selected ? orderedThread(state.threadComments.filter((item) => item.contentId === selected.id)) : [];
  const replyTo = selectedComments.find((item) => item.id === replyToId);
  const taskLocked = Boolean(state.agentBusy || state.generationFailure || confirmation || reportConfirmation || pendingReport);
  const composerLocked = Boolean(busy === "comment" || pendingSubmission);
  const commentDepth = (comment: PublicThreadComment) => {
    let parentId = comment.parentCommentId;
    let depth = 0;
    const visited = new Set([comment.id]);
    while (parentId && depth < 3 && !visited.has(parentId)) {
      visited.add(parentId); const parent = selectedComments.find((item) => item.id === parentId);
      if (!parent) break;
      depth += 1; parentId = parent.parentCommentId;
    }
    return depth;
  };
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
      <div className="speed-control"><button className={state.timeScale === 1 ? "active" : ""} onClick={() => void changeTimeScale(1)} disabled={Boolean(busy) || taskLocked} title="现实 1 秒推进游戏 10 秒">一档</button><button className={state.timeScale === 10 ? "active" : ""} onClick={() => void changeTimeScale(10)} disabled={Boolean(busy) || taskLocked} title="现实 1 秒推进游戏 100 秒">二档</button><button className={state.timeScale === 100 ? "active" : ""} onClick={() => void changeTimeScale(100)} disabled={Boolean(busy) || taskLocked} title="现实 1 秒推进游戏 1000 秒">三档</button></div>
      <button className="clock-button" disabled={Boolean(busy) || taskLocked || state.status === "finished" || state.status === "awaiting_report"} onClick={() => void toggleClock()} title={state.status === "paused" ? "恢复时间" : "暂停时间"}>{state.status === "paused" ? <Play size={16} /> : <Pause size={16} />}<span>{state.status === "paused" ? "继续" : "暂停"}</span></button>
    </header>

    {error && <div className="workbench-error"><CircleAlert size={16} />{error}<button onClick={() => setError("")} title="关闭"><X size={15} /></button></div>}
    {(state.agentBusy || busy === "comment" || busy === "report" || busy === "retry") && <div className="task-status" role="status"><RefreshCw className="spin" size={16} /><span>正在处理公开信息，游戏时间已暂停。你可以继续阅读已保存材料。</span></div>}
    {confirmation && pendingSubmission && selectedId !== pendingSubmission.contentId && <div className="task-status"><span>有一条评论等待你确认后发布。</span><button onClick={() => setSelectedId(pendingSubmission.contentId)}>返回待确认评论</button></div>}
    {reportConfirmation && (!boardOpen || sideTab !== "report") && <div className="task-status"><span>报告含义等待核对，尚未结算。</span><button onClick={() => { setSideTab("report"); setBoardOpen(true); }}>核对报告</button></div>}
    {pendingReport && !state.report && !state.agentBusy && !state.generationFailure && !reportConfirmation && !busy && <div className="task-status" role="status"><div><strong>报告提交尚未确认</strong><p>原报告已保留，可以重试同一份提交，或取消原任务后修改。</p></div><button className="primary-command compact" onClick={() => void submitFinalReport()}><RefreshCw size={14} />重试提交</button><button onClick={() => void editPendingReport()}>修改报告</button></div>}
    {pendingSubmission && !state.agentBusy && !state.generationFailure && !confirmation && !busy && <div className="task-status" role="status"><div><strong>上次发送尚未确认</strong><p>原评论和回复对象已保留，可以重试发送，也可以先取消原任务再修改草稿。</p>{state.status !== "active" && <small>恢复游戏时间后可重试发送；现在仍可修改草稿。</small>}</div><button className="primary-command compact" disabled={state.status !== "active"} onClick={() => void sendComment()}><RefreshCw size={14} />重试发送</button><button onClick={() => void editPendingComment()}>修改草稿</button></div>}
    {state.generationFailure && <div className="task-status failed" role="alert"><CircleAlert size={18} /><div><strong>{state.generationFailure.operation === "publication" ? "报道暂未发布" : state.generationFailure.operation === "report" ? "报告暂未完成" : "评论暂未发布"}</strong><p>{state.generationFailure.message}</p><small>游戏时间已暂停，已有文字和记录保持不变。</small></div><button className="primary-command compact" disabled={Boolean(busy) || state.agentBusy} onClick={() => void retryTask()}><RefreshCw size={14} />重试原任务</button>{state.generationFailure.operation === "comment" && <button disabled={Boolean(busy)} onClick={() => void editPendingComment()}>修改草稿</button>}{state.generationFailure.operation === "report" && <button disabled={Boolean(busy)} onClick={() => void editPendingReport()}>修改报告</button>}</div>}
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
        {state.discoveries.length > 0 && <details className="discovery-notices" open><summary>公开讨论有了补充 · {state.discoveries.length}</summary>{state.discoveries.slice(-4).reverse().map((discovery) => { const question = state.threadComments.find((item) => item.id === discovery.commentId); return <div key={discovery.id}><small>{eventTime(discovery.discoveredAtMinute)} · 未核验公开说法</small>{question && <p>回应了你的问题：“{question.text}”</p>}{discovery.contentIds.map((id) => { const content = state.visibleContents.find((item) => item.id === id); return content ? <button key={id} onClick={() => { setSelectedId(id); setChannel("all"); }}><FileText size={13} />{content.title}</button> : null; })}</div>; })}</details>}
        {selected ? <>{selectedBlocked && !state.savedContentIds.includes(selected.id) ? <div className="blocked-reader"><ShieldAlert size={34} /><h2>平台连接被围攻流量阻断</h2><p>等待世界时间流逝后再尝试，或查看电视、报纸和已经收藏的材料。</p></div> : <>
          <div className="reading-tools"><button disabled={Boolean(busy) || state.agentBusy || state.savedContentIds.includes(selected.id)} onClick={() => void saveSelected()}>{state.savedContentIds.includes(selected.id) ? <Check size={13} /> : <Bookmark size={13} />}{state.savedContentIds.includes(selected.id) ? "已收藏材料" : "收藏材料"}</button><button disabled={Boolean(busy) || state.agentBusy} onMouseDown={(event) => event.preventDefault()} onClick={() => void quoteSelection()}><Link2 size={13} />引用选中文字</button></div>
          <fieldset id="current-publication" className="media-interaction" disabled={Boolean(busy) || taskLocked || state.status !== "active"}><ContentPresentation content={selected} sourceName={sources.get(selected.sourceId)?.name ?? "未知来源"} saved={state.savedContentIds.includes(selected.id)} engagement={selectedEngagement} onSave={() => void saveSelected()} onEngage={(action) => void engage(action)} onComment={focusComment} /></fieldset>
          {selected.commentsEnabled && isPlatformContent(selected) && <section className={`comment-section ${selected.kind === "short_video" ? "video-comments" : "platform-comments"}`}><div className="comment-heading"><h2><MessageSquare size={16} />公开评论区</h2><span>{selectedComments.length} 条讨论</span></div>
            {!selectedComments.length && <p className="discussion-empty">这里还没有公开回应。可以引用材料，提出你想核对的问题。</p>}
            {selectedComments.map((comment) => { const parent = selectedComments.find((item) => item.id === comment.parentCommentId); const effects = state.comments.find((item) => item.id === comment.id); const saved = savedReplyIds.includes(comment.id) || state.investigationNotes.some((note) => note.text.includes(`评论 ${comment.id} ·`)); return <article id={`comment-${comment.id}`} className={`public-comment role-${comment.role}`} style={{ marginLeft: `${commentDepth(comment) * 14}px` }} key={comment.id}><header><b>{comment.role === "player" ? "你" : comment.displayName}</b><time>{eventTime(comment.publishedAtMinute)}</time></header>{parent && <a className="reply-context" href={`#comment-${parent.id}`}>回复 {parent.role === "player" ? "你" : parent.displayName}：{parent.text.slice(0, 70)}{parent.text.length > 70 ? "…" : ""}</a>}<p>{comment.text}</p>{effects && <small className="comment-consequence">曝光 +{effects.exposureGain} · 争议 +{effects.controversyGain} · 网暴 +{effects.harassmentGain}</small>}<footer><button disabled={composerLocked || state.status === "finished" || selectedBlocked} onClick={() => { setReplyToId(comment.id); focusComment(); }}><MessageSquare size={13} />回复</button><button disabled={Boolean(busy) || state.agentBusy || saved} onClick={() => void saveReply(comment)}>{saved ? <Check size={13} /> : <Bookmark size={13} />}{saved ? "已存为引用" : "保存引用"}</button>{comment.role !== "player" && <span>账号公开说法</span>}</footer></article>; })}
            {confirmation && <div className="confirmation-box"><strong>发布前确认</strong><blockquote>{confirmation.text}</blockquote><p>这句话被理解为：{({ fact: "陈述事实", inference: "提出推断", question: "询问核实", sarcasm: "反讽", emotion: "表达感受" } as const)[confirmation.features.expressionType]}，表达的确定程度 {confirmation.features.certainty}。</p><div><button disabled={Boolean(busy)} onClick={() => void editPendingComment()}>修改原文</button><button className="primary-command compact" disabled={Boolean(busy) || state.agentBusy || !pendingSubmission} onClick={() => void sendComment(confirmation.token)}>确认发布</button></div></div>}
            {replyTo && <div className="composer-target"><span>回复 @{replyTo.role === "player" ? "你" : replyTo.displayName}<small>{replyTo.text.slice(0, 100)}</small></span><button disabled={composerLocked} onClick={() => setReplyToId(null)} aria-label="取消回复对象"><X size={14} /></button></div>}
            {state.savedContentIds.length > 0 && <details className="citation-picker"><summary><Link2 size={13} />引用已收藏材料{citedContentIds.length ? `（${citedContentIds.length}）` : ""}</summary>{state.savedContentIds.map((id) => { const content = state.visibleContents.find((item) => item.id === id); return content ? <label key={id}><input type="checkbox" checked={citedContentIds.includes(id)} disabled={composerLocked} onChange={(event) => setCitedContentIds((ids) => event.target.checked ? [...ids, id] : ids.filter((item) => item !== id))} />{content.title}</label> : null; })}</details>}
            <div className="comment-composer"><textarea id="public-comment-composer" aria-label="公开评论草稿" value={commentText} onChange={(event) => setCommentText(event.target.value)} disabled={composerLocked || state.status === "finished" || state.status === "awaiting_report"} maxLength={1000} placeholder={state.status === "paused" ? "暂停时可以写草稿；恢复后点击发送才会公开" : replyTo ? "引用这条回应，继续追问来源、时间或尚未说明的部分" : "哪一处说法需要核对？公开提问，或引用材料指出矛盾"} /><button className="send-button" disabled={!commentText.trim() || Boolean(busy) || taskLocked || state.status !== "active" || selectedBlocked} onClick={() => void sendComment()} title="发表评论">{busy === "comment" ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}</button></div>
            <p className="draft-hint">{pendingSubmission ? "原评论正在等待处理，修改前请先取消原任务。" : state.status === "paused" ? "草稿已保存在本机，恢复时间不会自动发送。" : "草稿仅保存在本机。公开发言可能被其他账号引用、截图或转发。"}</p>
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
            <div className="note-stack">{state.investigationNotes.map((note, index) => <article className={`board-note tone-${index % 3}`} key={note.id}><div><small>{eventTime(note.createdAtMinute)}</small><button disabled={Boolean(busy) || state.agentBusy} onClick={() => void deleteNote(note.id)} title="移除笔记"><Trash2 size={13} /></button></div><p>{note.text}</p>{note.linkedContentIds.map((contentId) => { const item = state.visibleContents.find((content) => content.id === contentId); return item ? <button className="note-link" key={contentId} onClick={() => setSelectedId(contentId)}><Link2 size={11} />{item.title}</button> : null; })}</article>)}</div>
          </section>
        </div> : <div className="report-pane">
          {state.report ? <>
            <ReportResult state={state} onOpenEvidence={openReportEvidence} />
            {state.discoveries.length > 0 && <div className="report-replay"><h3>你的公开追问</h3>{state.discoveries.map((discovery) => { const question = state.threadComments.find((item) => item.id === discovery.commentId); const response = state.threadComments.find((item) => item.id === discovery.responseCommentId); return <article key={discovery.id}><p>你的问题：{question?.text}</p><p>{response?.displayName}：{response?.text}</p>{discovery.contentIds.map((id) => { const content = state.visibleContents.find((item) => item.id === id); return content ? <button className="note-link" key={id} onClick={() => { setSelectedId(id); setBoardOpen(false); }}>{content.title}</button> : null; })}<small>公开补充仍需核验；这段记录仅回放实际发生的互动。</small></article>; })}</div>}
          </> : reportConfirmation ? <ReportConfirmation interpretation={reportConfirmation.interpretation} state={state} busy={Boolean(busy) || state.agentBusy} canConfirm={Boolean(pendingReport)} onConfirm={() => void submitFinalReport(reportConfirmation.token)} onEdit={() => void editPendingReport()} onOpenEvidence={openReportEvidence} /> : <>
            <div className="report-draft-tools"><button disabled={Boolean(pendingReport) || !state.investigationNotes.some((note) => !importedNoteIds.includes(note.id))} onClick={importNotes}><StickyNote size={14} />从调查笔记追加草稿</button><p>只带入你已保存的文字和出处，你可以删改，不会自动判定真假。</p></div>
            <textarea aria-label="最终报告草稿" value={reportText} readOnly={Boolean(pendingReport)} maxLength={20_000} onChange={(event) => updateReportDraft(event.target.value)} placeholder="陈述你的判断和把握程度，引用依据，解释因果，指出反证与仍无法确定的部分。" />
            {pendingReport && <p className="draft-hint">这份提交已锁定。重试和确认沿用原文，返回修改后才能编辑。</p>}
            <button className="primary-command" disabled={Boolean(busy) || taskLocked || reportText.trim().length < 20} onClick={() => void submitFinalReport()}>{busy === "report" ? <RefreshCw className="spin" size={16} /> : <FileText size={16} />}提交报告</button>
          </>}
        </div>}
      </aside>
    </div>
  </main>;
}
