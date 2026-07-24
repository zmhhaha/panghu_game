import { Router } from "express";
import { z } from "zod";
import { toPublicWorldState, type GameAction } from "@qianfu/core";
import { gameRepository } from "../game-repository.js";
import { LINJIANG_1942 } from "@qianfu/content";
import { campaignOrchestrator } from "../agents/orchestrator.js";

export const gamesRouter = Router();

const difficultySchema = z.enum(["story", "undercover", "iron_curtain"]);
const duration = z.number().int().nonnegative().multipleOf(10);
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("dialogue_start"), targetCharacterId: z.string().min(1), goal: z.enum(["small_talk", "build_trust", "probe_attitude", "request_information", "verify_intel", "apply_pressure", "recruit_probe", "long_talk"]), tone: z.enum(["neutral", "friendly", "formal", "urgent", "threatening"]), allocatedMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(60)]), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_turn"), sessionId: z.string().min(8), playerText: z.string().trim().min(1).max(500), durationMinutes: z.literal(2), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("dialogue_end"), sessionId: z.string().min(8), durationMinutes: z.literal(0), idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("move"), destinationId: z.string().min(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("observe"), targetCharacterId: z.string().min(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("wait"), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("record_intel"), intelId: z.string().min(1), fields: z.array(z.string()).max(20), confidenceDelta: z.number().min(0).max(1), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({ type: z.literal("transmit_intel"), intelId: z.string().min(1), method: z.enum(["radio", "courier"]), durationMinutes: duration, idempotencyKey: z.string().min(8).max(128) }),
  z.object({
    type: z.literal("dialogue"),
    targetCharacterId: z.string().min(1),
    goal: z.enum(["small_talk", "build_trust", "probe_attitude", "request_information", "verify_intel", "apply_pressure", "recruit_probe", "long_talk"]),
    tone: z.enum(["neutral", "friendly", "formal", "urgent", "threatening"]),
    playerText: z.string().trim().min(1).max(500),
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
  const parsed = z.object({ difficulty: difficultySchema.default("undercover") }).safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "参数无效", detail: parsed.error.flatten() }); return; }
  try {
    await gameRepository.ensureUser(req.user);
    res.status(201).json(toPublicWorldState(await gameRepository.createGame(req.user.id, parsed.data.difficulty)));
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/context", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    if (!state) { res.status(404).json({ error: "战役不存在" }); return; }
    const visibleCharacters = LINJIANG_1942.characters
      .filter((character) => state.characters[character.id]?.locationId === state.currentLocationId)
      .map((character) => ({ id: character.id, name: character.name, publicIdentity: character.publicIdentity, recruitable: character.recruitable }));
    res.json({
      campaign: { id: LINJIANG_1942.id, version: LINJIANG_1942.version, name: LINJIANG_1942.name },
      locations: LINJIANG_1942.locations.map(({ id, name, district }) => ({ id, name, district })),
      characters: visibleCharacters,
      intel: LINJIANG_1942.intel.map(({ id, title, requiredFields }) => ({ id, title, requiredFields })),
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
    }
    const result = await gameRepository.execute(req.params.id, req.user.id, action);
    if (!result) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ ...result, state: toPublicWorldState(result.state) });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "行动执行失败" });
  }
});

gamesRouter.get("/:id/events", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const events = await gameRepository.getEvents(req.params.id, req.user.id);
    if (!events) { res.status(404).json({ error: "战役不存在" }); return; }
    res.json({ events: events.map((event) => event.type === "dialogue.completed"
      ? { ...event, payload: (() => { const payload = event.payload as Record<string, unknown>; const { privateIntent: _privateIntent, memorySummary: _memorySummary, requestedEffects: _requestedEffects, ...publicPayload } = payload; return publicPayload; })() }
      : event) });
  } catch (error) { next(error); }
});

gamesRouter.get("/:id/export", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const state = await gameRepository.getGame(req.params.id, req.user.id);
    const events = await gameRepository.getEvents(req.params.id, req.user.id);
    if (!state || !events) { res.status(404).json({ error: "战役不存在" }); return; }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qianfu-${state.gameInstanceId}.json"`);
    res.json({ schemaVersion: "1.0.0", exportedAt: new Date().toISOString(), campaign: LINJIANG_1942, state, events });
  } catch (error) { next(error); }
});
