import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { users, duelRecords, decks, trainingSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

/**
 * GET /api/v1/auth/me
 * 返回当前登录用户信息（含数据库中的游戏数据）。
 */
router.get("/me", authMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  try {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (rows.length === 0) {
      // 数据库未就绪时回退到 auth 信息
      res.json(req.user);
      return;
    }
    const u = rows[0];
    res.json({
      id: u.id,
      username: u.username,
      email: u.email,
      level: u.level,
      xp: u.xp,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    });
  } catch {
    // 数据库不可用，回退
    res.json(req.user);
  }
});

/**
 * POST /api/v1/auth/register
 * 注册新用户（数据库已有则返回）。
 */
router.post("/register", authMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  try {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (existing.length > 0) {
      res.json({ message: "用户已存在", user: existing[0] });
      return;
    }

    const now = new Date().toISOString();
    await db.insert(users).values({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      level: 1,
      xp: 0,
      createdAt: now,
      lastLoginAt: now,
    });

    res.status(201).json({ message: "注册成功" });
  } catch (err: any) {
    res.status(500).json({ error: "注册失败", detail: err.message });
  }
});

/**
 * POST /api/v1/auth/login
 * 由 SSO 管理，占位。
 */
router.post("/login", (_req, res) => {
  res.json({ message: "登录功能由 SSO 统一管理" });
});
