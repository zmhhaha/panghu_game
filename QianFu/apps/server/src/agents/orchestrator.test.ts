import { createInitialWorld, evaluateRecruitmentTest, type CampaignDefinition, type ProposeCooperationRequestAction, type RecruitmentTestAction } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignOrchestrator } from "./orchestrator.js";
import { createAgentProvider, parseModelJson, parseNpcResponse, type AgentProvider } from "./provider.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CampaignOrchestrator", () => {
  const screeningPlan = {
    objective: "核对候选人的履历和纪律表现。",
    steps: "先核对公开档案。\n再从独立来源确认关键经历。\n最后观察是否遵守约定。",
    safeguards: "分段进行，不接触核心名单；每一步保留独立核对来源。",
    abortCondition: "消息异常扩散或出现无法解释的矛盾时立即停止并撤退。",
  };

  function screeningAction(): RecruitmentTestAction {
    return {
      type: "recruitment_test", targetCharacterId: "old-wu", testType: "background_check",
      plan: screeningPlan, durationMinutes: 60, idempotencyKey: "screening-agent-test",
    };
  }

  function cooperationAction(): ProposeCooperationRequestAction {
    return {
      type: "propose_cooperation_request", memberId: "old-wu", kind: "gather_intel", targetId: "shipment-time", approach: "urgent",
      terms: { purpose: "核对运输记录的来源和经手人", riskLimit: "low", exchange: "none", abortCondition: "发现跟踪或临时盘查时立即中止" },
      durationMinutes: 0, idempotencyKey: "cooperation-agent-test",
    };
  }

  it("keeps valid speech when optional model effects have the wrong shape", () => {
    expect(parseNpcResponse({
      visibleSpeech: "家里都好，劳你挂念。",
      privateIntent: "继续观察",
      requestedEffects: ["trust+1", "suspicion-1"],
    })).toEqual({
      visibleSpeech: "家里都好，劳你挂念。",
      privateIntent: "继续观察",
      requestedEffects: [],
      evidenceQuote: "",
    });
  });

  it("recovers speech from a slightly malformed model object without applying effects", () => {
    expect(parseModelJson(`{
      "visibleSpeech": "档案科管的是文件，不是来客。你问这个做什么？",
      "privateIntent": "继续观察",
      "requestedEffects": ["怀疑增加",]
    }`)).toEqual({
      visibleSpeech: "档案科管的是文件，不是来客。你问这个做什么？",
      privateIntent: "继续观察",
      requestedEffects: [],
      evidenceQuote: "",
    });
  });

  it("asks the provider to repair an unrecoverable response once", async () => {
    vi.stubEnv("PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://example.test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: "{broken" } }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"visibleSpeech":"档案科收存公文，你问这个做什么？","privateIntent":"观察来意","requestedEffects":[]}' } }] }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createAgentProvider()?.complete("system", "user");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ visibleSpeech: "档案科收存公文，你问这个做什么？", privateIntent: "观察来意", requestedEffects: [] });
  });

  it("gives an NPC its personality, relationship and recent private memory in one model call", async () => {
    const state = createInitialWorld(LINJIANG_1942, "game-test", "user-test", "story");
    const characterId = "old-wu";
    const sessionId = "dialogue-session-0001";
    state.activeDialogue = {
      id: sessionId,
      characterId,
      goal: "build_trust",
      tone: "friendly",
      targetIntelId: null,
      allocatedMinutes: 20,
      elapsedMinutes: 2,
      maxTurns: 10,
      turnCount: 1,
      status: "active",
      transcript: [],
    };
    state.dialogueMemories[characterId] = {
      characterId,
      summary: "玩家上次问过钟表是否走准。",
      lastPrivateIntent: "怀疑玩家在用钟表试探接头暗号。",
      lastGoal: "small_talk",
      interactionCount: 1,
      turns: [
        { speaker: "player", text: "这只表最近慢了么？", at: state.currentTime },
        { speaker: "npc", text: "慢的是表，还是等消息的人？", at: state.currentTime },
      ],
    };

    let callCount = 0;
    let capturedSystem = "";
    let capturedUser = "";
    const provider: AgentProvider = {
      name: "test",
      async complete(system, user) {
        callCount += 1;
        capturedSystem = system;
        capturedUser = user;
        return {
          visibleSpeech: "先说说你为什么突然关心这只表。",
          privateIntent: "继续观察玩家",
          requestedEffects: [],
        };
      },
    };
    const orchestrator = new CampaignOrchestrator(provider);

    const prepared = await orchestrator.prepareTurn(state, {
      type: "dialogue_turn",
      sessionId,
      playerText: "因为有人让我来取修好的怀表。",
      durationMinutes: 2,
      idempotencyKey: "dialogue-turn-0002",
    });

    expect(callCount).toBe(1);
    const user = JSON.parse(capturedUser);
    expect(capturedSystem).toContain("老吴");
    expect(user.npcPersonality.verbalHabits).toContain("钟总会走准");
    expect(user.memorySummary).toContain("钟表是否走准");
    expect(user.previousPrivateIntent).toContain("接头暗号");
    expect(user.recentDialogue).toHaveLength(2);
    expect(user.playerText).toBe("因为有人让我来取修好的怀表。");
    expect(user.npcRelationship).toBeTruthy();
    expect(user.immutableScene.playerPublicIdentity).toBe("机要处档案员");
    expect(user.immutableScene.npcPublicIdentity).toBe("钟表店老板");
    expect(user.permittedEvidence).toEqual([]);
    expect(capturedSystem).toContain("Never borrow another NPC's profession");
    expect(prepared.agentOutcome?.provider).toBe("model");
  });

  it("asks the NPC to answer again when semantic validation rejects a repeated line", async () => {
    const state = createInitialWorld(LINJIANG_1942, "retry-game", "retry-user", "story");
    const sessionId = "retry-session-0001";
    state.activeDialogue = {
      id: sessionId, characterId: "chen-jingwen", initiatedBy: "npc", goal: "build_trust", tone: "formal",
      targetIntelId: null, allocatedMinutes: 20, elapsedMinutes: 6, maxTurns: 10, turnCount: 3,
      status: "active", transcript: [],
    };
    state.dialogueMemories["chen-jingwen"].turns = [
      { speaker: "player", text: "我只是普通人。", at: state.currentTime },
      { speaker: "npc", text: "那就当我没说过。", at: state.currentTime },
    ];
    const users: string[] = [];
    const provider: AgentProvider = {
      name: "test",
      async complete(_system, user) {
        users.push(user);
        return users.length === 1
          ? { visibleSpeech: "那就当我没说过。", privateIntent: "继续观察", evidenceQuote: "", requestedEffects: [] }
          : { visibleSpeech: "我指的是把经手的事情说清楚，不是要你答应什么。", privateIntent: "收回试探", evidenceQuote: "", requestedEffects: [] };
      },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareTurn(state, {
      type: "dialogue_turn", sessionId, playerText: "我不明白你说的合作是什么意思。", durationMinutes: 2, idempotencyKey: "retry-turn-0001",
    });

    expect(users).toHaveLength(2);
    expect(JSON.parse(users[1]).correction.reason).toContain("repeated");
    expect(prepared.agentOutcome?.visibleSpeech).toContain("不是要你答应什么");
    expect(prepared.agentOutcome?.provider).toBe("model");
  });

  it("resolves NPC context from the state's campaign id and version", async () => {
    const customCampaign: CampaignDefinition = {
      ...LINJIANG_1942,
      id: "custom-campaign",
      version: "2.0.0",
      characters: [{
        id: "custom-contact", name: "许掌柜", publicIdentity: "药铺掌柜", hiddenAlignment: "neutral",
        initialLocationId: "archive-office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "看店" }],
        reliability: { loyalty: 50, discipline: 60, pressureResistance: 50, courage: 40, competence: 70 },
        personality: { traits: ["审慎"], speechStyle: "简短", values: ["生意"], fears: ["查封"], verbalHabits: ["药不能乱抓"], sensitiveTopics: [] },
      }],
      intel: [], objectives: [], publicLeads: [], narrativeEvents: [],
    };
    const state = createInitialWorld(customCampaign, "custom-game", "custom-user");
    state.activeDialogue = { id: "custom-session", characterId: "custom-contact", goal: "small_talk", tone: "neutral", targetIntelId: null, allocatedMinutes: 10, elapsedMinutes: 0, maxTurns: 5, turnCount: 0, status: "active", transcript: [] };
    let systemPrompt = "";
    const provider: AgentProvider = {
      name: "test",
      async complete(system) {
        systemPrompt = system;
        return { visibleSpeech: "药不能乱抓。您哪里不舒服？", privateIntent: "观察来客", evidenceQuote: "", requestedEffects: [] };
      },
    };
    const resolver = vi.fn(() => customCampaign);
    const prepared = await new CampaignOrchestrator(provider, resolver).prepareTurn(state, {
      type: "dialogue_turn", sessionId: "custom-session", playerText: "想买点止咳药。", durationMinutes: 2, idempotencyKey: "custom-turn-0001",
    });

    expect(resolver).toHaveBeenCalledWith("custom-campaign", "2.0.0");
    expect(systemPrompt).toContain("许掌柜");
    expect(systemPrompt).toContain("药铺掌柜");
    expect(systemPrompt).not.toContain("老吴");
    expect(prepared.agentOutcome?.provider).toBe("model");
  });

  it("gives the screening agent only the controller's authoritative result projection", async () => {
    const state = createInitialWorld(LINJIANG_1942, "screening-game", "screening-user", "undercover");
    const action = screeningAction();
    const character = LINJIANG_1942.characters.find((item) => item.id === action.targetCharacterId)!;
    const authoritativeResult = evaluateRecruitmentTest(character, action.testType, action.plan);
    let capturedUser = "";
    const provider: AgentProvider = {
      name: "test",
      async complete(_system, user) {
        capturedUser = user;
        return { result: authoritativeResult, observation: "约定时间过去五分钟后，他仍在原处等待，没有另找旁人传话。" };
      },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareRecruitmentTest(state, action);
    const payload = JSON.parse(capturedUser);

    expect(payload.controllerProjection.result).toBe(authoritativeResult);
    expect(payload.controllerProjection.baselineObservation).toBeTruthy();
    expect(prepared.agentObservation).toContain("没有另找旁人传话");
  });

  it("discards a screening observation that contradicts the controller", async () => {
    const state = createInitialWorld(LINJIANG_1942, "screening-conflict", "screening-user", "undercover");
    const action = screeningAction();
    const character = LINJIANG_1942.characters.find((item) => item.id === action.targetCharacterId)!;
    const authoritativeResult = evaluateRecruitmentTest(character, action.testType, action.plan);
    const conflictingResult = authoritativeResult === "warning" ? "favorable" : "warning";
    const provider: AgentProvider = {
      name: "test",
      async complete() { return { result: conflictingResult, observation: "记录与约定不一致。" }; },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareRecruitmentTest(state, action);

    expect(prepared.agentObservation).toBeUndefined();
  });

  it("discards a screening observation that exposes a hidden verdict", async () => {
    const state = createInitialWorld(LINJIANG_1942, "screening-verdict", "screening-user", "story");
    const action = screeningAction();
    const character = LINJIANG_1942.characters.find((item) => item.id === action.targetCharacterId)!;
    const authoritativeResult = evaluateRecruitmentTest(character, action.testType, action.plan);
    const provider: AgentProvider = {
      name: "test",
      async complete() { return { result: authoritativeResult, observation: "这些表现足以证明他是可靠的自己人。" }; },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareRecruitmentTest(state, action);

    expect(prepared.agentObservation).toBeUndefined();
  });

  it("lets the NPC phrase a controller-authorized cooperation counteroffer", async () => {
    const state = createInitialWorld(LINJIANG_1942, "cooperation-game", "cooperation-user", "undercover");
    state.characters["old-wu"].recruited = true;
    state.characters["old-wu"].recruitmentProgress = 100;
    state.network.activeMemberIds.push("old-wu");
    const provider: AgentProvider = {
      name: "test",
      async complete() { return { decision: "counter", message: "这事能办，但得照我的路线走；一见巡查，我马上收手。" }; },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareCooperationRequest(state, cooperationAction());

    expect(prepared.agentResponse).toMatchObject({ decision: "counter", proposedApproach: "cautious" });
    expect(prepared.agentResponse?.message).toContain("照我的路线走");
  });

  it("discards an NPC cooperation answer that contradicts the controller", async () => {
    const state = createInitialWorld(LINJIANG_1942, "cooperation-conflict", "cooperation-user", "undercover");
    state.characters["old-wu"].recruited = true;
    state.characters["old-wu"].recruitmentProgress = 100;
    state.network.activeMemberIds.push("old-wu");
    const provider: AgentProvider = {
      name: "test",
      async complete() { return { decision: "accept", message: "没问题，我现在就去。" }; },
    };

    const prepared = await new CampaignOrchestrator(provider).prepareCooperationRequest(state, cooperationAction());

    expect(prepared.agentResponse).toBeUndefined();
  });
});
