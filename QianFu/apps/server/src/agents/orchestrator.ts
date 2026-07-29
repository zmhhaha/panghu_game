import { evaluateCooperationRequest, evaluateRecruitmentTest, getCoverProfile, isIntelUnlocked, recruitmentEvidenceSummary, type CampaignDefinition, type DialogueAction, type DialogueMemory, type DialogueTurnAction, type ProposeCooperationRequestAction, type RecruitmentTestAction, type WorldState } from "@qianfu/core";
import { DIALOGUE_TEXT_LIMITS } from "@qianfu/core/dialogue";
import { getCampaignDefinition } from "@qianfu/content";
import { createAgentProvider, parseModelJson, parseNpcResponse, type AgentProvider, type NpcAgentResponse } from "./provider.js";
import { z } from "zod";

export interface AgentPreparation {
  action: DialogueAction;
  provider: "model" | "fallback";
  directorSummary: string;
}

/** Owns global context and gives each NPC only its permitted projection. */
export class CampaignOrchestrator {
  constructor(
    private readonly provider: AgentProvider | null = createAgentProvider(),
    private readonly resolveCampaign: (id: string, version: string) => CampaignDefinition = getCampaignDefinition,
  ) {
    console.info(`[QianFu Agent] provider=${provider?.name ?? "fallback"}`);
  }

  async prepareDialogue(state: WorldState, action: DialogueAction): Promise<AgentPreparation> {
    const campaign = this.resolveCampaign(state.campaignId, state.campaignVersion);
    const character = campaign.characters.find((item) => item.id === action.targetCharacterId);
    const memory = state.dialogueMemories?.[action.targetCharacterId] ?? {
      characterId: action.targetCharacterId, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
    };
    const directorSummary = this.buildDirectorSummary(campaign, state, action);
    if (!character || !this.provider) return { action, provider: "fallback", directorSummary };

    try {
      const npc = await this.runNpcAgent(campaign, character, state, action, memory, directorSummary);
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
      targetIntelId: session.targetIntelId ?? undefined,
      playerText: action.playerText, durationMinutes: 2, idempotencyKey: action.idempotencyKey,
    });
    return { ...action, agentOutcome: prepared.action.agentOutcome };
  }

  async prepareRecruitmentTest(state: WorldState, action: RecruitmentTestAction): Promise<RecruitmentTestAction> {
    const campaign = this.resolveCampaign(state.campaignId, state.campaignVersion);
    const character = campaign.characters.find((item) => item.id === action.targetCharacterId);
    if (!character || !this.provider) return action;
    const authoritativeResult = evaluateRecruitmentTest(character, action.testType, action.plan);
    const authoritativeSummary = recruitmentEvidenceSummary(action.testType, authoritativeResult);
    try {
      const system = 'You are the screening-action narrator for a spy game. The controller projection is authoritative. Add one concrete, externally observable detail that supports it without changing its result. Never reveal hidden alignment, true reliability, backend values, or call anyone reliable, unreliable, loyal, a traitor, a spy, an agent, or a comrade. Output JSON only: {"result":"favorable|warning|inconclusive","observation":"an observation under 240 Chinese characters"}.';
      const user = JSON.stringify({
        testType: action.testType,
        candidate: { name: character.name, publicIdentity: character.publicIdentity, personality: character.personality },
        plan: action.plan,
        time: state.currentTime,
        controllerProjection: { result: authoritativeResult, baselineObservation: authoritativeSummary },
      });
      const raw = await this.provider.complete(system, user);
      const value = z.object({
        result: z.enum(["favorable", "warning", "inconclusive"]),
        observation: z.string().min(1).max(240),
      }).parse(typeof raw === "string" ? parseModelJson(raw) : raw);
      if (value.result !== authoritativeResult) throw new Error("screening observation contradicted controller result");
      if (/(?:不可靠|可靠|忠诚|背叛者|叛徒|内奸|特务|间谍|自己人|同志)/.test(value.observation)) {
        throw new Error("screening observation exposed a hidden verdict");
      }
      return { ...action, agentObservation: value.observation };
    } catch (error) {
      console.warn(`[QianFu Agent] recruitment target=${action.targetCharacterId} provider=${this.provider.name} status=fallback`, error instanceof Error ? error.message : error);
      return action;
    }
  }

  async prepareCooperationRequest(state: WorldState, action: ProposeCooperationRequestAction): Promise<ProposeCooperationRequestAction> {
    const campaign = this.resolveCampaign(state.campaignId, state.campaignVersion);
    const character = campaign.characters.find((item) => item.id === action.memberId);
    const relationship = state.characters[action.memberId];
    if (!character || !relationship?.recruited || !state.network.activeMemberIds.includes(action.memberId)) return action;
    const target = action.kind === "scout_location"
      ? campaign.locations.find((item) => item.id === action.targetId)?.name
      : campaign.intel.find((item) => item.id === action.targetId)?.title;
    const authoritative = evaluateCooperationRequest(character, relationship, action);
    if (!this.provider) return action;
    try {
      const system = [
        `你正在扮演谍战游戏中的${character.name}，公开身份是${character.publicIdentity}。`,
        "玩家正在向你提出一次有限合作请求。你不是听命工具，要像真实人物一样回应风险、交换条件和退出边界。",
        "主控给出的decision和条件调整是权威结果，不得更改。只写你当面对玩家说的话，不解释数值、规则、AI或隐藏立场。",
        "回复应为一到四句自然中文，不超过240字；可以迟疑、反问或强调个人顾虑，但不能凭空添加情报或承诺未给出的资源。",
        '只输出JSON：{"decision":"accept|counter|refuse","message":"角色化回应"}。',
      ].join("\n");
      const raw = await this.provider.complete(system, JSON.stringify({
        request: { kind: action.kind, target: target ?? "未确认目标", approach: action.approach, terms: action.terms },
        npc: { publicIdentity: character.publicIdentity, personality: character.personality ?? null },
        npcCurrentView: { trust: relationship.privateTrust, stress: relationship.stress, interestDependency: relationship.interestDependency },
        controllerProjection: authoritative,
      }));
      const generated = z.object({ decision: z.enum(["accept", "counter", "refuse"]), message: z.string().trim().min(1).max(240) })
        .parse(typeof raw === "string" ? parseModelJson(raw) : raw);
      if (generated.decision !== authoritative.decision) throw new Error("cooperation response contradicted controller decision");
      if (/(?:忠诚度|可靠性|后台数值|成功率|系统判定|隐藏阵营)/.test(generated.message)) throw new Error("cooperation response exposed hidden state");
      return { ...action, agentResponse: { ...authoritative, message: generated.message } };
    } catch (error) {
      console.warn(`[QianFu Agent] cooperation member=${action.memberId} provider=${this.provider.name} status=fallback`, error instanceof Error ? error.message : error);
      return action;
    }
  }

  private async runNpcAgent(
    campaign: CampaignDefinition, character: CampaignDefinition["characters"][number], state: WorldState,
    action: DialogueAction, memory: DialogueMemory, scene: string,
  ): Promise<NpcAgentResponse> {
    const provider = this.provider;
    if (!provider) throw new Error("Agent provider is disabled");
    const personality = character.personality ?? {
      traits: ["谨慎"], speechStyle: "克制", values: ["安全"], fears: ["暴露"], verbalHabits: [], sensitiveTopics: [],
    };
    const relationship = state.characters[character.id];
    const recentDialogue = memory.turns.slice(-8).map(({ speaker, text }) => ({ speaker, text }));
    const cover = getCoverProfile(state.cover.profileId);
    const localTime = formatLocalSceneTime(state.currentTime);
    const permittedEvidence = this.buildPermittedEvidence(campaign, state, character.id, action);

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
      `Immutable scene facts: local time is ${localTime}; the player's public identity is ${cover.title}; the NPC is ${character.publicIdentity}. Never contradict these facts.`,
      "Never borrow another NPC's profession, verbal habits, memories, or concerns. A dock worker must not speak as an editor; an editor must not speak as a merchant or technician.",
      "Only claim a concrete intelligence fact when it appears in permittedEvidence. If a fact is spoken, evidenceQuote must be an exact non-empty substring copied from visibleSpeech. Otherwise evidenceQuote must be an empty string.",
      "Output JSON fields: visibleSpeech, privateIntent, evidenceQuote, requestedEffects.",
    ].join("\n");

    const userPayload = {
      scene,
      sceneBoundary: dialogueBoundary(action.goal),
      immutableScene: { localTime, playerPublicIdentity: cover.title, npcPublicIdentity: character.publicIdentity },
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
      permittedEvidence,
    };
    let response = parseNpcResponse(await provider.complete(system, JSON.stringify(userPayload)));
    const previousNpc = memory.turns.filter((turn) => turn.speaker === "npc").at(-1)?.text?.trim();
    try {
      validateNpcResponse(response, previousNpc, action.playerText, permittedEvidence, character.id, localTime);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "NPC response failed validation";
      console.warn(`[QianFu Agent] npc=${character.id} provider=${provider.name} status=retry reason=${reason}`);
      response = parseNpcResponse(await provider.complete(system, JSON.stringify({
        ...userPayload,
        correction: {
          rejectedVisibleSpeech: response.visibleSpeech,
          reason,
          instruction: "重新扮演并回答玩家最后一句。换一种内容和句式，不复述被拒绝的回复或近期台词；permittedEvidence为空时不得声称具体情报，evidenceQuote必须为空。只输出规定JSON。",
        },
      })));
      validateNpcResponse(response, previousNpc, action.playerText, permittedEvidence, character.id, localTime);
    }
    return response;
  }

  private buildPermittedEvidence(campaign: CampaignDefinition, state: WorldState, characterId: string, action: DialogueAction) {
    if (action.goal !== "request_information" && action.goal !== "verify_intel") return [];
    const session = state.activeDialogue;
    if (session?.status === "active" && session.characterId === characterId) {
      const earnedSlots = session.turnCount < 2 ? 0 : Math.floor((session.turnCount - 2) / 5) + 1;
      if ((session.discoveredFields?.length ?? 0) >= earnedSlots) return [];
    }
    const relationship = state.characters[characterId];
    if (!relationship) return [];
    const definitions = action.goal === "verify_intel"
      ? campaign.intel.filter((item) => item.id === action.targetIntelId)
      : campaign.intel;
    for (const definition of definitions) {
      if (!isIntelUnlocked(campaign, state, definition.id)) continue;
      if (!definition.sourceCharacterIds.includes(characterId)) continue;
      const requirement = definition.sourceRequirements?.[characterId];
      if (requirement && (relationship.familiarity < requirement.familiarity || relationship.privateTrust < requirement.privateTrust)) continue;
      const intel = state.intel[definition.id];
      if (!intel) continue;
      const field = action.goal === "verify_intel"
        ? intel.knownFields.find((candidate) => !intel.evidence.some((item) => item.field === candidate && item.sourceId === characterId))
        : definition.requiredFields.find((candidate) => !intel.knownFields.includes(candidate));
      if (!field) continue;
      const value = definition.fieldValues?.[field];
      if (!value) continue;
      return [{
        intelId: definition.id,
        intelTitle: definition.title,
        field,
        fieldLabel: definition.fieldLabels?.[field] ?? field,
        value,
      }];
    }
    return [];
  }

  private buildDirectorSummary(campaign: CampaignDefinition, state: WorldState, action: DialogueAction): string {
    const location = campaign.locations.find((item) => item.id === state.currentLocationId);
    const targetIntel = action.targetIntelId ? campaign.intel.find((item) => item.id === action.targetIntelId) : null;
    const session = state.activeDialogue;
    const target = targetIntel ? `；核验对象：${targetIntel.title}（玩家已知字段：${state.intel[targetIntel.id]?.knownFields.map((field) => targetIntel.fieldLabels?.[field] ?? field).join("、") || "无"}）` : "";
    return `时间：${state.currentTime}；地点：${location?.name ?? "未知"}；交谈目标：${action.goal}${target}；本次会话已进行${session?.elapsedMinutes ?? 0}分钟，共${session?.allocatedMinutes ?? action.durationMinutes}分钟。世界规则和情报判定由主控系统负责。`;
  }
}

function validateNpcResponse(
  response: NpcAgentResponse,
  previousNpc: string | undefined,
  playerText: string,
  permittedEvidence: Array<{ value: string }>,
  characterId: string,
  localTime: string,
) {
  if (previousNpc && response.visibleSpeech.trim() === previousNpc) throw new Error("NPC response repeated the previous turn");
  if (response.visibleSpeech.trim() === playerText.trim()) throw new Error("NPC response echoed the player");
  if (response.evidenceQuote && !response.visibleSpeech.includes(response.evidenceQuote)) throw new Error("NPC evidence quote is not visible to the player");
  if (response.evidenceQuote && !permittedEvidence.some((evidence) => response.evidenceQuote.includes(evidence.value))) {
    throw new Error("NPC evidence quote did not contain an authorized fact");
  }
  validateSceneConsistency(characterId, response.visibleSpeech, playerText, localTime);
}

function formatLocalSceneTime(currentTime: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(currentTime));
}

function validateSceneConsistency(characterId: string, speech: string, playerText: string, localTime: string) {
  const hour = Number(localTime.match(/(\d{2}):/)?.[1] ?? 12);
  if (hour >= 7 && hour < 18 && /大半夜|深更半夜|这么晚|夜里还/.test(speech) && !/昨夜|昨晚|半夜|夜里/.test(playerText)) {
    throw new Error("NPC contradicted the current time of day");
  }
  const roleLeakage: Record<string, RegExp> = {
    "zhao-fusheng": /稿费|交稿|写进晚报|报社截稿|这篇稿子/,
    "zhou-qiming": /稿费|商号掌柜|写进晚报/,
    "chen-jingwen": /稿费|商号掌柜|码头调度/,
    "lin-ruolan": /入库调度|机房维修|哪家商号的掌柜/,
  };
  if (roleLeakage[characterId]?.test(speech)) throw new Error("NPC response leaked another role's persona");
}

export const campaignOrchestrator = new CampaignOrchestrator();

function dialogueBoundary(goal: DialogueAction["goal"]): string {
  if (goal === "small_talk") return "这是轻度日常接触，不应突然谈出核心秘密。";
  if (goal === "long_talk") return "双方有较完整的交谈时间，但信任和信息边界仍由关系决定。";
  if (goal === "apply_pressure") return "玩家正在施压；根据性格表现抵触、恐惧、反击或有限让步。";
  if (goal === "recruit_probe") return "玩家在试探合作可能，不要直接知道对方的招募意图。";
  return "围绕玩家实际说出的内容交谈，不要假定玩家未说出口的目的。";
}
