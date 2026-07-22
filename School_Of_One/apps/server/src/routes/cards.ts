import { Router, Router as ExpressRouter } from "express";
import { v4 as uuid } from "uuid";
import { getAllPresetCards } from "@school-of-one/core";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { userCards, customCards } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const router: ExpressRouter = Router();

// ── preset 路由（公开） ──────────────────────────────────

router.get("/preset", (req, res) => {
  const { faction, gameId } = req.query;
  let cards = getAllPresetCards();
  if (faction) cards = cards.filter((c) => c.factionId === faction);
  if (gameId) cards = cards.filter((c) => c.gameId === gameId);
  res.json({ cards, total: cards.length });
});

router.get("/preset/:id", (req, res) => {
  const cards = getAllPresetCards();
  const card = cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: "Card not found" });
  res.json({ card });
});

// ── 自定义卡牌（需认证） ────────────────────────────────

/** GET /api/v1/cards/custom — 自创武功卡牌列表 */
router.get("/custom", authMiddleware, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select()
      .from(customCards)
      .where(eq(customCards.userId, req.user.id))
      .orderBy(customCards.createdAt);
    res.json({ customCards: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/cards/custom/:cardId — 单张自创武功卡牌 */
router.get("/custom/:cardId", authMiddleware, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select()
      .from(customCards)
      .where(and(eq(customCards.cardId, req.params.cardId), eq(customCards.userId, req.user.id)))
      .limit(1);
    if (rows.length === 0) return res.status(404).json({ error: "卡牌不存在" });
    res.json({ customCard: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── 用户卡牌收集（需认证） ──────────────────────────────

router.get("/mine", authMiddleware, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select().from(userCards).where(eq(userCards.userId, req.user.id));
    res.json({ cardIds: rows.map((r) => r.cardId), cards: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/v1/cards/unlock — 解锁一张卡牌（幂等，重复调用忽略） */
router.post("/unlock", authMiddleware, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { cardId } = req.body;
  if (!cardId) { res.status(400).json({ error: "cardId required" }); return; }

  try {
    const db = getDb();
    // 幂等：已存在则忽略
    const existing = await db.select()
      .from(userCards)
      .where(and(eq(userCards.userId, req.user.id), eq(userCards.cardId, cardId)))
      .limit(1);
    if (existing.length > 0) {
      res.json({ message: "已解锁", cardId });
      return;
    }

    await db.insert(userCards).values({
      id: uuid(),
      userId: req.user.id,
      cardId,
      unlockedAt: new Date().toISOString(),
    });
    res.status(201).json({ message: "解锁成功", cardId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
