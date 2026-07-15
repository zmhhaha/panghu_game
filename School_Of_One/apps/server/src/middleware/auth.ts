import { Request, Response, NextFunction } from "express";

/**
 * 从 oauth2-proxy 注入的 header 中提取用户信息。
 *
 * 生产环境（NODE_ENV=production）:
 *   - X-Forwarded-User 由 oauth2-proxy 注入
 *   - X-Forwarded-Email 由 oauth2-proxy 注入
 *
 * 开发环境:
 *   - header 不存在，回退为默认模拟用户
 */
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
 * 可选中间件：将用户信息挂到 req.user 上。
 * 不强制拦截请求 —— 未认证用户仍可访问（方便开发调试）。
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = extractUser(req) || undefined;
  next();
}
