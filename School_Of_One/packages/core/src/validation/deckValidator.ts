import { Deck } from "../types/index.js";

export class DeckValidator {
  static readonly MIN_SIZE = 15;
  static readonly MAX_SIZE = 30;

  static validate(deck: Deck): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const count = deck.cardEntries.length;
    if (count < this.MIN_SIZE) errors.push(`Deck must have at least ${this.MIN_SIZE} cards (has ${count})`);
    if (count > this.MAX_SIZE) errors.push(`Deck cannot exceed ${this.MAX_SIZE} cards (has ${count})`);
    return { valid: errors.length === 0, errors };
  }
}
