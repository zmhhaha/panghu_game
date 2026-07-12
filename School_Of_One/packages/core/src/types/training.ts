export type TrainingType = "faction_training" | "hermit_training";

export interface TrainingSession {
  id: string;
  userId: string;
  trainingType: TrainingType;
  factionId?: string;
  status: "in_progress" | "completed" | "abandoned";
  userDescription: string | null;
  masterFeedback: string | null;
  matchedKeywords: string[];

  // 门派习武
  matchedPresetCardId: string | null;
  matchExplanation: string | null;
  matchScore: number | null;

  // 世外高人
  createdCustomCardId: string | null;
  creativityScore: number | null;
  balanceScore: number | null;

  startedAt: string;
  descriptionSubmittedAt: string | null;
  feedbackGeneratedAt: string | null;
  completedAt: string | null;
}
