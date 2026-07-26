import type { ActionResult, DifficultyConfig, GameAction, GameEvent, WorldState } from "@qianfu/core";
import type { AuthUser } from "./middleware/auth.js";

export interface UserRecord extends AuthUser {
  createdAt: string;
  lastLoginAt: string;
}

export interface GameRepository {
  ensureUser(user: AuthUser): Promise<UserRecord>;
  createGame(ownerUserId: string, difficultyId: DifficultyConfig["id"]): Promise<WorldState>;
  listGames(ownerUserId: string): Promise<WorldState[]>;
  getGame(gameInstanceId: string, ownerUserId: string): Promise<WorldState | null>;
  deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean>;
  execute(gameInstanceId: string, ownerUserId: string, action: GameAction): Promise<ActionResult | null>;
  getEvents(gameInstanceId: string, ownerUserId: string): Promise<GameEvent[] | null>;
}
