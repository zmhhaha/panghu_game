import type { DialogueAction, DialogueMemory, DialogueTurnAction, WorldState } from "@qianfu/core";
import { DIALOGUE_TEXT_LIMITS } from "@qianfu/core/dialogue";
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
      npc.visibleSpeech = npc.visibleSpeech.slice(0, DIALOGUE_TEXT_LIMITS[action.goal]);
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
    const textLimit = DIALOGUE_TEXT_LIMITS[session.goal];
    if (action.playerText.length > textLimit) throw new Error(`“${session.goal}”每轮发言最多 ${textLimit} 个字符`);
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
      "你的首要任务是作为这个人生活在场景里，不是替系统完成对话目标。先理解玩家原话和言外之意，再从自己的经历、眼下烦恼和利害关系作答。",
      "回复必须紧接玩家刚说的话，体现情绪和关系变化；不要泛泛而谈，不要重复前几轮的句式或口头禅。",
      "像真实交谈一样，可以回答日常细节、停顿、误解、敷衍或改变主意；不要每轮都把话题转向工作，不要总让玩家先表态。口头禅最多偶尔使用一次。",
      "通常回复1到4句中文。关系不足时可以回避、反问、撒谎或转移话题，不要为了推进剧情主动泄露情报。",
      `visibleSpeech不得超过${DIALOGUE_TEXT_LIMITS[action.goal]}个字符；${action.goal === "small_talk" ? "寒暄只说简短自然的日常话，不展开长篇叙述。" : action.goal === "long_talk" ? "长谈可以完整表达观点，但仍要像当面交谈。" : "控制在两三句有针对性的话内。"}`,
      "只输出JSON对象：visibleSpeech是对玩家说的话；privateIntent是未说出口的一句真实意图；requestedEffects必须是数组，通常输出[]，需要建议状态变化时元素格式为{type,value,reason}。",
    ].join("\n");

    const user = JSON.stringify({
      scene,
      sceneBoundary: dialogueBoundary(action.goal),
      playerTone: action.tone,
      playerText: action.playerText,
      npcPersonality: personality,
      npcRoleplay: personality.roleplay ?? null,
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

function dialogueBoundary(goal: DialogueAction["goal"]): string {
  if (goal === "small_talk") return "这是轻度日常接触，不应突然谈出核心秘密。";
  if (goal === "long_talk") return "双方有较完整的交谈时间，但信任和信息边界仍由关系决定。";
  if (goal === "apply_pressure") return "玩家正在施压；根据性格表现抵触、恐惧、反击或有限让步。";
  if (goal === "recruit_probe") return "玩家在试探合作可能，不要直接知道对方的招募意图。";
  return "围绕玩家实际说出的内容交谈，不要假定玩家未说出口的目的。";
}
