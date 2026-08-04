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
    interface Request {
      user?: AuthUser;
    }
  }
}

function firstHeader(value: string | string[] | undefined): string {
  return String(Array.isArray(value) ? value[0] : value ?? "").trim();
}

export function extractUser(req: Request): AuthUser | null {
  const forwardedUser = firstHeader(req.headers["x-forwarded-user"]);
  const subject = firstHeader(req.headers["x-auth-request-sub"]) || forwardedUser;
  const username = firstHeader(req.headers["x-forwarded-preferred-username"]) || forwardedUser;
  const email = firstHeader(req.headers["x-forwarded-email"]);

  if (subject && username) {
    if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY_AUTH_HEADERS !== "true") return null;
    return {
      id: `casdoor:${subject.slice(0, 240)}`,
      authProvider: "casdoor",
      externalSubject: subject.slice(0, 240),
      username: username.slice(0, 160),
      email: email.slice(0, 320),
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      id: "development:dev-user",
      authProvider: "development",
      externalSubject: "dev-user",
      username: "开发者",
      email: "dev@localhost",
    };
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = extractUser(req);
  if (!user) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  req.user = user;
  next();
}
