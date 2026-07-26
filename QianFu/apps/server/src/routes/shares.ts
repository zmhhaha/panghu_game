import { Router } from "express";
import { gameRepository } from "../game-repository.js";
import { renderReportHtml } from "../reports.js";

export const publicSharesRouter = Router();
export const privateSharesRouter = Router();

publicSharesRouter.get("/:shareId/export", async (req, res, next) => {
  try {
    const shared = await gameRepository.getPublicShare(req.params.shareId);
    if (!shared) { res.status(404).json({ error: "分享不存在、已过期或已撤销" }); return; }
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.query.format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qianfu-shared-${shared.share.shareId}.html"`);
      res.send(renderReportHtml(shared.report));
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qianfu-shared-${shared.share.shareId}.json"`);
    res.json(shared);
  } catch (error) { next(error); }
});

publicSharesRouter.get("/:shareId", async (req, res, next) => {
  try {
    const shared = await gameRepository.getPublicShare(req.params.shareId);
    if (!shared) { res.status(404).json({ error: "分享不存在、已过期或已撤销" }); return; }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.json(shared);
  } catch (error) { next(error); }
});

privateSharesRouter.delete("/:shareId", async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const revoked = await gameRepository.revokeShare(req.params.shareId, req.user.id);
    if (!revoked) { res.status(404).json({ error: "分享不存在或已经撤销" }); return; }
    res.json({ revoked: true });
  } catch (error) { next(error); }
});
