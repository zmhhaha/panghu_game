"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComradeTaskApproach, ComradeTaskKind, CooperationExchange, CooperationRiskLimit, GameAction, PublicWorldState } from "@qianfu/core";
import { Handshake, Network, X } from "lucide-react";
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

const statusLabels = { awaiting_confirmation: "等待确认", countered: "对方提出条件", declined: "已拒绝", active: "行动中", completed: "已完成", failed: "受挫", cancelled: "已撤回" } as const;
const riskLabels = { low: "只接受低风险", moderate: "可承担有限风险", high: "必要时承担高风险" } as const;
const exchangeLabels = { none: "不预设交换", favor: "欠一次人情", payment: "支付报酬", protection: "提供保护" } as const;

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
  const [purpose, setPurpose] = useState("");
  const [riskLimit, setRiskLimit] = useState<CooperationRiskLimit>("moderate");
  const [exchange, setExchange] = useState<CooperationExchange>("none");
  const [abortCondition, setAbortCondition] = useState("发现跟踪、盘查或无法确认撤离路线时立即中止");

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

  const memberBusy = tasks.some((task) => task.memberId === memberId && ["awaiting_confirmation", "countered", "active"].includes(task.status));
  const duration = (kinds.find((item) => item.id === kind)?.baseMinutes ?? 30) + (approaches.find((item) => item.id === approach)?.offset ?? 0);
  const recentTasks = [...tasks].reverse().slice(0, 6);

  const propose = () => {
    if (!memberId || !targetId || memberBusy) return;
    onAction({
      type: "propose_cooperation_request", memberId, kind, targetId, approach,
      terms: { purpose: purpose.trim(), riskLimit, exchange, abortCondition: abortCondition.trim() },
      durationMinutes: 0, idempotencyKey: crypto.randomUUID(),
    });
  };

  return <section className="mt-8 border-t border-line pt-6">
    <p className="flex items-center gap-2 text-xs font-medium text-muted"><Network size={15} /><span>组织网络</span></p>
    {members.length === 0 ? <div className="mt-3 border border-dashed border-line px-4 py-7 text-center text-sm text-muted">尚未有通过考验并正式加入网络的同志。</div> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="合作对象" value={memberId} onChange={setMemberId} options={members.map((member) => ({ id: member.id, label: `${member.name} · ${member.publicIdentity}` }))} />
        <SelectField label="请求事项" value={kind} onChange={(value) => setKind(value as ComradeTaskKind)} options={kinds} />
        <SelectField label="目标" value={targetId} onChange={setTargetId} options={targets} />
        <SelectField label="建议方法" value={approach} onChange={(value) => setApproach(value as ComradeTaskApproach)} options={approaches} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">说明目的<textarea value={purpose} maxLength={240} onChange={(event) => setPurpose(event.target.value)} placeholder="告诉对方需要确认什么，以及为什么需要他出面" className="mt-2 min-h-24 w-full resize-y border border-line bg-panel px-3 py-2 text-sm leading-6 text-paper outline-none focus:border-copper" /></label>
        <label className="text-xs text-muted">中止条件<textarea value={abortCondition} maxLength={240} onChange={(event) => setAbortCondition(event.target.value)} className="mt-2 min-h-24 w-full resize-y border border-line bg-panel px-3 py-2 text-sm leading-6 text-paper outline-none focus:border-copper" /></label>
        <SelectField label="风险边界" value={riskLimit} onChange={(value) => setRiskLimit(value as CooperationRiskLimit)} options={Object.entries(riskLabels).map(([id, label]) => ({ id, label }))} />
        <SelectField label="交换条件" value={exchange} onChange={(value) => setExchange(value as CooperationExchange)} options={Object.entries(exchangeLabels).map(([id, label]) => ({ id, label }))} />
      </div>
      <div className="mt-3 flex flex-col gap-3 border-l-2 border-safe bg-safe/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm">建议行动约 {duration} 分钟</p><p className="mt-1 text-xs leading-5 text-muted">对方会先评估目的、风险和交换条件；只有双方确认后才开始行动。</p></div>
        <Button className="shrink-0" disabled={busy || memberBusy || !targetId || purpose.trim().length < 4 || abortCondition.trim().length < 4 || state.status !== "active"} onClick={propose}><Handshake size={15} />{memberBusy ? "仍有合作事项未结束" : "提出合作请求"}</Button>
      </div>
    </>}

    {recentTasks.length > 0 && <div className="mt-5 divide-y divide-line border-y border-line">{recentTasks.map((task) => {
      const member = members.find((item) => item.id === task.memberId);
      const kindLabel = kinds.find((item) => item.id === task.kind)?.label ?? task.kind;
      const targetLabel = context.intel.find((item) => item.id === task.targetId)?.title
        ?? context.locations.find((item) => item.id === task.targetId)?.name ?? "未知目标";
      const remaining = task.commitment ? Math.max(0, Math.ceil((new Date(task.commitment.dueAt).getTime() - new Date(state.currentTime).getTime()) / 60_000)) : 0;
      return <div key={task.id} className="flex items-start gap-3 py-3">
        <span className={`mt-1 h-2 w-2 shrink-0 ${task.status === "completed" ? "bg-safe" : task.status === "failed" || task.status === "declined" ? "bg-alert" : ["active", "countered", "awaiting_confirmation"].includes(task.status) ? "bg-copper" : "bg-muted"}`} />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm">{member?.name ?? task.memberId} · {kindLabel}</p><span className="text-[10px] text-muted">{statusLabels[task.status]}{task.status === "active" ? ` · 约 ${remaining} 分钟` : ""}</span></div><p className="mt-1 text-xs text-muted">目标：{targetLabel} · {riskLabels[task.terms.riskLimit]}</p><p className="mt-2 text-xs leading-5 text-paper/80">“{task.response.message}”</p>{task.response.proposedApproach && <p className="mt-1 text-[10px] text-copper">对方要求改用{approaches.find((item) => item.id === task.response.proposedApproach)?.label ?? task.response.proposedApproach}方式。</p>}{task.response.requestedExchange && <p className="mt-1 text-[10px] text-copper">对方要求：{exchangeLabels[task.response.requestedExchange]}</p>}{task.report && <p className="mt-2 text-xs leading-5 text-paper/75">{task.report}</p>}{["awaiting_confirmation", "countered"].includes(task.status) && <div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => onAction({ type: "confirm_cooperation_request", requestId: task.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}><Handshake size={14} />接受条件并确认</Button><Button variant="outline" disabled={busy} onClick={() => onAction({ type: "cancel_cooperation_request", requestId: task.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })}>不再继续</Button></div>}</div>
        {task.status === "active" && <button title="尝试撤回合作请求" aria-label="尝试撤回合作请求" disabled={busy} onClick={() => onAction({ type: "cancel_cooperation_request", requestId: task.id, durationMinutes: 0, idempotencyKey: crypto.randomUUID() })} className="grid h-8 w-8 shrink-0 place-items-center text-muted hover:text-alert disabled:opacity-40"><X size={15} /></button>}
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
