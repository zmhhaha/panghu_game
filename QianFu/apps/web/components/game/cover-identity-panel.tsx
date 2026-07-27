"use client";

import { useState } from "react";
import { BriefcaseBusiness, ClipboardCheck, FileStack, HeartPulse, ShieldAlert, TimerReset, UserRoundCheck } from "lucide-react";
import type { CoverWorkKind, GameAction, LeaveReason, PublicWorldState } from "@qianfu/core";
import { COVER_PROFILES } from "@qianfu/core/cover-profiles";
import { Button } from "@/components/ui/button";

const workOptions: Array<{ kind: CoverWorkKind; label: string; minutes: number; detail: string; icon: typeof FileStack }> = [
  { kind: "file_sorting", label: "整理档案", minutes: 60, detail: "留下可核对的工作记录", icon: FileStack },
  { kind: "duty_shift", label: "完成值班", minutes: 120, detail: "同事会看见你在岗位上", icon: TimerReset },
  { kind: "submit_report", label: "提交报告", minutes: 30, detail: "降低上级对你的追问", icon: ClipboardCheck },
  { kind: "settle_accounts", label: "结算货账", minutes: 60, detail: "留下可信的货款与账册记录", icon: FileStack },
  { kind: "visit_clients", label: "拜访客户", minutes: 120, detail: "以生意见面解释公开行程", icon: TimerReset },
  { kind: "stock_check", label: "清点存货", minutes: 30, detail: "核对货单与今日路线", icon: ClipboardCheck },
  { kind: "submit_column", label: "递交短稿", minutes: 30, detail: "让编辑部留下你的来稿记录", icon: ClipboardCheck },
  { kind: "street_research", label: "街头采风", minutes: 60, detail: "用采访和笔记说明行踪", icon: TimerReset },
  { kind: "proofread_copy", label: "校对稿样", minutes: 30, detail: "在编辑部留下可见工作痕迹", icon: FileStack },
];

const statusLabels = { awaiting_shift: "待岗", working: "正常工作", on_leave: "请假中", unexcused_absence: "异常缺勤" } as const;

export function CoverIdentityPanel({ state, busy, onAction }: { state: PublicWorldState; busy: boolean; onAction: (action: GameAction) => void }) {
  const [reason, setReason] = useState<LeaveReason>("family");
  const cover = state.cover;
  const profile = COVER_PROFILES.find((item) => item.id === cover.profileId) ?? COVER_PROFILES[0];
  const atOffice = profile.workLocationIds.includes(state.currentLocationId);
  const now = minuteOfDay(state.currentTime);
  const workingHours = Boolean(profile.workHours && now >= profile.workHours.startMinute && now < profile.workHours.endMinute);
  const actionDisabled = busy || !atOffice || !workingHours || cover.workStatus === "on_leave" || cover.completedWorkDates.includes(state.currentTime.slice(0, 10));
  const leaveDisabled = busy || !atOffice || !workingHours || cover.workStatus === "on_leave";
  return <section className="mt-5 border-t border-line pt-4">
    <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-medium text-muted"><BriefcaseBusiness size={15} />公开身份：{profile.title}</p><span className={cover.workStatus === "unexcused_absence" ? "text-[10px] text-alert" : cover.workStatus === "working" ? "text-[10px] text-safe" : "text-[10px] text-muted"}>{statusLabels[cover.workStatus]}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-3"><Metric label="公开信誉" value={cover.credibility} color="bg-safe" /><Metric label="上级怀疑" value={cover.supervisorSuspicion} color="bg-alert" /></div>
    <p className="mt-3 text-xs leading-5 text-muted">连续缺勤 {cover.consecutiveAbsences} 天 · 请假 {cover.leaveCount} 次{cover.leaveUntil ? ` · 已登记至 ${formatTime(cover.leaveUntil)}` : ""}</p>
    <div className="mt-4 space-y-2">{workOptions.filter((option) => profile.workKinds.includes(option.kind)).map((option) => { const Icon = option.icon; return <button key={option.kind} disabled={actionDisabled} onClick={() => onAction({ type: "cover_work", workKind: option.kind, durationMinutes: option.minutes, idempotencyKey: crypto.randomUUID() })} className="flex w-full items-center gap-3 border border-line px-3 py-2.5 text-left text-xs text-paper/85 hover:border-copper disabled:cursor-not-allowed disabled:opacity-40"><Icon size={15} className="shrink-0 text-copper" /><span className="min-w-0 flex-1"><span className="block">{option.label} · {option.minutes} 分钟</span><span className="mt-0.5 block text-[10px] text-muted">{option.detail}</span></span></button>; })}</div>
    <div className="mt-3 flex gap-2"><select value={reason} disabled={leaveDisabled} onChange={(event) => setReason(event.target.value as LeaveReason)} className="h-9 min-w-0 flex-1 border border-line bg-ink px-2 text-xs text-paper disabled:opacity-40"><option value="family">家庭事务</option><option value="health">身体不适</option><option value="official">公务外出</option></select><Button variant="outline" disabled={leaveDisabled} onClick={() => onAction({ type: "request_leave", reason, durationMinutes: 10, idempotencyKey: crypto.randomUUID() })}><HeartPulse size={14} />请假</Button></div>
    {!atOffice ? <p className="mt-3 text-[10px] text-muted">需要在公开身份合理的活动地点处理{profile.routineLabel}。</p> : !workingHours ? <p className="mt-3 text-[10px] text-muted">当前不在{profile.routineLabel}的合理活动时段。</p> : null}
    {cover.observations.length > 0 && <div className="mt-4 border-t border-line pt-3"><p className="flex items-center gap-2 text-[10px] text-muted"><UserRoundCheck size={12} />同事与上级观察</p><ol className="mt-2 space-y-2">{cover.observations.slice(-3).reverse().map((item) => <li key={item.id} className="text-[10px] leading-5 text-muted"><span className={item.type === "absence_recorded" || item.type === "supervisor_check" ? "text-alert" : "text-paper/80"}>{item.summary}</span><time className="ml-2 text-muted/70">{formatTime(item.observedAt)}</time></li>)}</ol></div>}
    {cover.workStatus === "unexcused_absence" && <p className="mt-3 flex gap-2 border-l-2 border-alert bg-alert/10 px-3 py-2 text-[10px] leading-5 text-[#efaaa4]"><ShieldAlert size={13} className="mt-0.5 shrink-0" />异常缺勤会增加个人怀疑，并可能引来上级核查。</p>}
  </section>;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className="mb-1 flex justify-between text-[10px] text-muted"><span>{label}</span><span>{Math.round(value)}%</span></div><div className="h-1.5 bg-line"><div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function minuteOfDay(value: string) {
  const date = new Date(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
