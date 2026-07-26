"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CampaignReportBundle, CampaignShareSummary } from "@qianfu/core";
import { ArrowLeft, Check, Clipboard, Download, ExternalLink, FileJson, Link2, Share2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReportDocument } from "@/components/game/report-document";

export function SettlementReport({ gameInstanceId }: { gameInstanceId: string }) {
  const [bundle, setBundle] = useState<CampaignReportBundle | null>(null);
  const [shares, setShares] = useState<CampaignShareSummary[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<7 | 30 | 90 | null>(30);
  const [copied, setCopied] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<CampaignShareSummary | null>(null);

  useEffect(() => {
    Promise.all([api.getReport(gameInstanceId), api.listShares(gameInstanceId)])
      .then(([report, shareList]) => { setBundle(report); setShares(shareList.shares); setError(""); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取结算档案"));
  }, [gameInstanceId]);

  const createShare = async () => {
    if (!confirmed) return;
    setBusy(true); setError("");
    try {
      const share = await api.createShare(gameInstanceId, expiresInDays);
      setShares((items) => [share, ...items]); setShareOpen(false); setConfirmed(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建分享失败"); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await api.revokeShare(revokeTarget.shareId);
      setShares((items) => items.map((item) => item.shareId === revokeTarget.shareId ? { ...item, revokedAt: new Date().toISOString() } : item));
      setRevokeTarget(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "撤销分享失败"); }
    finally { setBusy(false); }
  };
  const copy = async (shareId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
    setCopied(shareId); window.setTimeout(() => setCopied(""), 1800);
  };

  if (!bundle) return <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-sm text-muted">{error || "正在生成结算档案..."}</main>;

  return <main className="min-h-screen overflow-x-hidden bg-ink text-paper">
    <header className="border-b border-line"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-paper"><ArrowLeft size={16} />返回战役列表</Link><span className="text-xs text-safe">战役已冻结</span></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      {error && <div className="mb-5 border-l-2 border-alert bg-alert/10 px-4 py-3 text-sm text-[#efaaa4]">{error}</div>}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"><a href={api.exportGame(gameInstanceId, "html")}><Button variant="outline" className="w-full"><Download size={15} />HTML 战报</Button></a><a href={api.exportGame(gameInstanceId, "json")}><Button variant="outline" className="w-full"><FileJson size={15} />JSON 档案</Button></a><Button className="col-span-2 sm:w-auto" onClick={() => { setShareOpen(true); setConfirmed(false); }}><Share2 size={15} />创建公开分享</Button></div>
      <ReportDocument report={bundle.ownerReport} />
      <section className="border-t border-line py-8"><div className="flex items-center justify-between"><div><h2 className="font-serif text-xl">公开分享</h2><p className="mt-1 text-sm text-muted">分享内容为创建时冻结的脱敏副本。</p></div><span className="text-xs text-muted">{shares.filter((item) => !item.revokedAt).length} 个有效链接</span></div>{shares.length === 0 ? <p className="mt-5 text-sm text-muted">尚未创建公开链接。</p> : <div className="mt-5 divide-y divide-line border-y border-line">{shares.map((share) => { const expired = Boolean(share.expiresAt && Date.parse(share.expiresAt) <= Date.now()); const unavailable = Boolean(share.revokedAt || expired); return <div key={share.shareId} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-mono text-xs text-paper/80">/share/{share.shareId}</p><p className="mt-1 text-xs text-muted">创建于 {new Date(share.createdAt).toLocaleString("zh-CN")} · {share.expiresAt ? `有效至 ${new Date(share.expiresAt).toLocaleDateString("zh-CN")}` : "长期有效"} · 访问 {share.accessCount} 次</p></div><div className="flex gap-2">{!unavailable && <><button title="复制链接" onClick={() => void copy(share.shareId)} className="grid h-9 w-9 place-items-center border border-line text-muted hover:text-paper">{copied === share.shareId ? <Check size={15} /> : <Clipboard size={15} />}</button><a title="打开分享" href={`/share/${share.shareId}`} target="_blank" className="grid h-9 w-9 place-items-center border border-line text-muted hover:text-paper"><ExternalLink size={15} /></a><Button variant="ghost" onClick={() => setRevokeTarget(share)}>撤销</Button></>} {unavailable && <span className="self-center text-xs text-alert">{share.revokedAt ? "已撤销" : "已过期"}</span>}</div></div>; })}</div>}</section>
    </div>

    {shareOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true"><div className="my-6 w-full max-w-4xl border border-line bg-ink shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">分享前预览</p><h2 className="mt-1 font-serif text-xl">确认公开内容</h2></div><button aria-label="关闭" onClick={() => setShareOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></div><div className="max-h-[65vh] overflow-y-auto px-5"><ReportDocument report={bundle.publicPreview} preview /></div><div className="border-t border-line bg-panel px-5 py-4"><div className="grid gap-4 sm:grid-cols-[180px_1fr]"><label className="text-xs text-muted">链接有效期<select value={expiresInDays ?? "never"} onChange={(event) => setExpiresInDays(event.target.value === "never" ? null : Number(event.target.value) as 7 | 30 | 90)} className="mt-2 h-10 w-full border border-line bg-ink px-3 text-sm text-paper"><option value={7}>7 天</option><option value={30}>30 天</option><option value={90}>90 天</option><option value="never">长期有效</option></select></label><label className="flex items-center gap-3 self-end text-sm text-paper/80"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="h-4 w-4 accent-[#76a7a1]" />我已检查以上公开内容，确认创建不可枚举的只读链接</label></div><div className="mt-5 flex justify-end gap-3"><Button variant="ghost" onClick={() => setShareOpen(false)}>取消</Button><Button disabled={!confirmed || busy} onClick={() => void createShare()}><Link2 size={15} />{busy ? "正在创建" : "创建分享"}</Button></div></div></div></div>}
    {revokeTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md border border-line bg-panel p-5"><p className="text-xs text-alert">撤销公开访问</p><h2 className="mt-2 font-serif text-xl">确认撤销这个分享链接？</h2><p className="mt-4 text-sm leading-7 text-muted">撤销后链接立即失效，已下载的文件无法收回。</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={() => setRevokeTarget(null)}>取消</Button><Button variant="danger" disabled={busy} onClick={() => void revoke()}>{busy ? "正在撤销" : "确认撤销"}</Button></div></div></div>}
  </main>;
}
