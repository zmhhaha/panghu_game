import type { DifficultyConfig } from "./types.js";

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
