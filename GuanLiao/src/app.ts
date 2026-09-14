import express from "express";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { requireAuth } from "./middleware/auth.js";
import type { GameStateRepository } from "./repository.js";
import { createAgentsRouter } from "./routes/agents.js";
import { createStateRouter } from "./routes/state.js";

export function createApp(repository: GameStateRepository, staticRoot: string): express.Express {
  const app = express();
  const indexPath = path.join(staticRoot, "index.html");
  const clientVersion = Math.max(
    statSync(path.join(staticRoot, "agent-client.js")).mtimeMs,
    statSync(path.join(staticRoot, "game.js")).mtimeMs,
  ).toString(36);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "guanliao-server" }));
  app.get("/api/ready", async (_req, res) => {
    const ready = await repository.ready();
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  });
  app.use("/api/agents", requireAuth, createAgentsRouter());
  app.use("/api/state", requireAuth, createStateRouter(repository));

  app.use("/assets", express.static(path.join(staticRoot, "assets"), { etag: true, maxAge: "1h" }));
  app.get(["/", "/index.html"], (_req, res) => {
    res.setHeader("cache-control", "no-store");
    res.type("html").send(readFileSync(indexPath, "utf8").replaceAll("__CLIENT_VERSION__", clientVersion));
  });
  for (const asset of ["styles.css", "agent-client.js", "game.js"]) {
    app.get(`/${asset}`, (_req, res) => {
      // These files form one client application. Caching one of them across a
      // deployment can combine an old interaction flow with a new API server.
      res.setHeader("cache-control", "no-store");
      res.sendFile(path.join(staticRoot, asset));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    const status = typeof error === "object" && error && "status" in error && error.status === 413 ? 413 : 500;
    res.status(status).json({ error: status === 413 ? "请求内容过大" : "服务器内部错误" });
  });

  return app;
}
