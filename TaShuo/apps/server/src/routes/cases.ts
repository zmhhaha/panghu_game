import { CASES } from "@tashuo/content";
import { toPublicCaseSummary } from "@tashuo/core";
import { Router } from "express";

export const casesRouter = Router();
casesRouter.get("/", (_req, res) => res.json({ cases: CASES.map(toPublicCaseSummary) }));

