import type { AuthUser } from "./middleware/auth.js";
import type { GameStateRepository, StoredGameState } from "./repository.js";

export class InMemoryGameStateRepository implements GameStateRepository {
  private readonly states = new Map<string, StoredGameState>();

  async get(user: AuthUser): Promise<StoredGameState | null> {
    const record = this.states.get(user.id);
    return record ? structuredClone(record) : null;
  }

  async put(user: AuthUser, state: unknown): Promise<StoredGameState> {
    const record = { state: structuredClone(state), updatedAt: new Date().toISOString() };
    this.states.set(user.id, record);
    return structuredClone(record);
  }

  async delete(user: AuthUser): Promise<boolean> {
    return this.states.delete(user.id);
  }

  async ready(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}
