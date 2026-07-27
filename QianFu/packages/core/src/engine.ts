import { randomUUID } from "node:crypto";
import { DIALOGUE_TEXT_LIMITS } from "./dialogue.js";
import type {
  ActionResult, CampaignDefinition, CampaignEnding, CharacterState, GameAction,
  GameEvent, IntelEvidenceSourceType, IntelState, RadioMessageFormat, RecruitmentEvidenceResult, RecruitmentTestType, ScoreBreakdown, WorldState,
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
      recruitmentCase: { stage: "contact", completedTestTypes: [], evidence: [] },
      exposed: false,
      agentTier: "background",
    },
  ]));
  const dialogueMemories = Object.fromEntries(campaign.characters.map((character) => [character.id, {
    characterId: character.id, summary: "尚未与玩家交谈。", lastPrivateIntent: null, turns: [], lastGoal: null, interactionCount: 0,
  }]));

  const intel = Object.fromEntries(campaign.intel.map((item): [string, IntelState] => [
    item.id,
    { id: item.id, knownFields: [], confidence: 0, collectedSourceIds: [], evidence: [], deliveredFields: [], deliveredAt: null, deliveryMethod: null },
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
    network: { exposure: 0, activeMemberIds: [], compromisedMemberIds: [], availableChannels: ["radio", "courier"], tasks: [] },
    radio: {
      codebooks: [
        { id: "one_time_pad", usageCount: 0, usesRemaining: 2, lastUsedAt: null },
        { id: "book_cipher", usageCount: 0, usesRemaining: null, lastUsedAt: null },
      ],
      transmissions: [],
    },
    investigation: {
      pressure: 0,
      locationHeat: Object.fromEntries(campaign.locations.map((location) => [location.id, 0])),
      surveillanceLocationIds: [],
      evidence: [],
      lastActionAt: null,
    },
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
    if (this.state.activeDialogue) this.state.activeDialogue.targetIntelId ??= null;
    this.state.discoveredLocationIds ??= campaign.locations.slice(0, 3).map((location) => location.id);
    this.state.knownCharacterIds ??= [];
    this.state.investigation ??= {
      pressure: 0,
      locationHeat: Object.fromEntries(campaign.locations.map((location) => [location.id, 0])),
      surveillanceLocationIds: [],
      evidence: [],
      lastActionAt: null,
    };
    this.state.investigation.evidence ??= [];
    this.state.investigation.surveillanceLocationIds ??= [];
    this.state.investigation.locationHeat ??= {};
    for (const location of campaign.locations) this.state.investigation.locationHeat[location.id] ??= 0;
    this.state.network.tasks ??= [];
    this.state.radio ??= {
      codebooks: [
        { id: "one_time_pad", usageCount: 0, usesRemaining: 2, lastUsedAt: null },
        { id: "book_cipher", usageCount: 0, usesRemaining: null, lastUsedAt: null },
      ],
      transmissions: [],
    };
    this.state.radio.transmissions ??= [];
    for (const intel of Object.values(this.state.intel)) {
      intel.evidence ??= [];
      intel.deliveredFields ??= intel.deliveredAt ? [...intel.knownFields] : [];
    }
    for (const character of campaign.characters) {
      const characterState = this.state.characters[character.id];
      if (characterState) {
        characterState.recruitmentCase ??= {
          stage: characterState.recruited ? "recruited" : "contact",
          completedTestTypes: [],
          evidence: [],
        };
      }
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
      return { state: this.getState(), events: [], narration: "该行动已经处理。", duplicate: true, notices: [] };
    }
    if (!Number.isInteger(action.durationMinutes) || action.durationMinutes < 0 || (action.type === "dialogue_turn" ? action.durationMinutes !== 2 : action.durationMinutes % 10 !== 0)) {
      throw new Error("Action duration must be a non-negative multiple of 10 minutes");
    }

    const next = structuredClone(this.state);
    const events: GameEvent[] = [];
    const notices: string[] = [];
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
        if (action.goal === "verify_intel") {
          if (!action.targetIntelId) throw new Error("核验对话必须选择具体情报");
          const intelDefinition = this.campaign.intel.find((item) => item.id === action.targetIntelId);
          if (!intelDefinition?.sourceCharacterIds.includes(action.targetCharacterId) || !next.intel[action.targetIntelId]?.knownFields.length) throw new Error("该人物无法核验所选情报");
        }
        if (!next.knownCharacterIds.includes(action.targetCharacterId)) {
          next.knownCharacterIds.push(action.targetCharacterId);
          append("character.introduced", { characterId: action.targetCharacterId });
        }
        const minTurns = action.allocatedMinutes / 2;
        next.activeDialogue = { id: action.idempotencyKey, characterId: action.targetCharacterId, goal: action.goal, tone: action.tone, targetIntelId: action.targetIntelId ?? null, allocatedMinutes: action.allocatedMinutes, elapsedMinutes: 0, maxTurns: minTurns, turnCount: 0, status: "active", transcript: [] };
        append("dialogue.started", { characterId: action.targetCharacterId, goal: action.goal, targetIntelId: action.targetIntelId, allocatedMinutes: action.allocatedMinutes, maxTurns: minTurns });
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
        const legacyAction = { type: "dialogue" as const, targetCharacterId: session.characterId, goal: session.goal, tone: session.tone, targetIntelId: session.targetIntelId ?? undefined, playerText: action.playerText, durationMinutes: 10, idempotencyKey: action.idempotencyKey };
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
        const contactWeight = session.goal === "apply_pressure" ? 3 : session.goal === "recruit_probe" || session.goal === "request_information" ? 2 : 1;
        recordInvestigationEvidence(next, "extended_contact", next.currentLocationId, contactWeight, append);
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
        if (elapsedDuration > 0) recordInvestigationEvidence(next, "extended_contact", next.currentLocationId, Math.max(1, Math.ceil(elapsedDuration / 10)), append);
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
        recordInvestigationEvidence(next, "covert_observation", next.currentLocationId, 6, append);
        append("character.observed", { characterId: target.id });
        narration = "你记下了目标的行动规律，但长时间停留也可能引人注意。";
        break;
      }
      case "record_intel": {
        const intel = next.intel[action.intelId];
        const definition = this.campaign.intel.find((item) => item.id === action.intelId);
        if (!intel || !definition) throw new Error("Unknown intelligence item");
        const acceptedFields = action.fields.filter((field) => definition.requiredFields.includes(field));
        intel.knownFields = [...new Set([...intel.knownFields, ...acceptedFields])];
        for (const field of acceptedFields) addIntelEvidence(this.campaign, next, definition, field, "player-record", "个人记录", "document", `${action.idempotencyKey}:${field}`, false);
        intel.confidence = clamp(intel.confidence + action.confidenceDelta, 0, 1);
        recordInvestigationEvidence(next, "sensitive_notes", next.currentLocationId, 3, append);
        append("intel.recorded", { intelId: action.intelId, fields: action.fields });
        narration = "新的情报碎片已经记录，仍需核验来源。";
        break;
      }
      case "transmit_intel": {
        const intel = next.intel[action.intelId];
        if (!intel) throw new Error("Unknown intelligence item");
        if (!next.network.availableChannels.includes(action.method)) throw new Error("Delivery channel is unavailable");
        if (intel.knownFields.length === 0) throw new Error("Cannot transmit intelligence with no known fields");
        const remainingFields = intel.knownFields.filter((field) => !intel.deliveredFields.includes(field));
        if (remainingFields.length === 0) throw new Error("Intelligence has already been transmitted");
        intel.deliveredAt = addMinutes(next.currentTime, action.durationMinutes);
        intel.deliveredFields = [...new Set([...intel.deliveredFields, ...remainingFields])];
        intel.deliveryMethod = action.method;
        next.network.exposure = clamp(next.network.exposure + (action.method === "radio" ? 4 : 2) * next.difficulty.enemyResponseSpeed);
        next.personalSuspicion = clamp(next.personalSuspicion + (action.method === "radio" ? 2 : 1) * next.difficulty.enemyResponseSpeed);
        recordInvestigationEvidence(next, action.method === "radio" ? "radio_signal" : "courier_pattern", next.currentLocationId, action.method === "radio" ? 18 : 7, append);
        append("intel.transmitted", { intelId: action.intelId, method: action.method });
        narration = "情报已经送出，最终价值将在组织确认后结算。";
        break;
      }
      case "send_radio_message": {
        if (action.durationMinutes !== 0) throw new Error("电文耗时由服务端计算");
        if (action.locationId !== next.currentLocationId) throw new Error("必须先抵达选定的发报地点");
        const siteRisk = radioSiteRisk(action.locationId);
        if (siteRisk === null) throw new Error("当前地点无法安全架设电台");
        const items = normalizeRadioItems(this.campaign, next, action.items);
        const fieldCount = items.reduce((total, item) => total + item.fields.length, 0);
        if (fieldCount === 0) throw new Error("电文至少需要包含一个已知且未送达的字段");
        const codebook = next.radio.codebooks.find((item) => item.id === action.codebookId);
        if (!codebook) throw new Error("密码本不可用");
        if (codebook.usesRemaining !== null && codebook.usesRemaining <= 0) throw new Error("一次一密页已经用尽");
        const scheduledWindowKnown = next.intel["radio-window"]?.knownFields.length > 0;
        if (action.timing === "scheduled" && !scheduledWindowKnown) throw new Error("尚未掌握组织收报窗口");

        const waitMinutes = action.timing === "scheduled" ? minutesUntilRadioWindow(next.currentTime) : 0;
        const operationMinutes = radioOperationMinutes(fieldCount, action.format, action.codebookId);
        elapsedDuration = waitMinutes + operationMinutes;
        const completedAt = addMinutes(next.currentTime, elapsedDuration);
        const receiptDueAt = addMinutes(completedAt, action.timing === "scheduled" ? 20 : 40);
        const repeatedCodebook = codebook.usageCount > 0 && codebook.id === "book_cipher";
        const signalWeight = Math.round(siteRisk + operationMinutes / 3 + (action.timing === "immediate" ? 8 : 0) + (repeatedCodebook ? 6 : 0));
        codebook.usageCount += 1;
        codebook.lastUsedAt = completedAt;
        if (codebook.usesRemaining !== null) codebook.usesRemaining -= 1;
        next.radio.transmissions.push({
          id: action.idempotencyKey,
          items,
          format: action.format,
          codebookId: action.codebookId,
          timing: action.timing,
          locationId: action.locationId,
          fieldCount,
          durationMinutes: elapsedDuration,
          sentAt: next.currentTime,
          completedAt,
          receiptDueAt,
          receiptStatus: "pending",
          receiptSummary: "电文已经发出，正在等待组织回执。",
        });
        next.radio.transmissions = next.radio.transmissions.slice(-30);
        next.network.exposure = clamp(next.network.exposure + signalWeight * 0.3 * next.difficulty.enemyResponseSpeed);
        next.personalSuspicion = clamp(next.personalSuspicion + Math.max(1, siteRisk / 4) * next.difficulty.enemyResponseSpeed);
        recordInvestigationEvidence(next, "radio_signal", action.locationId, signalWeight, append);
        append("radio.message_sent", { transmissionId: action.idempotencyKey, items, format: action.format, codebookId: action.codebookId, timing: action.timing, locationId: action.locationId, fieldCount, durationMinutes: elapsedDuration, receiptDueAt });
        narration = `电文已在${elapsedDuration}分钟内完成编码、发送和清理。组织回执预计稍后抵达。`;
        break;
      }
      case "dialogue": {
        const target = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!target || !definition) throw new Error("Unknown character");
        if (target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        if (!next.knownCharacterIds.includes(action.targetCharacterId)) {
          next.knownCharacterIds.push(action.targetCharacterId);
          append("character.introduced", { characterId: action.targetCharacterId });
        }
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
      case "delegate_comrade_task": {
        if (action.durationMinutes !== 0) throw new Error("Delegating a comrade task does not advance time");
        const member = next.characters[action.memberId];
        if (!member?.recruited || !next.network.activeMemberIds.includes(action.memberId)) throw new Error("Character is not an active network member");
        if (member.exposed || next.network.compromisedMemberIds.includes(action.memberId)) throw new Error("Compromised members cannot receive new tasks");
        if (next.network.tasks.some((task) => task.memberId === action.memberId && task.status === "active")) throw new Error("Network member already has an active task");
        validateComradeTaskTarget(this.campaign, next, action.kind, action.targetId);
        const taskMinutes = comradeTaskMinutes(action.kind, action.approach);
        next.network.tasks.push({
          id: action.idempotencyKey,
          memberId: action.memberId,
          kind: action.kind,
          targetId: action.targetId,
          approach: action.approach,
          status: "active",
          assignedAt: next.currentTime,
          dueAt: addMinutes(next.currentTime, taskMinutes),
          completedAt: null,
          report: null,
        });
        member.agentTier = "active";
        append("comrade.task_assigned", { taskId: action.idempotencyKey, memberId: action.memberId, kind: action.kind, targetId: action.targetId, approach: action.approach, taskMinutes });
        narration = `任务已经交给${this.campaign.characters.find((item) => item.id === action.memberId)?.name ?? "这名同志"}，对方会按约定自行行动。`;
        break;
      }
      case "cancel_comrade_task": {
        if (action.durationMinutes !== 0) throw new Error("Cancelling a comrade task does not advance time");
        const task = next.network.tasks.find((item) => item.id === action.taskId);
        if (!task || task.status !== "active") throw new Error("Comrade task is not active");
        task.status = "cancelled";
        task.completedAt = next.currentTime;
        task.report = "任务已通过约定渠道撤回，没有产生结果。";
        if (next.characters[task.memberId]) next.characters[task.memberId].agentTier = "background";
        append("comrade.task_cancelled", { taskId: task.id, memberId: task.memberId });
        narration = "撤回指令已经送出。对方会在不暴露联络关系的前提下停止行动。";
        break;
      }
      case "recruitment_test": {
        const character = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!character || !definition || !definition.recruitable) throw new Error("该人物不在可招募候选名单中");
        if (!next.knownCharacterIds.includes(character.id)) throw new Error("尚未建立候选人档案");
        if (character.recruited) throw new Error("该人物已经加入组织");
        if (character.recruitmentCase.completedTestTypes.includes(action.testType)) throw new Error("同类甄别已经完成，重复结果没有额外价值");
        const requiredDuration = recruitmentTestMinutes(action.testType);
        if (action.durationMinutes !== requiredDuration) throw new Error("甄别行动耗时不符合规则");
        if (character.familiarity < 3) throw new Error("对候选人了解不足，先通过接触建立基础档案");
        if (action.testType !== "background_check" && character.locationId !== next.currentLocationId) throw new Error("需要与候选人在同一地点安排这项测试");
        if (action.testType === "low_risk_task" && character.recruitmentProgress < 20) throw new Error("尚未形成初步合作意向，不能安排低风险任务");

        const result = evaluateRecruitmentTest(definition, action.testType);
        const evidence = {
          id: action.idempotencyKey,
          testType: action.testType,
          result,
          summary: recruitmentEvidenceSummary(action.testType, result),
          observedAt: next.currentTime,
        };
        character.recruitmentCase.completedTestTypes.push(action.testType);
        character.recruitmentCase.evidence.push(evidence);
        character.recruitmentCase.stage = character.recruitmentCase.completedTestTypes.length >= 3 && character.recruitmentProgress >= 20 ? "ready" : "screening";
        character.recruitmentProgress = clamp(character.recruitmentProgress + (result === "favorable" ? 12 : result === "inconclusive" ? 7 : 3), 0, 90);
        const riskWeight = action.testType === "controlled_leak" ? 8 : action.testType === "low_risk_task" ? 5 : 3;
        recordInvestigationEvidence(next, action.testType === "background_check" ? "covert_observation" : "sensitive_notes", next.currentLocationId, riskWeight, append);
        if (action.testType === "controlled_leak") next.network.exposure = clamp(next.network.exposure + 3 * next.difficulty.enemyResponseSpeed);
        append("recruitment.test_completed", { characterId: character.id, evidence });
        narration = evidence.summary;
        break;
      }
      case "recruit_candidate": {
        const character = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!character || !definition || !definition.recruitable) throw new Error("该人物不在可招募候选名单中");
        if (action.durationMinutes !== 30) throw new Error("正式招募需要 30 分钟");
        if (character.locationId !== next.currentLocationId) throw new Error("正式招募必须当面进行");
        if (character.recruited) throw new Error("该人物已经加入组织");
        if (character.familiarity < 8 || character.privateTrust < 5 || character.recruitmentProgress < 20) throw new Error("关系和合作意向尚不足以提出正式招募");
        if (new Set(character.recruitmentCase.completedTestTypes).size < 3) throw new Error("至少完成三类不同甄别后才能正式招募");
        character.recruited = true;
        character.agentTier = "active";
        character.recruitmentProgress = 100;
        character.recruitmentCase.stage = "recruited";
        if (!next.network.activeMemberIds.includes(character.id)) next.network.activeMemberIds.push(character.id);
        next.network.exposure = clamp(next.network.exposure + 5 * next.difficulty.enemyResponseSpeed);
        append("character.recruited", { characterId: character.id, completedTestTypes: character.recruitmentCase.completedTestTypes });
        narration = `${definition.name}接受了有限联络与保密规则，正式进入你的组织网络。甄别证据仍可能存在误差。`;
        break;
      }
      case "wait":
        append("player.waited", { durationMinutes: action.durationMinutes });
        narration = "时间继续向前，城市中的其他人也在行动。";
        break;
    }

    const previousTime = next.currentTime;
    const finalTime = addMinutes(next.currentTime, elapsedDuration);
    const previousBucket = Math.floor(new Date(previousTime).getTime() / 600_000);
    const finalBucket = Math.floor(new Date(finalTime).getTime() / 600_000);
    // Dialogue turns use two-minute slices. Longer actions still resolve every
    // crossed ten-minute world boundary instead of collapsing them into one tick.
    for (let bucket = previousBucket + 1; bucket <= finalBucket; bucket += 1) {
      next.currentTime = new Date(bucket * 600_000).toISOString();
      advanceSchedules(this.campaign, next, append);
      const tickNotices = [
        ...advanceComradeTasks(this.campaign, next, append),
        ...advanceRadioReceipts(next, append),
        ...advanceEnemyInvestigation(next, append),
      ];
      notices.push(...tickNotices);
      if (next.activeDialogue && tickNotices.length > 0) {
        next.activeDialogue.transcript.push(...tickNotices.map((text) => ({ speaker: "system" as const, text, at: next.currentTime })));
      }
    }
    next.currentTime = finalTime;
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

    return { state: this.getState(), events, narration, duplicate: false, npcReply, notices };
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
      `这件事我未必有答案。你要是不介意，可以把刚才的话说具体些。`,
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

function comradeTaskMinutes(
  kind: Extract<GameAction, { type: "delegate_comrade_task" }>["kind"],
  approach: Extract<GameAction, { type: "delegate_comrade_task" }>["approach"],
): number {
  const base = kind === "gather_intel" ? 60 : 30;
  return base + (approach === "cautious" ? 20 : approach === "urgent" ? -10 : 0);
}

function validateComradeTaskTarget(
  campaign: CampaignDefinition,
  state: WorldState,
  kind: Extract<GameAction, { type: "delegate_comrade_task" }>["kind"],
  targetId: string,
) {
  if (kind === "scout_location") {
    if (!campaign.locations.some((location) => location.id === targetId)) throw new Error("Unknown task location");
    if (state.discoveredLocationIds.includes(targetId)) throw new Error("Location has already been discovered");
    return;
  }
  const intel = state.intel[targetId];
  const definition = campaign.intel.find((item) => item.id === targetId);
  if (!intel || !definition) throw new Error("Unknown task intelligence item");
  if (intel.deliveredAt) throw new Error("Delivered intelligence cannot receive another task");
  if (kind === "verify_intel" && intel.knownFields.length === 0) throw new Error("Intelligence must be discovered before it can be verified");
  if (kind === "gather_intel" && definition.requiredFields.every((field) => intel.knownFields.includes(field))) throw new Error("All intelligence fields are already known");
}

function radioSiteRisk(locationId: string): number | null {
  if (locationId === "wu-clock-shop") return 4;
  if (locationId === "jianghai-hotel") return 10;
  if (locationId === "radio-office") return 18;
  return null;
}

function normalizeRadioItems(
  campaign: CampaignDefinition,
  state: WorldState,
  requestedItems: Extract<GameAction, { type: "send_radio_message" }>["items"],
) {
  if (requestedItems.length === 0 || requestedItems.length > 6) throw new Error("电文包含的情报项数量无效");
  const seenIntel = new Set<string>();
  return requestedItems.map((requested) => {
    if (seenIntel.has(requested.intelId)) throw new Error("同一情报不能在一封电文中重复出现");
    seenIntel.add(requested.intelId);
    const intel = state.intel[requested.intelId];
    const definition = campaign.intel.find((item) => item.id === requested.intelId);
    if (!intel || !definition) throw new Error("电文包含未知情报");
    const fields = [...new Set(requested.fields)];
    if (fields.length === 0 || fields.length > 20) throw new Error("每项情报至少选择一个字段");
    for (const field of fields) {
      if (!definition.requiredFields.includes(field) || !intel.knownFields.includes(field)) throw new Error("不能发送尚未掌握的情报字段");
      if (intel.deliveredFields.includes(field)) throw new Error("不能重复发送已经确认送达的字段");
    }
    return { intelId: requested.intelId, fields };
  });
}

function radioOperationMinutes(fieldCount: number, format: RadioMessageFormat, codebookId: "one_time_pad" | "book_cipher"): number {
  const encoding = codebookId === "one_time_pad" ? 20 : 10;
  const fieldsPerTenMinutes = format === "compressed" ? 4 : 2;
  const transmission = Math.max(10, Math.ceil(fieldCount / fieldsPerTenMinutes) * 10);
  return encoding + transmission + 10;
}

function minutesUntilRadioWindow(iso: string): number {
  const minute = minuteOfDay(iso);
  const windows = [600, 900, 1260];
  const next = windows.find((window) => window >= minute);
  return next === undefined ? 1440 - minute + windows[0] : next - minute;
}

function advanceRadioReceipts(
  state: WorldState,
  append: (type: string, payload: unknown) => void,
): string[] {
  const notices: string[] = [];
  for (const transmission of state.radio.transmissions.filter((item) => item.receiptStatus === "pending" && new Date(item.receiptDueAt) <= new Date(state.currentTime))) {
    const confidenceValues = transmission.items.map((item) => state.intel[item.intelId]?.confidence ?? 0);
    const averageConfidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0;
    const codebookBonus = transmission.codebookId === "one_time_pad" ? 15 : 5;
    const formatBonus = transmission.format === "full" ? 10 : 0;
    const timingBonus = transmission.timing === "scheduled" ? 10 : 0;
    const heatPenalty = Math.min(20, state.investigation.locationHeat[transmission.locationId] ?? 0);
    const difficultyPenalty = Math.max(0, state.difficulty.enemyResponseSpeed - 1) * 12;
    const receptionScore = averageConfidence * 60 + codebookBonus + formatBonus + timingBonus - heatPenalty - difficultyPenalty;

    if (receptionScore >= 68) {
      transmission.receiptStatus = "confirmed";
      transmission.receiptSummary = "组织回执确认：电文完整收到，已进入情报核验流程。";
    } else if (receptionScore >= 45) {
      transmission.receiptStatus = "partial";
      transmission.receiptSummary = "组织回执不完整：部分报码无法辨认，需要补发关键字段。";
    } else {
      transmission.receiptStatus = "no_receipt";
      transmission.receiptSummary = "约定时间内没有收到有效回执，无法确认电文是否送达。";
    }

    const deliveredItems = transmission.receiptStatus === "confirmed"
      ? transmission.items
      : transmission.receiptStatus === "partial"
        ? transmission.items.map((item) => ({ ...item, fields: item.fields.slice(0, 1) }))
        : [];
    for (const delivered of deliveredItems) {
      const intel = state.intel[delivered.intelId];
      if (!intel) continue;
      intel.deliveredFields = [...new Set([...intel.deliveredFields, ...delivered.fields])];
      intel.deliveredAt = state.currentTime;
      intel.deliveryMethod = "radio";
    }
    append("radio.receipt_received", {
      transmissionId: transmission.id,
      status: transmission.receiptStatus,
      deliveredItems,
      summary: transmission.receiptSummary,
    });
    notices.push(transmission.receiptSummary);
  }
  return notices;
}

function advanceComradeTasks(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
): string[] {
  const notices: string[] = [];
  for (const task of state.network.tasks.filter((item) => item.status === "active" && new Date(item.dueAt) <= new Date(state.currentTime))) {
    const member = state.characters[task.memberId];
    const definition = campaign.characters.find((item) => item.id === task.memberId);
    if (!member || !definition) {
      task.status = "failed";
      task.completedAt = state.currentTime;
      task.report = "联络对象没有按约定出现，任务已经失去执行条件。";
      notices.push(task.report);
      append("comrade.task_failed", { taskId: task.id, memberId: task.memberId, report: task.report });
      continue;
    }

    const ability = definition.reliability.competence * 0.55
      + definition.reliability.discipline * 0.25
      + definition.reliability.courage * 0.1
      + definition.reliability.loyalty * 0.1;
    const approachModifier = task.approach === "cautious" ? 10 : task.approach === "urgent" ? -15 : 0;
    const difficultyPenalty = Math.max(0, state.difficulty.enemyResponseSpeed - 1) * 15;
    const successChance = clamp(ability + approachModifier - difficultyPenalty, 10, 100);
    const success = stableRoll(`${state.gameInstanceId}:${task.id}:${task.kind}:${task.targetId}`) < successChance;
    const evidenceWeight = task.approach === "cautious" ? 2 : task.approach === "urgent" ? 7 : 4;
    const evidenceLocationId = task.kind === "scout_location" ? task.targetId : member.locationId;
    recordInvestigationEvidence(state, "courier_pattern", evidenceLocationId, evidenceWeight, append);
    task.completedAt = state.currentTime;
    member.agentTier = "background";

    if (success) {
      task.status = "completed";
      if (task.kind === "scout_location") {
        if (!state.discoveredLocationIds.includes(task.targetId)) state.discoveredLocationIds.push(task.targetId);
        const locationName = campaign.locations.find((location) => location.id === task.targetId)?.name ?? "目标地点";
        task.report = `${definition.name}确认了${locationName}的进入路线和周边情况。`;
        append("location.discovered", { locationId: task.targetId, sourceMemberId: task.memberId });
      } else {
        const intel = state.intel[task.targetId];
        const intelDefinition = campaign.intel.find((item) => item.id === task.targetId);
        if (!intel || !intelDefinition) continue;
        if (task.kind === "gather_intel") {
          const missing = intelDefinition.requiredFields.filter((field) => !intel.knownFields.includes(field));
          const field = missing[stableRoll(`${task.id}:field`) % Math.max(1, missing.length)];
          if (field) {
            intel.knownFields.push(field);
            addIntelEvidence(campaign, state, intelDefinition, field, task.memberId, definition.name, "comrade_report", `${task.id}:${field}`);
          }
          intel.collectedSourceIds = [...new Set([...intel.collectedSourceIds, task.memberId])];
          task.report = `${definition.name}送回了“${intelDefinition.title}”的一项可核对线索。`;
        } else {
          const field = [...intel.knownFields]
            .sort((a, b) => intel.evidence.filter((item) => item.field === a).length - intel.evidence.filter((item) => item.field === b).length)[0];
          const evidence = field
            ? addIntelEvidence(campaign, state, intelDefinition, field, task.memberId, definition.name, "comrade_report", `${task.id}:${field}`)
            : null;
          task.report = evidence
            ? `${definition.name}交叉核对了“${intelDefinition.title}”中的一项记录。`
            : `${definition.name}没有找到可进一步核对的新来源。`;
        }
      }
      if (task.approach === "urgent") state.network.exposure = clamp(state.network.exposure + state.difficulty.enemyResponseSpeed);
      append("comrade.task_completed", { taskId: task.id, memberId: task.memberId, kind: task.kind, targetId: task.targetId, report: task.report });
    } else {
      task.status = "failed";
      member.stress = clamp(member.stress + (task.approach === "urgent" ? 14 : 8));
      state.network.exposure = clamp(state.network.exposure + evidenceWeight * state.difficulty.enemyResponseSpeed);
      task.report = `${definition.name}没有取得可靠结果，并报告行动环境已经变得危险。`;
      append("comrade.task_failed", { taskId: task.id, memberId: task.memberId, kind: task.kind, targetId: task.targetId, report: task.report });
    }
    notices.push(task.report ?? "一项同志任务已经结束。");
  }
  return notices;
}

function stableRoll(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function recordInvestigationEvidence(
  state: WorldState,
  type: WorldState["investigation"]["evidence"][number]["type"],
  locationId: string,
  weight: number,
  append: (type: string, payload: unknown) => void,
) {
  const investigation = state.investigation;
  investigation.locationHeat[locationId] = clamp((investigation.locationHeat[locationId] ?? 0) + weight);
  investigation.evidence.push({ type, locationId, weight, observedAt: state.currentTime, processed: false });
  investigation.evidence = investigation.evidence.slice(-100);
  append("investigation.evidence_recorded", { type, locationId, weight });
}

function advanceEnemyInvestigation(state: WorldState, append: (type: string, payload: unknown) => void): string[] {
  const investigation = state.investigation;
  const fresh = investigation.evidence.filter((evidence) => !evidence.processed);
  if (fresh.length === 0) return [];
  for (const evidence of fresh) evidence.processed = true;

  const newWeight = fresh.reduce((total, evidence) => total + evidence.weight, 0);
  investigation.pressure = clamp(investigation.pressure + newWeight * 0.8 * state.difficulty.enemyResponseSpeed);
  const radioEvidence = fresh.find((evidence) => evidence.type === "radio_signal");
  const hottest = Object.entries(investigation.locationHeat).sort((a, b) => b[1] - a[1])[0];
  let action: string | null = null;
  let notice: string | null = null;

  if (radioEvidence) {
    state.network.exposure = clamp(state.network.exposure + 3 * state.difficulty.enemyResponseSpeed);
    action = "radio_sweep";
    notice = "远处传来短促的干扰声。有人正在这一带排查异常无线电信号。";
  } else if (hottest && hottest[1] >= 12 && !investigation.surveillanceLocationIds.includes(hottest[0])) {
    investigation.surveillanceLocationIds.push(hottest[0]);
    action = "surveillance_started";
    notice = "街角多了一个停留过久的陌生人。这里可能已经受到监视。";
  } else if (investigation.surveillanceLocationIds.includes(state.currentLocationId) && fresh.some((evidence) => evidence.locationId === state.currentLocationId)) {
    state.personalSuspicion = clamp(state.personalSuspicion + 3 * state.difficulty.enemyResponseSpeed);
    action = "subject_followed";
    notice = "窗外同一道人影再次出现。你意识到自己的停留可能被人记下了。";
  } else if (investigation.pressure >= 30) {
    state.personalSuspicion = clamp(state.personalSuspicion + 1 * state.difficulty.enemyResponseSpeed);
    action = "records_reviewed";
    notice = "机关里开始核对近期出入和调阅记录，几个人被叫去补填说明。";
  }

  for (const locationId of Object.keys(investigation.locationHeat)) {
    investigation.locationHeat[locationId] = clamp(investigation.locationHeat[locationId] - 0.5);
  }
  if (!action || !notice) return [];
  investigation.lastActionAt = state.currentTime;
  append("investigation.action_taken", { action, locationId: radioEvidence?.locationId ?? hottest?.[0], notice });
  return [notice];
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
): { intelId: string; field: string; verified: boolean; assessment: string } | null {
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
      character.recruitmentProgress = clamp(character.recruitmentProgress + 20, 0, 60);
      character.recruitmentCase.stage = character.recruitmentCase.completedTestTypes.length >= 3 ? "ready" : "screening";
    }
  }

  const canShare = character.familiarity >= 5 && character.privateTrust >= 2 && action.goal === "request_information";
  if (!canShare && action.goal !== "verify_intel") return null;
  const candidate = action.goal === "verify_intel"
    ? campaign.intel.find((item) => (!action.targetIntelId || item.id === action.targetIntelId)
      && item.sourceCharacterIds.includes(definition.id)
      && state.intel[item.id].knownFields.some((field) => !state.intel[item.id].evidence.some((evidence) => evidence.field === field && evidence.sourceId === definition.id)))
    : campaign.intel.find((item) => item.sourceCharacterIds.includes(definition.id) && state.intel[item.id].knownFields.length < item.requiredFields.length);
  if (!candidate) return null;
  const intel = state.intel[candidate.id];
  const verified = action.goal === "verify_intel";
  const field = verified
    ? [...intel.knownFields].sort((a, b) => intel.evidence.filter((item) => item.field === a).length - intel.evidence.filter((item) => item.field === b).length)
      .find((item) => !intel.evidence.some((evidence) => evidence.field === item && evidence.sourceId === definition.id))
    : candidate.requiredFields[intel.knownFields.length];
  if (!field) return null;
  if (!intel.knownFields.includes(field)) {
    intel.knownFields = [...intel.knownFields, field];
  }
  intel.collectedSourceIds = [...new Set([...intel.collectedSourceIds, definition.id])];
  const evidence = addIntelEvidence(campaign, state, candidate, field, definition.id, definition.name, "testimony", `${action.idempotencyKey}:${candidate.id}:${field}`);
  return evidence ? { intelId: candidate.id, field, verified, assessment: evidence.assessment } : null;
}

function addIntelEvidence(
  campaign: CampaignDefinition,
  state: WorldState,
  definition: CampaignDefinition["intel"][number],
  field: string,
  sourceId: string,
  sourceLabel: string,
  sourceType: IntelEvidenceSourceType,
  evidenceId: string,
  adjustConfidence = true,
) {
  const intel = state.intel[definition.id];
  if (!intel || intel.evidence.some((item) => item.field === field && item.sourceId === sourceId)) return null;
  const fieldEvidence = intel.evidence.filter((item) => item.field === field);
  const upstreamSourceId = definition.sourceOrigins?.[sourceId] ?? sourceId;
  const hasSameUpstream = fieldEvidence.some((item) => item.upstreamSourceId === upstreamSourceId);
  const hasIndependentSource = fieldEvidence.some((item) => item.upstreamSourceId !== upstreamSourceId);
  const sourceIndex = definition.sourceCharacterIds.indexOf(sourceId);
  const assessment = definition.truth === "partial" && sourceIndex > 0 && hasIndependentSource
    ? "contradicts" as const
    : hasSameUpstream
      ? "dependent" as const
      : hasIndependentSource
        ? "corroborates" as const
        : "unverified" as const;
  const fieldLabel = definition.fieldLabels?.[field] ?? field;
  const summary = assessment === "corroborates"
    ? `${sourceLabel}从独立来源印证了“${fieldLabel}”。`
    : assessment === "contradicts"
      ? `${sourceLabel}对“${fieldLabel}”给出了与现有记录不一致的说法。`
      : assessment === "dependent"
        ? `${sourceLabel}提到“${fieldLabel}”，但线索与已有记录来自同一上游。`
        : `${sourceLabel}提供了关于“${fieldLabel}”的线索，尚缺独立来源核验。`;
  const evidence = { id: evidenceId, field, sourceId, sourceLabel, sourceType, upstreamSourceId, assessment, summary, collectedAt: state.currentTime };
  intel.evidence.push(evidence);
  intel.evidence = intel.evidence.slice(-80);
  if (adjustConfidence) {
    const delta = assessment === "corroborates"
      ? 0.25 * state.difficulty.intelClarity + 0.15
      : assessment === "dependent"
        ? 0.08
        : assessment === "contradicts"
          ? -0.12 * state.difficulty.deceptionFrequency
          : 0.2 * state.difficulty.intelClarity + 0.08;
    intel.confidence = clamp(intel.confidence + delta, 0, 1);
  }
  return evidence;
}

function recruitmentTestMinutes(testType: RecruitmentTestType): number {
  if (testType === "background_check" || testType === "low_risk_task") return 60;
  if (testType === "controlled_leak") return 40;
  return 30;
}

function evaluateRecruitmentTest(
  definition: CampaignDefinition["characters"][number],
  testType: RecruitmentTestType,
): RecruitmentEvidenceResult {
  const reliability = definition.reliability;
  const score = testType === "background_check"
    ? reliability.loyalty * 0.45 + reliability.pressureResistance * 0.2 + reliability.competence * 0.35
    : testType === "controlled_leak"
      ? reliability.discipline * 0.45 + reliability.loyalty * 0.4 + reliability.pressureResistance * 0.15
      : testType === "discipline_check"
        ? reliability.discipline * 0.55 + reliability.pressureResistance * 0.3 + reliability.loyalty * 0.15
        : reliability.competence * 0.45 + reliability.discipline * 0.3 + reliability.courage * 0.25;
  if (score >= 70) return "favorable";
  if (score < 50) return "warning";
  return "inconclusive";
}

function recruitmentEvidenceSummary(testType: RecruitmentTestType, result: RecruitmentEvidenceResult): string {
  const summaries: Record<RecruitmentTestType, Record<RecruitmentEvidenceResult, string>> = {
    background_check: {
      favorable: "背景中的任职、来往和关键时间点基本能够相互印证。",
      warning: "背景核查出现无法解释的时间空档，且有一段关系被刻意淡化。",
      inconclusive: "现有履历大体连贯，但关键时期缺少独立来源佐证。",
    },
    controlled_leak: {
      favorable: "可控消息没有出现在预设范围之外，对方表现出保密意识。",
      warning: "可控消息沿不该出现的路径扩散，暂时无法确认是疏忽还是有意泄露。",
      inconclusive: "没有发现明确泄露，但观察时间和接触范围不足以下结论。",
    },
    discipline_check: {
      favorable: "对方按约定时间和备用规则行动，没有擅自扩大接触。",
      warning: "对方临时改变约定且未按备用规则说明，纪律性值得警惕。",
      inconclusive: "行动基本完成，但对意外情况的处理不够稳定。",
    },
    low_risk_task: {
      favorable: "低风险任务按边界完成，结果可以被另一条线索核对。",
      warning: "任务结果存在明显疏漏，对方还试图掩饰过程中的异常。",
      inconclusive: "任务完成了一部分，但能力与态度仍难以分开判断。",
    },
  };
  return summaries[testType][result];
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
    const pendingBeforeDeadline = state.radio.transmissions.some((transmission) =>
      transmission.receiptStatus === "pending" && Date.parse(transmission.completedAt) <= deadline,
    );
    if (pendingBeforeDeadline) return null;
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
    const hasRequiredFields = definition.requiredFields.every((field) => intel.deliveredFields.includes(field));
    const acceptedMethod = intel.deliveryMethod !== null && objective.acceptedDeliveryMethods.includes(intel.deliveryMethod);
    return hasRequiredFields && acceptedMethod && intel.confidence >= objective.minimumConfidence;
  });
}
