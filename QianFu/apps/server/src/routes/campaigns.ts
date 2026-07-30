import { Router } from "express";
import { listCampaignCatalog } from "@qianfu/content";

export const campaignsRouter = Router();

campaignsRouter.get("/", (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  res.json({ campaigns: listCampaignCatalog() });
});
