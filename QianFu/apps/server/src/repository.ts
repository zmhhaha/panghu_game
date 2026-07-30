import type {
  ActionResult, CampaignReportBundle, CampaignShareSummary, DifficultyConfig,
  GameAction, GameEvent, SharedCampaignReport, WorldState,
} from "@qianfu/core";
import type { AuthUser } from "./middleware/auth.js";

export interface UserRecord extends AuthUser {
  createdAt: string;
  lastLoginAt: string;
}

export interface PlayerSnapshotSummary {
  slot: 1 | 2;
  label: string;
  savedAt: string;
  currentTime: string;
  stateVersion: number;
  lastEventSeq: number;
}

export interface CreateGameOptions {
  campaignId: string;
  campaignVersion: string;
  difficultyId: DifficultyConfig["id"];
  coverProfileId: WorldState["cover"]["profileId"];
}

export interface GameRepository {
  ensureUser(user: AuthUser): Promise<UserRecord>;
  createGame(ownerUserId: string, options: CreateGameOptions): Promise<WorldState>;
  listGames(ownerUserId: string): Promise<WorldState[]>;
  getGame(gameInstanceId: string, ownerUserId: string): Promise<WorldState | null>;
  deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean>;
  execute(gameInstanceId: string, ownerUserId: string, action: GameAction): Promise<ActionResult | null>;
  getEvents(gameInstanceId: string, ownerUserId: string): Promise<GameEvent[] | null>;
  getReport(gameInstanceId: string, ownerUserId: string): Promise<CampaignReportBundle | null>;
  listShares(gameInstanceId: string, ownerUserId: string): Promise<CampaignShareSummary[] | null>;
  createShare(gameInstanceId: string, ownerUserId: string, expiresAt: string | null): Promise<CampaignShareSummary | null>;
  revokeShare(shareId: string, ownerUserId: string): Promise<boolean>;
  getPublicShare(shareId: string): Promise<SharedCampaignReport | null>;
  listPlayerSnapshots(gameInstanceId: string, ownerUserId: string): Promise<PlayerSnapshotSummary[] | null>;
  savePlayerSnapshot(gameInstanceId: string, ownerUserId: string, slot: 1 | 2, label: string): Promise<PlayerSnapshotSummary | null>;
  loadPlayerSnapshot(gameInstanceId: string, ownerUserId: string, slot: 1 | 2): Promise<{ state: WorldState; events: GameEvent[] } | null>;
}
