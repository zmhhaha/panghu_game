import { Router } from "express";
import { randomUUID as uuid } from "crypto";
import crypto from "crypto";
import { getDb } from "../db/index.js";
import { comboCache } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

const COMBO_JUDGE_URL = process.env.COMBO_JUDGE_URL || "http://localhost:8004";

function makeCacheKey(moveA: string, moveB: string): string {
  const raw = `${moveA}|${moveB}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

/**
 * POST /api/ai/combo/judge
 * 带数据库缓存的连招判定。
 * 先查 combo_cache 表，有则直接返回并递增 hit_count；
 * 没有则转发 combo-judge Agent，保存结果后返回。
 */
router.post("/judge", async (req, res) => {
  const { moveA, moveB } = req.body;
  if (!moveA || !moveB) {
    res.status(400).json({ error: "moveA and moveB required" });
    return;
  }

  const key = makeCacheKey(moveA, moveB);

  try {
    const db = getDb();

    // 查缓存
    const rows = await db.select().from(comboCache).where(eq(comboCache.cacheKey, key)).limit(1);
    if (rows.length > 0) {
      // 命中：递增 hitCount
      await db.update(comboCache)
        .set({ hitCount: rows[0].hitCount + 1 })
        .where(eq(comboCache.id, rows[0].id));
      res.json(rows[0].result);
      return;
    }
  } catch {
    // 数据库不可用时回退
  }

  // 未命中：转发到 combo-judge
  try {
    const response = await fetch(`${COMBO_JUDGE_URL}/api/combo/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveA, moveB }),
    });
    const result = await response.json();

    // 异步保存到缓存（不阻塞响应）
    try {
      const db = getDb();
      await db.insert(comboCache).values({
        id: uuid(),
        cacheKey: key,
        moveA,
        moveB,
        result,
        createdAt: new Date().toISOString(),
        hitCount: 1,
      });
    } catch {
      // 缓存写入失败不影响响应
    }

    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: `combo-judge 调用失败: ${err.message}` });
  }
});
