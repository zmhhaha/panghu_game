import { Router, Router as ExpressRouter } from "express";
import { FACTIONS } from "@school-of-one/core";

export const router: ExpressRouter = Router();

router.get("/", (_req, res) => {
  res.json({ factions: FACTIONS });
});

router.get("/:id", (req, res) => {
  const faction = FACTIONS.find((f) => f.id === req.params.id);
  if (!faction) return res.status(404).json({ error: "Faction not found" });
  res.json({ faction });
});
