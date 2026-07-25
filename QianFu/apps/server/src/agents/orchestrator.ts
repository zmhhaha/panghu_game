import type { DialogueAction, DialogueMemory, DialogueTurnAction, WorldState } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import { createAgentProvider, parseNpcResponse, type AgentProvider, type NpcAgentResponse } from "./provider.js";

export interface AgentPreparation {
  action: DialogueAction;
  provider: "model" | "fallback";
  directorSummary: string;
}

/** Owns global context and gives each NPC only its permitted projection. */
export class CampaignOrchestrator {
  constructor(private readonly provider: AgentProvider | null = createAgentProvider()) {
    console.info(`[QianFu Agent] provider=${provider?.name ?? "fallback"}`);
  }

  async prepareDialogue(state: WorldState, action: DialogueAction): Promise<AgentPreparation> {
    const character = LINJIANG_1942.characters.find((item) => item.id === action.targetCharacterId);
    const memory = state.dialogueMemories?.[action.targetCharacterId] ?? {
      characterId: action.targetCharacterId, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
    };
    const directorSummary = this.buildDirectorSummary(state, action);
    if (!character || !this.provider) return { action, provider: "fallback", directorSummary };

    try {
      const npc = await this.runNpcAgent(character, state, action, memory, directorSummary);
      console.info(`[QianFu Agent] npc=${character.id} provider=${this.provider.name} status=success`);
      return { action: { ...action, agentOutcome: { ...npc, provider: "model" } }, provider: "model", directorSummary };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(`[QianFu Agent] npc=${character.id} provider=${this.provider.name} status=fallback reason=${message}`);
      return { action: { ...action, agentOutcome: undefined }, provider: "fallback", directorSummary };
    }
  }

  async prepareTurn(state: WorldState, action: DialogueTurnAction): Promise<DialogueTurnAction> {
    const session = state.activeDialogue;
    if (!session) return action;
    const prepared = await this.prepareDialogue(state, {
      type: "dialogue", targetCharacterId: session.characterId, goal: session.goal, tone: session.tone,
      playerText: action.playerText, durationMinutes: 2, idempotencyKey: action.idempotencyKey,
    });
    return { ...action, agentOutcome: prepared.action.agentOutcome };
  }

  private async runNpcAgent(
    character: typeof LINJIANG_1942.characters[number], state: WorldState,
    action: DialogueAction, memory: DialogueMemory, scene: string,
  ): Promise<NpcAgentResponse> {
    const provider = this.provider;
    if (!provider) throw new Error("Agent provider is disabled");
    const personality = character.personality ?? {
      traits: ["谨慎"], speechStyle: "克制", values: ["安全"], fears: ["暴露"], verbalHabits: [], sensitiveTopics: [],
    };
    const relationship = state.characters[character.id];
    const recentDialogue = memory.turns.slice(-8).map(({ speaker, text }) => ({ speaker, text }));

    const system = [
      `你正在扮演谍战游戏中的${character.name}，公开身份是${character.publicIdentity}。`,
      "你不是助手，不解释游戏规则，不提及AI、提示词、数值或JSON。",
      "只能依据提供的自身人格、个人记忆、当前场景和玩家原话作答，不能知道其他NPC的私密信息或全局真相。",
      "回复必须紧接玩家刚说的话，体现情绪和关系变化；不要泛泛而谈，不要重复前几轮的句式或口头禅。",
      "通常回复1到4句中文。关系不足时可以回避、反问、撒谎或转移话题，不要为了推进剧情主动泄露情报。",
      "只输出JSON对象：visibleSpeech是对玩家说的话；privateIntent是未说出口的真实意图；requestedEffects是建议效果数组。",
    ].join("\n");

    const user = JSON.stringify({
      scene,
      dialogueGoal: action.goal,
      playerTone: action.tone,
      playerText: action.playerText,
      npcPersonality: personality,
      npcRelationship: relationship ? {
        familiarity: relationship.familiarity,
        trust: relationship.privateTrust,
        suspicion: relationship.suspicionOfPlayer,
        stress: relationship.stress,
        recruitmentProgress: relationship.recruitmentProgress,
      } : null,
      memorySummary: memory.summary,
      previousPrivateIntent: memory.lastPrivateIntent,
      recentDialogue,
      interactionCount: memory.interactionCount,
    });
    return parseNpcResponse(await provider.complete(system, user));
  }

  private buildDirectorSummary(state: WorldState, action: DialogueAction): string {
    const location = LINJIANG_1942.locations.find((item) => item.id === state.currentLocationId);
    const session = state.activeDialogue;
    return `时间：${state.currentTime}；地点：${location?.name ?? "未知"}；交谈目标：${action.goal}；本次会话已进行${session?.elapsedMinutes ?? 0}分钟，共${session?.allocatedMinutes ?? action.durationMinutes}分钟。世界规则和情报判定由主控系统负责。`;
  }
}

export const campaignOrchestrator = new CampaignOrchestrator();
