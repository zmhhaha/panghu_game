"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SharedCampaignReport } from "@qianfu/core";
import { ArrowLeft, Download, FileJson, LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReportDocument } from "@/components/game/report-document";

export function SharedReportView({ shareId }: { shareId: string }) {
  const [shared, setShared] = useState<SharedCampaignReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.getSharedReport(shareId).then(setShared).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取公开战报")); }, [shareId]);
  if (!shared) return <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-center text-sm text-muted">{error || "正在查阅公开档案..."}</main>;
  return <main className="min-h-screen overflow-x-hidden bg-ink text-paper"><header className="border-b border-line"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-paper"><ArrowLeft size={16} />返回潜线</Link><span className="flex items-center gap-2 text-xs text-safe"><LockKeyhole size={14} />脱敏只读副本</span></div></header><div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><div className="mb-8 grid grid-cols-2 gap-3 sm:flex"><a href={api.exportShare(shareId, "html")}><Button variant="outline" className="w-full"><Download size={15} />下载 HTML</Button></a><a href={api.exportShare(shareId, "json")}><Button variant="outline" className="w-full"><FileJson size={15} />下载 JSON</Button></a></div><ReportDocument report={shared.report} /><footer className="border-t border-line py-6 text-xs leading-6 text-muted">此页面不包含人物隐藏可靠性、敌方完整调查状态、未获知情报或 Agent 内部上下文。链接可能由创建者撤销。</footer></div></main>;
}
