import type { DialogueGoal } from "./types.js";

export const DIALOGUE_TEXT_LIMITS: Record<DialogueGoal, number> = {
  small_talk: 80,
  build_trust: 140,
  probe_attitude: 120,
  verify_intel: 160,
  request_information: 180,
  apply_pressure: 140,
  recruit_probe: 180,
  long_talk: 300,
};

export const DIALOGUE_MAX_TEXT_LENGTH = 300;
