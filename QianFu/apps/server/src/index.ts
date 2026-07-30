import express from "express";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { gamesRouter } from "./routes/games.js";
import { privateSharesRouter, publicSharesRouter } from "./routes/shares.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "qianfu-server" }));
app.use("/api/v1/shares", publicSharesRouter);
app.use("/api/v1", requireAuth);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/campaigns", campaignsRouter);
app.use("/api/v1/games", gamesRouter);
app.use("/api/v1/manage-shares", privateSharesRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "服务器内部错误" });
});

app.listen(port, () => console.log(`[QianFu] server listening on http://localhost:${port}`));
