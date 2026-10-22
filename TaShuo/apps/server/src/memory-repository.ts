import type { GameState, PublicationRecord } from "@tashuo/core";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, PublicationKey, SaveGameInput, SaveGameResult, StoredAction, UserRecord } from "./repository.js";
import { assertPublicationMatchesKey, assertSameAction, normalizeAction, publicationCacheKey, StateConflictError } from "./repository.js";

interface StoredGame { state: GameState; actions: Map<string, StoredAction> }

export class InMemoryGameRepository implements GameRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly games = new Map<string, StoredGame>();
  private readonly publications = new Map<string, PublicationRecord>();
  private readonly pendingPublications = new Map<string, Promise<PublicationRecord>>();

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
    this.games.set(state.id, { state: structuredClone(state), actions: new Map() });
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

  async findAction(gameInstanceId: string, ownerUserId: string, idempotencyKey: string): Promise<StoredAction | null> {
    const stored = this.games.get(gameInstanceId);
    if (!stored || stored.state.ownerUserId !== ownerUserId) return null;
    const action = stored.actions.get(idempotencyKey);
    return action ? structuredClone(action) : null;
  }

  async getOrCreatePublication(key: PublicationKey, generate: () => Promise<PublicationRecord>): Promise<PublicationRecord> {
    const cacheKey = publicationCacheKey(key);
    const stored = this.publications.get(cacheKey);
    if (stored) {
      assertPublicationMatchesKey(key, stored);
      return structuredClone(stored);
    }
    let pending = this.pendingPublications.get(cacheKey);
    if (!pending) {
      pending = Promise.resolve().then(generate).then((publication) => {
        assertPublicationMatchesKey(key, publication);
        const saved = structuredClone(publication);
        this.publications.set(cacheKey, saved);
        return saved;
      }).finally(() => { this.pendingPublications.delete(cacheKey); });
      this.pendingPublications.set(cacheKey, pending);
    }
    return structuredClone(await pending);
  }

  async saveGame(input: SaveGameInput): Promise<SaveGameResult | null> {
    const stored = this.games.get(input.gameInstanceId);
    if (!stored || stored.state.ownerUserId !== input.ownerUserId) return null;
    const previous = stored.actions.get(input.idempotencyKey);
    if (previous) {
      assertSameAction(previous, input.actionType, input.action);
      return { state: structuredClone(stored.state), duplicate: true };
    }
    if (stored.state.stateVersion !== input.expectedStateVersion) throw new StateConflictError();
    if (input.nextState.ownerUserId !== input.ownerUserId || input.nextState.id !== input.gameInstanceId) throw new Error("禁止跨实例写入状态");
    const action = normalizeAction(input.action);
    stored.state = structuredClone(input.nextState);
    stored.actions.set(input.idempotencyKey, { actionType: input.actionType, action });
    return { state: structuredClone(stored.state), duplicate: false };
  }

  async deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean> {
    const stored = this.games.get(gameInstanceId);
    if (!stored || stored.state.ownerUserId !== ownerUserId) return false;
    return this.games.delete(gameInstanceId);
  }
}
