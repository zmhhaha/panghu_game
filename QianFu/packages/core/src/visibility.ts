import type { CharacterState, IntelState, WorldState } from "./types.js";

export type PublicCharacterState = Pick<CharacterState, "id" | "templateId" | "locationId" | "recruited" | "exposed" | "agentTier">;
export type PublicWorldState = Omit<WorldState, "characters" | "intel" | "dialogueMemories"> & {
  characters: Record<string, PublicCharacterState>;
  intel: Record<string, Pick<IntelState, "id" | "knownFields" | "confidence" | "deliveredAt" | "deliveryMethod">>;
};

export function toPublicWorldState(state: WorldState): PublicWorldState {
  const visibleCharacters = Object.fromEntries(
    Object.values(state.characters)
      .filter((character) => character.locationId === state.currentLocationId)
      .map((character): [string, PublicCharacterState] => [character.id, {
        id: character.id,
        templateId: character.templateId,
        locationId: character.locationId,
        recruited: character.recruited,
        exposed: character.exposed,
        agentTier: character.agentTier,
      }]),
  );
  const visibleIntel = Object.fromEntries(
    Object.values(state.intel).map((intel) => [intel.id, {
      id: intel.id,
      knownFields: intel.knownFields,
      confidence: intel.confidence,
      deliveredAt: intel.deliveredAt,
      deliveryMethod: intel.deliveryMethod,
    }]),
  );
  return { ...structuredClone(state), characters: visibleCharacters, intel: visibleIntel };
}
