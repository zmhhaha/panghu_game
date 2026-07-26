"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComradeTaskApproach, ComradeTaskKind, GameAction, PublicWorldState } from "@qianfu/core";
import { BriefcaseBusiness, Network, X } from "lucide-react";
import type { GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";

const kinds: Array<{ id: ComradeTaskKind; label: string; baseMinutes: number }> = [
  { id: "gather_intel", label: "搜集情报", baseMinutes: 60 },
  { id: "verify_intel", label: "核验线索", baseMinutes: 30 },
  { id: "scout_location", label: "踩点侦察", baseMinutes: 30 },
];

const approaches: Array<{ id: ComradeTaskApproach; label: string; offset: number }> = [
  { id: "cautious", label: "谨慎", offset: 20 },
  { id: "balanced", label: "平衡", offset: 0 },
  { id: "urgent", label: "紧急", offset: -10 },
];

const statusLabels = { active: "执行中", completed: "已完成", failed: "失败", cancelled: "已撤回" } as const;

export function OrganizationNetwork({ state, context, busy, onAction }: {
  state: PublicWorldState;
  context: GameContext;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const members = context.networkMembers ?? [];
  const tasks = state.network.tasks ?? [];
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<ComradeTaskKind>("gather_intel");
  const [approach, setApproach] = useState<ComradeTaskApproach>("balanced");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (!members.some((member) => member.id === memberId)) setMemberId(members[0]?.id ?? "");
  }, [memberId, members]);

  const targets = useMemo(() => {
    if (kind === "scout_location") {
      return context.locations.filter((location) => !location.discovered).map((location) => ({ id: location.id, label: location.name }));
    }
    return context.intel
      .filter((item) => {
        const intel = state.intel[item.id];
        if (intel.deliveredAt) return false;
        if (kind === "verify_intel") return intel.knownFields.length > 0;
        return item.requiredFields.some((field) => !intel.knownFields.includes(field));
      })
      .map((item) => ({ id: item.id, label: item.title }));
  }, [context.intel, context.locations, kind, state.intel]);

  useEffect(() => {
    if (!targets.some((target) => target.id === targetId)) setTargetId(targets[0]?.id ?? "");
  }, [targetId, targets]);

  const memberBusy = tasks.some((task) => task.memberId === memberId && task.status === "active");
  const duration = (kinds.find((item) => item.id === kind)?.baseMinutes ?? 30) + (approaches.find((item) => item.id === approach)?.offset ?? 0);
  const recentTasks = [...tasks].reverse().slice(0, 6);

  const assign = () => {
    if (!memberId || !targetId || memberBusy) return;
    onAction({ type: "delegate_comrade_task", memberId, kind, targetId, approach, durationMinutes: 0, idempotencyKey: crypto.randomUUID() });
  };

  return <section className="mt-8 border-t border-line pt-6">
    <p className="flex items-center gap-2 text-xs font-medium text-muted"><Network size={15} /><span>组织网络</span></p>
    {members.length === 0 ? <div className="mt-3 border border-dashed border-line px-4 py-7 text-center text-sm text-muted">尚未有通过考验并正式加入网络的同志。</div> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="执行成员" value={memberId} onChange={setMemberId} options={members.map((member) => ({ id: member.id, label: `${member.name} · ${member.publicIdentity}` }))} />
        <SelectField label="任务" value={kind} onChange={(value) => setKind(value as ComradeTaskKind)} options={kinds} />
        <SelectField label="目标" value={targetId} onChange={setTargetId} options={targets} />
        <SelectField label="策略" value={approach} onChange={(value) => setApproach(value as ComradeTaskApproach)} options={approaches} />
      </div>
      <div className="mt-3 flex flex-col gap-3 border-l-2 border-safe bg-safe/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm">预计 {duration} 分钟</p><p className="mt-1 text-xs leading-5 text-muted">同志会独立选择路线和方法，结果在世界时间推进时送回。</p></div>
        <Button className="shrink-0" disabled={busy || memberBusy || !targetId || state.status !== "active"} onClick={assign}><BriefcaseBusiness size={15} />{memberBusy ? "成员正在执行任务" : "下达任务"}</Button>
      </div>
    </>}

    {recentTasks.length > 0 && <div className="mt-5 divide-y divide-line border-y border-line">{recentTasks.map((task) => {
      const member = members.find((item) => item.id === task.memberId);
      const kindLabel = kinds.find((item) => item.id === task.kind)?.label ?? task.kind;
      const targetLabel = context.intel.find((item) => item.id === task.targetId)?.title
        ?? context.locations.find((item) => item.id === task.targetId)?.name ?? "未知目标";
      const remaining = Math.max(0, Math.ceil((new Date(task.dueAt).getTime() - new Date(state.currentTime).getTime()) / 60_000));
      return <div key={task.id} className="flex items-start gap-3 py-3">
        <span className={`mt-1 h-2 w-2 shrink-0 ${task.status === "completed" ? "bg-safe" : task.status === "failed" ? "bg-alert" : task.status === "active" ? "bg-copper" : "bg-muted"}`} />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm">{member?.name ?? task.memberId} · {kindLabel}</p><span className="text-[10px] text-muted">{statusLabels[task.status]}{task.status === "active" ? ` · 约 ${remaining} 分钟` : ""}</span></div><p className="mt-1 text-xs text-muted">目标：{targetLabel}</p>{task.report && <p className="mt-2 text-xs leading-5 text-paper/75">{task.report}</p>}</div>
        {task.status === "active" && <button title="撤回任务" aria-label="撤回任务" disabled={busy} onClick={() => onAction({ type: "cancel_comrade_task", taskId: task.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })} className="grid h-8 w-8 shrink-0 place-items-center text-muted hover:text-alert disabled:opacity-40"><X size={15} /></button>}
      </div>;
    })}</div>}
  </section>;
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return <label className="text-xs text-muted">{label}<select value={value} disabled={options.length === 0} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full border border-line bg-panel px-3 text-sm text-paper outline-none focus:border-copper disabled:opacity-50">{options.length === 0 ? <option value="">暂无可选目标</option> : options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}
