import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { trainingSessions, userCards, customCards } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const router = Router();

const TRAINING_GROUND_URL = process.env.TRAINING_GROUND_URL || "http://localhost:8005";

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

/** POST /api/v1/training/complete — 习武完成（内部调用 AI Agent match + 保存 + 解锁） */
router.post("/complete", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { sessionId, factionId, masterName, trainingType } = req.body;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  try {
    // 1. 调用 AI Agent 获取最终匹配结果
    const matchResp = await fetch(`${TRAINING_GROUND_URL}/api/training/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, description: "" }),
    });
    if (!matchResp.ok) {
      const errBody = await matchResp.text().catch(() => "");
      // 区分 agent session 丢失（404）和其他后端错误
      if (matchResp.status === 404) {
        res.status(400).json({ error: `习武会话已过期（AI 服务重启导致），请重新开始习武`, detail: errBody, code: "SESSION_EXPIRED" });
      } else if (matchResp.status >= 500) {
        res.status(502).json({ error: `AI 训练服务暂时不可用，请稍后再试`, detail: errBody, code: "AI_SERVICE_ERROR" });
      } else {
        res.status(502).json({ error: `AI Agent match 失败: ${matchResp.status}`, detail: errBody });
      }
      return;
    }
    const match = await matchResp.json();

    const isHermit = trainingType === "hermit" || match.trainingType === "hermit";
    const matched = isHermit ? (match.matched === true && (match.cardDescription || match.card_description)) : (match.matched === true);
    const cardDescription = match.cardDescription || match.card_description || "";

    // 2. 保存习武记录
    const db = getDb();
    const sessionIdDb = uuid();
    await db.insert(trainingSessions).values({
      id: sessionIdDb,
      userId: req.user.id,
      factionId: isHermit ? "hermit" : (factionId || null),
      masterName: isHermit ? "世外高人" : (masterName || null),
      rounds: match.totalRounds || 0,
      matchedCardId: matched ? (match.finalCardId || null) : null,
      createdAt: new Date().toISOString(),
    });

    // 3. 解锁卡牌（世外高人用自定义 cardId）
    if (matched && isHermit) {
      // 计算当前用户已有自定义卡牌数
      const existingCards = await db.select()
        .from(userCards)
        .where(eq(userCards.userId, req.user.id));
      const customCards = existingCards.filter((c: any) => c.cardId && c.cardId.startsWith("custom:"));
      const customIndex = customCards.length + 1;

      const cardId = `custom:${req.user.id}:${customIndex}`;
      const cardName = `${req.user.username || "少侠"}-${["一","二","三","四","五","六","七","八","九","十"][customIndex - 1] || customIndex}式`;

      // 写入 userCards
      await db.insert(userCards).values({
        id: uuid(),
        userId: req.user.id,
        cardId,
        unlockedAt: new Date().toISOString(),
      });

      // 写入 customCards（存元数据）
      await db.insert(customCards).values({
        id: uuid(),
        userId: req.user.id,
        cardId,
        name: cardName,
        factionId: "hermit",
        gameId: "martial-hegemony",
        description: cardDescription,
        displacement: match.cardDisplacement || 0,
        sourceTrainingSessionId: sessionIdDb,
        isApproved: false,
        createdAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        matched: true,
        finalCardId: cardId,
        finalCardName: cardName,
        finalConfidence: 1,
        masterSummary: match.masterSummary || "",
        substyleName: "自创武功",
        totalRounds: match.totalRounds || 0,
        cardDescription: cardDescription,
        cardDisplacement: match.cardDisplacement || 0,
        trainingType: "hermit",
      });
      return;
    }

    // 门派模式：解锁预设卡牌
    if (matched && match.finalCardId && !isHermit) {
      const existing = await db.select()
        .from(userCards)
        .where(and(eq(userCards.userId, req.user.id), eq(userCards.cardId, match.finalCardId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(userCards).values({
          id: uuid(),
          userId: req.user.id,
          cardId: match.finalCardId,
          unlockedAt: new Date().toISOString(),
        });
      }
    }

    // 4. 返回结果
    res.json({
      success: true,
      matched,
      finalCardId: matched ? (match.finalCardId || "") : "",
      finalCardName: matched ? (match.finalCardName || "") : "",
      finalConfidence: match.finalConfidence || 0,
      masterSummary: match.masterSummary || "",
      substyleName: match.substyleName || "",
      totalRounds: match.totalRounds || 0,
      trainingType: "faction",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
