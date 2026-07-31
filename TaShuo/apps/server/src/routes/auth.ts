import { Router } from "express";
import type { GameRepository } from "../repository.js";

export function createAuthRouter(repository: GameRepository): Router {
  const router = Router();
  router.get("/me", async (req, res, next) => {
    if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
    try { res.json(await repository.ensureUser(req.user)); } catch (error) { next(error); }
  });
  return router;
}

