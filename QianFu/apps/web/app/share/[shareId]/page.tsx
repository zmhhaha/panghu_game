import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export default function SharedReportPage({ params }: { params: { shareId: string } }) {
  return <main className="min-h-screen bg-ink px-5 py-10 text-paper"><div className="mx-auto max-w-3xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-paper"><ArrowLeft size={16} /> 返回潜线</Link><article className="mt-10 border border-line bg-panel p-7 md:p-10"><div className="flex items-center justify-between"><p className="text-xs tracking-[0.2em] text-copper">战役结算报告</p><LockKeyhole size={16} className="text-safe" /></div><h1 className="mt-5 font-serif text-3xl">报告尚未生成</h1><p className="mt-4 text-sm leading-7 text-muted">分享编号 {params.shareId}。正式报告将在战役冻结、玩家确认脱敏预览后生成。</p></article></div></main>;
}
