import { Router } from "express";
import { z } from "zod";
import { CampaignEngine, COVER_PROFILES, getCampaignCoverProfile, getContextualDialogueGoals, getCountermeasureOptions, getDifficultyVisibility, getRadioMinigameConfig, getRadioSites, getRestAvailability, isCharacterAvailableAt, isIntelUnlocked, isObjectiveUnlocked, toPublicGameEvents, toPublicWorldState, type GameAction, type RadioMessageItem } from "@qianfu/core";
import { DIALOGUE_MAX_TEXT_LENGTH } from "@qianfu/core/dialogue";
import { gameRepository } from "../game-repository.js";
import { DEFAULT_CAMPAIGN_REF, getCampaignDefinition, listCampaignCatalog } from "@qianfu/content";
import { campaignOrchestrator } from "../agents/orchestrator.js";
import { renderReportHtml } from "../reports.js";
import { issueRadioChallenge, scoreRadioAttempt, verifyRadioChallenge } from "../radio-challenge.js";

export const gamesRouter = Router();

const difficultySchema = z.enum(["story", "undercover", "iron_curtain"]);
const saveSlotSchema = z.union([z.literal("1"), z.literal("2")]);
const duration = z.number().int().nonnegative().multipleOf(10);
const radioSelectionSchema = z.object({
  items: z.array(z.object({ intelId: z.string().min(1), fields: z.array(z.string().min(1)).min(1).max(20) })).min(1).max(6),
  format: z.enum(["compressed", "full"]),
  codebookId: z.enum(["one_time_pad", "book_cipher"]),
  timing: z.enum(["scheduled", "immediate"]),
  locationId: z.string().min(1),
});
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("dialogue_start"), targetCharacterId: z.string().min(1), goal: z.enum(["small_talk", "build_trust", "probe_attitude", "request_information", "verify_intel", "apply_pressure", "recruit_probe", "long_talk"]), tone: z.enum(["neutral", "friendly", "formal", "urgent", "threatening"]), targetIntelId: z.string().min(1).optional(), allocatedMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(60)]), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_turn"), sessionId: z.string().min(8), playerText: z.string().trim().min(1).max(DIALOGUE_MAX_TEXT_LENGTH), durationMinutes: z.literal(2), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_end"), sessionId: z.string().min(8), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("respond_to_contact"), contactId: z.string().min(3).max(160), decision: z.enum(["accept", "defer", "refuse"]), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("countermeasure"), kind: z.enum(["check_tail", "reinforce_cover", "plant_decoy", "relocate_materials"]), targetLocationId: z.string().min(1).optional(), durationMinutes: z.union([z.literal(20), z.literal(30), z.literal(60)]), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("interrogation_answer"), interrogationId: z.string().min(8), strategy: z.enum(["calm", "formal", "deflect", "counter_question"]), playerText: z.string().trim().min(4).max(300), durationMinutes: z.literal(10), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("move"), destinationId: z.string().min(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("observe"), targetCharacterId: z.string().min(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("wait"), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("rest"), sleepMinutes: z.number().int().min(60).max(720).multipleOf(30), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("record_intel"), intelId: z.string().min(1), fields: z.array(z.string()).max(20), confidenceDelta: z.number().min(0).max(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("transmit_intel"), intelId: z.string().min(1), method: z.enum(["radio", "courier"]), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("cover_work"), workKind: z.enum(["file_sorting", "duty_shift", "submit_report", "settle_accounts", "visit_clients", "stock_check", "submit_column", "street_research", "proofread_copy"]), durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("request_leave"), reason: z.enum(["family", "health", "official"]), durationMinutes: z.literal(10), idempotencyKey: z.string().min(8).max(128) }),
  z.object({
    type: z.literal("send_radio_message"),
    ...radioSelectionSchema.shape,
    mode: z.enum(["automatic", "manual"]).default("automatic"),
    challengeToken: z.string().min(32).max(16000).optional(),
    attempt: z.object({
      inputs: z.array(z.object({ symbol: z.enum([".", "-"]), offsetMs: z.number().int().nonnegative() })).max(2000),
      correctionCount: z.number().int().nonnegative().max(2000),
      interruptionDecisions: z.array(z.object({ interruptionId: z.string().min(1).max(80), decision: z.enum(["pause", "force"]) })).max(10).default([]),
    }).optional(),
    durationMinutes: z.literal(0),
    idempotencyKey: z.string().min(8).max(128),
  }),
  z.object({
    type: z.literal("abort_radio_message"),
    ...radioSelectionSchema.shape,
    challengeToken: z.string().min(32).max(16000),
    interruptionId: z.string().min(1).max(80),
    durationMinutes: z.literal(0),
    idempotencyKey: z.string().min(8).max(128),
  }),
  z.object({
    type: z.literal("propose_cooperation_request"), memberId: z.string().min(1), kind: z.enum(["gather_intel", "verify_intel", "scout_location"]), targetId: z.string().min(1), approach: z.enum(["cautious", "balanced", "urgent"]),
    terms: z.object({ purpose: z.string().trim().min(4).max(240), riskLimit: z.enum(["low", "moderate", "high"]), exchange: z.enum(["none", "favor", "payment", "protection"]), abortCondition: z.string().trim().min(4).max(240) }),
    durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128),
  }),
  z.object({ type: z.literal("confirm_cooperation_request"), requestId: z.string().min(8).max(128), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("cancel_cooperation_request"), requestId: z.string().min(8).max(128), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("recruitment_test"), targetCharacterId: z.string().min(1), testType: z.enum(["background_check", "controlled_leak", "discipline_check", "low_risk_task"]), plan: z.object({ objective: z.string().trim().min(4).max(240), steps: z.string().trim().min(8).max(1200), safeguards: z.string().trim().min(4).max(600), abortCondition: z.string().trim().min(4).max(400) }), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("recruit_candidate"), targetCharacterId: z.string().min(1), durationMinutes: z.literal(30), idempotencyKey: z.string().min(8).max(128) }),
  z.object({
    type: z.literal("dialogue"),
    targetCharacterId: z.string().min(1),
    goal: z.enum(["small_talk", "build_trust", "probe_attitude", "request_information", "verify_intel", "apply_pressure", "recruit_probe", "long_talk"]),
    tone: z.enum(["neutral", "friendly", "formal", "urgent", "threatening"]),
    playerText: z.string().trim().min(1).max(DIALOGUE_MAX_TEXT_LENGTH),
    targetIntelId: z.string().min(1).optional(),
    durationMinutes: z.number().int().positive().multipleOf(10).max(60),
    idempotencyKey: z.string().min(8).max(128),
  }),
]);

function canonicalRadioItems(items: RadioMessageItem[]): RadioMessageItem[] {
  return items.map((item) => ({ intelId: item.intelId, fields: [...new Set(item.fields)] }));
}

gamesRouter.get("/", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    await gameRepository.ensureUser(req.user);
    const games = (await gameRepository.listGames(req.user.id)).map((state) => {
      const campaign = getCampaignDefinition(state.campaignId, state.campaignVersion);
      const currentLocationName = campaign.locations.find((location) => location.id === state.currentLocationId)?.name ?? "未知地点";
      return { ...toPublicWorldState(state), campaignName: campaign.name, currentLocationName };
    });
    res.json({ games });
  } catch (error) { next(error); }
});

gamesRouter.post("/", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = z.object({
    campaignId: z.string().min(1).default(DEFAULT_CAMPAIGN_REF.id),
    campaignVersion: z.string().min(1).default(DEFAULT_CAMPAIGN_REF.version),
    difficulty: difficultySchema.default("undercover"),
    coverProfileId: z.enum(["archive_clerk", "travelling_merchant", "freelance_writer"]).default("archive_clerk"),
  }).safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "参数无效", detail: parsed.error.flatten() }); return; }
  try {
    const selected = listCampaignCatalog().find((campaign) => campaign.id === parsed.data.campaignId && campaign.version === parsed.data.campaignVersion);
    if (!selected) { res.status(400).json({ error: "战役不存在或该版本不可用" }); return; }
    if (!selected.coverProfileIds.includes(parsed.data.coverProfileId)) { res.status(400).json({ error: "该战役不支持所选公开身份" }); return; }
    await gameRepository.ensureUser(req.user);
    res.status(201).json(toPublicWorldState(await gameRepository.createGame(req.user.id, {
      campaignId: selected.id,
      campaignVersion: selected.version,
      difficultyId: parsed.data.difficulty,
      coverProfileId: parsed.data.coverProfileId,
    })));
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/context", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    const campaign = getCampaignDefinition(state.campaignId, state.campaignVersion);
    const coverProfile = getCampaignCoverProfile(campaign, state.cover.profileId);
    const visibility = getDifficultyVisibility(state.difficulty.id);
    const visibleCharacters = campaign.characters
      .filter((character) => state.characters[character.id]?.locationId === state.currentLocationId && isCharacterAvailableAt(character, state.currentTime))
      .map((character) => {
        const known = state.knownCharacterIds?.includes(character.id) ?? false;
        const verifiableIntelIds = campaign.intel
          .filter((intel) => intel.sourceCharacterIds.includes(character.id) && (state.intel[intel.id]?.knownFields.length ?? 0) > 0)
          .map((intel) => intel.id);
        const relationship = state.characters[character.id];
        const availableDialogueGoals = known && relationship
          ? getContextualDialogueGoals(relationship, { recruitable: character.recruitable, hasVerifiableIntel: verifiableIntelIds.length > 0 })
          : [];
        return { id: character.id, name: known ? character.name : "？？？", publicIdentity: known ? character.publicIdentity : "尚未认识", recruitable: known && character.recruitable, known, verifiableIntelIds, availableDialogueGoals };
      });
    res.json({
      campaign: { id: campaign.id, version: campaign.version, name: campaign.name },
      coverProfile: {
        id: coverProfile.id,
        title: coverProfile.title,
        routineLabel: coverProfile.routineLabel,
        workHours: coverProfile.workHours,
        workKinds: coverProfile.workKinds,
        accountability: coverProfile.accountability,
        currentLocationEligible: coverProfile.workLocationIds.includes(state.currentLocationId),
      },
      interrogator: state.interrogation ? (() => {
        const character = campaign.characters.find((item) => item.id === state.interrogation?.interrogatorCharacterId);
        return character ? { name: character.name, publicIdentity: character.publicIdentity } : { name: "调查员", publicIdentity: "敌方调查人员" };
      })() : null,
      visibility,
      radioMinigame: getRadioMinigameConfig(state.difficulty.id),
      settlement: {
        ready: state.status === "finished",
        pendingReceipts: state.radio.transmissions.filter((item) => item.receiptStatus === "pending").length,
      },
      locations: campaign.locations.map(({ id, name, district, travelMinutes, mapPosition }) => {
        const legacyDiscovered = state.discoveredLocationIds?.includes(id) ?? id === state.currentLocationId;
        const knowledge = state.locationKnowledge?.[id];
        const stage = knowledge?.stage ?? (legacyDiscovered ? "accessible" : "unknown");
        const identified = stage === "located" || stage === "accessible" || stage === "compromised";
        return {
          id,
          name: identified ? name : "？？？",
          district: identified ? district : stage === "rumored" ? "区域传闻" : "区域未确认",
          travelMinutes,
          mapPosition,
          discovered: stage === "accessible",
          stage,
          hint: knowledge?.hint ?? null,
        };
      }),
      narrativeThreads: state.narrativeThreads ?? [],
      rest: getRestAvailability(campaign, state),
      countermeasures: getCountermeasureOptions(campaign, state),
      radioSites: getRadioSites(campaign, state).map((site) => ({
        ...site,
        discovered: state.discoveredLocationIds.includes(site.id),
        currentHeat: state.investigation.locationHeat[site.id] ?? 0,
      })),
      characters: visibleCharacters,
      networkMembers: campaign.characters
        .filter((character) => state.network.activeMemberIds.includes(character.id))
        .map((character) => ({ id: character.id, name: character.name, publicIdentity: character.publicIdentity })),
      recruitmentCandidates: campaign.characters
        .filter((character) => character.recruitable && state.knownCharacterIds.includes(character.id))
        .map((character) => {
          const candidate = state.characters[character.id];
          const recruitmentCase = candidate.recruitmentCase ?? { stage: candidate.recruited ? "recruited" : "contact", completedTestTypes: [], evidence: [] };
          const rapportReady = candidate.familiarity >= 8 && candidate.privateTrust >= 5 && candidate.recruitmentProgress >= 20;
          const testsReady = new Set(recruitmentCase.completedTestTypes).size >= 3;
          return {
            id: character.id,
            name: character.name,
            publicIdentity: character.publicIdentity,
            stage: candidate.recruited ? "recruited" : testsReady && rapportReady ? "ready" : recruitmentCase.stage,
            completedTestTypes: recruitmentCase.completedTestTypes,
            evidence: recruitmentCase.evidence.map((evidence) => ({
              ...evidence,
              result: visibility.showEvidenceRelations ? evidence.result : null,
              summary: visibility.showEvidenceRelations ? evidence.summary : "甄别行动已经结束，以下仅保留可观察的原始执行记录。",
              executionReport: evidence.executionReport ? {
                ...evidence.executionReport,
                followUpOptions: visibility.showPlanGenerator ? evidence.executionReport.followUpOptions : [],
              } : undefined,
            })),
            requirements: {
              contactReady: candidate.familiarity >= 3,
              cooperationReady: candidate.recruitmentProgress >= 20,
              rapportReady,
              testsCompleted: recruitmentCase.completedTestTypes.length,
              testsRequired: 3,
            },
            canRecruit: !candidate.recruited && rapportReady && testsReady && candidate.locationId === state.currentLocationId,
          };
        }),
      intel: campaign.intel.filter((definition) => isIntelUnlocked(campaign, state, definition.id) || (state.intel[definition.id]?.knownFields.length ?? 0) > 0).map(({ id, title, requiredFields, fieldLabels }) => ({ id, title, requiredFields, fieldLabels: fieldLabels ?? {} })),
      objectives: campaign.objectives.map((objective) => {
        const unlocked = isObjectiveUnlocked(state, objective);
        const intel = objective.requiredIntelIds.map((intelId) => {
          const definition = campaign.intel.find((item) => item.id === intelId)!;
          const current = state.intel[intelId];
          const knownFields = current?.knownFields ?? [];
          const deliveredFields = current?.deliveredFields ?? (current?.deliveredAt ? [...knownFields] : []);
          const missingFields = definition.requiredFields.filter((field) => !knownFields.includes(field));
          const delivered = definition.requiredFields.every((field) => deliveredFields.includes(field))
            && Boolean(current?.deliveryMethod && objective.acceptedDeliveryMethods.includes(current.deliveryMethod));
          const matchingTransmissions = state.radio.transmissions.filter((transmission) => transmission.items.some((item) => item.intelId === intelId));
          const latestTransmission = matchingTransmissions.at(-1);
          const receiptStatus = current?.deliveryMethod === "courier" && delivered
            ? "courier_delivered"
            : latestTransmission?.receiptStatus ?? "not_sent";
          return { id: intelId, title: definition.title, requiredFields: definition.requiredFields, knownFields, deliveredFields, confidence: current?.confidence ?? 0, delivered, missingFields, receiptStatus };
        });
        const allReady = intel.every((item) => item.missingFields.length === 0 && item.confidence >= objective.minimumConfidence);
        const completed = intel.every((item) => item.delivered && item.missingFields.length === 0 && item.confidence >= objective.minimumConfidence);
        const remainingMinutes = Math.max(0, Math.round((Date.parse(objective.deadline) - Date.parse(state.currentTime)) / 60_000));
        return {
          id: objective.id,
          title: objective.title ?? objective.id,
          deadline: objective.deadline,
          minimumConfidence: objective.minimumConfidence,
          acceptedDeliveryMethods: objective.acceptedDeliveryMethods,
          status: state.failedObjectiveIds?.includes(objective.id) ? "failed" : !unlocked ? "locked" : completed ? "completed" : remainingMinutes === 0 ? "overdue" : allReady ? "ready_to_transmit" : "in_progress",
          remainingMinutes,
          intel: unlocked ? intel : [],
        };
      }),
    });
  } catch (error) { next(error); }
});

gamesRouter.get("/:id", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const game = await gameRepository.getGame(req.params.id, req.user.id);
    if (!game) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json(toPublicWorldState(game));
  } catch (error) { next(error); }
});

gamesRouter.delete("/:id", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const deleted = await gameRepository.deleteGame(req.params.id, req.user.id);
    if (!deleted) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/snapshots", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const snapshots = await gameRepository.listPlayerSnapshots(req.params.id, req.user.id);
    if (!snapshots) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ snapshots });
  } catch (error) { next(error); }
});

gamesRouter.put("/:id/snapshots/:slot", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = z.object({ label: z.string().trim().max(60).default("") }).safeParse(req.body ?? {});
  const slot = saveSlotSchema.safeParse(req.params.slot);
  if (!parsed.success || !slot.success) { res.status(400).json({ error: "存档参数无效" }); return; }
  try {
    const snapshot = await gameRepository.savePlayerSnapshot(req.params.id, req.user.id, Number(slot.data) as 1 | 2, parsed.data.label);
    if (!snapshot) { res.status(409).json({ error: "战役不存在或已经结算" }); return; }
    res.json(snapshot);
  } catch (error) { next(error); }
});

gamesRouter.post("/:id/snapshots/:slot/load", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const slot = saveSlotSchema.safeParse(req.params.slot);
  if (!slot.success) { res.status(400).json({ error: "存档槽位无效" }); return; }
  try {
    const loaded = await gameRepository.loadPlayerSnapshot(req.params.id, req.user.id, Number(slot.data) as 1 | 2);
    if (!loaded) { res.status(409).json({ error: "存档不存在、版本不兼容或战役已经结算" }); return; }
    res.json({ state: toPublicWorldState(loaded.state), events: toPublicGameEvents(loaded.events, loaded.state.difficulty.id) });
  } catch (error) { next(error); }
});

gamesRouter.post("/:id/radio-challenges", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = radioSelectionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "电文参数无效", detail: parsed.error.flatten() }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    const campaign = getCampaignDefinition(state.campaignId, state.campaignVersion);
    const items = canonicalRadioItems(parsed.data.items);
    new CampaignEngine(campaign, state).execute({
      type: "send_radio_message", ...parsed.data, items, mode: "manual",
      manualPerformance: { accuracy: 1, timingScore: 1, completion: 1, grade: "excellent", errorCount: 0, correctionCount: 0, sequence: "." },
      durationMinutes: 0, idempotencyKey: `radio-preflight-${state.stateVersion}`,
    });
    const challenge = issueRadioChallenge({
      userId: req.user.id, gameInstanceId: state.gameInstanceId, stateVersion: state.stateVersion,
      items, format: parsed.data.format, codebookId: parsed.data.codebookId, timing: parsed.data.timing,
      locationId: parsed.data.locationId, difficultyId: state.difficulty.id,
    });
    const content = items.map((item) => {
      const definition = campaign.intel.find((intel) => intel.id === item.intelId);
      return { intelId: item.intelId, title: definition?.title ?? item.intelId, fields: item.fields.map((field) => definition?.fieldLabels?.[field] ?? field) };
    });
    res.status(201).json({ ...challenge, content });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "无法编制发报挑战" });
  }
});

gamesRouter.post("/:id/actions", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "行动参数无效", detail: parsed.error.flatten() }); return; }
  try {
    let action: GameAction = parsed.data;
    if (action.type === "dialogue") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      action = (await campaignOrchestrator.prepareDialogue(current, action)).action;
    } else if (action.type === "dialogue_turn") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      action = await campaignOrchestrator.prepareTurn(current, action);
    } else if (action.type === "recruitment_test") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      action = await campaignOrchestrator.prepareRecruitmentTest(current, action);
    } else if (action.type === "propose_cooperation_request") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      action = await campaignOrchestrator.prepareCooperationRequest(current, action);
    } else if (action.type === "send_radio_message" && parsed.data.type === "send_radio_message") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      const items = canonicalRadioItems(parsed.data.items);
      if (parsed.data.mode === "manual") {
        if (!parsed.data.challengeToken || !parsed.data.attempt) { res.status(400).json({ error: "手动发报缺少挑战或操作记录" }); return; }
        const payload = verifyRadioChallenge(parsed.data.challengeToken, {
          userId: req.user.id, gameInstanceId: current.gameInstanceId, stateVersion: current.stateVersion,
          items, format: parsed.data.format, codebookId: parsed.data.codebookId, timing: parsed.data.timing,
          locationId: parsed.data.locationId, difficultyId: current.difficulty.id,
        });
        action = {
          type: "send_radio_message", items, format: parsed.data.format, codebookId: parsed.data.codebookId,
          timing: parsed.data.timing, locationId: parsed.data.locationId, mode: "manual",
          manualPerformance: scoreRadioAttempt(payload, parsed.data.attempt.inputs, parsed.data.attempt.correctionCount, parsed.data.attempt.interruptionDecisions),
          durationMinutes: 0, idempotencyKey: parsed.data.idempotencyKey,
        };
      } else {
        action = { type: "send_radio_message", items, format: parsed.data.format, codebookId: parsed.data.codebookId, timing: parsed.data.timing, locationId: parsed.data.locationId, mode: "automatic", durationMinutes: 0, idempotencyKey: parsed.data.idempotencyKey };
      }
    } else if (action.type === "abort_radio_message" && parsed.data.type === "abort_radio_message") {
      const current = await gameRepository.getGame(req.params.id, req.user.id);
      if (!current) { res.status(404).json({ error: "战役不存在" }); return; }
      const items = canonicalRadioItems(parsed.data.items);
      const payload = verifyRadioChallenge(parsed.data.challengeToken, {
        userId: req.user.id, gameInstanceId: current.gameInstanceId, stateVersion: current.stateVersion,
        items, format: parsed.data.format, codebookId: parsed.data.codebookId, timing: parsed.data.timing,
        locationId: parsed.data.locationId, difficultyId: current.difficulty.id,
      });
      const interruptionId = parsed.data.interruptionId;
      const interruption = payload.interruptions.find((item) => item.id === interruptionId);
      if (!interruption) { res.status(400).json({ error: "发报途中事件无效" }); return; }
      const riskDelta = interruption.kind === "patrol" ? 4 : interruption.kind === "power_flicker" ? 3 : 2;
      action = { type: "abort_radio_message", locationId: parsed.data.locationId, riskDelta, interruptionId: interruption.id, durationMinutes: 10, idempotencyKey: parsed.data.idempotencyKey };
    }
    const result = await gameRepository.execute(req.params.id, req.user.id, action);
    if (!result) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ ...result, state: toPublicWorldState(result.state), events: toPublicGameEvents(result.events, result.state.difficulty.id) });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "行动执行失败" });
  }
});

gamesRouter.get("/:id/events", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const [events, state] = await Promise.all([
      gameRepository.getEvents(req.params.id, req.user.id),
      gameRepository.getGame(req.params.id, req.user.id),
    ]);
    if (!events || !state) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ events: toPublicGameEvents(events, state.difficulty.id) });
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/report", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    if (state.status !== "finished") { res.status(409).json({ error: "战役尚未结算" }); return; }
    const report = await gameRepository.getReport(req.params.id, req.user.id);
    if (!report) { res.status(409).json({ error: "结算报告尚未生成" }); return; }
    res.json(report);
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/shares", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const shares = await gameRepository.listShares(req.params.id, req.user.id);
    if (!shares) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ shares });
  } catch (error) { next(error); }
});

gamesRouter.post("/:id/shares", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = z.object({ expiresInDays: z.union([z.literal(7), z.literal(30), z.literal(90), z.null()]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "分享有效期无效" }); return; }
  const expiresAt = parsed.data.expiresInDays === null
    ? null
    : new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    if (state.status !== "finished") { res.status(409).json({ error: "只有已结算战役可以分享" }); return; }
    const share = await gameRepository.createShare(req.params.id, req.user.id, expiresAt);
    if (!share) { res.status(409).json({ error: "结算报告尚未生成" }); return; }
    res.status(201).json(share);
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/export", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    const events = await gameRepository.getEvents(req.params.id, req.user.id);
    if (!state || !events) { res.status(404).json({ error: "战役不存在" }); return; }
    const campaign = getCampaignDefinition(state.campaignId, state.campaignVersion);
    const format = req.query.format === "html" ? "html" : "json";
    if (state.status !== "finished") {
      if (format === "html") { res.status(409).json({ error: "战役结算后才能导出 HTML 战报" }); return; }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qianfu-progress-${state.gameInstanceId}.json"`);
      res.json({
        schemaVersion: "1.0.0", kind: "player_progress", exportedAt: new Date().toISOString(),
        campaign: { id: campaign.id, version: campaign.version, name: campaign.name },
        state: toPublicWorldState(state), events: toPublicGameEvents(events, state.difficulty.id),
      });
      return;
    }
    const bundle = await gameRepository.getReport(req.params.id, req.user.id);
    if (!bundle) { res.status(409).json({ error: "结算报告尚未生成" }); return; }
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qianfu-report-${state.gameInstanceId}.html"`);
      res.send(renderReportHtml(bundle.ownerReport));
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qianfu-report-${state.gameInstanceId}.json"`);
    res.json(bundle.ownerReport);
  } catch (error) { next(error); }
});
