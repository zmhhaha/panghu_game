import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { router as authRouter } from "./routes/auth.js";
import { router as factionRouter } from "./routes/factions.js";
import { router as cardRouter } from "./routes/cards.js";
import { router as deckRouter } from "./routes/decks.js";
import { router as duelRouter } from "./routes/duels.js";
import { router as trainingRouter } from "./routes/training.js";
import { router as comboCacheRouter } from "./routes/combo-cache.js";
import { router as duelCacheRouter } from "./routes/duel-cache.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
const PORT = 3001;

// AI Agent 服务地址（K8s 内部，通过环境变量覆盖）
const DUEL_JUDGE_URL = process.env.DUEL_JUDGE_URL || "http://localhost:8003";
const COMBO_JUDGE_URL = process.env.COMBO_JUDGE_URL || "http://localhost:8004";
const TRAINING_GROUND_URL = process.env.TRAINING_GROUND_URL || "http://localhost:8005";

app.use(cors());

// AI Agent 反向代理（必须在 express.json() 之前，避免 body 被消费）
// duel 走缓存路由，不直接代理到 duel-judge
app.use("/api/ai/duel", (req, res, next) => {
  // POST /api/ai/duel/judge 走缓存逻辑（需要先解析 body）
  if (req.method === "POST" && req.path === "/judge") {
    return express.json()(req, res, () => duelCacheRouter(req, res, next));
  }
  // 其他（如 GET /health）直接转发
  createProxyMiddleware({
    target: DUEL_JUDGE_URL,
    changeOrigin: true,
    pathRewrite: (path) => "/api/duel" + path,
  })(req, res, next);
});
// combo 走缓存路由，不直接代理到 combo-judge
app.use("/api/ai/combo", (req, res, next) => {
  // POST /api/ai/combo/judge 走缓存逻辑（需要先解析 body）
  if (req.method === "POST" && req.path === "/judge") {
    return express.json()(req, res, () => comboCacheRouter(req, res, next));
  }
  // 其他（如 GET /health）直接转发
  createProxyMiddleware({
    target: COMBO_JUDGE_URL,
    changeOrigin: true,
    pathRewrite: (path) => "/api/combo" + path,
  })(req, res, next);
});
app.use("/api/ai/training", createProxyMiddleware({
  target: TRAINING_GROUND_URL,
  changeOrigin: true,
  pathRewrite: (path) => "/api/training" + path,
}));

app.use(express.json());

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "School of One" });
});

// 路由
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/factions", factionRouter);
app.use("/api/v1/cards", cardRouter);
app.use("/api/v1/decks", deckRouter);
app.use("/api/v1/duels", duelRouter);
app.use("/api/v1/training", trainingRouter);

// 错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  Duel Judge → ${DUEL_JUDGE_URL}`);
  console.log(`  Combo Judge → ${COMBO_JUDGE_URL}`);
  console.log(`  Training Ground → ${TRAINING_GROUND_URL}`);
});
