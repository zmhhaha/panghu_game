import { Router } from "express";
import { gameRepository } from "../game-repository.js";

export const authRouter = Router();

authRouter.get("/me", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    res.json(await gameRepository.ensureUser(req.user));
  } catch (error) { next(error); }
});
