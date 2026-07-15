import { FactionId } from "./card.js";

export interface DeckCardEntry {
  cardId: string;
  cardType: "preset" | "custom";
}

export interface Deck {
  id: string;
  userId: string;
  gameId: string;
  name: string;
  factionId: FactionId;
  cardEntries: DeckCardEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: { code: string; message: string }[];
}
