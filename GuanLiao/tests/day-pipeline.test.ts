import { describe, expect, it, vi } from "vitest";
import { BureaucracyOrchestrator } from "../src/agents/orchestrator.js";
import { dayRequestSchema, type DayProgress, type DayRequest } from "../src/agents/day-schema.js";

const agent = (id: string) => ({
  id, name: "官员" + id, role: "县丞", style: "cautious" as const, personaLabel: "谨慎",
  publicFace: "先留卷宗，再作安排。", traits: { competence: 60, loyalty: 60, ambition: 40, greed: 20, caution: 80 },
});
const narrative = {
  interpretation: "他认为应当先查明当地实际情形。",
  calculation: "他希望先留下卷宗以免日后担责。",
  action: "先派人造册查验，然后再行转交。",
  officialReport: "奉批。已经派员造册，相关事项正在办理。",
  forwardedText: "先造清册核验，再行办理具报。",
};
function step(directiveId: string, level: number): DayRequest["propagation"][number] {
  return {
    directiveId, stepId: directiveId + level, predecessorStepId: level ? directiveId + (level - 1) : null,
    level, era: "ming", day: 3, orderText: "修理河堤，不得摊派贫户。", receivedText: "修理河堤，不得摊派贫户。",
    analysis: { clarity: 80, clarityLabel: "明确", dominant: "relief" }, agent: agent(directiveId + level),
    controllerProjection: { narrative, fidelity: 80, holdDays: 0, effects: {} },
  };
}
function chain(directiveId: string, levels: number, dependsOnStepId: string | null): DayRequest["completions"][number] {
  return {
    directiveId, dependsOnStepId, era: "ming", day: 3, orderText: "修理河堤，不得摊派贫户。",
    outcome: { success: true, title: "河堤合龙", text: "堤岸险口已经修补完毕。" },
    agents: Array.from({ length: levels }, (_, index) => {
      const official = agent(directiveId + (levels - 1 - index));
      return { agent: official, fallback: {
        agentId: official.id, agentName: official.name, role: official.role, style: official.style, day: 3,
        receivedReport: "现场情形已经查验，堤岸修补完毕。",
        reportingCalculation: "他打算留下复核余地以免担责。",
        reportText: "奉结。据属员回报，堤岸已经修补完毕。",
      } };
    }),
  };
}
const base = (): DayRequest => ({
  protocolVersion: 1, dayRunId: "59c84758-9b7c-4d20-9da1-caa0909c7f23",
  difficulty: "guided", propagation: [], completions: [],
});
const completion = { reportingCalculation: "他准备留出复核余地以免日后担责。", reportText: "奉结。堤岸已见成效，后续仍待复核。" };

describe("whole-day dependency pipeline", () => {
  it("starts an unlocked completion before unrelated downward work finishes", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let completionStarted = false;
    const service = new BureaucracyOrchestrator({
      name: "test", async complete(_system, user) {
        const input = JSON.parse(user);
        if (!input.requests) { completionStarted = true; return completion; }
        if (input.requests.some((item: { stepId: string }) => item.stepId === "b1")) await gate;
        return { steps: input.requests.map((item: { stepId: string }) => ({ ...narrative, stepId: item.stepId })) };
      },
    });
    const request = base();
    request.propagation = [step("a", 0), step("b", 0), step("b", 1), step("b", 2)];
    request.completions = [chain("a", 1, "a0")];
    const events: DayProgress[] = [];
    const result = service.prepareDay(request, event => events.push(event));
    try {
      await vi.waitFor(() => expect(completionStarted).toBe(true));
      expect(events.some(event => event.phase === "down" && event.official?.includes("b2"))).toBe(false);
    } finally { release(); }
    expect((await result).fallbackCount).toBe(0);
  });

  it("filters opaque progress and preserves bottom-up received reports", async () => {
    const inputs: string[] = [];
    const service = new BureaucracyOrchestrator({
      name: "test", async complete(_system, user) {
        inputs.push(JSON.parse(user).receivedCompletionReport);
        return completion;
      },
    });
    const request = base();
    request.difficulty = "opaque";
    request.completions = [chain("a", 2, null)];
    const events: DayProgress[] = [];
    const result = await service.prepareDay(request, event => events.push(event));
    expect(inputs[1]).toBe(result.completions[0].completionChain[0].reportText);
    expect(events.filter(event => event.official).map(event => event.official)).toEqual(["县丞 官员a0"]);
    expect(events.every(event => !event.down && !event.up && !event.calculation && !event.action)).toBe(true);
  });

  it("report difficulty never streams private calculations", async () => {
    const request = base();
    request.difficulty = "reports";
    request.propagation = [step("a", 0)];
    const events: DayProgress[] = [];
    await new BureaucracyOrchestrator(null).prepareDay(request, event => events.push(event));
    expect(events.some(event => event.report)).toBe(true);
    expect(events.every(event => !event.calculation && !event.action)).toBe(true);
  });

  it("completes a cancelled day with fallback without issuing model calls", async () => {
    const controller = new AbortController();
    controller.abort();
    const complete = vi.fn();
    const request = base();
    request.propagation = [step("a", 0)];
    request.completions = [chain("a", 1, "a0")];
    const result = await new BureaucracyOrchestrator({ name: "test", complete }).prepareDay(request, () => {}, controller.signal);
    expect(complete).not.toHaveBeenCalled();
    expect(result.fallbackCount).toBe(2);
  });

  it("rejects a completion depending on another directive or the wrong level", () => {
    const request = base();
    request.propagation = [step("a", 0), step("a", 1)];
    request.completions = [chain("a", 2, "a0")];
    expect(dayRequestSchema.safeParse(request).success).toBe(false);
    request.completions = [chain("b", 2, "a1")];
    expect(dayRequestSchema.safeParse(request).success).toBe(false);
  });
});
