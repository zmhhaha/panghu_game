import { randomUUID } from "node:crypto";
import { CASES, getCase } from "@tashuo/content";
import {
  createInitialGameState, createInvestigationNote, deleteInvestigationNote, pauseGame, publishComment, repostContent, resumeGame, saveContent, setEvidence, setTimeScale, toggleContentLike,
  submitReport, synchronizeGame, toPublicGameState, type EvidenceEntry, type GameState, type SpeechFeatures,
} from "@tashuo/core";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { AgentOrchestrator } from "../agents/orchestrator.js";
import { createConfirmationToken, verifyConfirmationToken } from "../confirmation-token.js";
import type { GameRepository } from "../repository.js";
import { StateConflictError } from "../repository.js";

const createSchema = z.object({ caseId: z.string().min(1) });
const actionSchema = z.object({ idempotencyKey: z.string().min(8).max(128) });
const contentActionSchema = actionSchema.extend({ contentId: z.string().min(1) });
const commentSchema = contentActionSchema.extend({ text: z.string().trim().min(1).max(1000), confirmationToken: z.string().optional() });
const evidenceSchema = actionSchema.extend({
  entry: z.object({ factId: z.string(), judgment: z.enum(["true", "false", "partial", "unknown"]), confidence: z.number().min(0).max(100), supportingContentIds: z.array(z.string()).max(30), opposingContentIds: z.array(z.string()).max(30), note: z.string().max(2000) }),
});
const reportSchema = actionSchema.extend({ text: z.string().trim().min(20).max(20_000) });
const noteSchema = actionSchema.extend({ text: z.string().trim().min(1).max(2000), linkedContentIds: z.array(z.string()).max(12).default([]) });
const engagementSchema = contentActionSchema.extend({ action: z.enum(["like", "repost"]) });
const timeScaleSchema = actionSchema.extend({ timeScale: z.union([z.literal(1), z.literal(10), z.literal(100)]) });

const requireUser = (user: Express.Request["user"]) => {
  if (!user) throw new Error("未登录");
  return user;
};

const definitionFor = (state: GameState) => {
  const definition = getCase(state.caseId, state.caseVersion);
  if (!definition) throw new Error("事件内容版本不存在");
  return definition;
};

export function createGamesRouter(repository: GameRepository, orchestrator: AgentOrchestrator, confirmationSecret: string): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      const games = await repository.listGames(user.id);
      res.json({ games: games.map((state) => toPublicGameState(state, definitionFor(state))) });
    } catch (error) { next(error); }
  });

  router.post("/", async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "事件参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      await repository.ensureUser(user);
      const definition = CASES.find((item) => item.id === parsed.data.caseId);
      if (!definition) { res.status(404).json({ error: "事件不存在" }); return; }
      const state = createInitialGameState(definition, randomUUID(), user.id);
      await repository.createGame(user.id, state);
      res.status(201).json(toPublicGameState(state, definition));
    } catch (error) { next(error); }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      const state = await repository.getGame(req.params.id, user.id);
      if (!state) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      res.json(toPublicGameState(state, definitionFor(state)));
    } catch (error) { next(error); }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const user = requireUser(req.user);
      if (!await repository.deleteGame(req.params.id, user.id)) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      res.json({ deleted: true });
    } catch (error) { next(error); }
  });

  const simpleAction = (type: "sync" | "pause" | "resume") => async (req: Request, res: Response, next: NextFunction) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "操作参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = type === "sync" ? synchronizeGame(current, definition) : type === "pause" ? pauseGame(current, definition) : resumeGame(current);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: type, action: parsed.data, nextState });
      if (!saved) { res.status(404).json({ error: "游戏实例不存在" }); return; }
      res.json({ state: toPublicGameState(saved.state, definition), duplicate: saved.duplicate });
    } catch (error) { next(error); }
  };

  router.post("/:id/sync", simpleAction("sync"));
  router.post("/:id/pause", simpleAction("pause"));
  router.post("/:id/resume", simpleAction("resume"));

  router.post("/:id/time-scale", async (req, res, next) => {
    const parsed = timeScaleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "鏃堕棿閫熷害鍙傛暟鏃犳晥" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = setTimeScale(current, definition, parsed.data.timeScale);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "time_scale_changed", action: parsed.data, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/save-content", async (req, res, next) => {
    const parsed = contentActionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "收藏参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = saveContent(current, parsed.data.contentId);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "save_content", action: parsed.data, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/engagement", async (req, res, next) => {
    const parsed = engagementSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "互动参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = parsed.data.action === "like" ? toggleContentLike(current, definition, parsed.data.contentId) : repostContent(current, definition, parsed.data.contentId);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: `content_${parsed.data.action}`, action: parsed.data, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/comments", async (req, res, next) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "评论参数无效", detail: parsed.error.flatten() }); return; }
    const user = requireUser(req.user);
    const current = await repository.getGame(req.params.id, user.id);
    if (!current) { res.status(404).json({ error: "game not found" }); return; }
    const definition = definitionFor(current);
    if (current.status !== "active") { res.status(409).json({ error: "恢复世界时间后才能发表评论" }); return; }
    const requestStartedAt = new Date().toISOString();
    const paused = pauseGame(current, definition, requestStartedAt);
    try {
      let speech: SpeechFeatures;
      if (parsed.data.confirmationToken) {
        speech = verifyConfirmationToken(parsed.data.confirmationToken, { ownerUserId: user.id, gameInstanceId: current.id, contentId: parsed.data.contentId, text: parsed.data.text, stateVersion: current.stateVersion }, confirmationSecret);
      } else {
        speech = await orchestrator.analyzeSpeech(definition, paused, parsed.data.contentId, parsed.data.text, randomUUID());
        if (speech.confidence < 60) {
          const confirmationToken = createConfirmationToken({ ownerUserId: user.id, gameInstanceId: current.id, contentId: parsed.data.contentId, text: parsed.data.text, stateVersion: current.stateVersion, speechFeatures: speech }, confirmationSecret);
          res.status(422).json({ error: "发言含义需要确认", speechFeatures: speech, confirmationToken });
          return;
        }
      }
      const reactions = await orchestrator.reactGroups(definition, paused, parsed.data.contentId, parsed.data.text, speech);
      const commented = publishComment(paused, definition, { id: randomUUID(), contentId: parsed.data.contentId, text: parsed.data.text, speechFeatures: speech, groupReactions: reactions });
      const nextState = resumeGame(commented);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "publish_comment", action: { contentId: parsed.data.contentId, text: parsed.data.text }, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate, comment: saved!.state.comments.at(-1) });
    } catch (error) {
      try {
        await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: `${parsed.data.idempotencyKey}:model-failure`, actionType: "model_failure_pause", action: { contentId: parsed.data.contentId }, nextState: paused });
      } catch { /* The original error remains authoritative. */ }
      next(error);
    }
  });

  router.put("/:id/evidence", async (req, res, next) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "证据参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      if (!definition.facts.some((fact) => fact.id === parsed.data.entry.factId)) { res.status(400).json({ error: "调查主张不存在" }); return; }
      const nextState = setEvidence(current, parsed.data.entry as EvidenceEntry);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "set_evidence", action: parsed.data.entry, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/notes", async (req, res, next) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "调查笔记参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = createInvestigationNote(current, { id: randomUUID(), text: parsed.data.text, linkedContentIds: parsed.data.linkedContentIds });
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "create_note", action: { text: parsed.data.text, linkedContentIds: parsed.data.linkedContentIds }, nextState });
      res.status(201).json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.delete("/:id/notes/:noteId", async (req, res, next) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "调查笔记参数无效" }); return; }
    try {
      const user = requireUser(req.user);
      const current = await repository.getGame(req.params.id, user.id);
      if (!current) { res.status(404).json({ error: "game not found" }); return; }
      const definition = definitionFor(current);
      const nextState = deleteInvestigationNote(current, req.params.noteId);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "delete_note", action: { noteId: req.params.noteId }, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  router.post("/:id/report", async (req, res, next) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "报告参数无效" }); return; }
    const user = requireUser(req.user);
    const current = await repository.getGame(req.params.id, user.id);
    if (!current) { res.status(404).json({ error: "game not found" }); return; }
    const definition = definitionFor(current);
    const paused = current.status === "active" ? pauseGame(current, definition) : current;
    try {
      const analysis = await orchestrator.analyzeReport(definition, paused, parsed.data.text);
      const nextState = submitReport(paused, definition, parsed.data.text, analysis);
      const saved = await repository.saveGame({ gameInstanceId: current.id, ownerUserId: user.id, expectedStateVersion: current.stateVersion, idempotencyKey: parsed.data.idempotencyKey, actionType: "submit_report", action: { text: parsed.data.text }, nextState });
      res.json({ state: toPublicGameState(saved!.state, definition), duplicate: saved!.duplicate });
    } catch (error) { next(error); }
  });

  return router;
}

export function gameErrorStatus(error: unknown): number {
  return error instanceof StateConflictError ? 409 : error instanceof z.ZodError ? 422 : 500;
}
