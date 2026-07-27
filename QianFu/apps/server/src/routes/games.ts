import { Router } from "express";
import { z } from "zod";
import { COVER_PROFILES, getDifficultyVisibility, isCharacterAvailableAt, toPublicGameEvents, toPublicWorldState, type GameAction } from "@qianfu/core";
import { DIALOGUE_MAX_TEXT_LENGTH } from "@qianfu/core/dialogue";
import { gameRepository } from "../game-repository.js";
import { LINJIANG_1942 } from "@qianfu/content";
import { campaignOrchestrator } from "../agents/orchestrator.js";
import { renderReportHtml } from "../reports.js";

export const gamesRouter = Router();

const difficultySchema = z.enum(["story", "undercover", "iron_curtain"]);
const saveSlotSchema = z.union([z.literal("1"), z.literal("2")]);
const duration = z.number().int().nonnegative().multipleOf(10);
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("dialogue_start"), targetCharacterId: z.string().min(1), goal: z.enum(["small_talk", "build_trust", "probe_attitude", "request_information", "verify_intel", "apply_pressure", "recruit_probe", "long_talk"]), tone: z.enum(["neutral", "friendly", "formal", "urgent", "threatening"]), targetIntelId: z.string().min(1).optional(), allocatedMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(60)]), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_turn"), sessionId: z.string().min(8), playerText: z.string().trim().min(1).max(DIALOGUE_MAX_TEXT_LENGTH), durationMinutes: z.literal(2), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_end"), sessionId: z.string().min(8), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
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
    items: z.array(z.object({ intelId: z.string().min(1), fields: z.array(z.string().min(1)).min(1).max(20) })).min(1).max(6),
    format: z.enum(["compressed", "full"]),
    codebookId: z.enum(["one_time_pad", "book_cipher"]),
    timing: z.enum(["scheduled", "immediate"]),
    locationId: z.string().min(1),
    durationMinutes: z.literal(0),
    idempotencyKey: z.string().min(8).max(128),
  }),
  z.object({ type: z.literal("delegate_comrade_task"), memberId: z.string().min(1), kind: z.enum(["gather_intel", "verify_intel", "scout_location"]), targetId: z.string().min(1), approach: z.enum(["cautious", "balanced", "urgent"]), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("cancel_comrade_task"), taskId: z.string().min(8).max(128), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
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

gamesRouter.get("/", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    await gameRepository.ensureUser(req.user);
    res.json({ games: (await gameRepository.listGames(req.user.id)).map(toPublicWorldState) });
  } catch (error) { next(error); }
});

gamesRouter.post("/", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const parsed = z.object({ difficulty: difficultySchema.default("undercover"), coverProfileId: z.enum(["archive_clerk", "travelling_merchant", "freelance_writer"]).default("archive_clerk") }).safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "参数无效", detail: parsed.error.flatten() }); return; }
  try {
    await gameRepository.ensureUser(req.user);
    res.status(201).json(toPublicWorldState(await gameRepository.createGame(req.user.id, parsed.data.difficulty, parsed.data.coverProfileId)));
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/context", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    const visibleCharacters = LINJIANG_1942.characters
      .filter((character) => state.characters[character.id]?.locationId === state.currentLocationId && isCharacterAvailableAt(character, state.currentTime))
      .map((character) => {
        const known = state.knownCharacterIds?.includes(character.id) ?? false;
        const verifiableIntelIds = LINJIANG_1942.intel
          .filter((intel) => intel.sourceCharacterIds.includes(character.id) && (state.intel[intel.id]?.knownFields.length ?? 0) > 0)
          .map((intel) => intel.id);
        return { id: character.id, name: known ? character.name : "？？？", publicIdentity: known ? character.publicIdentity : "尚未认识", recruitable: known && character.recruitable, known, verifiableIntelIds };
      });
    res.json({
      campaign: { id: LINJIANG_1942.id, version: LINJIANG_1942.version, name: LINJIANG_1942.name },
      visibility: getDifficultyVisibility(state.difficulty.id),
      settlement: {
        ready: state.status === "finished",
        pendingReceipts: state.radio.transmissions.filter((item) => item.receiptStatus === "pending").length,
      },
      locations: LINJIANG_1942.locations.map(({ id, name, district }) => {
        const discovered = state.discoveredLocationIds?.includes(id) ?? id === state.currentLocationId;
        return { id, name: discovered ? name : "？？？", district: discovered ? district : "区域未确认", discovered };
      }),
      characters: visibleCharacters,
      networkMembers: LINJIANG_1942.characters
        .filter((character) => state.network.activeMemberIds.includes(character.id))
        .map((character) => ({ id: character.id, name: character.name, publicIdentity: character.publicIdentity })),
      recruitmentCandidates: LINJIANG_1942.characters
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
            evidence: recruitmentCase.evidence,
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
      intel: LINJIANG_1942.intel.map(({ id, title, requiredFields, fieldLabels }) => ({ id, title, requiredFields, fieldLabels: fieldLabels ?? {} })),
      objectives: LINJIANG_1942.objectives.map((objective) => {
        const intel = objective.requiredIntelIds.map((intelId) => {
          const definition = LINJIANG_1942.intel.find((item) => item.id === intelId)!;
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
          title: objective.id === "confirm-radio-shipment" ? "确认无线电设备运输并安全送出" : objective.id,
          deadline: objective.deadline,
          minimumConfidence: objective.minimumConfidence,
          acceptedDeliveryMethods: objective.acceptedDeliveryMethods,
          status: completed ? "completed" : remainingMinutes === 0 ? "overdue" : allReady ? "ready_to_transmit" : "in_progress",
          remainingMinutes,
          intel,
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
    res.json({ state: toPublicWorldState(loaded.state), events: toPublicGameEvents(loaded.events) });
  } catch (error) { next(error); }
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
    }
    const result = await gameRepository.execute(req.params.id, req.user.id, action);
    if (!result) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ ...result, state: toPublicWorldState(result.state), events: toPublicGameEvents(result.events) });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "行动执行失败" });
  }
});

gamesRouter.get("/:id/events", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const events = await gameRepository.getEvents(req.params.id, req.user.id);
    if (!events) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ events: toPublicGameEvents(events) });
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
    const format = req.query.format === "html" ? "html" : "json";
    if (state.status !== "finished") {
      if (format === "html") { res.status(409).json({ error: "战役结算后才能导出 HTML 战报" }); return; }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qianfu-progress-${state.gameInstanceId}.json"`);
      res.json({
        schemaVersion: "1.0.0", kind: "player_progress", exportedAt: new Date().toISOString(),
        campaign: { id: LINJIANG_1942.id, version: LINJIANG_1942.version, name: LINJIANG_1942.name },
        state: toPublicWorldState(state), events: toPublicGameEvents(events),
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
