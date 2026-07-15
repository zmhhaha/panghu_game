import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";

export const router = Router();

/**
 * GET /api/v1/auth/me
 * 返回当前登录用户信息。
 *
 * 生产环境从 oauth2-proxy 注入的 X-Forwarded-User header 获取，
 * 开发环境返回默认模拟用户。
 */
router.get("/me", authMiddleware, (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  res.json(req.user);
});

// 占位：注册/登录端点——生产环境由 oauth2-proxy 处理
router.post("/register", (_req, res) => {
  res.json({ message: "注册功能由 SSO 统一管理" });
});
router.post("/login", (_req, res) => {
  res.json({ message: "登录功能由 SSO 统一管理" });
});
