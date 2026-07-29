import type { CharacterState, DialogueGoal } from "./types.js";

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

export function getContextualDialogueGoals(
  relationship: Pick<CharacterState, "familiarity" | "privateTrust" | "suspicionOfPlayer">,
  options: { recruitable: boolean; hasVerifiableIntel: boolean },
): DialogueGoal[] {
  if (relationship.familiarity < 3) return ["small_talk", "build_trust"];

  if (relationship.familiarity < 8) {
    const goals: DialogueGoal[] = ["small_talk", "build_trust", "probe_attitude"];
    if (options.hasVerifiableIntel) goals.push("verify_intel");
    if (relationship.suspicionOfPlayer >= 15 && goals.length < 5) goals.push("apply_pressure");
    return goals;
  }

  if (relationship.privateTrust < 5) {
    const goals: DialogueGoal[] = ["small_talk", "build_trust", "probe_attitude", "apply_pressure"];
    if (options.hasVerifiableIntel) goals.splice(3, 0, "verify_intel");
    return goals.slice(0, 5);
  }

  const goals: DialogueGoal[] = ["request_information"];
  if (options.hasVerifiableIntel) goals.push("verify_intel");
  if (options.recruitable) goals.push("recruit_probe");
  if (relationship.familiarity >= 12 && relationship.privateTrust >= 8) goals.push("long_talk");
  if (relationship.suspicionOfPlayer >= 15) goals.push("apply_pressure");
  for (const fallback of ["probe_attitude", "small_talk", "build_trust"] as DialogueGoal[]) {
    if (goals.length >= 5) break;
    goals.push(fallback);
  }
  return [...new Set(goals)].slice(0, 5);
}
