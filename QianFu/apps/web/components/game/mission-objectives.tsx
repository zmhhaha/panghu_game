"use client";

import { Check, CircleAlert, Clock3, FileCheck2 } from "lucide-react";
import type { GameContext } from "@/lib/api";
import type { PublicWorldState } from "@qianfu/core";

export function MissionObjectives({ state, context }: { state: PublicWorldState; context: GameContext }) {
  return <section className="mt-7 border-t border-line pt-5">
    <div className="flex items-center gap-2 text-xs font-medium text-muted"><FileCheck2 size={15} />核心任务</div>
    {context.settlement.pendingReceipts > 0 && <p className="mt-3 border-l-2 border-copper bg-copper/[0.06] px-3 py-2 text-xs leading-5 text-muted">有 {context.settlement.pendingReceipts} 封电文正在等待组织回执；在回执落定前不能判断其是否满足结算条件。</p>}
    <div className="mt-4 space-y-4">{context.objectives.map((objective) => <article key={objective.id} className="border border-line bg-panel/40 p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm text-paper">{objective.title}</h3><p className="mt-1 text-xs text-muted">截止 {formatDate(objective.deadline)}</p></div><Status status={objective.status} /></div>
      <div className="mt-4 space-y-3">{objective.intel.map((intel) => { const definition = context.intel.find((item) => item.id === intel.id); return <div key={intel.id} className="border-l-2 border-line pl-3"><div className="flex items-center justify-between gap-3"><p className="text-xs text-paper/85">{intel.title}</p><span className="text-[10px] text-muted">可信度 {Math.round(intel.confidence * 100)}% / 需 {Math.round(objective.minimumConfidence * 100)}%</span></div><div className="mt-2 flex flex-wrap gap-1.5">{intel.requiredFields.map((field) => <span key={field} className={`border px-2 py-1 text-[10px] ${intel.knownFields.includes(field) ? "border-safe/40 text-safe" : "border-line text-muted"}`}>{intel.knownFields.includes(field) ? <Check size={10} className="mr-1 inline" /> : ""}{definition?.fieldLabels[field] ?? field}</span>)}</div><p className="mt-2 text-[10px] text-muted">{intel.delivered ? "已按允许渠道送达" : intel.missingFields.length > 0 ? `还缺 ${intel.missingFields.length} 个字段` : "字段齐全，等待送达"} · {receiptLabel(intel.receiptStatus)}</p></div>; })}</div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted"><span>{objective.status === "completed" ? "所有结算条件已满足" : objective.status === "ready_to_transmit" ? "情报已备齐，可以安排传递" : objective.status === "overdue" ? "已超过截止时间" : "继续收集并核验情报"}</span><span className={objective.remainingMinutes < 120 && objective.status !== "completed" ? "text-alert" : "text-muted"}><Clock3 size={11} className="mr-1 inline" />剩余 {formatRemaining(objective.remainingMinutes)}</span></div>
    </article>)}</div>
  </section>;
}

function receiptLabel(status: GameContext["objectives"][number]["intel"][number]["receiptStatus"]) {
  return status === "confirmed" ? "组织回执：完整收到" : status === "partial" ? "组织回执：部分收到" : status === "no_receipt" ? "组织回执：未收到" : status === "pending" ? "组织回执：等待中" : status === "courier_delivered" ? "交通员已送达" : "尚未传递";
}

function Status({ status }: { status: GameContext["objectives"][number]["status"] }) {
  if (status === "completed") return <span className="flex items-center gap-1 text-[10px] text-safe"><Check size={12} />已完成</span>;
  if (status === "overdue") return <span className="flex items-center gap-1 text-[10px] text-alert"><CircleAlert size={12} />已逾期</span>;
  if (status === "ready_to_transmit") return <span className="text-[10px] text-copper">待传递</span>;
  return <span className="text-[10px] text-muted">进行中</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function formatRemaining(minutes: number) {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}天${Math.floor((minutes % 1440) / 60)}小时`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}小时${minutes % 60}分`;
  return `${minutes}分钟`;
}
