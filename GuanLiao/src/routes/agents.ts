import { Router } from "express";
import { bureaucracyOrchestrator, type BureaucracyOrchestrator } from "../agents/orchestrator.js";
import { completionRequestSchema, propagationRequestSchema } from "../agents/schemas.js";

export function createAgentsRouter(orchestrator: BureaucracyOrchestrator = bureaucracyOrchestrator): Router {
  const router = Router();

  router.get("/status", (_req, res) => res.json(orchestrator.status()));

  router.post("/propagate", async (req, res, next) => {
    const parsed = propagationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "官员下行参数无效", detail: parsed.error.flatten() });
      return;
    }
    try {
      res.json(await orchestrator.preparePropagation(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.post("/complete", async (req, res, next) => {
    const parsed = completionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "办结回文参数无效", detail: parsed.error.flatten() });
      return;
    }
    try {
      res.json(await orchestrator.prepareCompletion(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
