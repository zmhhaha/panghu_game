import { Router } from "express";
import { z } from "zod";
import type { GameStateRepository } from "../repository.js";

const gameStateSchema = z.object({
  version: z.literal(4),
  era: z.enum(["ming", "qing"]),
  route: z.enum(["local", "central", "regional"]),
  difficulty: z.enum(["guided", "reports", "opaque"]),
  name: z.string().trim().min(1).max(24),
  day: z.number().int().min(1).max(10000),
  seed: z.number().int().positive(),
  stats: z.object({
    livelihood: z.number().finite().min(0).max(100),
    treasury: z.number().finite().min(0).max(100),
    reputation: z.number().finite().min(0).max(100),
    favor: z.number().finite().min(0).max(100),
  }),
  merit: z.number().finite().min(0).max(100000),
  rankIndex: z.number().int().min(0).max(20),
  docket: z.array(z.string().max(80)).max(32),
  decisions: z.record(z.unknown()),
  pending: z.array(z.unknown()).max(100),
  reports: z.array(z.unknown()).max(500),
  unreadReports: z.number().int().min(0).max(500),
  deck: z.array(z.string().max(80)).max(64),
  agents: z.array(z.unknown()).min(1).max(16),
  savedAt: z.string().datetime().optional(),
}).passthrough();

export function createStateRouter(repository: GameStateRepository): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader("cache-control", "no-store");
    next();
  });

  router.get("/", async (req, res, next) => {
    try {
      const saved = await repository.get(req.user!);
      if (!saved) {
        res.status(404).json({ state: null });
        return;
      }
      res.json(saved);
    } catch (error) {
      next(error);
    }
  });

  router.put("/", async (req, res, next) => {
    const parsed = gameStateSchema.safeParse(req.body?.state);
    if (!parsed.success) {
      res.status(400).json({ error: "存档格式无效", detail: parsed.error.flatten() });
      return;
    }
    try {
      res.json(await repository.put(req.user!, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/", async (req, res, next) => {
    try {
      await repository.delete(req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
