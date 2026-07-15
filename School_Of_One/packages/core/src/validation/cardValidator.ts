import { CardBase } from "../types/index.js";

export class CardValidator {
  static validate(card: CardBase): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!card.name) errors.push("Card name is required");
    if (!card.factionId) errors.push("Faction is required");
    if (!card.description) errors.push("Card description is required");
    return { valid: errors.length === 0, errors };
  }
}
