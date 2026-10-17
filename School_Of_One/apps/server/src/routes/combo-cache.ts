import { Router } from "express";
export const router = Router();

const COMBO_JUDGE_URL = process.env.COMBO_JUDGE_URL || "http://localhost:8004";

// Always generate: the judge uses a centrally switchable model route.
router.post("/judge", async (req, res) => {
  const { moveA, moveB } = req.body;
  if (!moveA || !moveB) {
    res.status(400).json({ error: "moveA and moveB required" });
    return;
  }

  // 未命中：转发到 combo-judge
  try {
    const response = await fetch(`${COMBO_JUDGE_URL}/api/combo/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveA, moveB }),
    });
    const result = await response.json();

    res.status(response.status).json(result);
  } catch (err: any) {
    res.status(502).json({ error: `combo-judge 调用失败: ${err.message}` });
  }
});
