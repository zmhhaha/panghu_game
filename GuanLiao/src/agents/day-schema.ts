import { z } from "zod";
import { completionRequestSchema, dependencyStepSchema, propagationBatchRequestSchema } from "./schemas.js";

export const dayRequestSchema = z.object({
  protocolVersion: z.literal(1),
  dayRunId: z.string().uuid(),
  difficulty: z.enum(["guided", "reports", "opaque"]),
  propagation: z.array(dependencyStepSchema.extend({ level: z.number().int().min(0).max(7) })).max(24),
  completions: z.array(completionRequestSchema.extend({
    directiveId: z.string().min(1).max(240),
    dependsOnStepId: z.string().min(1).max(320).nullable(),
  })).max(24),
}).superRefine((day, ctx) => {
  const invalid = () => ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid day dependency graph" });
  if (day.propagation.length && !propagationBatchRequestSchema.safeParse({
    protocolVersion: 2, requests: day.propagation,
  }).success) invalid();
  const ids = new Map(day.propagation.map(step => [step.stepId, step]));
  for (const step of day.propagation) {
    const parent = step.predecessorStepId ? ids.get(step.predecessorStepId) : null;
    if (parent && (parent.level + 1 !== step.level || parent.agent.id === step.agent.id)) invalid();
  }
  const completed = new Set<string>();
  for (const chain of day.completions) {
    if (completed.has(chain.directiveId)) invalid();
    completed.add(chain.directiveId);
    const own = day.propagation.filter(step => step.directiveId === chain.directiveId);
    const last = own.find(step => !own.some(other => other.predecessorStepId === step.stepId));
    if ((last?.stepId ?? null) !== chain.dependsOnStepId) invalid();
    const agentIds = chain.agents.map(item => item.agent.id);
    if (new Set(agentIds).size !== agentIds.length) invalid();
    if (last && (last.agent.id !== agentIds[0] || last.level !== agentIds.length - 1)) invalid();
    for (const step of own) {
      if (chain.agents[agentIds.length - 1 - step.level]?.agent.id !== step.agent.id) invalid();
    }
    for (const { agent, fallback } of chain.agents) {
      if (agent.id !== fallback.agentId || agent.name !== fallback.agentName || agent.role !== fallback.role) invalid();
    }
  }
});
export type DayRequest = z.infer<typeof dayRequestSchema>;

export type DayProgress = {
  dayRunId: string;
  phase?: "down" | "up";
  status: "started" | "working" | "completed";
  down?: { done: number; total: number };
  up?: { done: number; total: number };
  official?: string;
  report?: string;
  action?: string;
  calculation?: string;
  elapsedMs: number;
};
