import { randomUUID } from "node:crypto";
import { DIALOGUE_TEXT_LIMITS } from "./dialogue.js";
import type {
  ActionResult, CampaignDefinition, CampaignEnding, CharacterState, GameAction,
  GameEvent, IntelState, ScoreBreakdown, WorldState,
} from "./types.js";
import { DIFFICULTIES } from "./difficulties.js";

const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function createInitialWorld(
  campaign: CampaignDefinition,
  gameInstanceId: string,
  ownerUserId: string,
  difficultyId: keyof typeof DIFFICULTIES = "undercover",
): WorldState {
  const characters = Object.fromEntries(campaign.characters.map((character): [string, CharacterState] => [
    character.id,
    {
      id: character.id,
      templateId: character.id,
      locationId: character.initialLocationId,
      stress: 0,
      suspicionOfPlayer: 0,
      familiarity: 0,
      privateTrust: 0,
      interestDependency: 0,
      politicalAffinity: 0,
      recruited: false,
      recruitmentProgress: 0,
      exposed: false,
      agentTier: "background",
    },
  ]));
  const dialogueMemories = Object.fromEntries(campaign.characters.map((character) => [character.id, {
    characterId: character.id, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
  }]));

  const intel = Object.fromEntries(campaign.intel.map((item): [string, IntelState] => [
    item.id,
    { id: item.id, knownFields: [], confidence: 0, collectedSourceIds: [], deliveredAt: null, deliveryMethod: null },
  ]));

  return {
    gameInstanceId,
    ownerUserId,
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    engineVersion: campaign.engineVersion,
    difficulty: DIFFICULTIES[difficultyId],
    currentTime: campaign.startTime,
    currentLocationId: campaign.locations[0]?.id ?? "",
    discoveredLocationIds: campaign.locations.slice(0, 3).map((location) => location.id),
    knownCharacterIds: [],
    status: "active",
    stateVersion: 0,
    lastEventSeq: 0,
    playerEnergy: 100,
    playerStress: 0,
    personalSuspicion: 0,
    characters,
    dialogueMemories,
    activeDialogue: null,
    intel,
    network: { exposure: 0, activeMemberIds: [], compromisedMemberIds: [], availableChannels: ["radio", "courier"] },
    ending: null,
    closedAt: null,
  };
}

export class CampaignEngine {
  private state: WorldState;
  private readonly campaign: CampaignDefinition;
  private readonly usedIdempotencyKeys = new Set<string>();

  constructor(campaign: CampaignDefinition, initialState: WorldState) {
    if (campaign.id !== initialState.campaignId || campaign.version !== initialState.campaignVersion) {
      throw new Error("Campaign version does not match world state");
    }
    this.campaign = campaign;
    this.state = structuredClone(initialState);
    this.state.dialogueMemories ??= Object.fromEntries(campaign.characters.map((character) => [character.id, {
      characterId: character.id, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
    }]));
    this.state.activeDialogue ??= null;
    this.state.discoveredLocationIds ??= campaign.locations.slice(0, 3).map((location) => location.id);
    this.state.knownCharacterIds ??= [];
    for (const character of campaign.characters) {
      this.state.dialogueMemories[character.id] ??= {
        characterId: character.id, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
      };
      this.state.dialogueMemories[character.id].lastPrivateIntent ??= null;
    }
  }

  getState(): WorldState {
    return structuredClone(this.state);
  }

  execute(action: GameAction): ActionResult {
    if (this.state.status !== "active") throw new Error("Campaign is not active");
    if (this.usedIdempotencyKeys.has(action.idempotencyKey)) {
      return { state: this.getState(), events: [], narration: "该行动已经处理。", duplicate: true };
    }
    if (!Number.isInteger(action.durationMinutes) || action.durationMinutes < 0 || (action.type === "dialogue_turn" ? action.durationMinutes !== 2 : action.durationMinutes % 10 !== 0)) {
      throw new Error("Action duration must be a non-negative multiple of 10 minutes");
    }

    const next = structuredClone(this.state);
    const events: GameEvent[] = [];
    const append = (type: string, payload: unknown) => {
      next.lastEventSeq += 1;
      events.push({
        id: randomUUID(), gameInstanceId: next.gameInstanceId, eventSeq: next.lastEventSeq,
        idempotencyKey: action.idempotencyKey, type, occurredAt: next.currentTime, payload,
      });
    };

    let narration = "";
    let npcReply: string | undefined;
    let elapsedDuration = action.durationMinutes;
    switch (action.type) {
      case "dialogue_start": {
        const target = next.characters[action.targetCharacterId];
        if (!target || target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        if (next.activeDialogue?.status === "active") throw new Error("Another dialogue is already active");
        if (!next.knownCharacterIds.includes(action.targetCharacterId)) {
          next.knownCharacterIds.push(action.targetCharacterId);
          append("character.introduced", { characterId: action.targetCharacterId });
        }
        const minTurns = action.allocatedMinutes / 2;
        next.activeDialogue = { id: action.idempotencyKey, characterId: action.targetCharacterId, goal: action.goal, tone: action.tone, allocatedMinutes: action.allocatedMinutes, elapsedMinutes: 0, maxTurns: minTurns, turnCount: 0, status: "active", transcript: [] };
        append("dialogue.started", { characterId: action.targetCharacterId, goal: action.goal, allocatedMinutes: action.allocatedMinutes, maxTurns: minTurns });
        narration = "你坐下来，开始观察对方的反应。";
        break;
      }
      case "dialogue_turn": {
        const session = next.activeDialogue;
        if (!session || session.status !== "active" || session.id !== action.sessionId) throw new Error("Dialogue session is not active");
        if (action.durationMinutes !== 2) throw new Error("Each dialogue turn costs 2 minutes");
        const textLimit = DIALOGUE_TEXT_LIMITS[session.goal];
        if (action.playerText.trim().length === 0) throw new Error("对话内容不能为空");
        if (action.playerText.length > textLimit) throw new Error(`“${session.goal}”每轮发言最多 ${textLimit} 个字符`);
        const definition = this.campaign.characters.find((item) => item.id === session.characterId);
        if (!definition) throw new Error("Unknown character");
        const legacyAction = { type: "dialogue" as const, targetCharacterId: session.characterId, goal: session.goal, tone: session.tone, playerText: action.playerText, durationMinutes: 10, idempotencyKey: action.idempotencyKey };
        const discovery = resolveDialogue(this.campaign, next, definition, legacyAction);
        const memory = next.dialogueMemories[definition.id];
        if (!memory) throw new Error("Dialogue memory is unavailable");
        memory.turns.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime });
        npcReply = action.agentOutcome?.visibleSpeech ?? generateNpcReply(definition, next, legacyAction, memory, discovery !== null);
        memory.turns.push({ speaker: "npc", text: npcReply, at: next.currentTime });
        if (action.agentOutcome?.privateIntent) memory.lastPrivateIntent = action.agentOutcome.privateIntent;
        memory.turns = memory.turns.slice(-8); memory.interactionCount += 1; memory.lastGoal = session.goal; memory.summary = summarizeMemory(memory, definition);
        session.transcript.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime }, { speaker: "npc", text: npcReply, at: next.currentTime });
        session.elapsedMinutes += 2; session.turnCount += 1;
        if (session.turnCount >= session.maxTurns) session.status = "completed";
        append("dialogue.turn_completed", {
          characterId: definition.id, goal: session.goal, playerText: action.playerText, npcReply,
          turnCount: session.turnCount, maxTurns: session.maxTurns,
          privateIntent: action.agentOutcome?.privateIntent,
          requestedEffects: action.agentOutcome?.requestedEffects ?? [],
        });
        if (discovery) {
          append("intel.dialogue_discovered", { characterId: definition.id, ...discovery });
          unlockNextLocation(this.campaign, next, append);
        }
        narration = npcReply;
        break;
      }
      case "dialogue_end": {
        if (!next.activeDialogue || next.activeDialogue.id !== action.sessionId) throw new Error("Dialogue session is not active");
        const endedSession = next.activeDialogue;
        elapsedDuration = Math.max(0, endedSession.allocatedMinutes - endedSession.elapsedMinutes);
        append("dialogue.ended", { characterId: endedSession.characterId, turnCount: endedSession.turnCount });
        next.activeDialogue = null;
        narration = "你结束了这次交谈，重新回到街上的时间线。";
        break;
      }
      case "move": {
        const origin = this.campaign.locations.find((item) => item.id === next.currentLocationId);
        if (!next.discoveredLocationIds.includes(action.destinationId)) throw new Error("Destination has not been discovered");
        if (!origin?.travelMinutes[action.destinationId]) throw new Error("Destination is not reachable from current location");
        if (action.durationMinutes !== origin.travelMinutes[action.destinationId]) throw new Error("Move duration does not match campaign travel time");
        append("player.moved", { from: next.currentLocationId, to: action.destinationId });
        next.currentLocationId = action.destinationId;
        narration = `你抵达了${this.campaign.locations.find((item) => item.id === action.destinationId)?.name ?? action.destinationId}。`;
        break;
      }
      case "observe": {
        const target = next.characters[action.targetCharacterId];
        if (!target) throw new Error("Unknown character");
        if (target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        target.familiarity = clamp(target.familiarity + 2);
        if (!next.knownCharacterIds.includes(target.id)) {
          next.knownCharacterIds.push(target.id);
          append("character.identified", { characterId: target.id });
        }
        next.personalSuspicion = clamp(next.personalSuspicion + 1 * next.difficulty.enemyResponseSpeed);
        append("character.observed", { characterId: target.id });
        narration = "你记下了目标的行动规律，但长时间停留也可能引人注意。";
        break;
      }
      case "record_intel": {
        const intel = next.intel[action.intelId];
        const definition = this.campaign.intel.find((item) => item.id === action.intelId);
        if (!intel || !definition) throw new Error("Unknown intelligence item");
        intel.knownFields = [...new Set([...intel.knownFields, ...action.fields.filter((field) => definition.requiredFields.includes(field))])];
        intel.confidence = clamp(intel.confidence + action.confidenceDelta, 0, 1);
        append("intel.recorded", { intelId: action.intelId, fields: action.fields });
        narration = "新的情报碎片已经记录，仍需核验来源。";
        break;
      }
      case "transmit_intel": {
        const intel = next.intel[action.intelId];
        if (!intel) throw new Error("Unknown intelligence item");
        if (!next.network.availableChannels.includes(action.method)) throw new Error("Delivery channel is unavailable");
        if (intel.knownFields.length === 0) throw new Error("Cannot transmit intelligence with no known fields");
        if (intel.deliveredAt) throw new Error("Intelligence has already been transmitted");
        intel.deliveredAt = addMinutes(next.currentTime, action.durationMinutes);
        intel.deliveryMethod = action.method;
        next.network.exposure = clamp(next.network.exposure + (action.method === "radio" ? 4 : 2) * next.difficulty.enemyResponseSpeed);
        next.personalSuspicion = clamp(next.personalSuspicion + (action.method === "radio" ? 2 : 1) * next.difficulty.enemyResponseSpeed);
        append("intel.transmitted", { intelId: action.intelId, method: action.method });
        narration = "情报已经送出，最终价值将在组织确认后结算。";
        break;
      }
      case "dialogue": {
        const target = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!target || !definition) throw new Error("Unknown character");
        if (target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        const textLimit = DIALOGUE_TEXT_LIMITS[action.goal];
        if (action.playerText.trim().length === 0) throw new Error("对话内容不能为空");
        if (action.playerText.length > textLimit) throw new Error(`“${action.goal}”每轮发言最多 ${textLimit} 个字符`);
        const minimumDialogueDuration = action.goal === "small_talk" ? 10 : action.goal === "build_trust" || action.goal === "probe_attitude" || action.goal === "verify_intel" ? 20 : 30;
        if (action.durationMinutes < minimumDialogueDuration) throw new Error("Dialogue duration is too short for this goal");
        const discovery = resolveDialogue(this.campaign, next, definition, action);
        const memory = next.dialogueMemories[definition.id];
        if (memory) {
          memory.turns.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime });
          npcReply = action.agentOutcome?.visibleSpeech ?? generateNpcReply(definition, next, action, memory, discovery !== null);
          memory.turns.push({ speaker: "npc", text: npcReply, at: next.currentTime });
          if (action.agentOutcome?.privateIntent) memory.lastPrivateIntent = action.agentOutcome.privateIntent;
          memory.turns = memory.turns.slice(-8);
          memory.interactionCount += 1;
          memory.lastGoal = action.goal;
          memory.summary = summarizeMemory(memory, definition);
        }
        append("dialogue.completed", {
          characterId: action.targetCharacterId,
          goal: action.goal,
          tone: action.tone,
          playerText: action.playerText,
          npcReply,
          memorySummary: memory?.summary,
          agentProvider: action.agentOutcome?.provider ?? "fallback",
          privateIntent: action.agentOutcome?.privateIntent,
          requestedEffects: action.agentOutcome?.requestedEffects ?? [],
        });
        if (discovery) {
          append("intel.dialogue_discovered", { characterId: definition.id, ...discovery });
          unlockNextLocation(this.campaign, next, append);
        }
        if (action.goal === "recruit_probe") append("character.recruitment_progress", { characterId: definition.id, progress: next.characters[definition.id].recruitmentProgress, recruited: next.characters[definition.id].recruited });
        narration = dialogueNarration(next, definition, action, discovery !== null);
        break;
      }
      case "wait":
        append("player.waited", { durationMinutes: action.durationMinutes });
        narration = "时间继续向前，城市中的其他人也在行动。";
        break;
    }

    const previousTime = next.currentTime;
    next.currentTime = addMinutes(next.currentTime, elapsedDuration);
    // Dialogue turns use two-minute slices, but world events are resolved only
    // when the clock crosses a ten-minute boundary.
    if (Math.floor(new Date(previousTime).getTime() / 600_000) !== Math.floor(new Date(next.currentTime).getTime() / 600_000)) {
      advanceSchedules(this.campaign, next, append);
    }
    next.playerEnergy = clamp(next.playerEnergy - Math.ceil(elapsedDuration / 30));
    next.stateVersion += 1;
    this.state = next;
    this.usedIdempotencyKeys.add(action.idempotencyKey);

    const ending = evaluateEnding(this.campaign, this.state);
    if (ending) {
      this.state.ending = ending;
      this.state.status = "finished";
      this.state.closedAt = this.state.currentTime;
      this.state.stateVersion += 1;
    }

    return { state: this.getState(), events, narration, duplicate: false, npcReply };
  }
}

function generateNpcReply(
  definition: CampaignDefinition["characters"][number],
  state: WorldState,
  action: Extract<GameAction, { type: "dialogue" }>,
  memory: NonNullable<WorldState["dialogueMemories"][string]>,
  discovered: boolean,
): string {
  const personality = definition.personality ?? { traits: [], speechStyle: "克制", values: [], fears: [], verbalHabits: ["嗯"], sensitiveTopics: [] };
  const habits = personality.verbalHabits;
  const habit = habits[memory.interactionCount % Math.max(1, habits.length)] ?? "嗯";
  const playerText = action.playerText.trim();
  const familiarity = state.characters[definition.id]?.familiarity ?? 0;
  if (action.goal === "small_talk") {
    if (/重复|又是这句|兜圈子|敷衍/.test(playerText)) {
      return `你觉得我在兜圈子？刚认识就把话说满，反倒不像正常人。`;
    }
    if (/天气|晴|下雨|冷|热|风/.test(playerText)) {
      return `天气确实不错。不过做${definition.publicIdentity}的，天晴天阴都闲不下来。你今天怎么有空过来？`;
    }
    if (/等什么|什么消息|谁的消息/.test(playerText)) {
      return familiarity < 8
        ? `你问得倒细。我们才说过几句话，你怎么会觉得我在等消息？`
        : `无非是工作上的回音。倒是你，似乎比我更在意这件事。`;
    }
    if (/聊什么|说什么|话题/.test(playerText)) {
      const value = personality.values[0] ?? "近来的见闻";
      return `随便聊聊${value}也好。或者你直说，今天特意来找我是为了什么？`;
    }
    const smallTalk = [
      `听起来你今天心情不错。做${definition.publicIdentity}久了，我倒很少留意这些。`,
      `这话听着轻松。只是最近人人都忙，说闲话也会留三分。`,
      `${habit}，你说得有意思。接着说，我听听你的看法。`,
      `比起街上的传闻，我更愿意听你亲眼见到的事。`,
    ];
    return smallTalk[memory.interactionCount % smallTalk.length];
  }
  if (action.goal === "apply_pressure") return `${habit}。你问得太直接了，我们最好换个话题。`;
  if (discovered) return `${habit}，这件事我可以透露一点，细节等确认后再说。`;
  if (action.goal === "recruit_probe") return `${habit}，信任不是一句话能换来的，先从一件小事开始吧。`;
  if (action.goal === "build_trust") return `${habit}，你的态度比上次稳重。只要守口如瓶，合作并非没有可能。`;
  if (action.goal === "probe_attitude") return `${habit}，立场很危险。我只关心身边人的安全和事情能否做好。`;
  if (action.goal === "verify_intel") return `${habit}，方向大致没错，但还缺一个能核对的细节。`;
  return `${habit}，我听见了。关于这件事，我现在只能说到这里。`;
}

function summarizeMemory(memory: NonNullable<WorldState["dialogueMemories"][string]>, definition: CampaignDefinition["characters"][number]): string {
  const personality = definition.personality ?? { speechStyle: "克制" };
  const latest = memory.turns.filter((turn) => turn.speaker === "player").at(-1)?.text ?? "";
  return `${definition.name}已与玩家交谈${memory.interactionCount}次；最近话题是“${latest.slice(0, 40)}”，保持${personality.speechStyle}的说话方式。`;
}

function unlockNextLocation(campaign: CampaignDefinition, state: WorldState, append: (type: string, payload: unknown) => void) {
  const nextLocation = campaign.locations.find((location) => !state.discoveredLocationIds.includes(location.id));
  if (!nextLocation) return;
  state.discoveredLocationIds.push(nextLocation.id);
  append("location.discovered", { locationId: nextLocation.id });
}

function minuteOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function advanceSchedules(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
) {
  const minute = minuteOfDay(state.currentTime);
  for (const definition of campaign.characters) {
    const character = state.characters[definition.id];
    const schedule = definition.schedule.find((entry) => minute >= entry.startMinute && minute < entry.endMinute);
    if (!character || !schedule || character.locationId === schedule.locationId) continue;
    const from = character.locationId;
    character.locationId = schedule.locationId;
    append("character.schedule_advanced", { characterId: definition.id, from, to: schedule.locationId, activity: schedule.activity });
  }
}

function resolveDialogue(
  campaign: CampaignDefinition,
  state: WorldState,
  definition: CampaignDefinition["characters"][number],
  action: Extract<GameAction, { type: "dialogue" }>,
): { intelId: string; field: string | null; verified: boolean } | null {
  const character = state.characters[definition.id];
  const toneTrust = action.tone === "friendly" ? 3 : action.tone === "threatening" ? -4 : action.tone === "formal" ? 1 : 0;
  const pressure = action.goal === "apply_pressure" ? 7 : action.tone === "threatening" ? 5 : 0;
  character.familiarity = clamp(character.familiarity + (action.goal === "small_talk" ? 3 : action.goal === "build_trust" ? 4 : 2));
  character.privateTrust = clamp(character.privateTrust + toneTrust + (action.goal === "build_trust" ? 5 : 0), -100, 100);
  character.suspicionOfPlayer = clamp(character.suspicionOfPlayer + pressure * state.difficulty.enemyResponseSpeed);
  if (action.goal === "probe_attitude") {
    character.politicalAffinity = clamp(character.politicalAffinity + (definition.reliability.loyalty - 50) / 12, -100, 100);
  }
  if (action.goal === "recruit_probe") {
    character.interestDependency = clamp(character.interestDependency + (definition.reliability.loyalty < 50 ? 4 : 1));
    if (definition.recruitable && character.familiarity >= 8 && character.privateTrust >= 5) {
      const evidenceQuality = (definition.reliability.loyalty * 0.4 + definition.reliability.discipline * 0.3 + definition.reliability.competence * 0.3) / 100;
      character.recruitmentProgress = clamp(character.recruitmentProgress + Math.round(30 + evidenceQuality * 30));
      if (character.recruitmentProgress >= 100 && evidenceQuality >= 0.52) {
        character.recruited = true;
        character.agentTier = "active";
        if (!state.network.activeMemberIds.includes(character.id)) state.network.activeMemberIds.push(character.id);
        state.network.exposure = clamp(state.network.exposure + 5);
      }
    }
  }

  const canShare = character.familiarity >= 5 && character.privateTrust >= 2 && action.goal === "request_information";
  if (!canShare && action.goal !== "verify_intel") return null;
  const candidate = action.goal === "verify_intel"
    ? campaign.intel.find((item) => item.sourceCharacterIds.includes(definition.id) && state.intel[item.id].knownFields.length > 0 && !state.intel[item.id].collectedSourceIds.includes(definition.id))
    : campaign.intel.find((item) => item.sourceCharacterIds.includes(definition.id) && state.intel[item.id].knownFields.length < item.requiredFields.length);
  if (!candidate) return null;
  const intel = state.intel[candidate.id];
  const verified = action.goal === "verify_intel";
  const field = verified ? null : candidate.requiredFields[intel.knownFields.length];
  if (field) intel.knownFields = [...intel.knownFields, field];
  intel.collectedSourceIds = [...new Set([...intel.collectedSourceIds, definition.id])];
  const relationBonus = Math.max(0, character.privateTrust) / 100;
  intel.confidence = clamp(intel.confidence + 0.22 * state.difficulty.intelClarity + 0.12 + relationBonus * 0.12, 0, 1);
  return { intelId: candidate.id, field, verified };
}

function dialogueNarration(
  state: WorldState,
  definition: CampaignDefinition["characters"][number],
  action: Extract<GameAction, { type: "dialogue" }>,
  discovered: boolean,
): string {
  if (action.goal === "apply_pressure") return `${definition.name}的回答变得谨慎，房间里的空气也紧了起来。`;
  if (action.goal === "recruit_probe") {
    const character = state.characters[definition.id];
    return character.recruited ? `${definition.name}接受了有限度的联络安排，今后会按约定渠道行动。` : `${definition.name}没有直接表态，但你记下了对方在利益和风险面前的反应。`;
  }
  if (discovered && action.goal === "verify_intel") return `${definition.name}从另一个角度印证了你掌握的细节，情报可信度有所提高。`;
  if (discovered && action.goal === "request_information") return `${definition.name}说了一段看似随意的话，其中有一个细节值得记入情报板。`;
  if (action.goal === "build_trust" || action.goal === "small_talk") return `${definition.name}对你的戒心稍有松动，但仍在观察你的来意。`;
  return `${definition.name}没有给出明确答案，只留下了一些需要核验的措辞。`;
}

export function calculateScore(campaign: CampaignDefinition, state: WorldState): ScoreBreakdown {
  const required = campaign.objectives.filter((objective) => objective.required);
  const completed = required.filter((objective) => objectiveSatisfied(campaign, state, objective)).length;
  const mission = required.length === 0 ? 40 : Math.round((completed / required.length) * 40);
  const confidenceValues = Object.values(state.intel).filter((item) => item.knownFields.length > 0).map((item) => item.confidence);
  const intelligence = confidenceValues.length ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length * 15) : 0;
  const network = Math.round((1 - state.network.exposure / 100) * 20);
  const cover = Math.round((1 - state.personalSuspicion / 100) * 15);
  const efficiency = Math.round((state.playerEnergy / 100) * 10);
  const total = clamp(mission + intelligence + network + cover + efficiency);
  const grade = total >= 90 ? "S" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : total >= 40 ? "D" : "E";
  return { mission, intelligence, network, cover, efficiency, total, grade };
}

export function evaluateEnding(campaign: CampaignDefinition, state: WorldState): CampaignEnding | null {
  const score = calculateScore(campaign, state);
  if (state.network.exposure >= 80) return { type: "network_collapse", title: "网络崩溃", reasons: ["组织网络已低于最低运行能力"], score };
  const deadline = Math.min(...campaign.objectives.filter((item) => item.required).map((item) => new Date(item.deadline).getTime()));
  const requiredObjectives = campaign.objectives.filter((item) => item.required);
  const completed = requiredObjectives.filter((objective) => objectiveSatisfied(campaign, state, objective));
  if (requiredObjectives.length > 0 && completed.length === requiredObjectives.length) {
    const costly = state.personalSuspicion >= 60 || state.network.exposure >= 50 || state.network.compromisedMemberIds.length > 0;
    return { type: costly ? "costly_success" : "complete_success", title: costly ? "代价成功" : "完整成功", reasons: ["核心情报已按要求送达"], score };
  }
  if (Date.parse(state.currentTime) >= deadline) {
    const sentFalseIntel = campaign.intel.some((definition) => definition.truth === "false" && state.intel[definition.id]?.deliveredAt);
    return { type: sentFalseIntel ? "intelligence_failure" : "mission_failure", title: sentFalseIntel ? "情报失败" : "任务失败", reasons: [sentFalseIntel ? "错误情报已经送达组织" : "核心任务超过截止时间"], score };
  }
  return null;
}

function objectiveSatisfied(campaign: CampaignDefinition, state: WorldState, objective: CampaignDefinition["objectives"][number]): boolean {
  return objective.requiredIntelIds.every((id) => {
    const intel = state.intel[id];
    const definition = campaign.intel.find((item) => item.id === id);
    if (!intel?.deliveredAt || !definition || definition.truth === "false") return false;
    const hasRequiredFields = definition.requiredFields.every((field) => intel.knownFields.includes(field));
    const acceptedMethod = intel.deliveryMethod !== null && objective.acceptedDeliveryMethods.includes(intel.deliveryMethod);
    return hasRequiredFields && acceptedMethod && intel.confidence >= objective.minimumConfidence;
  });
}
