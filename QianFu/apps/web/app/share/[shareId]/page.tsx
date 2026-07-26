import type { Metadata } from "next";
import { SharedReportView } from "@/components/game/shared-report-view";

export const metadata: Metadata = { title: "公开战役档案 · 潜线", robots: { index: false, follow: false } };
export default function SharedReportPage({ params }: { params: { shareId: string } }) { return <SharedReportView shareId={params.shareId} />; }
