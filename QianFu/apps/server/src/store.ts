import { randomUUID } from "node:crypto";
import { CampaignEngine, createInitialWorld, type DifficultyConfig, type GameAction, type GameEvent, type WorldState } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, UserRecord } from "./repository.js";

interface StoredGame { engine: CampaignEngine; events: GameEvent[]; createdAt: string }

export class InMemoryGameRepository implements GameRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly games = new Map<string, StoredGame>();

  async ensureUser(user: AuthUser): Promise<UserRecord> {
    const existing = this.users.get(user.id);
    const now = new Date().toISOString();
    if (existing) {
      const updated = { ...existing, username: user.username, email: user.email, lastLoginAt: now };
      this.users.set(user.id, updated);
      return updated;
    }
    const created = { ...user, createdAt: now, lastLoginAt: now };
    this.users.set(user.id, created);
    return created;
  }

  async createGame(ownerUserId: string, difficultyId: DifficultyConfig["id"]): Promise<WorldState> {
    const gameInstanceId = randomUUID();
    const state = createInitialWorld(LINJIANG_1942, gameInstanceId, ownerUserId, difficultyId);
    this.games.set(gameInstanceId, { engine: new CampaignEngine(LINJIANG_1942, state), events: [], createdAt: new Date().toISOString() });
    return state;
  }

  async listGames(ownerUserId: string): Promise<WorldState[]> {
    return [...this.games.values()].map((game) => game.engine.getState()).filter((state) => state.ownerUserId === ownerUserId);
  }

  private findGame(gameInstanceId: string, ownerUserId: string): StoredGame | null {
    const game = this.games.get(gameInstanceId);
    if (!game || game.engine.getState().ownerUserId !== ownerUserId) return null;
    return game;
  }

  async getGame(gameInstanceId: string, ownerUserId: string): Promise<WorldState | null> {
    return this.findGame(gameInstanceId, ownerUserId)?.engine.getState() ?? null;
  }

  async execute(gameInstanceId: string, ownerUserId: string, action: GameAction) {
    const game = this.findGame(gameInstanceId, ownerUserId);
    if (!game) return null;
    const result = game.engine.execute(action);
    game.events.push(...result.events);
    return result;
  }

  async getEvents(gameInstanceId: string, ownerUserId: string): Promise<GameEvent[] | null> {
    const game = this.findGame(gameInstanceId, ownerUserId);
    return game ? structuredClone(game.events) : null;
  }
}

// Kept as a compatibility name for tests and early integrations.
export { InMemoryGameRepository as GameStore };
