import { isDeepStrictEqual } from "node:util";
import type { GameState, PublicationRecord } from "@tashuo/core";
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

export interface StoredAction {
  actionType: string;
  action: Record<string, unknown>;
}

/** Only immutable baseline articles may use this shared, player-independent key. */
export interface PublicationKey {
  caseId: string;
  caseVersion: string;
  contentId: string;
  promptVersion: string;
}

export function publicationCacheKey(key: PublicationKey): string {
  return JSON.stringify([key.caseId, key.caseVersion, key.contentId, key.promptVersion]);
}

export function assertPublicationMatchesKey(key: PublicationKey, publication: PublicationRecord): void {
  if (publication.caseVersion !== key.caseVersion || publication.contentId !== key.contentId || publication.promptVersion !== key.promptVersion) {
    throw new Error("稿件与发布任务版本不匹配");
  }
}

export function normalizeAction(action: unknown): Record<string, unknown> {
  const serialized: unknown = JSON.parse(JSON.stringify(action));
  if (!serialized || typeof serialized !== "object" || Array.isArray(serialized)) throw new Error("操作内容必须是 JSON 对象");
  return serialized as Record<string, unknown>;
}

export function assertSameAction(previous: StoredAction, actionType: string, action: unknown): void {
  // Match JSON storage semantics, including omitted undefined fields, without depending on object key order.
  if (previous.actionType !== actionType || !isDeepStrictEqual(normalizeAction(previous.action), normalizeAction(action))) {
    throw new IdempotencyConflictError();
  }
}

export interface GameRepository {
  ensureUser(user: AuthUser): Promise<UserRecord>;
  createGame(ownerUserId: string, state: GameState): Promise<GameState>;
  listGames(ownerUserId: string): Promise<GameState[]>;
  getGame(gameInstanceId: string, ownerUserId: string): Promise<GameState | null>;
  findAction(gameInstanceId: string, ownerUserId: string, idempotencyKey: string): Promise<StoredAction | null>;
  getOrCreatePublication(key: PublicationKey, generate: () => Promise<PublicationRecord>): Promise<PublicationRecord>;
  saveGame(input: SaveGameInput): Promise<SaveGameResult | null>;
  deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean>;
}

export class StateConflictError extends Error {
  constructor() { super("游戏状态已更新，请刷新后重试"); }
}

export class IdempotencyConflictError extends Error {
  constructor() { super("该操作编号已用于不同请求，请使用新的操作编号"); }
}

