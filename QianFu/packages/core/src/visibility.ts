import type { CharacterState, GameEvent, IntelState, WorldState } from "./types.js";

export type PublicCharacterState = Pick<CharacterState, "id" | "templateId" | "locationId" | "recruited" | "exposed" | "agentTier">;
export type PublicWorldState = Omit<WorldState, "characters" | "intel" | "dialogueMemories" | "investigation"> & {
  characters: Record<string, PublicCharacterState>;
  intel: Record<string, Pick<IntelState, "id" | "knownFields" | "confidence" | "deliveredAt" | "deliveryMethod">>;
  investigation: Pick<WorldState["investigation"], "pressure" | "locationHeat" | "surveillanceLocationIds" | "lastActionAt">;
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
  const clonedState = structuredClone(state);
  const privateInvestigation = clonedState.investigation ?? {
    pressure: 0,
    locationHeat: {},
    surveillanceLocationIds: [],
    evidence: [],
    lastActionAt: null,
  };
  const { dialogueMemories: _privateMemories, characters: _privateCharacters, intel: _privateIntel, investigation: _privateInvestigation, ...publicState } = clonedState;
  const { evidence: _privateEvidence, ...publicInvestigation } = privateInvestigation;
  return { ...publicState, characters: visibleCharacters, intel: visibleIntel, investigation: publicInvestigation };
}

export function toPublicGameEvents(events: GameEvent[]): GameEvent[] {
  return events
    .filter((event) => !event.type.startsWith("investigation.evidence_"))
    .map((event) => event.type === "dialogue.completed" || event.type === "dialogue.turn_completed"
      ? {
          ...event,
          payload: (() => {
            const payload = event.payload as Record<string, unknown>;
            const { privateIntent: _privateIntent, memorySummary: _memorySummary, requestedEffects: _requestedEffects, ...publicPayload } = payload;
            return publicPayload;
          })(),
        }
      : event);
}
