import { CardBase } from "../types";

export class CardValidator {
  static validatePower(card: CardBase): boolean {
    return card.power >= 0 && card.power <= 10;
  }

  static validateCost(card: CardBase): boolean {
    return card.cost >= 0 && card.cost <= 10;
  }

  static validate(card: CardBase): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.validatePower(card)) errors.push("Power must be between 0 and 10");
    if (!this.validateCost(card)) errors.push("Cost must be between 0 and 10");
    if (!card.name) errors.push("Card name is required");
    if (!card.factionId) errors.push("Faction is required");
    return { valid: errors.length === 0, errors };
  }
}
