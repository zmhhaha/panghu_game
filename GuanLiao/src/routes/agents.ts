import { Router } from "express";
import { dayRequestSchema } from "../agents/day-schema.js";
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

  router.get("/status", (_req, res) => res.json({ ...orchestrator.status(), dayProtocol: 1 }));

  router.post("/day", async (req, res) => {
    const parsed = dayRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "整日办理参数无效" });
      return;
    }
    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const send = (event: string, data: unknown) => {
      if (!res.destroyed && !res.writableEnded) {
        // A stalled client must not accumulate unlimited progress in memory.
        if (res.writableLength > 1024 * 1024) { res.destroy(); return; }
        res.write("event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n");
      }
    };
    const heartbeat = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) res.write(": heartbeat\n\n");
    }, 5000);
    try {
      const result = await orchestrator.prepareDay(parsed.data, event => send("progress", event), res.locals.agentSignal);
      send("result", result);
    } catch {
      send("failure", { dayRunId: parsed.data.dayRunId, message: "回文传递中断，请以备用文本结算。" });
    } finally {
      clearInterval(heartbeat);
      if (!res.destroyed) res.end();
    }
  });

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
