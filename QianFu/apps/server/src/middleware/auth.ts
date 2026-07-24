import type { NextFunction, Request, Response } from "express";

export interface AuthUser {
  id: string;
  authProvider: "casdoor" | "development";
  externalSubject: string;
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

const firstHeader = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function extractUser(req: Request): AuthUser | null {
  const forwardedUser = firstHeader(req.headers["x-forwarded-user"]);
  const subject = firstHeader(req.headers["x-auth-request-sub"]) || forwardedUser;
  const email = firstHeader(req.headers["x-forwarded-email"]) || "";
  const username = firstHeader(req.headers["x-forwarded-preferred-username"]) || forwardedUser;

  if (subject && username) {
    if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY_AUTH_HEADERS !== "true") return null;
    return { id: `casdoor:${subject}`, authProvider: "casdoor", externalSubject: subject, username, email };
  }
  if (process.env.NODE_ENV !== "production") {
    return { id: "development:dev-user", authProvider: "development", externalSubject: "dev-user", username: "开发者", email: "dev@localhost" };
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = extractUser(req);
  if (!user) { res.status(401).json({ error: "未登录" }); return; }
  req.user = user;
  next();
}
