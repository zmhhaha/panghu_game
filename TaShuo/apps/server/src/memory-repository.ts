import type { GameState } from "@tashuo/core";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, SaveGameInput, SaveGameResult, UserRecord } from "./repository.js";
import { StateConflictError } from "./repository.js";

interface StoredGame { state: GameState; idempotencyKeys: Set<string> }

export class InMemoryGameRepository implements GameRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly games = new Map<string, StoredGame>();

  async ensureUser(user: AuthUser): Promise<UserRecord> {
    const now = new Date().toISOString();
    const previous = this.users.get(user.id);
    const record: UserRecord = previous
      ? { ...previous, username: user.username, email: user.email, lastLoginAt: now }
      : { ...user, createdAt: now, lastLoginAt: now };
    this.users.set(user.id, record);
    return structuredClone(record);
  }

  async createGame(ownerUserId: string, state: GameState): Promise<GameState> {
    if (state.ownerUserId !== ownerUserId) throw new Error("游戏所有者不匹配");
    this.games.set(state.id, { state: structuredClone(state), idempotencyKeys: new Set() });
    return structuredClone(state);
  }

  async listGames(ownerUserId: string): Promise<GameState[]> {
    return [...this.games.values()].filter((item) => item.state.ownerUserId === ownerUserId).map((item) => structuredClone(item.state));
  }

  async getGame(gameInstanceId: string, ownerUserId: string): Promise<GameState | null> {
    const stored = this.games.get(gameInstanceId);
    if (!stored || stored.state.ownerUserId !== ownerUserId) return null;
    return structuredClone(stored.state);
  }

  async saveGame(input: SaveGameInput): Promise<SaveGameResult | null> {
    const stored = this.games.get(input.gameInstanceId);
    if (!stored || stored.state.ownerUserId !== input.ownerUserId) return null;
    if (stored.idempotencyKeys.has(input.idempotencyKey)) return { state: structuredClone(stored.state), duplicate: true };
    if (stored.state.stateVersion !== input.expectedStateVersion) throw new StateConflictError();
    if (input.nextState.ownerUserId !== input.ownerUserId || input.nextState.id !== input.gameInstanceId) throw new Error("禁止跨实例写入状态");
    stored.state = structuredClone(input.nextState);
    stored.idempotencyKeys.add(input.idempotencyKey);
    return { state: structuredClone(stored.state), duplicate: false };
  }

  async deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean> {
    const stored = this.games.get(gameInstanceId);
    if (!stored || stored.state.ownerUserId !== ownerUserId) return false;
    return this.games.delete(gameInstanceId);
  }
}
