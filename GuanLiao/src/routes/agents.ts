import { Router } from "express";
import { bureaucracyOrchestrator, type BureaucracyOrchestrator } from "../agents/orchestrator.js";
import {
  completionRequestSchema,
  propagationBatchRequestSchema,
  propagationRequestSchema,
} from "../agents/schemas.js";

export function createAgentsRouter(orchestrator: BureaucracyOrchestrator = bureaucracyOrchestrator): Router {
  const router = Router();
  router.use((req, res, next) => {
    const controller = new AbortController();
    res.locals.agentSignal = controller.signal;
    const close = () => { if (!res.writableEnded) controller.abort(new Error("client_disconnected")); };
    res.once("close", close);
    res.once("finish", () => res.removeListener("close", close));
    next();
  });

  router.get("/status", (_req, res) => res.json(orchestrator.status()));

  router.post("/propagate", async (req, res, next) => {
    const parsed = propagationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "官员下行参数无效", detail: parsed.error.flatten() });
      return;
    }
    try {
      const result = await orchestrator.preparePropagation(parsed.data, res.locals.agentSignal);
      if (!res.destroyed) res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/propagate-batch", async (req, res, next) => {
    const parsed = propagationBatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "官员批量下行参数无效", detail: parsed.error.flatten() });
      return;
    }
    try {
      const result = await orchestrator.preparePropagationBatch(parsed.data, res.locals.agentSignal);
      if (!res.destroyed) res.json(result);
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
      const result = await orchestrator.prepareCompletion(parsed.data, res.locals.agentSignal);
      if (!res.destroyed) res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
