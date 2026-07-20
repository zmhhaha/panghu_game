import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { duelRecords } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

router.use(authMiddleware);

/** GET /api/v1/duels — 用户对战历史 */
router.get("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select().from(duelRecords).where(eq(duelRecords.userId, req.user.id));
    res.json({ duels: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/v1/duels — 记录对战结果 */
router.post("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { opponent, winner, rounds, playerHearts, aiHearts, history } = req.body;

  try {
    const db = getDb();
    const id = uuid();
    await db.insert(duelRecords).values({
      id,
      userId: req.user.id,
      opponent: opponent || "AI",
      winner: winner || "未知",
      rounds: rounds || 0,
      playerHearts: playerHearts ?? 10,
      aiHearts: aiHearts ?? 10,
      history: history || [],
      createdAt: new Date().toISOString(),
    });

    // 获胜加经验
    if (winner === "player") {
      try {
        const { users } = await import("../db/schema.js");
        await db.update(users)
          .set({ xp: (await db.select().from(users).where(eq(users.id, req.user.id)).limit(1))[0]?.xp ?? 0 + 10 })
          .where(eq(users.id, req.user.id));
      } catch { /* ignore xp errors */ }
    }

    res.status(201).json({ id, message: "对战记录已保存" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
