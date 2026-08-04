import type { AuthUser } from "./middleware/auth.js";

export interface StoredGameState {
  state: unknown;
  updatedAt: string;
}

export interface GameStateRepository {
  get(user: AuthUser): Promise<StoredGameState | null>;
  put(user: AuthUser, state: unknown): Promise<StoredGameState>;
  delete(user: AuthUser): Promise<boolean>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}
