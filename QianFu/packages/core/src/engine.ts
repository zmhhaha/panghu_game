import { randomUUID } from "node:crypto";
import { DIALOGUE_TEXT_LIMITS, getContextualDialogueGoals } from "./dialogue.js";
import type {
  ActionResult, CampaignDefinition, CampaignEnding, CharacterState, GameAction,
  GameEvent, IntelEvidenceSourceType, IntelState, InterrogationStrategy, LocationKnowledgeStage, MissionObjective, NarrativeThreadState, RadioMessageFormat, RecruitmentEvidenceResult, RecruitmentExecutionReport, RecruitmentTestType, ScoreBreakdown, WorldState,
} from "./types.js";
import { DIFFICULTIES } from "./difficulties.js";
import { getCoverProfile } from "./cover-profiles.js";

const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function createInitialCoverState(profileId: WorldState["cover"]["profileId"] = "archive_clerk"): WorldState["cover"] {
  return {
    profileId,
    recordStatus: "pending",
    credibility: 65,
    scrutiny: 0,
    consecutiveRecordGaps: 0,
    leaveCount: 0,
    completedRecordDates: [],
    recordCreditMinutesByDate: {},
    lastRecordEvaluatedDate: null,
    leaveUntil: null,
    leaveReason: null,
    lastRecordAt: null,
    observations: [],
  };
}

export function createInitialWorld(
  campaign: CampaignDefinition,
  gameInstanceId: string,
  ownerUserId: string,
  difficultyId: keyof typeof DIFFICULTIES = "undercover",
  coverProfileId: WorldState["cover"]["profileId"] = "archive_clerk",
): WorldState {
  const coverProfile = getCoverProfile(coverProfileId);
  const profileApplies = campaign.locations.some((location) => location.id === coverProfile.startingLocationId);
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
  const startingLocationId = profileApplies ? coverProfile.startingLocationId : campaign.locations[0]?.id ?? "";
  const initiallyDiscovered = [...new Set([
    ...(profileApplies ? [coverProfile.startingLocationId] : campaign.locations.slice(0, 3).map((location) => location.id)),
    ...campaign.locations.filter((location) => location.radioSite?.initiallyAvailable).map((location) => location.id),
  ])];
  const cover = createInitialCoverState(coverProfile.id);
  if (coverProfile.workHours && minuteOfDay(campaign.startTime) >= coverProfile.workHours.endMinute) {
    // A campaign that opens after the shift cannot retroactively punish the player for that day.
    cover.lastRecordEvaluatedDate = coverDate(campaign.startTime);
  }

  return {
    gameInstanceId,
    ownerUserId,
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    engineVersion: campaign.engineVersion,
    difficulty: DIFFICULTIES[difficultyId],
    currentTime: campaign.startTime,
    currentLocationId: startingLocationId,
    discoveredLocationIds: initiallyDiscovered,
    locationKnowledge: Object.fromEntries(campaign.locations.map((location) => [location.id, {
      stage: initiallyDiscovered.includes(location.id) ? "accessible" : "unknown",
      sourceEventId: null,
      hint: location.id === startingLocationId ? "公开身份的日常活动地点。" : null,
      updatedAt: campaign.startTime,
    }])),
    knownCharacterIds: profileApplies ? coverProfile.initialContactCharacterIds.filter((id) => characters[id]) : Object.keys(characters),
    resolvedLeadIds: [],
    resolvedNarrativeEventIds: [],
    narrativeThreads: [],
    completedObjectiveIds: [],
    failedObjectiveIds: [],
    status: "active",
    stateVersion: 0,
    lastEventSeq: 0,
    playerEnergy: 100,
    playerStress: 0,
    personalSuspicion: 0,
    cover,
    characters,
    dialogueMemories,
    activeDialogue: null,
    pendingContact: null,
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
    interrogation: null,
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
    this.state.pendingContact ??= null;
    this.state.cover ??= createInitialCoverState();
    this.state.cover.profileId ??= "archive_clerk";
    if (this.state.activeDialogue) {
      this.state.activeDialogue.targetIntelId ??= null;
      this.state.activeDialogue.discoveredFields ??= [];
      this.state.activeDialogue.initiatedBy ??= this.state.activeDialogue.transcript[0]?.speaker === "npc" ? "npc" : "player";
    }
    this.state.discoveredLocationIds ??= [this.state.currentLocationId];
    for (const location of campaign.locations.filter((item) => item.radioSite?.initiallyAvailable)) {
      if (!this.state.discoveredLocationIds.includes(location.id)) this.state.discoveredLocationIds.push(location.id);
    }
    this.state.locationKnowledge ??= {};
    for (const location of campaign.locations) {
      this.state.locationKnowledge[location.id] ??= {
        stage: this.state.discoveredLocationIds.includes(location.id) ? "accessible" : "unknown",
        sourceEventId: null,
        hint: null,
        updatedAt: this.state.currentTime,
      };
    }
    this.state.knownCharacterIds ??= [];
    this.state.resolvedLeadIds ??= [];
    this.state.resolvedNarrativeEventIds ??= [];
    this.state.narrativeThreads ??= [];
    this.state.intel ??= {};
    for (const definition of campaign.intel) {
      this.state.intel[definition.id] ??= {
        id: definition.id,
        knownFields: [],
        confidence: 0,
        collectedSourceIds: [],
        evidence: [],
        deliveredFields: [],
        deliveredAt: null,
        deliveryMethod: null,
      };
    }
    this.state.completedObjectiveIds ??= campaign.objectives
      .filter((objective) => objectiveSatisfied(campaign, this.state, objective))
      .map((objective) => objective.id);
    this.state.failedObjectiveIds ??= [];
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
    this.state.interrogation ??= null;
    this.state.network.tasks ??= [];
    this.state.cover ??= createInitialCoverState();
    this.state.cover.completedRecordDates ??= [];
    this.state.cover.recordCreditMinutesByDate ??= {};
    this.state.cover.observations ??= [];
    this.state.cover.lastRecordEvaluatedDate ??= null;
    this.state.cover.leaveUntil ??= null;
    this.state.cover.leaveReason ??= null;
    this.state.cover.lastRecordAt ??= null;
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

    if (next.interrogation?.status === "pending" && Date.parse(next.currentTime) >= Date.parse(next.interrogation.dueAt)) {
      next.interrogation.status = "active";
      append("interrogation.started", { interrogationId: next.interrogation.id, interrogatorCharacterId: next.interrogation.interrogatorCharacterId });
    }
    if (next.interrogation?.status === "active" && action.type !== "interrogation_answer") {
      throw new Error("敌方盘问正在进行，必须先完成回答");
    }

    let narration = "";
    let npcReply: string | undefined;
    let elapsedDuration = action.durationMinutes;
    let energyRecovery = 0;
    switch (action.type) {
      case "dialogue_start": {
        const target = next.characters[action.targetCharacterId];
        const targetDefinition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!target || !targetDefinition || target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        if (!isCharacterAvailableAt(targetDefinition, next.currentTime)) throw new Error("该人物当前不在公开作息中，无法安排会面");
        if (!next.knownCharacterIds.includes(action.targetCharacterId)) throw new Error("尚未获得此人的引介或公开身份线索，不能直接攀谈");
        if (next.activeDialogue?.status === "active") throw new Error("Another dialogue is already active");
        const hasVerifiableIntel = this.campaign.intel.some((intel) => intel.sourceCharacterIds.includes(action.targetCharacterId) && (next.intel[intel.id]?.knownFields.length ?? 0) > 0);
        const availableGoals = getContextualDialogueGoals(target, { recruitable: targetDefinition.recruitable, hasVerifiableIntel });
        if (!availableGoals.includes(action.goal)) throw new Error("当前关系和已知信息不足以采用这个交谈目标");
        if (action.goal === "verify_intel") {
          if (!action.targetIntelId) throw new Error("核验对话必须选择具体情报");
          const intelDefinition = this.campaign.intel.find((item) => item.id === action.targetIntelId);
          if (!intelDefinition?.sourceCharacterIds.includes(action.targetCharacterId) || !next.intel[action.targetIntelId]?.knownFields.length) throw new Error("该人物无法核验所选情报");
        }
        const minTurns = action.allocatedMinutes / 2;
        next.activeDialogue = { id: action.idempotencyKey, characterId: action.targetCharacterId, initiatedBy: "player", goal: action.goal, tone: action.tone, targetIntelId: action.targetIntelId ?? null, allocatedMinutes: action.allocatedMinutes, elapsedMinutes: 0, maxTurns: minTurns, turnCount: 0, status: "active", discoveredFields: [], transcript: [] };
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
        const legacyAction = { type: "dialogue" as const, targetCharacterId: session.characterId, goal: session.goal, tone: session.tone, targetIntelId: session.targetIntelId ?? undefined, playerText: action.playerText, durationMinutes: 10, idempotencyKey: action.idempotencyKey, agentOutcome: action.agentOutcome };
        const groundedAgentReply = !action.agentOutcome || Boolean(
          action.agentOutcome.evidenceQuote
          && action.agentOutcome.visibleSpeech.includes(action.agentOutcome.evidenceQuote),
        );
        const earnedDiscoverySlots = session.turnCount < 2 ? 0 : Math.floor((session.turnCount - 2) / 5) + 1;
        const allowDiscovery = groundedAgentReply && (session.discoveredFields?.length ?? 0) < earnedDiscoverySlots;
        const discovery = resolveDialogue(this.campaign, next, definition, legacyAction, allowDiscovery, 0.25);
        const memory = next.dialogueMemories[definition.id];
        if (!memory) throw new Error("Dialogue memory is unavailable");
        memory.turns.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime });
        npcReply = action.agentOutcome?.visibleSpeech ?? generateNpcReply(this.campaign, definition, next, legacyAction, memory, discovery);
        memory.turns.push({ speaker: "npc", text: npcReply, at: next.currentTime });
        if (action.agentOutcome?.privateIntent) memory.lastPrivateIntent = action.agentOutcome.privateIntent;
        memory.turns = memory.turns.slice(-8); memory.interactionCount += 1; memory.lastGoal = session.goal; memory.summary = summarizeMemory(memory, definition);
        session.transcript.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime }, { speaker: "npc", text: npcReply, at: next.currentTime });
        if (discovery) session.discoveredFields = [...(session.discoveredFields ?? []), `${discovery.intelId}:${discovery.field}`];
        session.elapsedMinutes += 2; session.turnCount += 1;
        if (session.turnCount >= session.maxTurns) session.status = "completed";
        append("dialogue.turn_completed", {
          characterId: definition.id, goal: session.goal, playerText: action.playerText, npcReply,
          turnCount: session.turnCount, maxTurns: session.maxTurns,
          privateIntent: action.agentOutcome?.privateIntent,
          relationshipReaction: action.agentOutcome?.relationshipReaction ?? inferFallbackRelationshipReaction(definition, legacyAction),
          reactionReason: action.agentOutcome?.reactionReason,
          requestedEffects: action.agentOutcome?.requestedEffects ?? [],
        });
        recordCoverConversationCredit(next, action.durationMinutes, append);
        const contactWeight = session.goal === "apply_pressure" ? 3 : session.goal === "recruit_probe" || session.goal === "request_information" ? 2 : 1;
        recordInvestigationEvidence(next, "extended_contact", next.currentLocationId, contactWeight, append);
        if (discovery) {
          append("intel.dialogue_discovered", { characterId: definition.id, ...discovery });
          resolveCampaignLeads(this.campaign, next, append, "dialogue_discovery", definition.id);
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
      case "respond_to_contact": {
        const contact = next.pendingContact;
        if (!contact || contact.id !== action.contactId) throw new Error("主动接触已经失效");
        if (Date.parse(next.currentTime) >= Date.parse(contact.expiresAt)) throw new Error("对方已经离开，无法再回应这次接触");
        const sourceEvent = this.campaign.narrativeEvents?.find((event) => event.id === contact.eventId);
        const missingRequiredLead = sourceEvent?.trigger.requiredLeadIds?.some((id) => !next.resolvedLeadIds?.includes(id)) ?? false;
        if (missingRequiredLead) {
          next.pendingContact = null;
          next.resolvedNarrativeEventIds = next.resolvedNarrativeEventIds?.filter((id) => id !== contact.eventId) ?? [];
          append("director.contact_invalidated", { contactId: contact.id, eventId: contact.eventId, characterId: contact.characterId, reason: "required_public_lead_missing" });
          narration = "你很快确认这是一次信息错位：对方并没有理由就这件事来找你，本次接触已取消。";
          break;
        }
        const definition = this.campaign.characters.find((item) => item.id === contact.characterId);
        const character = next.characters[contact.characterId];
        if (!definition || !character) throw new Error("主动接触人物不存在");
        if (action.durationMinutes !== 0) throw new Error("回应主动接触不直接消耗时间");
        if (action.decision === "defer") {
          if (contact.deferrals >= 1) throw new Error("这次接触已经推迟过，必须作出决定");
          contact.deferrals += 1;
          contact.deferredUntil = addMinutes(next.currentTime, 30);
          append("director.contact_deferred", { contactId: contact.id, characterId: contact.characterId, deferredUntil: contact.deferredUntil });
          narration = `${definition.name}点点头，表示半小时后再来找你。`;
          break;
        }
        if (action.decision === "refuse") {
          character.privateTrust = clamp(character.privateTrust - 2, -100, 100);
          character.suspicionOfPlayer = clamp(character.suspicionOfPlayer + 2);
          next.pendingContact = null;
          append("director.contact_refused", { contactId: contact.id, characterId: contact.characterId, reason: contact.reason });
          narration = `${definition.name}没有继续追问，但显然记住了你的回避。`;
          break;
        }
        if (contact.deferredUntil && Date.parse(next.currentTime) < Date.parse(contact.deferredUntil)) throw new Error("约定的时间还没到");
        if (next.activeDialogue?.status === "active") throw new Error("Another dialogue is already active");
        if (character.locationId !== next.currentLocationId || !isCharacterAvailableAt(definition, next.currentTime)) throw new Error("对方此刻已经不在现场");
        const maxTurns = contact.allocatedMinutes / 2;
        next.activeDialogue = {
          id: action.idempotencyKey, characterId: contact.characterId, initiatedBy: "npc", goal: contact.goal, tone: contact.tone,
          targetIntelId: null, allocatedMinutes: contact.allocatedMinutes, elapsedMinutes: 0, maxTurns, turnCount: 0,
          status: "active", discoveredFields: [], transcript: [{ speaker: "npc", text: contact.openingLine, at: next.currentTime }],
        };
        const memory = next.dialogueMemories[contact.characterId];
        if (memory) {
          memory.turns.push({ speaker: "npc", text: contact.openingLine, at: next.currentTime });
          memory.turns = memory.turns.slice(-8);
        }
        next.pendingContact = null;
        append("director.contact_accepted", { contactId: contact.id, characterId: contact.characterId, reason: contact.reason });
        append("dialogue.started", { characterId: contact.characterId, goal: contact.goal, allocatedMinutes: contact.allocatedMinutes, maxTurns, proactive: true });
        narration = contact.openingLine;
        break;
      }
      case "countermeasure": {
        const requiredDuration = countermeasureDuration(action.kind);
        if (action.durationMinutes !== requiredDuration) throw new Error("反侦察行动耗时不符合规则");
        const availability = getCountermeasureOptions(this.campaign, next).find((item) => item.kind === action.kind);
        if (!availability?.available) throw new Error(availability?.reason ?? "当前无法执行这项反侦察行动");
        const currentHeat = next.investigation.locationHeat[next.currentLocationId] ?? 0;
        if (action.kind === "check_tail") {
          const wasWatched = next.investigation.surveillanceLocationIds.includes(next.currentLocationId) || currentHeat >= 6;
          next.investigation.locationHeat[next.currentLocationId] = clamp(currentHeat - (wasWatched ? 10 : 4));
          next.investigation.surveillanceLocationIds = next.investigation.surveillanceLocationIds.filter((id) => id !== next.currentLocationId);
          next.investigation.pressure = clamp(next.investigation.pressure - (wasWatched ? 6 : 2));
          next.playerStress = clamp(next.playerStress + 2);
          narration = wasWatched ? "你借橱窗反光和两次折返确认了尾巴，并在人群换向时甩开对方。" : "你绕行核对了几处视线，没有发现稳定跟踪者，但这段路耗费了时间。";
        } else if (action.kind === "reinforce_cover") {
          next.cover.credibility = clamp(next.cover.credibility + 6);
          next.cover.scrutiny = clamp(next.cover.scrutiny - 8);
          next.personalSuspicion = clamp(next.personalSuspicion - 4);
          next.investigation.pressure = clamp(next.investigation.pressure - 4);
          const summary = "你补齐了公开工作记录、往来凭据和可供同事复核的时间线。";
          addCoverObservation(next, "work_completed", summary);
          narration = summary;
        } else if (action.kind === "plant_decoy") {
          const targetId = action.targetLocationId;
          if (!targetId || targetId === next.currentLocationId || !next.discoveredLocationIds.includes(targetId)) throw new Error("必须选择另一个已解锁地点布置假线索");
          next.investigation.locationHeat[next.currentLocationId] = clamp(currentHeat - 7);
          next.investigation.locationHeat[targetId] = clamp((next.investigation.locationHeat[targetId] ?? 0) + 5);
          next.investigation.surveillanceLocationIds = next.investigation.surveillanceLocationIds.filter((id) => id !== next.currentLocationId);
          next.investigation.pressure = clamp(next.investigation.pressure - 3);
          next.network.exposure = clamp(next.network.exposure + 2 * next.difficulty.enemyResponseSpeed);
          narration = "你留下了一条能够被敌方发现、却无法直接指向组织成员的假行程。注意力暂时被引向别处。";
        } else {
          next.investigation.locationHeat[next.currentLocationId] = clamp(currentHeat - 12);
          next.investigation.pressure = clamp(next.investigation.pressure - 3);
          next.network.exposure = clamp(next.network.exposure - 4);
          next.playerStress = clamp(next.playerStress + 3);
          narration = "你分批转移了敏感纸张、密码材料和联络痕迹，没有把所有东西带在同一路线上。";
        }
        append("counterintelligence.completed", {
          kind: action.kind, locationId: next.currentLocationId, targetLocationId: action.targetLocationId,
          pressure: next.investigation.pressure, personalSuspicion: next.personalSuspicion, networkExposure: next.network.exposure,
          notice: narration,
        });
        break;
      }
      case "move": {
        const origin = this.campaign.locations.find((item) => item.id === next.currentLocationId);
        const destinationKnowledge = next.locationKnowledge?.[action.destinationId]?.stage;
        if (!next.discoveredLocationIds.includes(action.destinationId) || (destinationKnowledge && destinationKnowledge !== "accessible")) {
          throw new Error("Destination is not yet accessible");
        }
        if (!origin?.travelMinutes[action.destinationId]) throw new Error("Destination is not reachable from current location");
        if (action.durationMinutes !== origin.travelMinutes[action.destinationId]) throw new Error("Move duration does not match campaign travel time");
        append("player.moved", { from: next.currentLocationId, to: action.destinationId });
        next.currentLocationId = action.destinationId;
        narration = `你抵达了${this.campaign.locations.find((item) => item.id === action.destinationId)?.name ?? action.destinationId}。`;
        break;
      }
      case "observe": {
        const target = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!target || !definition) throw new Error("Unknown character");
        if (target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        if (!isCharacterAvailableAt(definition, next.currentTime)) throw new Error("目标已离开公开活动地点");
        target.familiarity = clamp(target.familiarity + 2);
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
        if (!isIntelUnlocked(this.campaign, next, action.intelId)) throw new Error("该情报所属的后续任务尚未解锁");
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
        const mode = action.mode ?? "automatic";
        if (next.difficulty.id === "iron_curtain" && mode !== "manual") throw new Error("铁幕模式必须由玩家完成摩尔斯发报");
        if (mode === "manual") validateRadioPerformance(action.manualPerformance);
        if (action.locationId !== next.currentLocationId) throw new Error("必须先抵达选定的发报地点");
        const siteRisk = radioSiteRisk(this.campaign, next, action.locationId);
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
        const retransmission = [...next.radio.transmissions].reverse().find((transmission) =>
          (transmission.receiptStatus === "partial" || transmission.receiptStatus === "no_receipt")
          && items.some((item) => transmission.items.some((previous) => previous.intelId === item.intelId && item.fields.some((field) => previous.fields.includes(field)))),
        );
        const baselineOperationMinutes = Math.max(20, radioOperationMinutes(fieldCount, action.format, action.codebookId) - (retransmission ? 10 : 0));
        const performanceTimeDelta = mode === "manual"
          ? action.manualPerformance!.grade === "excellent" ? -10 : action.manualPerformance!.grade === "rough" ? 10 : 0
          : 0;
        const interruptionTimeMinutes = mode === "manual" ? action.manualPerformance!.interruptionTimeMinutes ?? 0 : 0;
        const operationMinutes = Math.max(20, baselineOperationMinutes + performanceTimeDelta + interruptionTimeMinutes);
        elapsedDuration = waitMinutes + operationMinutes;
        const completedAt = addMinutes(next.currentTime, elapsedDuration);
        const receiptDueAt = addMinutes(completedAt, action.timing === "scheduled" ? 20 : 40);
        const repeatedCodebook = codebook.usageCount > 0 && codebook.id === "book_cipher";
        const performanceSignalDelta = mode === "manual"
          ? action.manualPerformance!.errorCount * 1.5 + action.manualPerformance!.correctionCount * 0.5 + (action.manualPerformance!.grade === "excellent" ? -3 : 0) + (action.manualPerformance!.interruptionRiskDelta ?? 0)
          : 0;
        const signalWeight = Math.max(1, Math.round(siteRisk + operationMinutes / 3 + (action.timing === "immediate" ? 8 : 0) + (repeatedCodebook ? 6 : 0) + (retransmission ? 4 : 0) + performanceSignalDelta));
        const exposureBefore = next.network.exposure;
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
          mode,
          ...(mode === "manual" ? { morse: action.manualPerformance } : {}),
          signalWeight,
          exposureDelta: 0,
          warningSigns: radioWarningSigns(signalWeight, Boolean(retransmission), action.manualPerformance?.interruptionDecisions?.length ?? 0),
          retransmissionOfId: retransmission?.id ?? null,
        });
        next.radio.transmissions = next.radio.transmissions.slice(-30);
        next.network.exposure = clamp(next.network.exposure + signalWeight * 0.3 * next.difficulty.enemyResponseSpeed);
        next.radio.transmissions.at(-1)!.exposureDelta = Number((next.network.exposure - exposureBefore).toFixed(1));
        next.personalSuspicion = clamp(next.personalSuspicion + Math.max(1, siteRisk / 4) * next.difficulty.enemyResponseSpeed);
        recordInvestigationEvidence(next, "radio_signal", action.locationId, signalWeight, append);
        append("radio.message_sent", { transmissionId: action.idempotencyKey, items, format: action.format, codebookId: action.codebookId, timing: action.timing, locationId: action.locationId, fieldCount, durationMinutes: elapsedDuration, receiptDueAt, mode, morse: mode === "manual" ? action.manualPerformance : undefined });
        narration = `电文已在${elapsedDuration}分钟内完成编码、发送和清理。组织回执预计稍后抵达。`;
        break;
      }
      case "abort_radio_message": {
        if (action.locationId !== next.currentLocationId) throw new Error("发报地点已经变化，不能处置原来的电台现场");
        const riskDelta = action.riskDelta;
        if (action.durationMinutes !== 10 || riskDelta === undefined || !Number.isFinite(riskDelta) || riskDelta < 1 || riskDelta > 10) throw new Error("销毁电文参数无效");
        const siteRisk = radioSiteRisk(this.campaign, next, action.locationId);
        if (siteRisk === null) throw new Error("当前地点无法处置发报现场");
        elapsedDuration = 10;
        const signalWeight = Math.round(siteRisk * 0.4 + riskDelta);
        next.network.exposure = clamp(next.network.exposure + signalWeight * 0.15 * next.difficulty.enemyResponseSpeed);
        recordInvestigationEvidence(next, "radio_signal", action.locationId, signalWeight, append);
        append("radio.operation_aborted", { locationId: action.locationId, interruptionId: action.interruptionId, durationMinutes: elapsedDuration, signalWeight });
        notices.push("你切断电源、销毁电文并清理现场。本次情报没有发出。敌方可能捕捉到短暂信号。");
        narration = "电台已经停机，未完成的电文被销毁。";
        break;
      }
      case "dialogue": {
        const target = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!target || !definition) throw new Error("Unknown character");
        if (target.locationId !== next.currentLocationId) throw new Error("Target is not at the current location");
        if (!isCharacterAvailableAt(definition, next.currentTime)) throw new Error("该人物当前不在公开作息中，无法安排会面");
        if (!next.knownCharacterIds.includes(action.targetCharacterId)) throw new Error("尚未获得此人的引介或公开身份线索，不能直接攀谈");
        const hasVerifiableIntel = this.campaign.intel.some((intel) => intel.sourceCharacterIds.includes(action.targetCharacterId) && (next.intel[intel.id]?.knownFields.length ?? 0) > 0);
        if (!getContextualDialogueGoals(target, { recruitable: definition.recruitable, hasVerifiableIntel }).includes(action.goal)) throw new Error("当前关系和已知信息不足以采用这个交谈目标");
        const textLimit = DIALOGUE_TEXT_LIMITS[action.goal];
        if (action.playerText.trim().length === 0) throw new Error("对话内容不能为空");
        if (action.playerText.length > textLimit) throw new Error(`“${action.goal}”每轮发言最多 ${textLimit} 个字符`);
        const minimumDialogueDuration = action.goal === "small_talk" ? 10 : action.goal === "build_trust" || action.goal === "probe_attitude" || action.goal === "verify_intel" ? 20 : 30;
        if (action.durationMinutes < minimumDialogueDuration) throw new Error("Dialogue duration is too short for this goal");
        const groundedAgentReply = !action.agentOutcome || Boolean(
          action.agentOutcome.evidenceQuote
          && action.agentOutcome.visibleSpeech.includes(action.agentOutcome.evidenceQuote),
        );
        const discovery = resolveDialogue(this.campaign, next, definition, action, groundedAgentReply);
        const memory = next.dialogueMemories[definition.id];
        if (memory) {
          memory.turns.push({ speaker: "player", text: action.playerText.trim(), at: next.currentTime });
          npcReply = action.agentOutcome?.visibleSpeech ?? generateNpcReply(this.campaign, definition, next, action, memory, discovery);
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
          relationshipReaction: action.agentOutcome?.relationshipReaction ?? inferFallbackRelationshipReaction(definition, action),
          reactionReason: action.agentOutcome?.reactionReason,
          requestedEffects: action.agentOutcome?.requestedEffects ?? [],
        });
        if (discovery) {
          append("intel.dialogue_discovered", { characterId: definition.id, ...discovery });
          resolveCampaignLeads(this.campaign, next, append, "dialogue_discovery", definition.id);
        }
        if (action.goal === "recruit_probe") append("character.recruitment_progress", { characterId: definition.id, progress: next.characters[definition.id].recruitmentProgress, recruited: next.characters[definition.id].recruited });
        narration = dialogueNarration(next, definition, action, discovery !== null);
        break;
      }
      case "propose_cooperation_request": {
        if (action.durationMinutes !== 0) throw new Error("提出合作请求不直接推进时间");
        const member = next.characters[action.memberId];
        const definition = this.campaign.characters.find((item) => item.id === action.memberId);
        if (!member?.recruited || !definition || !next.network.activeMemberIds.includes(action.memberId)) throw new Error("该人物尚未与玩家建立有效合作关系");
        if (member.exposed || next.network.compromisedMemberIds.includes(action.memberId)) throw new Error("该人物当前处境异常，无法安全提出新的合作请求");
        if (next.network.tasks.some((task) => task.memberId === action.memberId && ["awaiting_confirmation", "countered", "active"].includes(task.status))) throw new Error("该人物已有一项尚未结束的合作事项");
        validateComradeTaskTarget(this.campaign, next, action.kind, action.targetId);
        validateCooperationTerms(action.terms);
        const authoritativeResponse = evaluateCooperationRequest(definition, member, action);
        const response = action.agentResponse?.decision === authoritativeResponse.decision
          ? { ...authoritativeResponse, message: sanitizeCooperationMessage(action.agentResponse.message, authoritativeResponse.message) }
          : authoritativeResponse;
        const status = response.decision === "accept" ? "awaiting_confirmation" : response.decision === "counter" ? "countered" : "declined";
        next.network.tasks.push({
          id: action.idempotencyKey,
          memberId: action.memberId,
          kind: action.kind,
          targetId: action.targetId,
          requestedApproach: action.approach,
          status,
          requestedAt: next.currentTime,
          terms: structuredClone(action.terms),
          response,
          commitment: null,
          completedAt: null,
          report: null,
        });
        append("comrade.request_responded", { requestId: action.idempotencyKey, memberId: action.memberId, kind: action.kind, targetId: action.targetId, decision: response.decision, message: response.message });
        narration = `${definition.name}回应：“${response.message}”`;
        break;
      }
      case "confirm_cooperation_request": {
        if (action.durationMinutes !== 0) throw new Error("确认合作承诺不直接推进时间");
        const task = next.network.tasks.find((item) => item.id === action.requestId);
        if (!task || !["awaiting_confirmation", "countered"].includes(task.status)) throw new Error("当前没有可确认的合作条件");
        const approach = task.response.proposedApproach ?? task.requestedApproach;
        const exchange = task.response.requestedExchange ?? task.terms.exchange;
        const taskMinutes = comradeTaskMinutes(task.kind, approach);
        task.status = "active";
        task.commitment = { agreedAt: next.currentTime, approach, exchange, dueAt: addMinutes(next.currentTime, taskMinutes) };
        if (next.characters[task.memberId]) next.characters[task.memberId].agentTier = "active";
        append("comrade.commitment_confirmed", { requestId: task.id, memberId: task.memberId, kind: task.kind, targetId: task.targetId, approach, exchange, taskMinutes });
        narration = "双方确认了行动范围、联络方式和中止条件。对方将按自己的判断开始行动。";
        break;
      }
      case "cancel_cooperation_request": {
        if (action.durationMinutes !== 0) throw new Error("撤回合作请求不直接推进时间");
        const task = next.network.tasks.find((item) => item.id === action.requestId);
        if (!task || !["awaiting_confirmation", "countered", "active"].includes(task.status)) throw new Error("当前合作事项无法撤回");
        const wasActive = task.status === "active";
        task.status = "cancelled";
        task.completedAt = next.currentTime;
        task.report = wasActive ? "合作请求已通过约定渠道撤回，但对方能否立即脱身仍取决于现场情况。" : "双方没有形成最终承诺，这项合作请求已经撤回。";
        if (next.characters[task.memberId]) next.characters[task.memberId].agentTier = "background";
        append("comrade.request_cancelled", { requestId: task.id, memberId: task.memberId, wasActive });
        narration = task.report;
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
        if (action.testType !== "background_check" && !isCharacterAvailableAt(definition, next.currentTime)) throw new Error("候选人当前不在公开作息中，无法安排当面测试");
        if (action.testType === "low_risk_task" && character.recruitmentProgress < 20) throw new Error("尚未形成初步合作意向，不能安排低风险任务");

        validateRecruitmentPlan(action.plan);
        const result = evaluateRecruitmentTest(definition, action.testType, action.plan);
        const executionReport = action.agentReport ?? buildRecruitmentExecutionReport(
          definition, action.testType, result, action.plan, action.durationMinutes, next.investigation.pressure,
        );
        const evidence = {
          id: action.idempotencyKey,
          testType: action.testType,
          result,
          summary: recruitmentEvidenceSummary(action.testType, result),
          observedAt: next.currentTime,
          plan: action.plan,
          executionReport,
        };
        character.recruitmentCase.completedTestTypes.push(action.testType);
        character.recruitmentCase.evidence.push(evidence);
        character.recruitmentCase.stage = character.recruitmentCase.completedTestTypes.length >= 3 && character.recruitmentProgress >= 20 ? "ready" : "screening";
        character.recruitmentProgress = clamp(character.recruitmentProgress + (result === "favorable" ? 12 : result === "inconclusive" ? 7 : 3), 0, 90);
        const riskWeight = action.testType === "controlled_leak" ? 8 : action.testType === "low_risk_task" ? 5 : 3;
        recordInvestigationEvidence(next, action.testType === "background_check" ? "covert_observation" : "sensitive_notes", next.currentLocationId, riskWeight, append);
        if (action.testType === "controlled_leak") next.network.exposure = clamp(next.network.exposure + 3 * next.difficulty.enemyResponseSpeed);
        append("recruitment.test_completed", { characterId: character.id, evidence });
        narration = `${evidence.summary} 详细执行记录已经归入候选人档案。`;
        break;
      }
      case "recruit_candidate": {
        const character = next.characters[action.targetCharacterId];
        const definition = this.campaign.characters.find((item) => item.id === action.targetCharacterId);
        if (!character || !definition || !definition.recruitable) throw new Error("该人物不在可招募候选名单中");
        if (action.durationMinutes !== 30) throw new Error("正式招募需要 30 分钟");
        if (character.locationId !== next.currentLocationId) throw new Error("正式招募必须当面进行");
        if (!isCharacterAvailableAt(definition, next.currentTime)) throw new Error("候选人当前不在公开作息中，无法安排会面");
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
      case "cover_work": {
        const profile = getCoverProfile(next.cover.profileId);
        if (!profile.workLocationIds.includes(next.currentLocationId)) throw new Error(`公开工作需要在${profile.title}的活动范围内完成`);
        if (!isCoverWorkHours(next.currentTime, next.cover.profileId)) throw new Error("当前不在公开工作时段");
        if (!profile.workKinds.includes(action.workKind)) throw new Error("该工作不属于当前公开身份");
        if (next.cover.leaveUntil && new Date(next.cover.leaveUntil) >= new Date(next.currentTime)) throw new Error("请假期间不能安排公开工作");
        const requiredDuration = coverWorkMinutes(action.workKind);
        if (action.durationMinutes !== requiredDuration) throw new Error("公开工作耗时不符合规则");
        const date = coverDate(next.currentTime);
        if (next.cover.completedRecordDates.includes(date)) throw new Error("今天已经形成过公开记录");
        next.cover.completedRecordDates.push(date);
        next.cover.completedRecordDates = next.cover.completedRecordDates.slice(-30);
        next.cover.recordStatus = "recorded";
        next.cover.consecutiveRecordGaps = 0;
        next.cover.lastRecordAt = addMinutes(next.currentTime, action.durationMinutes);
        const benefit = coverWorkBenefit(action.workKind);
        next.cover.credibility = clamp(next.cover.credibility + benefit);
        next.cover.scrutiny = clamp(next.cover.scrutiny - (action.workKind === "submit_report" ? 8 : 4));
        next.personalSuspicion = clamp(next.personalSuspicion - 1);
        const summary = coverWorkSummary(action.workKind);
        addCoverObservation(next, "work_completed", summary);
        append("cover.work_completed", { workKind: action.workKind, summary });
        const leadHints = resolveCampaignLeads(this.campaign, next, append, "cover_work", undefined, next.cover.profileId, action.workKind);
        narration = leadHints.length > 0 ? `${summary}\n${leadHints.join("\n")}` : summary;
        break;
      }
      case "request_leave": {
        const profile = getCoverProfile(next.cover.profileId);
        if (!profile.accountability.allowsLeave) throw new Error(`${profile.title}没有固定考勤，不需要办理请假；请通过${profile.routineLabel}留下可核验的公开记录`);
        if (!profile.workLocationIds.includes(next.currentLocationId)) throw new Error("需要在公开身份的活动范围内安排请假");
        if (!isCoverWorkHours(next.currentTime, next.cover.profileId)) throw new Error("当前无法办理请假");
        if (action.durationMinutes !== 10) throw new Error("办理请假需要 10 分钟");
        if (next.cover.leaveUntil && new Date(next.cover.leaveUntil) >= new Date(next.currentTime)) throw new Error("当前已有生效中的请假记录");
        next.cover.leaveUntil = endOfCoverShift(next.currentTime, next.cover.profileId);
        next.cover.leaveReason = action.reason;
        next.cover.leaveCount += 1;
        next.cover.recordStatus = "excused";
        next.cover.credibility = clamp(next.cover.credibility - 2);
        next.cover.scrutiny = clamp(next.cover.scrutiny + (next.cover.leaveCount > 1 ? 2 : 0));
        const summary = `你的${leaveReasonLabel(action.reason)}请假已登记，今天的缺席将有公开记录。`;
        addCoverObservation(next, "leave_approved", summary);
        append("cover.leave_approved", { reason: action.reason, leaveUntil: next.cover.leaveUntil, summary });
        narration = summary;
        break;
      }
      case "wait":
        append("player.waited", { durationMinutes: action.durationMinutes });
        narration = "时间继续向前，城市中的其他人也在行动。";
        break;
      case "rest": {
        if (action.durationMinutes !== 0) throw new Error("Rest duration is calculated by the server");
        const availability = getRestAvailability(this.campaign, next);
        if (!availability.available) throw new Error(availability.reason);
        const rest = calculateRest(action.sleepMinutes);
        if (!rest) throw new Error("休息时长必须为一至十二小时，且以三十分钟为单位");
        elapsedDuration = rest.minutes;
        energyRecovery = rest.recovery;
        append("player.rested", { durationMinutes: rest.minutes, recovery: rest.recovery });
        narration = `你收起了当天的行动安排，休息了 ${formatRestDuration(rest.minutes)}。`;
        break;
      }
      case "interrogation_answer": {
        const interrogation = next.interrogation;
        if (!interrogation || interrogation.status !== "active" || interrogation.id !== action.interrogationId) throw new Error("当前没有对应的盘问");
        if (action.durationMinutes !== 10) throw new Error("每次盘问回答耗时 10 分钟");
        const text = action.playerText.trim();
        if (text.length < 4 || text.length > 300) throw new Error("盘问回答应为 4 至 300 个字符");
        const question = interrogation.questions[interrogation.answers.length];
        if (!question) throw new Error("盘问问题已经回答完毕");
        interrogation.consistency = clamp(interrogation.consistency + interrogationAnswerScore(next, action.strategy, text), 0, 100);
        interrogation.answers.push({ question, text, strategy: action.strategy, at: next.currentTime });
        append("interrogation.answer_recorded", { interrogationId: interrogation.id, questionNumber: interrogation.answers.length, strategy: action.strategy, consistency: interrogation.consistency });
        if (interrogation.answers.length >= interrogation.questions.length) {
          interrogation.status = "resolved";
          interrogation.outcome = interrogation.consistency >= 62 ? "cleared" : interrogation.consistency >= 42 ? "watched" : "compromised";
          if (interrogation.outcome === "cleared") {
            next.personalSuspicion = clamp(next.personalSuspicion - 8);
            next.investigation.pressure = clamp(next.investigation.pressure - 10);
            narration = "你的说法与公开记录基本吻合。韩世杰暂时放下笔，但仍提醒你不要离城。";
          } else if (interrogation.outcome === "watched") {
            next.personalSuspicion = clamp(next.personalSuspicion + 5 * next.difficulty.enemyResponseSpeed);
            narration = "韩世杰没有抓住明确破绽，却将你的名字留在了继续观察的名单上。";
          } else {
            next.personalSuspicion = clamp(next.personalSuspicion + 15 * next.difficulty.enemyResponseSpeed);
            next.cover.scrutiny = clamp(next.cover.scrutiny + 12);
            next.investigation.pressure = clamp(next.investigation.pressure + 10);
            narration = "前后说法出现明显漏洞。韩世杰要求补查你的考勤、来往和近期出入记录。";
          }
          append("interrogation.resolved", { interrogationId: interrogation.id, outcome: interrogation.outcome, consistency: interrogation.consistency });
        } else {
          narration = `韩世杰没有评价，只翻到下一页：“${interrogation.questions[interrogation.answers.length]}”`;
        }
        break;
      }
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
        ...advancePendingContact(this.campaign, next, append),
        ...advanceComradeTasks(this.campaign, next, append),
        ...advanceRadioReceipts(next, append),
        ...advanceMissionObjectives(this.campaign, next, append),
        ...advanceCoverIdentity(next, append),
        ...advanceInterrogation(next, append),
        ...advanceEnemyInvestigation(next, append, action),
        ...advanceNarrativeEvents(this.campaign, next, append, true),
      ];
      notices.push(...tickNotices);
      if (next.activeDialogue && tickNotices.length > 0) {
        next.activeDialogue.transcript.push(...tickNotices.map((text) => ({ speaker: "system" as const, text, at: next.currentTime })));
      }
      if (next.activeDialogue?.status === "active" && next.interrogation?.status === "active") {
        next.activeDialogue.status = "completed";
        const notice = "警备处的传唤打断了交谈，你必须立即去接受盘问。";
        next.activeDialogue.transcript.push({ speaker: "system", text: notice, at: next.currentTime });
        append("dialogue.interrupted", { characterId: next.activeDialogue.characterId, reason: "interrogation" });
        notices.push(notice);
      }
      if (next.activeDialogue?.status === "active") {
        const speaker = this.campaign.characters.find((character) => character.id === next.activeDialogue?.characterId);
        if (speaker && !isCharacterAvailableAt(speaker, next.currentTime)) {
          next.activeDialogue.status = "completed";
          const notice = `${speaker.name}结束了交谈，按自己的作息离开了公开场所。`;
          next.activeDialogue.transcript.push({ speaker: "system", text: notice, at: next.currentTime });
          append("dialogue.interrupted", { characterId: speaker.id, reason: "schedule" });
          notices.push(notice);
        }
      }
    }
    next.currentTime = finalTime;
    notices.push(...advanceMissionObjectives(this.campaign, next, append));
    notices.push(...advanceNarrativeEvents(this.campaign, next, append, false));
    resolveCompletedNarrativeThreads(this.campaign, next, append);
    next.playerEnergy = action.type === "rest"
      ? clamp(next.playerEnergy + energyRecovery)
      : clamp(next.playerEnergy - actionEnergyCost(action, elapsedDuration, previousTime));
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
  campaign: CampaignDefinition,
  definition: CampaignDefinition["characters"][number],
  state: WorldState,
  action: Extract<GameAction, { type: "dialogue" }>,
  memory: NonNullable<WorldState["dialogueMemories"][string]>,
  discovery: { intelId: string; field: string; verified: boolean; assessment: string } | null,
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
    return selectFallbackReply(memory, smallTalk, action.idempotencyKey);
  }
  if (action.goal === "apply_pressure") return selectFallbackReply(memory, [
    "你问得太直接了。这里不是说这种话的地方。",
    "声音放低些。你要的是回答，还是只想看我慌不慌？",
    "逼我现在表态，对你我都没有好处。换个能说清楚的问题。",
  ], action.idempotencyKey);
  if (discovery) {
    return groundedFallbackDisclosure(campaign, definition, discovery, state);
  }
  if (action.goal === "request_information") {
    const prompts = fallbackInformationPrompts(definition.id);
    return selectFallbackReply(memory, prompts, action.idempotencyKey);
  }
  if (action.goal === "recruit_probe") return selectFallbackReply(memory, [
    "这种话不能靠一时热心。先看你遇到麻烦时会不会守住分寸。",
    "别急着把关系说得太近。真想帮忙，就先把一件不惹眼的小事做好。",
    "我听懂了，但现在还不到答应的时候。日子久了，自然看得出彼此是什么人。",
  ], action.idempotencyKey);
  if (action.goal === "build_trust") {
    const replies = /合作|什么意思|不明白|普通人/.test(playerText)
      ? [
        "我说的是往后办事时彼此把话说明白，不是要你答应什么。你若觉得不妥，就当这话没说。",
        "你不用多想。我只是希望经手事情时少些含糊，免得最后谁也说不清。",
      ]
      : /笔迹|仿照|没写过|封面/.test(playerText)
        ? [
          "既然你不认这笔迹，先别急着下结论。想想最后一次见到这份东西是什么时候，还有谁碰过它。",
          "仿得像反而麻烦。先把经手时间和见过封面的人记下来，别当场惊动旁人。",
        ]
        : /准确|档案|查|核对|职责|工作/.test(playerText)
          ? [
            "按职责核对没有错。我只是要确认你查到异常时会先找谁，免得一份记录惊动太多人。",
            "这理由说得通。那就照你的规矩来，但碰到前后对不上的地方，先把原件留在桌上。",
          ]
          : /去看|查看|看看|查一下/.test(playerText)
            ? [
              "你先去看也好。回来只告诉我页码和经手栏有没有改动，别先问旁人。",
              "可以，但先记住现在的样子。真有出入，贸然追问只会让经手人有准备。",
            ]
            : [
              "我不是要你立刻表态。先把眼前这件事说清楚，往后才知道彼此能不能放心。",
              "话说得漂亮没有用。我更在意出了差错以后，你会先遮掩还是先把来龙去脉查明白。",
              "先按你认为稳妥的办法做。结果如何，比现在说什么都更能说明问题。",
            ];
    return selectFallbackReply(memory, replies, action.idempotencyKey);
  }
  if (action.goal === "probe_attitude") return selectFallbackReply(memory, [
    "立场两个字太大了。我只看一件事：出了麻烦，你先保自己，还是先想会牵连谁。",
    "你若想听一句痛快话，恐怕要失望。人在这里做事，先得知道什么话会害人。",
    "我不替任何口号作保证。你可以看我怎么做，再决定还要不要问。",
  ], action.idempotencyKey);
  if (action.goal === "verify_intel") return selectFallbackReply(memory, [
    "方向大致没错，但还缺一个能和记录对上的细节。",
    "先别把它当成定论。日期、经手人和原始出处，至少还要再对上一项。",
    "我只能确认这件事有迹可查，不能替你保证听来的每句话都是真的。",
  ], action.idempotencyKey);
  return `${habit}，我听见了。关于这件事，我现在只能说到这里。`;
}

function selectFallbackReply(
  memory: NonNullable<WorldState["dialogueMemories"][string]>,
  candidates: string[],
  seed: string,
): string {
  const recent = new Set(memory.turns.filter((turn) => turn.speaker === "npc").slice(-3).map((turn) => turn.text.trim()));
  const start = stableRoll(`${seed}:${memory.interactionCount}`) % candidates.length;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length];
    if (!recent.has(candidate.trim())) return candidate;
  }
  return candidates[start];
}

function summarizeMemory(memory: NonNullable<WorldState["dialogueMemories"][string]>, definition: CampaignDefinition["characters"][number]): string {
  const personality = definition.personality ?? { speechStyle: "克制" };
  const latest = memory.turns.filter((turn) => turn.speaker === "player").at(-1)?.text ?? "";
  return `${definition.name}已与玩家交谈${memory.interactionCount}次；最近话题是“${latest.slice(0, 40)}”，保持${personality.speechStyle}的说话方式。`;
}

function resolveCampaignLeads(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
  trigger: "cover_work" | "dialogue_discovery",
  characterId?: string,
  profileId?: WorldState["cover"]["profileId"],
  workKind?: Extract<GameAction, { type: "cover_work" }>["workKind"],
): string[] {
  const resolved = state.resolvedLeadIds ?? (state.resolvedLeadIds = []);
  const leads = campaign.publicLeads ?? [];
  const hints: string[] = [];

  for (const lead of leads) {
    if (lead.trigger !== trigger || resolved.includes(lead.id)) continue;
    if (lead.profileIds?.length && !lead.profileIds.includes(state.cover.profileId)) continue;
    if (trigger === "cover_work" && (lead.profileId !== profileId || lead.workKind !== workKind)) continue;
    if (trigger === "dialogue_discovery" && lead.characterId !== characterId) continue;

    for (const locationId of lead.locationIds) {
      if (!campaign.locations.some((location) => location.id === locationId) || state.discoveredLocationIds.includes(locationId)) continue;
      state.discoveredLocationIds.push(locationId);
      state.locationKnowledge ??= {};
      state.locationKnowledge[locationId] = {
        stage: "accessible",
        sourceEventId: lead.id,
        hint: lead.hint,
        updatedAt: state.currentTime,
      };
      const location = campaign.locations.find((item) => item.id === locationId);
      append("location.discovered", { locationId, locationName: location?.name, stage: "accessible", leadId: lead.id, hint: lead.hint, sourceCharacterId: characterId });
    }
    for (const introducedCharacterId of lead.characterIds) {
      if (!state.characters[introducedCharacterId] || state.knownCharacterIds.includes(introducedCharacterId)) continue;
      state.knownCharacterIds.push(introducedCharacterId);
      const introduced = campaign.characters.find((item) => item.id === introducedCharacterId);
      append("character.introduced", { characterId: introducedCharacterId, characterName: introduced?.name, publicIdentity: introduced?.publicIdentity, leadId: lead.id, hint: lead.hint, sourceCharacterId: characterId });
    }
    resolved.push(lead.id);
    append("lead.resolved", { leadId: lead.id, trigger, hint: lead.hint, sourceCharacterId: characterId, profileId, workKind });
    hints.push(`线索：${lead.hint}`);
  }
  return hints;
}

function fallbackInformationPrompts(characterId: string): string[] {
  const prompts: Record<string, string[]> = {
    "chen-jingwen": ["档案上的事，先说清楚调阅事由和经手科室。", "没有档号和签章，我不能凭一句话替你翻底册。"],
    "zhou-qiming": ["设备的事要看编号和检修日期，光凭传闻判断不了。", "把参数说具体些，我才能判断是哪一批机器。"],
    "zhao-fusheng": ["码头的底账不认人情，只认回执日期、货主和班次。", "你先说是哪一班货，我再看看手里的收货记录。"],
    "lin-ruolan": ["稿件可以谈，但信源和公开记录至少要能对上一处。", "先把消息的来路说清楚，我才知道它能不能见报。"],
  };
  return prompts[characterId] ?? ["把日期、编号和经手人说清楚，我才能替你核对。", "这件事不能只凭传闻，先给我一个可核对的细节。"];
}

function groundedFallbackDisclosure(
  campaign: CampaignDefinition,
  character: CampaignDefinition["characters"][number],
  discovery: { intelId: string; field: string; verified: boolean },
  state: WorldState,
): string {
  const definition = campaign.intel.find((item) => item.id === discovery.intelId);
  const fieldLabel = definition?.fieldLabels?.[discovery.field] ?? discovery.field;
  const fieldValue = definition?.fieldValues?.[discovery.field];
  const evidence = state.intel[discovery.intelId]?.evidence
    .find((item) => item.field === discovery.field && item.sourceId === character.id);
  const detail = fieldValue
    ? `${fieldLabel}记的是“${fieldValue}”。`
    : evidence?.summary ?? "这条记录我只见过一次，还需要你另找来源核对。";
  return discovery.verified ? `我重新核过了。${detail}` : `我只说我亲眼见到的：${detail}`;
}

function advanceNarrativeEvents(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
  allowContact: boolean,
): string[] {
  const resolved = state.resolvedNarrativeEventIds ?? (state.resolvedNarrativeEventIds = []);
  const notices: string[] = [];

  for (const event of campaign.narrativeEvents ?? []) {
    if (resolved.includes(event.id)) continue;
    const trigger = event.trigger;
    if (trigger.notBefore && new Date(state.currentTime) < new Date(trigger.notBefore)) continue;
    if (!(trigger.requiredEventIds ?? []).every((id) => resolved.includes(id))) continue;
    if (!(trigger.requiredLeadIds ?? []).every((id) => state.resolvedLeadIds?.includes(id))) continue;
    if (!(trigger.requiredCompletedObjectiveIds ?? []).every((id) => state.completedObjectiveIds?.includes(id))) continue;
    if (state.investigation.pressure < (trigger.minInvestigationPressure ?? 0)) continue;
    if (state.investigation.pressure > (trigger.maxInvestigationPressure ?? 100)) continue;
    if (trigger.type === "relationship") {
      if (!trigger.characterId) continue;
      const character = state.characters[trigger.characterId];
      const memory = state.dialogueMemories[trigger.characterId];
      if (!character || !memory) continue;
      if (character.familiarity < (trigger.minFamiliarity ?? 0)) continue;
      if (character.privateTrust < (trigger.minPrivateTrust ?? -100)) continue;
      if (memory.interactionCount < (trigger.minInteractionCount ?? 0)) continue;
    }
    const contact = event.effects.contact;
    if (contact) {
      const definition = campaign.characters.find((item) => item.id === contact.characterId);
      const character = state.characters[contact.characterId];
      if (!allowContact || state.pendingContact || state.activeDialogue?.status === "active" || state.interrogation?.status === "active") continue;
      if (!definition || !character || !state.knownCharacterIds.includes(contact.characterId)) continue;
      if (character.locationId !== state.currentLocationId || !isCharacterAvailableAt(definition, state.currentTime)) continue;
    }

    state.locationKnowledge ??= {};
    for (const effect of event.effects.locations ?? []) {
      const current = state.locationKnowledge[effect.locationId];
      const nextStage = chooseLocationKnowledgeStage(current?.stage ?? "unknown", effect.stage);
      if (current?.stage === nextStage) continue;
      state.locationKnowledge[effect.locationId] = {
        stage: nextStage,
        sourceEventId: event.id,
        hint: effect.hint,
        updatedAt: state.currentTime,
      };
      if (nextStage === "accessible" && !state.discoveredLocationIds.includes(effect.locationId)) {
        state.discoveredLocationIds.push(effect.locationId);
      }
      const location = campaign.locations.find((item) => item.id === effect.locationId);
      append("location.stage_changed", { locationId: effect.locationId, locationName: nextStage === "rumored" ? undefined : location?.name, stage: nextStage, eventId: event.id, hint: effect.hint });
    }
    for (const characterId of event.effects.introduceCharacterIds ?? []) {
      if (!state.characters[characterId] || state.knownCharacterIds.includes(characterId)) continue;
      state.knownCharacterIds.push(characterId);
      const introduced = campaign.characters.find((item) => item.id === characterId);
      append("character.introduced", { characterId, characterName: introduced?.name, publicIdentity: introduced?.publicIdentity, eventId: event.id, hint: event.visibleSummary });
    }
    if (event.effects.thread) {
      state.narrativeThreads ??= [];
      const existing = state.narrativeThreads.find((thread) => thread.id === event.effects.thread?.id);
      const thread: NarrativeThreadState = {
        ...event.effects.thread,
        status: event.effects.thread.status ?? "active",
        sourceEventId: event.id,
        updatedAt: state.currentTime,
      };
      if (existing) Object.assign(existing, thread);
      else state.narrativeThreads.push(thread);
      append("narrative.thread_updated", thread);
    }
    if (contact) {
      const definition = campaign.characters.find((item) => item.id === contact.characterId)!;
      state.pendingContact = {
        id: `${event.id}:${state.lastEventSeq + 1}`,
        eventId: event.id,
        characterId: contact.characterId,
        reason: contact.reason,
        openingLine: contact.openingLine,
        goal: contact.goal,
        tone: contact.tone,
        allocatedMinutes: contact.allocatedMinutes,
        createdAt: state.currentTime,
        expiresAt: addMinutes(state.currentTime, contact.responseWindowMinutes),
        deferredUntil: null,
        deferrals: 0,
      };
      append("director.contact_offered", {
        contactId: state.pendingContact.id, eventId: event.id, characterId: contact.characterId,
        characterName: definition.name, publicIdentity: definition.publicIdentity, reason: contact.reason,
        openingLine: contact.openingLine, expiresAt: state.pendingContact.expiresAt,
      });
    }
    resolved.push(event.id);
    append("narrative.event_resolved", { eventId: event.id, title: event.title, summary: event.visibleSummary });
    notices.push(event.visibleSummary);
  }
  return notices;
}

function advancePendingContact(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
): string[] {
  const contact = state.pendingContact;
  if (!contact || Date.parse(state.currentTime) < Date.parse(contact.expiresAt)) return [];
  const character = state.characters[contact.characterId];
  if (character) character.privateTrust = clamp(character.privateTrust - 1, -100, 100);
  const name = campaign.characters.find((item) => item.id === contact.characterId)?.name ?? "来访者";
  state.pendingContact = null;
  const notice = `${name}没有等到你的答复，主动接触的机会已经过去。`;
  append("director.contact_expired", { contactId: contact.id, characterId: contact.characterId, notice });
  return [notice];
}

function resolveCompletedNarrativeThreads(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
) {
  const required = campaign.objectives.filter((objective) => objective.required);
  if (required.length === 0 || !required.every((objective) => objectiveSatisfied(campaign, state, objective))) return;
  for (const thread of state.narrativeThreads ?? []) {
    if (thread.status === "resolved") continue;
    thread.status = "resolved";
    thread.updatedAt = state.currentTime;
    append("narrative.thread_updated", { ...thread, resolution: "核心目标已经完成并得到组织确认" });
  }
}

function advanceMissionObjectives(
  campaign: CampaignDefinition,
  state: WorldState,
  append: (type: string, payload: unknown) => void,
): string[] {
  const completedIds = state.completedObjectiveIds ?? (state.completedObjectiveIds = []);
  const failedIds = state.failedObjectiveIds ?? (state.failedObjectiveIds = []);
  const notices: string[] = [];
  for (const objective of campaign.objectives
    .filter((item) => item.required)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))) {
    if (completedIds.includes(objective.id) || failedIds.includes(objective.id) || !isObjectiveUnlocked(state, objective)) continue;
    if (!objectiveSatisfied(campaign, state, objective)) {
      if (Date.parse(state.currentTime) < Date.parse(objective.deadline) || hasOnTimePendingTransmission(state, objective)) continue;
      failedIds.push(objective.id);
      const reason = "任务超过截止时间，组织未能收到满足要求的完整情报";
      append("mission.objective_failed", { objectiveId: objective.id, title: objective.title ?? objective.id, deadline: objective.deadline, reason });
      notices.push(`${objective.title ?? objective.id}未能按时完成，但战役仍会继续。组织正在调整后续任务。`);
      appendUnlockedObjectives(campaign, state, objective.id, append, notices);
      continue;
    }
    completedIds.push(objective.id);
    const effects = objective.completionEffects;
    if (effects) {
      state.investigation.pressure = clamp(state.investigation.pressure + (effects.investigationPressure ?? 0));
      state.personalSuspicion = clamp(state.personalSuspicion + (effects.personalSuspicion ?? 0));
      state.network.exposure = clamp(state.network.exposure + (effects.networkExposure ?? 0));
      for (const characterId of effects.introduceCharacterIds ?? []) {
        if (state.characters[characterId] && !state.knownCharacterIds.includes(characterId)) {
          state.knownCharacterIds.push(characterId);
          const introduced = campaign.characters.find((item) => item.id === characterId);
          append("character.introduced", { characterId, characterName: introduced?.name, publicIdentity: introduced?.publicIdentity, objectiveId: objective.id, hint: effects.notice });
        }
      }
      for (const locationId of effects.unlockLocationIds ?? []) {
        if (!campaign.locations.some((location) => location.id === locationId)) continue;
        if (!state.discoveredLocationIds.includes(locationId)) state.discoveredLocationIds.push(locationId);
        state.locationKnowledge ??= {};
        state.locationKnowledge[locationId] = { stage: "accessible", sourceEventId: objective.id, hint: effects.notice, updatedAt: state.currentTime };
        const location = campaign.locations.find((item) => item.id === locationId);
        append("location.stage_changed", { locationId, locationName: location?.name, stage: "accessible", objectiveId: objective.id, hint: effects.notice });
      }
      if (effects.interrogation && (!state.interrogation || state.interrogation.status === "resolved")) {
        const interrogator = campaign.characters.find((character) => character.id === effects.interrogation?.interrogatorCharacterId);
        if (interrogator && !state.knownCharacterIds.includes(interrogator.id)) {
          state.knownCharacterIds.push(interrogator.id);
          append("character.introduced", { characterId: interrogator.id, characterName: interrogator.name, publicIdentity: interrogator.publicIdentity, objectiveId: objective.id, hint: "敌方以公开调查名义安排盘问" });
        }
        state.interrogation = {
          id: `${objective.id}:interrogation`, triggerObjectiveId: objective.id,
          interrogatorCharacterId: effects.interrogation.interrogatorCharacterId,
          status: "pending", dueAt: addMinutes(state.currentTime, effects.interrogation.delayMinutes),
          questions: buildInterrogationQuestions(state.cover.profileId), answers: [], consistency: 50, outcome: null,
        };
        append("interrogation.scheduled", { interrogationId: state.interrogation.id, dueAt: state.interrogation.dueAt, interrogatorCharacterId: state.interrogation.interrogatorCharacterId });
      }
      notices.push(effects.notice);
    }
    append("mission.objective_completed", { objectiveId: objective.id, title: objective.title ?? objective.id, effects });
    appendUnlockedObjectives(campaign, state, objective.id, append, notices);
  }
  return notices;
}

function appendUnlockedObjectives(
  campaign: CampaignDefinition,
  state: WorldState,
  resolvedObjectiveId: string,
  append: (type: string, payload: unknown) => void,
  notices: string[],
) {
  const resolvedIds = new Set([...(state.completedObjectiveIds ?? []), ...(state.failedObjectiveIds ?? [])]);
  for (const unlocked of campaign.objectives.filter((candidate) =>
    !resolvedIds.has(candidate.id)
    && (candidate.unlockAfterObjectiveIds ?? []).includes(resolvedObjectiveId)
    && isObjectiveUnlocked(state, candidate))) {
    append("mission.objective_unlocked", { objectiveId: unlocked.id, title: unlocked.title ?? unlocked.id, deadline: unlocked.deadline });
    notices.push(`组织下达后续任务：${unlocked.title ?? unlocked.id}`);
  }
}

function hasOnTimePendingTransmission(state: WorldState, objective: MissionObjective): boolean {
  const requiredIntelIds = new Set(objective.requiredIntelIds);
  return state.radio.transmissions.some((transmission) =>
    transmission.receiptStatus === "pending"
    && Date.parse(transmission.completedAt) <= Date.parse(objective.deadline)
    && transmission.items.some((item) => requiredIntelIds.has(item.intelId)),
  );
}

export function isObjectiveUnlocked(state: WorldState, objective: MissionObjective): boolean {
  const resolvedIds = new Set([...(state.completedObjectiveIds ?? []), ...(state.failedObjectiveIds ?? [])]);
  return (objective.unlockAfterObjectiveIds ?? []).every((id) => resolvedIds.has(id));
}

export function isIntelUnlocked(campaign: CampaignDefinition, state: WorldState, intelId: string): boolean {
  const owners = campaign.objectives.filter((objective) => objective.requiredIntelIds.includes(intelId));
  return owners.length === 0 || owners.some((objective) => isObjectiveUnlocked(state, objective));
}

function advanceInterrogation(state: WorldState, append: (type: string, payload: unknown) => void): string[] {
  const interrogation = state.interrogation;
  if (!interrogation || interrogation.status !== "pending" || Date.parse(state.currentTime) < Date.parse(interrogation.dueAt)) return [];
  interrogation.status = "active";
  append("interrogation.started", { interrogationId: interrogation.id, interrogatorCharacterId: interrogation.interrogatorCharacterId });
  return [`警备处的传唤已经送到。韩世杰在临时问讯室等你回答：“${interrogation.questions[0]}”`];
}

function buildInterrogationQuestions(profileId: WorldState["cover"]["profileId"]): string[] {
  const workQuestion = profileId === "archive_clerk"
    ? "设备运输出事前后，你调阅过哪些档案，谁能证明？"
    : profileId === "travelling_merchant"
      ? "设备运输出事前后，你去了哪些商号和码头，账目在哪里？"
      : "设备运输出事前后，你采访过哪些人，稿件和笔记在哪里？";
  return [
    workQuestion,
    "你的行踪为什么多次与被查地点重合？给我一个能核对的公开理由。",
    "如果我们现在去核对你的同事、客户或编辑，他们会怎样描述你这几天的行动？",
  ];
}

function interrogationAnswerScore(state: WorldState, strategy: InterrogationStrategy, text: string): number {
  const profileTerms: Record<WorldState["cover"]["profileId"], RegExp> = {
    archive_clerk: /档案|调阅|值班|科长|签字|登记|同事|公文/,
    travelling_merchant: /货账|客户|商号|收据|仓库|送货|生意|行会/,
    freelance_writer: /稿件|编辑|采访|校样|报社|笔记|采风|刊发/,
  };
  let score = text.length >= 12 && text.length <= 160 ? 2 : text.length < 8 ? -3 : -1;
  if (profileTerms[state.cover.profileId].test(text)) score += 3;
  if (strategy === "calm") score += 1;
  if (strategy === "formal") score += state.cover.credibility >= 55 ? 3 : -1;
  if (strategy === "deflect") score -= 2;
  if (strategy === "counter_question") score -= state.personalSuspicion >= 50 ? 3 : 1;
  if (state.interrogation?.answers.some((answer) => answer.text === text)) score -= 5;
  return score;
}

function chooseLocationKnowledgeStage(
  current: LocationKnowledgeStage,
  proposed: Exclude<LocationKnowledgeStage, "unknown">,
): LocationKnowledgeStage {
  if (current === "compromised" || proposed === "compromised") return "compromised" as const;
  const order = { unknown: 0, rumored: 1, located: 2, accessible: 3 } as const;
  return order[proposed] > order[current] ? proposed : current;
}

function comradeTaskMinutes(
  kind: Extract<GameAction, { type: "propose_cooperation_request" }>["kind"],
  approach: Extract<GameAction, { type: "propose_cooperation_request" }>["approach"],
): number {
  const base = kind === "gather_intel" ? 60 : 30;
  return base + (approach === "cautious" ? 20 : approach === "urgent" ? -10 : 0);
}

function validateComradeTaskTarget(
  campaign: CampaignDefinition,
  state: WorldState,
  kind: Extract<GameAction, { type: "propose_cooperation_request" }>["kind"],
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
  if (!isIntelUnlocked(campaign, state, targetId)) throw new Error("Intelligence belongs to a locked mission");
  if (intel.deliveredAt) throw new Error("Delivered intelligence cannot receive another task");
  if (kind === "verify_intel" && intel.knownFields.length === 0) throw new Error("Intelligence must be discovered before it can be verified");
  if (kind === "gather_intel" && definition.requiredFields.every((field) => intel.knownFields.includes(field))) throw new Error("All intelligence fields are already known");
}

function validateCooperationTerms(terms: Extract<GameAction, { type: "propose_cooperation_request" }>["terms"]) {
  if (terms.purpose.trim().length < 4 || terms.purpose.length > 240) throw new Error("合作目的需要控制在 4 到 240 个字符之间");
  if (terms.abortCondition.trim().length < 4 || terms.abortCondition.length > 240) throw new Error("中止条件需要控制在 4 到 240 个字符之间");
}

export function evaluateCooperationRequest(
  definition: CampaignDefinition["characters"][number],
  member: CharacterState,
  action: Extract<GameAction, { type: "propose_cooperation_request" }>,
): NonNullable<Extract<GameAction, { type: "propose_cooperation_request" }>["agentResponse"]> {
  const reliability = definition.reliability;
  const cooperation = member.privateTrust * 2
    + member.interestDependency * 0.35
    + member.recruitmentProgress * 0.25
    + reliability.loyalty * 0.3
    + reliability.discipline * 0.1
    - member.stress * 0.4;
  const baseRisk = action.kind === "scout_location" ? 34 : action.kind === "gather_intel" ? 28 : 18;
  const approachRisk = action.approach === "urgent" ? 24 : action.approach === "balanced" ? 10 : 0;
  const risk = baseRisk + approachRisk;
  const riskTolerance = action.terms.riskLimit === "high" ? 85 : action.terms.riskLimit === "moderate" ? 60 : 35;

  if (member.stress >= 85 || cooperation < 38) {
    return {
      decision: "refuse", proposedApproach: null, requestedExchange: null,
      message: member.stress >= 85 ? "这阵子风声太紧，我现在不能答应。再往前走一步，先出事的未必只有我。" : "这件事我不能只凭一句话接下来。我们之间还没有到能把彼此性命押进去的地步。",
    };
  }

  const needsSaferMethod = risk > Math.min(riskTolerance, reliability.courage + 20) || (action.terms.riskLimit === "low" && action.approach !== "cautious");
  const needsExchange = cooperation < 65 && action.terms.exchange === "none";
  if (needsSaferMethod || needsExchange) {
    const requestedExchange = needsExchange ? (reliability.loyalty < 55 ? "favor" : "protection") : null;
    return {
      decision: "counter",
      proposedApproach: needsSaferMethod ? "cautious" : null,
      requestedExchange,
      message: needsSaferMethod
        ? `可以谈，但不能照你说的速度来。我只按稳妥办法走，到了“${action.terms.abortCondition.trim()}”这一步就立刻停。`
        : requestedExchange === "favor"
          ? "我可以帮你，但这不是一句情分就能抹过去的。事情办完，你也得替我还一个人情。"
          : "我可以去，不过你得先答应，出了岔子要替我和家里人安排退路。",
    };
  }

  return {
    decision: "accept", proposedApproach: null, requestedExchange: null,
    message: `我明白你要查什么，也记住了中止条件。我会按约定的边界处理，没把握的事不会装作已经办成。`,
  };
}

function sanitizeCooperationMessage(message: string, fallback: string): string {
  const normalized = message.trim().slice(0, 240);
  if (!normalized || /(?:忠诚度|可靠性|后台数值|成功率|系统判定|隐藏阵营)/.test(normalized)) return fallback;
  return normalized;
}

function radioSiteRisk(campaign: CampaignDefinition, state: WorldState, locationId: string): number | null {
  const location = campaign.locations.find((item) => item.id === locationId);
  const site = location?.radioSite;
  if (site) {
    const recruited = !site.requiresRecruitedCharacterId || state.network.activeMemberIds.includes(site.requiresRecruitedCharacterId);
    const accessible = state.discoveredLocationIds.includes(locationId) && state.locationKnowledge?.[locationId]?.stage !== "compromised";
    return recruited && accessible ? site.baseRisk : null;
  }
  // Compatibility for content packages created before radio sites became data-driven.
  if (locationId === "wu-clock-shop") return 4;
  if (locationId === "jianghai-hotel") return 10;
  if (locationId === "radio-office") return 18;
  return null;
}

export function getRadioSites(campaign: CampaignDefinition, state: WorldState) {
  return campaign.locations.filter((location) => location.radioSite).map((location) => {
    const requirement = location.radioSite?.requiresRecruitedCharacterId;
    const available = Boolean(location.radioSite?.initiallyAvailable || (requirement && state.network.activeMemberIds.includes(requirement)));
    return { id: location.id, name: location.name, baseRisk: location.radioSite!.baseRisk, available, requiresRecruitedCharacterId: requirement ?? null };
  });
}

export function getRestAvailability(campaign: CampaignDefinition, state: WorldState): { available: boolean; reason: string } {
  const location = campaign.locations.find((item) => item.id === state.currentLocationId);
  const site = location?.radioSite;
  if (!site) {
    return { available: false, reason: "这里只是公开活动地点，没有安全过夜条件。请前往安全住处，或已加入组织的同志据点。" };
  }
  if (!state.discoveredLocationIds.includes(location.id) || state.locationKnowledge?.[location.id]?.stage === "compromised") {
    return { available: false, reason: "当前据点已经暴露或被封锁，不能在此休息。" };
  }
  if (site.requiresRecruitedCharacterId) {
    const member = state.characters[site.requiresRecruitedCharacterId];
    if (!state.network.activeMemberIds.includes(site.requiresRecruitedCharacterId)) {
      return { available: false, reason: "这里尚不是组织据点。只有对应同志正式加入网络后，才能在此休息。" };
    }
    if (member?.exposed) {
      return { available: false, reason: "负责此据点的同志已经暴露，这里不再适合过夜。" };
    }
  } else if (!site.initiallyAvailable) {
    return { available: false, reason: "这里尚未建立可供过夜的安全条件。" };
  }
  return { available: true, reason: "当前地点具备安全过夜条件。" };
}

export function getCountermeasureOptions(campaign: CampaignDefinition, state: WorldState) {
  const profile = getCoverProfile(state.cover.profileId);
  const heat = state.investigation.locationHeat[state.currentLocationId] ?? 0;
  const watched = state.investigation.surveillanceLocationIds.includes(state.currentLocationId);
  const pressure = state.investigation.pressure;
  const rest = getRestAvailability(campaign, state);
  const enoughEnergy = state.playerEnergy >= 8;
  return [
    {
      kind: "check_tail" as const, label: "检查并甩开跟踪", durationMinutes: 20,
      description: "用折返、橱窗反光和换向确认尾巴；可降低当前地点热度并解除监视。",
      available: enoughEnergy && (watched || heat >= 4 || pressure >= 10),
      reason: !enoughEnergy ? "精力不足" : watched || heat >= 4 || pressure >= 10 ? "当前可以执行" : "目前没有足够的跟踪迹象",
      requiresTarget: false,
    },
    {
      kind: "reinforce_cover" as const, label: "补强公开行踪", durationMinutes: 60,
      description: "补齐工作凭据和可核对的时间线，降低个人与上级怀疑。",
      available: enoughEnergy && profile.workLocationIds.includes(state.currentLocationId) && isCoverWorkHours(state.currentTime, state.cover.profileId),
      reason: !enoughEnergy ? "精力不足" : !profile.workLocationIds.includes(state.currentLocationId) ? "需要回到公开身份的工作地点" : !isCoverWorkHours(state.currentTime, state.cover.profileId) ? "当前不在公开工作时段" : "当前可以执行",
      requiresTarget: false,
    },
    {
      kind: "plant_decoy" as const, label: "布置假行程", durationMinutes: 30,
      description: "把敌方注意力引向另一个已知地点；降低当前热度，但会略增网络暴露。",
      available: enoughEnergy && pressure >= 15 && state.discoveredLocationIds.filter((id) => id !== state.currentLocationId).length > 0,
      reason: !enoughEnergy ? "精力不足" : pressure < 15 ? "调查压力尚不足以掩护假线索" : state.discoveredLocationIds.length < 2 ? "还没有可用于误导的其他地点" : "当前可以执行",
      requiresTarget: true,
    },
    {
      kind: "relocate_materials" as const, label: "转移敏感材料", durationMinutes: 30,
      description: "分批转移密码材料与联络痕迹，降低据点热度和网络暴露。",
      available: enoughEnergy && rest.available && !watched && (heat >= 4 || state.network.exposure >= 8),
      reason: !enoughEnergy ? "精力不足" : !rest.available ? "只能在安全住处或同志据点整理材料" : watched ? "当前正受监视，先设法甩开尾巴" : heat < 4 && state.network.exposure < 8 ? "目前没有需要转移的敏感痕迹" : "当前可以执行",
      requiresTarget: false,
    },
  ];
}

function countermeasureDuration(kind: Extract<GameAction, { type: "countermeasure" }>["kind"]) {
  return kind === "check_tail" ? 20 : kind === "reinforce_cover" ? 60 : 30;
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

function radioWarningSigns(signalWeight: number, retransmission: boolean, interruptionCount: number): string[] {
  const signs = signalWeight < 16
    ? ["频率较为干净，暂未察觉明显测向迹象。"]
    : signalWeight < 28
      ? ["发报结束后，附近街面出现了短暂停留的陌生车辆。"]
      : ["耳机中出现可疑的同频回扫，敌方可能已经开始测向。", "当前据点不宜连续发报。"];
  if (retransmission) signs.push("相同情报再次出现在频段上，通信规律更容易被归并。 ");
  if (interruptionCount > 0) signs.push("途中干扰延长了电台暴露窗口。 ");
  return signs.map((sign) => sign.trim());
}

function validateRadioPerformance(performance: Extract<GameAction, { type: "send_radio_message" }>["manualPerformance"]): void {
  if (!performance) throw new Error("手动发报缺少服务端校验结果");
  if (!Number.isFinite(performance.accuracy) || performance.accuracy < 0 || performance.accuracy > 1
    || !Number.isFinite(performance.timingScore) || performance.timingScore < 0 || performance.timingScore > 1
    || !Number.isFinite(performance.completion) || performance.completion < 0 || performance.completion > 1
    || !Number.isInteger(performance.errorCount) || performance.errorCount < 0
    || !Number.isInteger(performance.correctionCount) || performance.correctionCount < 0
    || !/^[.\- /]+$/.test(performance.sequence) || performance.sequence.length > 2000) {
    throw new Error("手动发报校验结果无效");
  }
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
    const manualQuality = transmission.mode === "manual" && transmission.morse
      ? transmission.morse.accuracy * 0.65 + transmission.morse.timingScore * 0.25 + transmission.morse.completion * 0.1
      : null;
    const performanceBonus = manualQuality === null ? 0 : (manualQuality - 0.65) * 30;
    const receptionScore = averageConfidence * 60 + codebookBonus + formatBonus + timingBonus + performanceBonus - heatPenalty - difficultyPenalty;

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
  for (const task of state.network.tasks.filter((item) => item.status === "active" && item.commitment && new Date(item.commitment.dueAt) <= new Date(state.currentTime))) {
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
    const approach = task.commitment?.approach ?? task.requestedApproach;
    const approachModifier = approach === "cautious" ? 10 : approach === "urgent" ? -15 : 0;
    const difficultyPenalty = Math.max(0, state.difficulty.enemyResponseSpeed - 1) * 15;
    const successChance = clamp(ability + approachModifier - difficultyPenalty, 10, 100);
    const success = stableRoll(`${state.gameInstanceId}:${task.id}:${task.kind}:${task.targetId}`) < successChance;
    const evidenceWeight = approach === "cautious" ? 2 : approach === "urgent" ? 7 : 4;
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
      if (approach === "urgent") state.network.exposure = clamp(state.network.exposure + state.difficulty.enemyResponseSpeed);
      append("comrade.task_completed", { taskId: task.id, memberId: task.memberId, kind: task.kind, targetId: task.targetId, report: task.report });
    } else {
      task.status = "failed";
      member.stress = clamp(member.stress + (approach === "urgent" ? 14 : 8));
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

function advanceEnemyInvestigation(
  state: WorldState,
  append: (type: string, payload: unknown) => void,
  sourceAction: GameAction,
): string[] {
  const investigation = state.investigation;
  const fresh = investigation.evidence.filter((evidence) => !evidence.processed);
  for (const evidence of fresh) evidence.processed = true;

  const newWeight = fresh.reduce((total, evidence) => total + evidence.weight, 0);
  const allowance = state.difficulty.recoveryAllowance;
  const recovery = sourceAction.type === "rest"
    ? 0.5 * allowance
    : sourceAction.type === "cover_work"
      ? 0.35 * allowance
      : sourceAction.type === "wait" || sourceAction.type === "move"
        ? 0.1 * allowance
        : 0;
  investigation.pressure = clamp(investigation.pressure + newWeight * 0.8 * state.difficulty.enemyResponseSpeed - recovery);
  const radioEvidence = fresh.find((evidence) => evidence.type === "radio_signal");
  const hottest = Object.entries(investigation.locationHeat).sort((a, b) => b[1] - a[1])[0];
  let responseAction: string | null = null;
  let notice: string | null = null;
  const escalationReady = !investigation.lastActionAt
    || Date.parse(state.currentTime) - Date.parse(investigation.lastActionAt) >= 30 * 60_000;

  if (radioEvidence) {
    state.network.exposure = clamp(state.network.exposure + 3 * state.difficulty.enemyResponseSpeed);
    responseAction = "radio_sweep";
    notice = "远处传来短促的干扰声。有人正在这一带排查异常无线电信号。";
  } else if (fresh.length > 0 && hottest && hottest[1] >= 12 && !investigation.surveillanceLocationIds.includes(hottest[0])) {
    investigation.surveillanceLocationIds.push(hottest[0]);
    responseAction = "surveillance_started";
    notice = "街角多了一个停留过久的陌生人。这里可能已经受到监视。";
  } else if (fresh.length > 0 && investigation.surveillanceLocationIds.includes(state.currentLocationId) && fresh.some((evidence) => evidence.locationId === state.currentLocationId)) {
    state.personalSuspicion = clamp(state.personalSuspicion + 3 * state.difficulty.enemyResponseSpeed);
    responseAction = "subject_followed";
    notice = "窗外同一道人影再次出现。你意识到自己的停留可能被人记下了。";
  } else if (investigation.pressure >= 80 && escalationReady) {
    state.personalSuspicion = clamp(state.personalSuspicion + 5 * state.difficulty.enemyResponseSpeed);
    state.cover.scrutiny = clamp(state.cover.scrutiny + 6 * state.difficulty.enemyResponseSpeed);
    state.network.exposure = clamp(state.network.exposure + 2 * state.difficulty.enemyResponseSpeed);
    responseAction = "coordinated_review";
    notice = "敌方把零散记录并案审查，公开身份、近期出入和无线电异常开始被交叉核对。";
  } else if (fresh.length > 0 && investigation.pressure >= 30) {
    state.personalSuspicion = clamp(state.personalSuspicion + 1 * state.difficulty.enemyResponseSpeed);
    responseAction = "records_reviewed";
    const accountability = getCoverProfile(state.cover.profileId).accountability;
    notice = accountability.mode === "business"
      ? "商会和货栈开始核对近期账册、客户与走货记录，几家往来商号被要求补齐凭据。"
      : accountability.mode === "editorial"
        ? "编辑部和警备处开始核对近期选题、采访与来稿记录，几名记者被要求说明行踪。"
        : "机关里开始核对近期出入和调阅记录，几个人被叫去补填说明。";
  }

  for (const locationId of Object.keys(investigation.locationHeat)) {
    investigation.locationHeat[locationId] = clamp(investigation.locationHeat[locationId] - 0.75 - recovery * 0.25);
  }
  investigation.surveillanceLocationIds = investigation.surveillanceLocationIds
    .filter((locationId) => (investigation.locationHeat[locationId] ?? 0) >= 5);
  if (!responseAction || !notice) return [];
  investigation.lastActionAt = state.currentTime;
  append("investigation.action_taken", { action: responseAction, locationId: radioEvidence?.locationId ?? hottest?.[0], notice });
  return [notice];
}

function advanceCoverIdentity(state: WorldState, append: (type: string, payload: unknown) => void): string[] {
  const cover = state.cover;
  const profile = getCoverProfile(cover.profileId);
  const date = coverDate(state.currentTime);
  const minute = minuteOfDay(state.currentTime);
  const leaveActive = Boolean(cover.leaveUntil && new Date(cover.leaveUntil) >= new Date(state.currentTime));
  if (!leaveActive && cover.leaveUntil && new Date(cover.leaveUntil) < new Date(state.currentTime)) {
    cover.leaveUntil = null;
    cover.leaveReason = null;
  }

  if (profile.workHours && minute >= profile.workHours.endMinute && cover.lastRecordEvaluatedDate !== date) {
    cover.lastRecordEvaluatedDate = date;
    if (!cover.completedRecordDates.includes(date) && !leaveActive) {
      cover.recordStatus = "gap";
      cover.consecutiveRecordGaps += 1;
      cover.credibility = clamp(cover.credibility - 16);
      cover.scrutiny = clamp(cover.scrutiny + 12);
      state.personalSuspicion = clamp(state.personalSuspicion + 4 * state.difficulty.enemyResponseSpeed);
      recordInvestigationEvidence(state, "sensitive_notes", state.currentLocationId, 4, append);
      const summary = profile.accountability.lapseSummary;
      addCoverObservation(state, "absence_recorded", summary);
      append("cover.absence_recorded", { date, consecutiveRecordGaps: cover.consecutiveRecordGaps, eventLabel: profile.accountability.lapseLabel, summary });
      const notices = [summary];
      if (cover.consecutiveRecordGaps >= 2 || cover.scrutiny >= 30) {
        cover.scrutiny = clamp(cover.scrutiny + 8);
        state.personalSuspicion = clamp(state.personalSuspicion + 3 * state.difficulty.enemyResponseSpeed);
        const checkSummary = profile.accountability.reviewSummary;
        addCoverObservation(state, "supervisor_check", checkSummary);
        append("cover.supervisor_check", { date, eventLabel: profile.accountability.mode === "business" ? "商会核查" : profile.accountability.mode === "editorial" ? "编辑部追问" : "上级核查", summary: checkSummary });
        notices.push(checkSummary);
      }
      return notices;
    }
  }

  if (leaveActive) cover.recordStatus = "excused";
  else if (cover.completedRecordDates.includes(date) && isCoverWorkHours(state.currentTime, cover.profileId)) cover.recordStatus = "recorded";
  else if (profile.workHours && minute >= profile.workHours.startMinute + 120 && minute < profile.workHours.endMinute && !cover.completedRecordDates.includes(date)) cover.recordStatus = "gap";
  else if (!profile.workHours || minute < profile.workHours.endMinute) cover.recordStatus = "pending";
  else if (cover.recordStatus === "excused") cover.recordStatus = "pending";
  return [];
}

function addCoverObservation(state: WorldState, type: WorldState["cover"]["observations"][number]["type"], summary: string) {
  state.cover.observations.push({ id: randomUUID(), type, summary, observedAt: state.currentTime });
  state.cover.observations = state.cover.observations.slice(-12);
}

function recordCoverConversationCredit(
  state: WorldState,
  minutes: number,
  append: (type: string, payload: unknown) => void,
) {
  const profile = getCoverProfile(state.cover.profileId);
  if (!profile.workLocationIds.includes(state.currentLocationId) || !isCoverWorkHours(state.currentTime, state.cover.profileId)) return;
  if (state.cover.recordStatus === "excused") return;
  const date = coverDate(state.currentTime);
  if (state.cover.completedRecordDates.includes(date)) return;
  state.cover.recordCreditMinutesByDate ??= {};
  const total = (state.cover.recordCreditMinutesByDate[date] ?? 0) + minutes;
  state.cover.recordCreditMinutesByDate[date] = total;
  if (total < 60) return;
  state.cover.completedRecordDates.push(date);
  state.cover.recordStatus = "recorded";
  state.cover.lastRecordAt = state.currentTime;
  state.cover.credibility = clamp(state.cover.credibility + 2);
  const summary = profile.accountability.conversationCreditSummary;
  addCoverObservation(state, "work_completed", summary);
  append("cover.activity_credited", { date, minutes: total, source: "workplace_dialogue", eventLabel: profile.accountability.recordProgressLabel, summary });
}

function coverDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function isCoverWorkHours(iso: string, profileId: WorldState["cover"]["profileId"] = "archive_clerk") {
  const minute = minuteOfDay(iso);
  const hours = getCoverProfile(profileId).workHours;
  return Boolean(hours && minute >= hours.startMinute && minute < hours.endMinute);
}

function endOfCoverShift(iso: string, profileId: WorldState["cover"]["profileId"]) {
  const hour = Math.floor((getCoverProfile(profileId).workHours?.endMinute ?? 17 * 60) / 60);
  return `${coverDate(iso)}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

function coverWorkMinutes(kind: Extract<GameAction, { type: "cover_work" }>["workKind"]) {
  if (kind === "duty_shift" || kind === "visit_clients") return 120;
  if (kind === "file_sorting" || kind === "settle_accounts" || kind === "street_research") return 60;
  return 30;
}

function coverWorkBenefit(kind: Extract<GameAction, { type: "cover_work" }>["workKind"]) {
  return kind === "duty_shift" || kind === "visit_clients" ? 10 : kind === "file_sorting" || kind === "settle_accounts" || kind === "street_research" ? 8 : 6;
}

function coverWorkSummary(kind: Extract<GameAction, { type: "cover_work" }>["workKind"]) {
  if (kind === "settle_accounts") return "你核对了发票与存货账册，留下了一条可信的经营记录。";
  if (kind === "visit_clients") return "你拜访了固定客户，公开的业务行程经得起核对。";
  if (kind === "stock_check") return "你核对了库存和送货单，让今天的路线有了合理的公开目的。";
  if (kind === "submit_column") return "你提交了一篇署名稿件，编辑部留下了明确的工作记录。";
  if (kind === "street_research") return "你完成了街头采风，笔记和目击者足以说明你的公开行踪。";
  if (kind === "proofread_copy") return "你在编辑部校对了一批稿件，留下了清楚的工作记录。";
  if (kind === "file_sorting") return "你按公开流程整理了档案，留下了一整段可被核对的工作记录。";
  if (kind === "duty_shift") return "你完成了值班，几位同事都看见你按时留在岗位上。";
  return "你提交了例行报告，上级对你的工作记录暂时没有新的追问。";
}

function leaveReasonLabel(reason: Extract<GameAction, { type: "request_leave" }>["reason"]) {
  return reason === "family" ? "家庭事务" : reason === "health" ? "身体不适" : "公务外出";
}

function minuteOfDay(iso: string): number {
  const date = new Date(iso);
  // Campaign timestamps are UTC instants rendered on the fixed Shanghai clock.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function isCharacterAvailableAt(definition: CampaignDefinition["characters"][number], currentTime: string): boolean {
  const minute = minuteOfDay(currentTime);
  return definition.schedule.some((entry) => minute >= entry.startMinute && minute < entry.endMinute);
}

function calculateRest(sleepMinutes: number): { minutes: number; recovery: number } | null {
  if (!Number.isInteger(sleepMinutes) || sleepMinutes < 60 || sleepMinutes > 12 * 60 || sleepMinutes % 30 !== 0) return null;
  const recovery = sleepMinutes < 6 * 60
    ? Math.floor(sleepMinutes / 60) * 5
    : sleepMinutes <= 8 * 60
      ? 30 + Math.floor((sleepMinutes - 6 * 60) / 60) * 10
      : 50 + Math.floor((sleepMinutes - 8 * 60) / 60) * 2;
  return { minutes: sleepMinutes, recovery };
}

function formatRestDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} 小时 ${remainder} 分钟` : `${hours} 小时`;
}

function actionEnergyCost(action: GameAction, elapsedDuration: number, startedAt: string): number {
  if (elapsedDuration === 0) return 0;
  if (action.type === "wait" || action.type === "dialogue_start" || action.type === "dialogue_turn" || action.type === "dialogue_end") return 0;
  const base = Math.ceil(elapsedDuration / 60);
  const nightMultiplier = minuteOfDay(startedAt) < 6 * 60 ? 2 : 1;
  const exertion = action.type === "observe" || action.type === "recruitment_test" || action.type === "recruit_candidate" ? 1 : 0;
  return (base + exertion) * nightMultiplier;
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
  allowDiscovery = true,
  relationshipScale = 1,
): { intelId: string; field: string; verified: boolean; assessment: string } | null {
  const character = state.characters[definition.id];
  const reaction = action.agentOutcome?.relationshipReaction ?? inferFallbackRelationshipReaction(definition, action);
  const trustDelta = ({
    resonated: 2,
    respected_boundary: 1,
    neutral: 0,
    misaligned: -1,
    boundary_violation: -3,
    inconsistent: -2,
  } as const)[reaction] * relationshipScale;
  const pressure = action.goal === "apply_pressure" ? 7 : action.tone === "threatening" ? 5 : 0;
  const familiarityDelta = action.goal === "small_talk" ? 3 : action.goal === "build_trust" ? 4 : 2;
  character.familiarity = clamp(character.familiarity + familiarityDelta * relationshipScale);
  character.privateTrust = clamp(character.privateTrust + trustDelta, -100, 100);
  const reactionSuspicion = reaction === "boundary_violation" ? 3 : reaction === "inconsistent" ? 2 : reaction === "misaligned" ? 1 : reaction === "resonated" ? -1 : 0;
  character.suspicionOfPlayer = clamp(character.suspicionOfPlayer + reactionSuspicion * relationshipScale + pressure * state.difficulty.enemyResponseSpeed);
  if (action.goal === "probe_attitude") {
    character.politicalAffinity = clamp(character.politicalAffinity + (definition.reliability.loyalty - 50) / 12, -100, 100);
  }
  if (action.goal === "recruit_probe") {
    const receptive = reaction === "resonated" || reaction === "respected_boundary";
    if (receptive) character.interestDependency = clamp(character.interestDependency + (definition.reliability.loyalty < 50 ? 4 : 1) * relationshipScale);
    if (receptive && definition.recruitable && character.familiarity >= 8 && character.privateTrust >= 5) {
      character.recruitmentProgress = clamp(character.recruitmentProgress + 20, 0, 60);
      character.recruitmentCase.stage = character.recruitmentCase.completedTestTypes.length >= 3 ? "ready" : "screening";
    }
  }

  const canShare = character.familiarity >= 8 && character.privateTrust >= 5 && action.goal === "request_information";
  if (!canShare && action.goal !== "verify_intel") return null;
  const candidate = action.goal === "verify_intel"
    ? campaign.intel.find((item) => isIntelUnlocked(campaign, state, item.id)
      && (!action.targetIntelId || item.id === action.targetIntelId)
      && item.sourceCharacterIds.includes(definition.id)
      && state.intel[item.id].knownFields.some((field) => !state.intel[item.id].evidence.some((evidence) => evidence.field === field && evidence.sourceId === definition.id)))
    : campaign.intel.find((item) => isIntelUnlocked(campaign, state, item.id) && item.sourceCharacterIds.includes(definition.id) && state.intel[item.id].knownFields.length < item.requiredFields.length);
  if (!candidate) return null;
  const requirement = candidate.sourceRequirements?.[definition.id];
  if (!allowDiscovery || (requirement && (character.familiarity < requirement.familiarity || character.privateTrust < requirement.privateTrust))) return null;
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

function inferFallbackRelationshipReaction(
  definition: CampaignDefinition["characters"][number],
  action: Extract<GameAction, { type: "dialogue" }>,
): NonNullable<NonNullable<Extract<GameAction, { type: "dialogue" }>["agentOutcome"]>["relationshipReaction"]> {
  const text = action.playerText.trim();
  if (action.tone === "threatening" || /(?:不说就|后果|威胁|别逼我|必须告诉|少废话)/.test(text)) return "boundary_violation";
  if (definition.personality?.sensitiveTopics.some((topic) => text.includes(topic))) return "boundary_violation";
  if (/(?:不方便可以不说|不必回答|以你的安全为先|不牵连|可以先核对|按规矩|尊重你的决定)/.test(text)) return "respected_boundary";
  if (definition.personality?.values.some((value) => value.length >= 2 && text.includes(value))) return "resonated";
  if (/(?:你们这种人|这不重要|管不了那么多|随便|无所谓)/.test(text)) return "misaligned";
  return "neutral";
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
  const fieldValue = definition.fieldValues?.[field];
  const fieldDescription = fieldValue ? `“${fieldLabel}：${fieldValue}”` : `“${fieldLabel}”`;
  const summary = assessment === "corroborates"
    ? `${sourceLabel}从独立来源印证了${fieldDescription}。`
    : assessment === "contradicts"
      ? `${sourceLabel}对${fieldDescription}给出了与现有记录不一致的说法。`
      : assessment === "dependent"
        ? `${sourceLabel}提到${fieldDescription}，但线索与已有记录来自同一上游。`
        : `${sourceLabel}提供了${fieldDescription}，尚缺独立来源核验。`;
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

function validateRecruitmentPlan(plan: Extract<GameAction, { type: "recruitment_test" }>["plan"]) {
  const steps = getRecruitmentPlanSteps(plan);
  if (steps.length < 2) throw new Error("甄别计划至少需要写出两个执行步骤");
  if (steps.length > 6) throw new Error("甄别计划最多包含六个执行步骤，请合并过细的步骤");
  if (plan.safeguards.length < 8) throw new Error("请补充具体的风险控制措施");
  if (plan.abortCondition.length < 8) throw new Error("请写明何种情况触发撤退");
}

export function getRecruitmentPlanSteps(
  plan: Extract<GameAction, { type: "recruitment_test" }>["plan"],
): string[] {
  return plan.steps.split(/\r?\n|[。；;]/).map((step) => step.trim()).filter(Boolean);
}

export function evaluateRecruitmentTest(
  definition: CampaignDefinition["characters"][number],
  testType: RecruitmentTestType,
  plan: Extract<GameAction, { type: "recruitment_test" }>["plan"],
): RecruitmentEvidenceResult {
  const reliability = definition.reliability;
  const score = testType === "background_check"
    ? reliability.loyalty * 0.45 + reliability.pressureResistance * 0.2 + reliability.competence * 0.35
    : testType === "controlled_leak"
      ? reliability.discipline * 0.45 + reliability.loyalty * 0.4 + reliability.pressureResistance * 0.15
      : testType === "discipline_check"
        ? reliability.discipline * 0.55 + reliability.pressureResistance * 0.3 + reliability.loyalty * 0.15
        : reliability.competence * 0.45 + reliability.discipline * 0.3 + reliability.courage * 0.25;
  const planText = `${plan.objective}${plan.steps}${plan.safeguards}${plan.abortCondition}`;
  const planQuality = Math.min(10, (planText.length >= 80 ? 3 : 0) + (plan.steps.split(/\r?\n|[。；;]/).length >= 3 ? 2 : 0) + (/(备用|撤退|停止|核对|独立|不接触|分段)/.test(planText) ? 5 : 0));
  const adjustedScore = score + planQuality;
  if (adjustedScore >= 70) return "favorable";
  if (adjustedScore < 50) return "warning";
  return "inconclusive";
}

export function buildRecruitmentExecutionReport(
  definition: CampaignDefinition["characters"][number],
  testType: RecruitmentTestType,
  result: RecruitmentEvidenceResult,
  plan: Extract<GameAction, { type: "recruitment_test" }>["plan"],
  durationMinutes: number,
  investigationPressure = 0,
): RecruitmentExecutionReport {
  const steps = getRecruitmentPlanSteps(plan).slice(0, 6);
  const concreteSteps = steps.length >= 2 ? steps : [plan.objective, "从独立来源复核行动中出现的细节"];
  const detailByType: Record<RecruitmentTestType, Record<RecruitmentEvidenceResult, string[]>> = {
    background_check: {
      favorable: ["公开任职日期与两处独立旁证能够对上", "被问及空档时给出的地点和经手人可以继续核验"],
      warning: ["一段任职时间在公开记录中缺少连续签字", "对同一时期的来往对象先后使用了不同称呼"],
      inconclusive: ["公开记录没有直接冲突", "关键时期只找到转述，尚无独立在场者"],
    },
    controlled_leak: {
      favorable: ["带有来源标记的消息没有离开预设接触范围", "观察窗口结束前没有出现额外探问"],
      warning: ["消息出现在未授权的接触路径上", "候选人无法完整解释中间一次传话"],
      inconclusive: ["观察期内没有确认扩散", "外围接触记录不完整，无法排除消息从别处重合出现"],
    },
    discipline_check: {
      favorable: ["约定时间、地点和备用规则均得到执行", "遇到变化时先核对而没有自行扩大接触"],
      warning: ["候选人临时改变了一项约定", "变更后没有按备用方式留下说明"],
      inconclusive: ["主要约定得到执行", "突发情况中的处置有一处无法由旁证还原"],
    },
    low_risk_task: {
      favorable: ["任务结果与独立来源能够相互印证", "候选人没有越过计划规定的知情边界"],
      warning: ["交回结果遗漏了一个可核对步骤", "候选人试图用结果替代对过程异常的解释"],
      inconclusive: ["任务只完成到可验证的一部分", "现有记录无法区分能力不足、谨慎中止或态度保留"],
    },
  };
  const details = detailByType[testType][result];
  const timeline = concreteSteps.map((step, index) => {
    const minuteOffset = Math.min(durationMinutes, Math.max(10, Math.round((durationMinutes * (index + 1) / concreteSteps.length) / 10) * 10));
    const outcome = result === "warning" && index === concreteSteps.length - 1
      ? "blocked" as const
      : result !== "favorable" && index >= Math.max(1, concreteSteps.length - 2)
        ? "partial" as const
        : "completed" as const;
    return { minuteOffset, step, outcome, observation: `${details[index % details.length]}。该记录对应计划中的“${step.slice(0, 80)}”。` };
  });
  const traits = definition.personality?.traits.join("、") || "谨慎";
  const behavior = result === "warning"
    ? `${definition.name}在关键追问前出现停顿，并把一处具体问题转向程序或他人；这种回避可能来自隐瞒，也可能来自自保。`
    : result === "favorable"
      ? `${definition.name}面对重复核对时保持了基本一致，没有主动索取计划之外的人名、地点或联络方式。`
      : `${definition.name}配合了部分步骤，但在无法确认的信息上保留说法，没有给出足以排除其他解释的细节。`;
  return {
    planSummary: `本次行动围绕“${plan.objective.trim()}”展开，按玩家提交的${concreteSteps.length}个步骤执行；风险控制采用“${plan.safeguards.trim()}”，并以“${plan.abortCondition.trim()}”作为中止边界。`,
    timeline,
    candidateBehavior: [
      `${definition.name}以${definition.publicIdentity}的公开身份参与，言行仍表现出${traits}的个人特点。`,
      behavior,
    ],
    evidence: [
      { source: "计划步骤与现场记录", observation: details[0], limitation: "记录只能证明本次行动中的表现，不能直接推断长期立场。" },
      { source: "独立旁证与既有档案", observation: details[1] ?? details[0], limitation: result === "favorable" ? "旁证之间仍可能共享同一上游来源。" : "旁证数量或观察窗口不足，仍存在其他合理解释。" },
    ],
    contradictions: result === "warning"
      ? ["候选人对一个关键时间点的说法与公开记录不能完全对应。", "计划要求的说明方式与实际留下的联络痕迹不一致。"]
      : result === "inconclusive" ? ["没有发现直接冲突，但一处关键经历只有候选人自己的说法。"] : [],
    deviations: result === "warning" ? ["行动在最后一个核验步骤受阻，没有按原计划取得完整闭环。"] : result === "inconclusive" ? ["一项独立核验只完成了一部分。"] : [],
    externalFactors: investigationPressure >= 50
      ? ["敌方调查压力较高，外围观察被迫缩短，部分接触不能反复确认。"]
      : ["行动期间没有出现足以终止计划的公开盘查，但外围视野仍然有限。"],
    unresolvedQuestions: result === "warning"
      ? ["时间空档究竟来自刻意隐瞒、公开身份需要，还是记录缺失？", "未经授权的接触由谁发起，候选人是否知情？"]
      : result === "favorable" ? ["候选人在更高压力和涉及家人时是否仍会保持相同边界？"] : ["缺失旁证的关键时期还有谁能够独立确认？", "候选人的保留是谨慎、能力不足还是另有顾虑？"],
    followUpOptions: result === "warning"
      ? ["更换独立来源复核矛盾时间点。", "降低透露范围，再观察一次联络纪律。"]
      : result === "favorable" ? ["用不同来源复核本次最有利的证据。", "在不扩大知情面的前提下观察压力反应。"] : ["补足一个独立在场者或书面记录。", "缩小问题范围后再次核对同一细节。"],
  };
}

export function recruitmentEvidenceSummary(testType: RecruitmentTestType, result: RecruitmentEvidenceResult): string {
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
  if (action.goal === "build_trust" || action.goal === "small_talk") {
    const reaction = action.agentOutcome?.relationshipReaction ?? inferFallbackRelationshipReaction(definition, action);
    if (reaction === "resonated" || reaction === "respected_boundary") return `${definition.name}认真听完了你的话，态度出现了有限但可感知的变化。`;
    if (reaction === "misaligned" || reaction === "boundary_violation" || reaction === "inconsistent") return `${definition.name}记住了你的说法，但戒心没有因此减少。`;
    return `这次交谈让${definition.name}对你更熟悉了一些，但尚不足以建立新的信任。`;
  }
  return `${definition.name}没有给出明确答案，只留下了一些需要核验的措辞。`;
}

export function calculateScore(campaign: CampaignDefinition, state: WorldState): ScoreBreakdown {
  const required = campaign.objectives.filter((objective) => objective.required);
  const completed = required.filter((objective) => objectiveSatisfied(campaign, state, objective)).length;
  const mission = required.length === 0 ? 40 : Math.round((completed / required.length) * 40);
  const confidenceValues = Object.values(state.intel).filter((item) => item.knownFields.length > 0).map((item) => item.confidence);
  const intelligence = confidenceValues.length ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length * 15) : 0;
  const network = Math.round((1 - state.network.exposure / 100) * 20);
  const pressureFactor = 1 - state.investigation.pressure / 100;
  const cover = Math.round((((1 - state.personalSuspicion / 100) * 0.35) + (state.cover.credibility / 100 * 0.3) + ((1 - state.cover.scrutiny / 100) * 0.2) + (pressureFactor * 0.15)) * 15);
  const efficiency = Math.round(((state.playerEnergy / 100) * 0.7 + pressureFactor * 0.3) * 10);
  const total = clamp(mission + intelligence + network + cover + efficiency);
  const grade = total >= 90 ? "S" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : total >= 40 ? "D" : "E";
  return { mission, intelligence, network, cover, efficiency, total, grade };
}

export function evaluateEnding(campaign: CampaignDefinition, state: WorldState): CampaignEnding | null {
  const score = calculateScore(campaign, state);
  if (state.network.exposure >= 80) return { type: "network_collapse", title: "网络崩溃", reasons: ["组织网络已低于最低运行能力"], score };
  const requiredObjectives = campaign.objectives.filter((item) => item.required);
  const completed = requiredObjectives.filter((objective) => objectiveSatisfied(campaign, state, objective));
  if (requiredObjectives.length > 0 && completed.length === requiredObjectives.length) {
    const costly = state.personalSuspicion >= 60 || state.network.exposure >= 50 || state.investigation.pressure >= 80 || state.network.compromisedMemberIds.length > 0;
    const reasons = ["核心情报已按要求送达"];
    if (state.investigation.pressure >= 80) reasons.push("敌方调查压力过高，行动网络留下了重大风险");
    return { type: costly ? "costly_success" : "complete_success", title: costly ? "代价成功" : "完整成功", reasons, score };
  }
  const failedIds = new Set(state.failedObjectiveIds ?? []);
  const allResolved = requiredObjectives.every((objective) =>
    completed.some((item) => item.id === objective.id) || failedIds.has(objective.id),
  );
  if (allResolved) {
    const sentFalseIntel = campaign.intel.some((definition) => definition.truth === "false" && state.intel[definition.id]?.deliveredAt);
    if (sentFalseIntel) return { type: "intelligence_failure", title: "情报失败", reasons: ["错误情报已经送达组织"], score };
    if (completed.length > 0) {
      return { type: "partial_success", title: "部分成功", reasons: [`完成 ${completed.length} 项任务，${failedIds.size} 项任务未能按时完成`], score };
    }
    return { type: "mission_failure", title: "任务失败", reasons: ["所有核心任务均未能在截止时间前完成"], score };
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
