import type { DifficultyConfig } from "./types.js";

export const DIFFICULTIES: Record<DifficultyConfig["id"], DifficultyConfig> = {
  story: {
    id: "story", intelClarity: 0.85, deadlineMultiplier: 1.35,
    enemyResponseSpeed: 0.65, npcAutonomy: 0.55, recruitEvidenceRate: 1.3,
    deceptionFrequency: 0.35, recoveryAllowance: 2, dialogueAssistLevel: 2,
  },
  undercover: {
    id: "undercover", intelClarity: 0.6, deadlineMultiplier: 1,
    enemyResponseSpeed: 1, npcAutonomy: 0.8, recruitEvidenceRate: 1,
    deceptionFrequency: 0.65, recoveryAllowance: 1, dialogueAssistLevel: 1,
  },
  iron_curtain: {
    id: "iron_curtain", intelClarity: 0.35, deadlineMultiplier: 0.85,
    enemyResponseSpeed: 1.35, npcAutonomy: 1, recruitEvidenceRate: 0.75,
    deceptionFrequency: 0.9, recoveryAllowance: 0, dialogueAssistLevel: 0,
  },
};
