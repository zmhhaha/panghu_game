import { Request, Response, NextFunction } from "express";
import { getDb } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractUser(req: Request): AuthUser | null {
  const userId = req.headers["x-forwarded-user"] as string | undefined;
  const email = req.headers["x-forwarded-email"] as string | undefined;

  if (userId) {
    return {
      id: userId,
      username: userId,
      email: email || "",
    };
  }

  // 开发环境回退
  if (process.env.NODE_ENV !== "production") {
    return {
      id: "dev-user",
      username: "开发者",
      email: "dev@localhost",
    };
  }

  return null;
}

/**
 * 自动注册用户到数据库（如果不存在的话）
 */
async function autoRegisterUser(req: Request) {
  if (!req.user) return;

  try {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (existing.length === 0) {
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
      console.log(`[Auth] 新用户自动注册: ${req.user.id}`);
    } else {
      // 更新登录时间
      await db.update(users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(users.id, req.user.id));
    }
  } catch (err) {
    // 数据库不可用时不阻塞请求
    console.warn("[Auth] autoRegisterUser 失败（数据库可能未就绪）:", err);
  }
}

/**
 * 可选中间件：将用户信息挂到 req.user 上，并自动注册。
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const user = extractUser(req);
  req.user = user || undefined;

  if (user) {
    // 异步自动注册，不阻塞请求
    autoRegisterUser(req).catch(console.warn);
  }

  next();
}
