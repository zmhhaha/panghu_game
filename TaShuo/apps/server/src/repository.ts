import type { GameState } from "@tashuo/core";
import type { AuthUser } from "./middleware/auth.js";

export interface UserRecord extends AuthUser {
  createdAt: string;
  lastLoginAt: string;
}

export interface SaveGameInput {
  gameInstanceId: string;
  ownerUserId: string;
  expectedStateVersion: number;
  idempotencyKey: string;
  actionType: string;
  action: unknown;
  nextState: GameState;
}

export interface SaveGameResult {
  state: GameState;
  duplicate: boolean;
}

export interface GameRepository {
  ensureUser(user: AuthUser): Promise<UserRecord>;
  createGame(ownerUserId: string, state: GameState): Promise<GameState>;
  listGames(ownerUserId: string): Promise<GameState[]>;
  getGame(gameInstanceId: string, ownerUserId: string): Promise<GameState | null>;
  saveGame(input: SaveGameInput): Promise<SaveGameResult | null>;
  deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean>;
}

export class StateConflictError extends Error {
  constructor() { super("游戏状态已更新，请刷新后重试"); }
}

