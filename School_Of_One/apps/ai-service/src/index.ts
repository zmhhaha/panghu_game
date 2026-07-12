import express from "express";

const app = express();
const PORT = 3002;

app.use(express.json());

app.get("/api/ai/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-service" });
});

// AI 服务路由占位
// POST /api/ai/training/describe - 习武场描述处理
// POST /api/ai/duel/judge      - 对决仲裁

app.listen(PORT, () => {
  console.log(`AI Service running on http://localhost:${PORT}`);
});
