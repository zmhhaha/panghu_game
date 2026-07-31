import type { CaseDefinition } from "@tashuo/core";
import { BLUE_RIVER } from "./cases/blue-river.js";
import { LOST_CONTROL_DEMO } from "./cases/lost-control-demo.js";
import { assertValidCase } from "./validation.js";

export { BLUE_RIVER, LOST_CONTROL_DEMO };
export * from "./validation.js";

export const CASES = [assertValidCase(LOST_CONTROL_DEMO), assertValidCase(BLUE_RIVER)] as const;

export function getCase(caseId: string, version?: string): CaseDefinition | null {
  return CASES.find((item) => item.id === caseId && (!version || item.version === version)) ?? null;
}

