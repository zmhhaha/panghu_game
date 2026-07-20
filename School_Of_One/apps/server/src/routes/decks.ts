import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { decks } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const router = Router();

router.use(authMiddleware);

/** GET /api/v1/decks — 列出用户所有卡组 */
router.get("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select().from(decks).where(eq(decks.userId, req.user.id));
    res.json({ decks: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/v1/decks — 保存卡组（创建或更新已有） */
router.post("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { id, name, starterCardId, cardIds } = req.body;
  const now = new Date().toISOString();

  try {
    const db = getDb();
    if (id) {
      // 更新
      await db.update(decks)
        .set({ name, starterCardId, cardIds, updatedAt: now })
        .where(and(eq(decks.id, id), eq(decks.userId, req.user.id)));
      res.json({ id, message: "卡组已更新" });
    } else {
      // 创建
      const newId = uuid();
      await db.insert(decks).values({
        id: newId,
        userId: req.user.id,
        name: name || "默认卡组",
        starterCardId,
        cardIds,
        createdAt: now,
        updatedAt: now,
      });
      res.status(201).json({ id: newId, message: "卡组已保存" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/v1/decks/:id — 删除卡组 */
router.delete("/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    await db.delete(decks)
      .where(and(eq(decks.id, req.params.id), eq(decks.userId, req.user.id)));
    res.json({ message: "卡组已删除" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
