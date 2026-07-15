import { Router, Router as ExpressRouter } from "express";
import { getAllPresetCards } from "@school-of-one/core";

export const router: ExpressRouter = Router();

router.get("/preset", (req, res) => {
  const { faction, gameId } = req.query;
  let cards = getAllPresetCards();

  if (faction) cards = cards.filter((c) => c.factionId === faction);
  if (gameId) cards = cards.filter((c) => c.gameId === gameId);

  res.json({ cards, total: cards.length });
});

router.get("/preset/:id", (req, res) => {
  const cards = getAllPresetCards();
  const card = cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: "Card not found" });
  res.json({ card });
});
