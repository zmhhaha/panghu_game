import express from "express";
import { AgentOrchestrator } from "./agents/orchestrator.js";
import type { AgentProvider } from "./agents/provider.js";
import { requireAuth } from "./middleware/auth.js";
import type { GameRepository } from "./repository.js";
import { createAuthRouter } from "./routes/auth.js";
import { casesRouter } from "./routes/cases.js";
import { createGamesRouter, gameErrorStatus } from "./routes/games.js";

export function createApp(repository: GameRepository, provider: AgentProvider, confirmationSecret: string) {
  const app = express();
  const orchestrator = new AgentOrchestrator(provider);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "tashuo-server", provider: provider.name, model: provider.model }));
  app.use("/api/v1", requireAuth);
  app.use("/api/v1/auth", createAuthRouter(repository));
  app.use("/api/v1/cases", casesRouter);
  app.use("/api/v1/games", createGamesRouter(repository, orchestrator, confirmationSecret));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    const status = gameErrorStatus(error);
    res.status(status).json({ error: error instanceof Error ? error.message : "服务器内部错误" });
  });
  return app;
}

