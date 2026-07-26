import { createInitialWorld } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignOrchestrator } from "./orchestrator.js";
import { createAgentProvider, parseModelJson, parseNpcResponse, type AgentProvider } from "./provider.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CampaignOrchestrator", () => {
  it("keeps valid speech when optional model effects have the wrong shape", () => {
    expect(parseNpcResponse({
      visibleSpeech: "家里都好，劳你挂念。",
      privateIntent: "继续观察",
      requestedEffects: ["trust+1", "suspicion-1"],
    })).toEqual({
      visibleSpeech: "家里都好，劳你挂念。",
      privateIntent: "继续观察",
      requestedEffects: [],
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
    expect(prepared.agentOutcome?.provider).toBe("model");
  });
});
