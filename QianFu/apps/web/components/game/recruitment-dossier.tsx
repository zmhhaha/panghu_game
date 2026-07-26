"use client";

import { useState } from "react";
import type { GameAction, RecruitmentEvidenceResult, RecruitmentTestType } from "@qianfu/core";
import { Check, CircleAlert, ClipboardCheck, FileSearch, ShieldCheck, UserPlus, X } from "lucide-react";
import type { GameContext } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Candidate = GameContext["recruitmentCandidates"][number];

const tests: Array<{ id: RecruitmentTestType; label: string; minutes: 30 | 40 | 60; description: string }> = [
  { id: "background_check", label: "背景核查", minutes: 60, description: "核对履历、来往与关键时间点" },
  { id: "controlled_leak", label: "可控假情报", minutes: 40, description: "观察消息是否沿异常路径扩散" },
  { id: "discipline_check", label: "纪律测试", minutes: 30, description: "检查对约定与备用规则的执行" },
  { id: "low_risk_task", label: "低风险任务", minutes: 60, description: "分离判断态度、纪律与执行能力" },
];

const resultLabels: Record<RecruitmentEvidenceResult, string> = {
  favorable: "有利迹象",
  warning: "需要警惕",
  inconclusive: "尚不明确",
};

const resultClasses: Record<RecruitmentEvidenceResult, string> = {
  favorable: "text-safe",
  warning: "text-alert",
  inconclusive: "text-copper",
};

export function RecruitmentDossier({
  candidate,
  busy,
  onAction,
}: {
  candidate: Candidate | undefined;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!candidate) return null;

  const recruited = candidate.stage === "recruited";
  const runTest = (testType: RecruitmentTestType, durationMinutes: number) => onAction({
    type: "recruitment_test",
    targetCharacterId: candidate.id,
    testType,
    durationMinutes,
    idempotencyKey: crypto.randomUUID(),
  });

  return <section className="mt-8 border-t border-line pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium text-muted"><ClipboardCheck size={15} />候选人甄别</p>
        <h3 className="mt-2 font-serif text-xl">{candidate.name} · {candidate.publicIdentity}</h3>
      </div>
      <span className={`border px-2.5 py-1 text-xs ${recruited ? "border-safe/50 text-safe" : candidate.canRecruit ? "border-copper/60 text-copper" : "border-line text-muted"}`}>
        {recruited ? "已加入网络" : candidate.canRecruit ? "可以正式接触" : `${candidate.requirements.testsCompleted}/${candidate.requirements.testsRequired} 类测试`}
      </span>
    </div>

    {!recruited && <>
      <div className="mt-4 grid gap-px bg-line sm:grid-cols-2">
        {tests.map((test) => {
          const completed = candidate.completedTestTypes.includes(test.id);
          const blocked = !candidate.requirements.contactReady || (test.id === "low_risk_task" && !candidate.requirements.cooperationReady);
          return <div key={test.id} className="flex min-h-[104px] items-start justify-between gap-3 bg-ink p-4">
            <div><p className="text-sm">{test.label}</p><p className="mt-1 text-xs leading-5 text-muted">{test.description}</p><p className="mt-2 text-[10px] text-muted">耗时 {test.minutes} 分钟</p></div>
            <button
              title={completed ? "该项已经完成" : blocked ? "先通过交谈建立必要接触" : `执行${test.label}`}
              disabled={busy || completed || blocked}
              onClick={() => runTest(test.id, test.minutes)}
              className="grid h-9 w-9 shrink-0 place-items-center border border-line text-muted hover:border-copper hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
            >{completed ? <Check size={15} className="text-safe" /> : <FileSearch size={15} />}</button>
          </div>;
        })}
      </div>

      {!candidate.requirements.contactReady && <p className="mt-3 flex items-center gap-2 text-xs text-copper"><CircleAlert size={13} />先通过寒暄或建立信任形成基础档案。</p>}
      {candidate.requirements.contactReady && !candidate.requirements.cooperationReady && <p className="mt-3 flex items-center gap-2 text-xs text-copper"><CircleAlert size={13} />通过“试探招募”确认初步合作意向后，才能安排低风险任务。</p>}
    </>}

    <div className="mt-5">
      <p className="text-xs text-muted">已记录证据</p>
      {candidate.evidence.length === 0 ? <p className="mt-3 text-sm text-muted">尚无可供判断的独立证据。一次测试不能证明一个人绝对可靠。</p> : <div className="mt-3 divide-y divide-line border-y border-line">
        {candidate.evidence.map((evidence) => <div key={evidence.id} className="grid gap-1 py-3 sm:grid-cols-[100px_1fr] sm:gap-4">
          <span className={`text-xs ${resultClasses[evidence.result]}`}>{resultLabels[evidence.result]}</span>
          <p className="text-sm leading-6 text-paper/80">{evidence.summary}</p>
        </div>)}
      </div>}
    </div>

    {!recruited && <div className="mt-5 border-l-2 border-copper bg-copper/[0.06] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm">正式招募</p><p className="mt-1 text-xs leading-5 text-muted">至少完成三类测试并建立足够信任。证据可能误导，最终判断由你负责。</p></div>
        <Button disabled={busy || !candidate.canRecruit} onClick={() => setConfirming(true)}><UserPlus size={15} />提出招募</Button>
      </div>
    </div>}

    {confirming && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="recruit-title">
      <div className="w-full max-w-md border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-copper">不可轻易撤回</p><h2 id="recruit-title" className="mt-2 font-serif text-xl">正式招募 {candidate.name}？</h2></div><button aria-label="关闭" onClick={() => setConfirming(false)} className="grid h-8 w-8 place-items-center text-muted hover:text-paper"><X size={17} /></button></div>
        <p className="mt-5 text-sm leading-7 text-paper/80">对方将获知有限的组织关系并成为可独立行动的同志 Agent。若判断错误，泄密和反向渗透会扩大整个网络的风险。</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setConfirming(false)}>取消</Button><Button disabled={busy} onClick={() => { setConfirming(false); onAction({ type: "recruit_candidate", targetCharacterId: candidate.id, durationMinutes: 30, idempotencyKey: crypto.randomUUID() }); }}><ShieldCheck size={15} />确认招募</Button></div>
      </div>
    </div>}
  </section>;
}
