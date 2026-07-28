import type { DifficultyConfig, RadioMinigameConfig } from "./types.js";

export interface DifficultyVisibilityPolicy {
  showObjectiveHints: boolean;
  showConfidence: boolean;
  showEvidenceRelations: boolean;
  showNpcAttitude: boolean;
  showRelationshipNumbers: boolean;
  showEventForecast: boolean;
  showIntelRecommendations: boolean;
  showPlanGenerator: boolean;
  autoFillRadioFields: boolean;
  showRawIntel: boolean;
}

const POLICIES: Record<DifficultyConfig["id"], DifficultyVisibilityPolicy> = {
  story: {
    showObjectiveHints: true, showConfidence: true, showEvidenceRelations: true, showNpcAttitude: true,
    showRelationshipNumbers: true, showEventForecast: true, showIntelRecommendations: true,
    showPlanGenerator: true, autoFillRadioFields: true, showRawIntel: false,
  },
  undercover: {
    showObjectiveHints: false, showConfidence: false, showEvidenceRelations: true, showNpcAttitude: true,
    showRelationshipNumbers: false, showEventForecast: false, showIntelRecommendations: false,
    showPlanGenerator: true, autoFillRadioFields: false, showRawIntel: false,
  },
  iron_curtain: {
    showObjectiveHints: false, showConfidence: false, showEvidenceRelations: false, showNpcAttitude: false,
    showRelationshipNumbers: false, showEventForecast: false, showIntelRecommendations: false,
    showPlanGenerator: false, autoFillRadioFields: false, showRawIntel: true,
  },
};

export function getDifficultyVisibility(difficulty: DifficultyConfig["id"]): DifficultyVisibilityPolicy {
  return { ...POLICIES[difficulty] };
}

const RADIO_MINIGAME: Record<DifficultyConfig["id"], RadioMinigameConfig> = {
  story: { required: false, unitMs: 800, timingToleranceMs: 400, focusWindow: 9, correctionAllowance: 5, interference: "none", maxManualFields: 12 },
  undercover: { required: false, unitMs: 650, timingToleranceMs: 260, focusWindow: 6, correctionAllowance: 3, interference: "light", maxManualFields: 12 },
  iron_curtain: { required: true, unitMs: 520, timingToleranceMs: 160, focusWindow: 4, correctionAllowance: 1, interference: "heavy", maxManualFields: 12 },
};

export function getRadioMinigameConfig(difficulty: DifficultyConfig["id"]): RadioMinigameConfig {
  return { ...RADIO_MINIGAME[difficulty] };
}
