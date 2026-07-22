import { Router } from "express";
import { randomUUID as uuid } from "crypto";
import crypto from "crypto";
import { getDb } from "../db/index.js";
import { duelCache } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

const DUEL_JUDGE_URL = process.env.DUEL_JUDGE_URL || "http://localhost:8003";

function makeCacheKey(moveA: string, moveB: string, distance: number, cardA?: string, cardB?: string): string {
  const raw = `${moveA}|${moveB}|${distance}|${cardA || ""}|${cardB || ""}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

/**
 * POST /api/ai/duel/judge
 * 带数据库缓存的比武判定。
 * 先查 duel_cache 表，有则直接返回并递增 hit_count；
 * 没有则转发 duel-judge Agent，保存结果后返回。
 */
router.post("/judge", async (req, res) => {
  const { moveA, moveB, distance, cardA, cardB } = req.body;
  if (!moveA || !moveB || distance === undefined || distance === null) {
    res.status(400).json({ error: "moveA, moveB and distance required" });
    return;
  }

  const key = makeCacheKey(moveA, moveB, distance, cardA, cardB);

  try {
    const db = getDb();

    // 查缓存
    const rows = await db.select().from(duelCache).where(eq(duelCache.cacheKey, key)).limit(1);
    if (rows.length > 0) {
      // 命中：递增 hitCount
      await db.update(duelCache)
        .set({ hitCount: rows[0].hitCount + 1 })
        .where(eq(duelCache.id, rows[0].id));
      res.json(rows[0].result);
      return;
    }
  } catch {
    // 数据库不可用时回退
  }

  // 未命中：转发到 duel-judge
  try {
    const response = await fetch(`${DUEL_JUDGE_URL}/api/duel/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveA, moveB, distance, cardA, cardB }),
    });
    const result = await response.json();

    // 异步保存到缓存（不阻塞响应）
    try {
      const db = getDb();
      await db.insert(duelCache).values({
        id: uuid(),
        cacheKey: key,
        moveA,
        moveB,
        distance: String(distance),
        cardA: cardA || "",
        cardB: cardB || "",
        result,
        createdAt: new Date().toISOString(),
        hitCount: 1,
      });
    } catch {
      // 缓存写入失败不影响响应
    }

    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: `duel-judge 调用失败: ${err.message}` });
  }
});
