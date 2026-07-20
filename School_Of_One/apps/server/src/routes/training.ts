import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { trainingSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

router.use(authMiddleware);

/** GET /api/v1/training/sessions — 习武历史 */
router.get("/sessions", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select().from(trainingSessions).where(eq(trainingSessions.userId, req.user.id));
    res.json({ sessions: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/v1/training/sessions — 记录习武结果 */
router.post("/sessions", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { factionId, masterName, rounds, matchedCardId } = req.body;

  try {
    const db = getDb();
    const id = uuid();
    await db.insert(trainingSessions).values({
      id,
      userId: req.user.id,
      factionId: factionId || null,
      masterName: masterName || null,
      rounds: rounds || 0,
      matchedCardId: matchedCardId || null,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id, message: "习武记录已保存" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
