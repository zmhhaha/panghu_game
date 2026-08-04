import { describe, expect, it } from "vitest";
import { BureaucracyOrchestrator } from "../src/agents/orchestrator.js";
import type { AgentProvider } from "../src/agents/provider.js";
import type { CompletionRequest, PropagationRequest } from "../src/agents/schemas.js";

const directAgent = {
  id: "local-0",
  role: "县丞",
  name: "沈履安",
  style: "cautious" as const,
  personaLabel: "明哲保身",
  publicFace: "凡事先留卷宗与退路。",
  traits: { competence: 62, loyalty: 55, ambition: 38, greed: 25, caution: 82 },
};

const executorAgent = {
  id: "local-1",
  role: "承差役头",
  name: "刘三省",
  style: "careerist" as const,
  personaLabel: "邀功求进",
  publicFace: "最在意迅速做出可供上报的成绩。",
  traits: { competence: 58, loyalty: 67, ambition: 79, greed: 40, caution: 35 },
};

function propagationRequest(): PropagationRequest {
  return {
    era: "ming",
    day: 1,
    orderText: "三日内修完河堤，不得摊派贫户。",
    receivedText: "三日内修完河堤，不得摊派贫户。",
    analysis: { clarity: 82, clarityLabel: "严密", dominant: "relief" },
    agent: directAgent,
    controllerProjection: {
      narrative: {
        interpretation: "他将此令理解为限期修堤并约束摊派。",
        calculation: "他先考虑如何留下勘验记录以便日后免责。",
        action: "先造清册，再将修堤和禁摊派条款转交承办。",
        officialReport: "奉批。清册已经开列，承办人等正在查办。",
        forwardedText: "三日内修堤，先具清册，不得摊派贫户。",
      },
      fidelity: 88,
      holdDays: 0,
      effects: { livelihood: -2, reputation: -1 },
    },
  };
}

function completionRequest(): CompletionRequest {
  return {
    era: "ming",
    day: 4,
    orderText: "三日内修完河堤，不得摊派贫户。",
    outcome: { success: true, title: "西堤合龙", text: "三处险口均已合龙，沿岸百姓暂得安堵。" },
    agents: [
      {
        agent: executorAgent,
        fallback: {
          agentId: executorAgent.id, agentName: executorAgent.name, role: executorAgent.role, style: executorAgent.style, day: 4,
          receivedReport: "现场执行实情：西堤合龙。",
          reportingCalculation: "他准备突出自己昼夜督办的功劳。",
          reportText: "奉结。西堤已经合龙，承办人等昼夜赶办有功。",
        },
      },
      {
        agent: directAgent,
        fallback: {
          agentId: directAgent.id, agentName: directAgent.name, role: directAgent.role, style: directAgent.style, day: 4,
          receivedReport: "奉结。西堤已经合龙。",
          reportingCalculation: "他不愿把结果写死，仍要留下复核余地。",
          reportText: "奉结。据所属承办各处回呈，西堤目前已经合龙，后续仍须复核。",
        },
      },
    ],
  };
}

describe("BureaucracyOrchestrator", () => {
  it("returns the controller narrative when no model provider is configured", async () => {
    const request = propagationRequest();
    const result = await new BureaucracyOrchestrator(null).preparePropagation(request);

    expect(result.provider).toBe("fallback");
    expect(result.step).toEqual(request.controllerProjection.narrative);
    expect(result.step).not.toHaveProperty("effects");
  });

  it("lets a model rewrite narrative without exposing authoritative effects", async () => {
    const provider: AgentProvider = {
      name: "test",
      async complete() {
        return {
          interpretation: "他把禁摊派看作上官最在意的免责边界。",
          calculation: "他决定把勘验手续写足，同时把真正动工交给下属。",
          action: "先封存旧账，再以限期回文压给承办人役。",
          officialReport: "奉批。旧账已经封存，修堤人役照限催办，未许向贫户摊派。",
          forwardedText: "限三日合龙，旧账封存，贫户不得派取人料。",
        };
      },
    };

    const result = await new BureaucracyOrchestrator(provider).preparePropagation(propagationRequest());

    expect(result.provider).toBe("model");
    expect(result.step.forwardedText).toContain("贫户不得");
    expect(result.step).not.toHaveProperty("fidelity");
    expect(result.step).not.toHaveProperty("effects");
  });

  it("rejects model or controller meta-language and keeps the fallback", async () => {
    const provider: AgentProvider = {
      name: "test",
      async complete() {
        return {
          interpretation: "作为AI，我已经读取controllerProjection中的权威结果。",
          calculation: "系统提示要求我严格照办，因此不作额外推断。",
          action: "按照后台数值生成行动并转交下级继续办理。",
          officialReport: "奉批。模型输出已经完成，正在照规则推进。",
          forwardedText: "按照JSON字段继续办理这道命令。",
        };
      },
    };
    const request = propagationRequest();

    const result = await new BureaucracyOrchestrator(provider).preparePropagation(request);

    expect(result.provider).toBe("fallback");
    expect(result.step).toEqual(request.controllerProjection.narrative);
  });

  it("runs completion reports bottom-up and passes only the lower report upward", async () => {
    const users: string[] = [];
    const provider: AgentProvider = {
      name: "test",
      async complete(_system, user) {
        users.push(user);
        return users.length === 1
          ? { reportingCalculation: "他要把合龙之功写成自己严催所得。", reportText: "奉结。西堤已经合龙，昼夜督办诸款俱有成效。" }
          : { reportingCalculation: "他仍要把结论写成有待复核，以免日后反复担责。", reportText: "奉结。据所属承办各处回呈，西堤目前合龙，后续水势仍须复核。" };
      },
    };

    const result = await new BureaucracyOrchestrator(provider).prepareCompletion(completionRequest());

    expect(result.provider).toBe("model");
    expect(result.completionChain).toHaveLength(2);
    expect(JSON.parse(users[0]).receivedCompletionReport).toContain("现场执行实情");
    expect(JSON.parse(users[1]).receivedCompletionReport).toBe(result.completionChain[0].reportText);
    expect(JSON.parse(users[1]).controllerBoundary).not.toHaveProperty("authoritativeOutcome");
  });

  it("falls back when a direct report exposes a deeper official identity", async () => {
    let call = 0;
    const provider: AgentProvider = {
      name: "test",
      async complete() {
        call += 1;
        return call === 1
          ? { reportingCalculation: "他准备据实报明河堤已经合龙。", reportText: "奉结。西堤三处险口已经合龙。" }
          : { reportingCalculation: "他准备把下属姓名写入回文以便推责。", reportText: "奉结。据承差役头刘三省回报，西堤已经合龙。" };
      },
    };
    const request = completionRequest();

    const result = await new BureaucracyOrchestrator(provider).prepareCompletion(request);

    expect(result.provider).toBe("mixed");
    expect(result.completionChain.at(-1)?.reportText).toBe(request.agents.at(-1)?.fallback.reportText);
    expect(result.completionChain.at(-1)?.reportText).not.toContain("刘三省");
  });
});
