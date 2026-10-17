import { Router } from "express";
export const router = Router();

const DUEL_JUDGE_URL = process.env.DUEL_JUDGE_URL || "http://localhost:8003";

// Always generate: the judge uses a centrally switchable model route.
router.post("/judge", async (req, res) => {
  const { moveA, moveB, distance, cardA, cardB } = req.body;
  if (!moveA || !moveB || distance === undefined || distance === null) {
    res.status(400).json({ error: "moveA, moveB and distance required" });
    return;
  }

  // 未命中：转发到 duel-judge
  try {
    const response = await fetch(`${DUEL_JUDGE_URL}/api/duel/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveA, moveB, distance, cardA, cardB }),
    });
    const result = await response.json();

    res.status(response.status).json(result);
  } catch (err: any) {
    res.status(502).json({ error: `duel-judge 调用失败: ${err.message}` });
  }
});
