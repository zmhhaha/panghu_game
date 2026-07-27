import { randomUUID } from "node:crypto";
import {
  CampaignEngine, createInitialWorld, type CampaignReportBundle, type CampaignShareSummary,
  type DifficultyConfig, type GameAction, type GameEvent, type SharedCampaignReport, type WorldState,
} from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, PlayerSnapshotSummary, UserRecord } from "./repository.js";
import { buildCampaignReportBundle } from "./reports.js";

interface StoredGame { engine: CampaignEngine; events: GameEvent[]; createdAt: string; snapshots: Map<1 | 2, { summary: PlayerSnapshotSummary; state: WorldState; eventCount: number }> }
interface StoredShare { summary: CampaignShareSummary; ownerUserId: string; report: SharedCampaignReport["report"] }

export class InMemoryGameRepository implements GameRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly games = new Map<string, StoredGame>();
  private readonly reports = new Map<string, CampaignReportBundle>();
  private readonly shares = new Map<string, StoredShare>();

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

  async createGame(ownerUserId: string, difficultyId: DifficultyConfig["id"], coverProfileId: WorldState["cover"]["profileId"] = "archive_clerk"): Promise<WorldState> {
    const gameInstanceId = randomUUID();
    const state = createInitialWorld(LINJIANG_1942, gameInstanceId, ownerUserId, difficultyId, coverProfileId);
    this.games.set(gameInstanceId, { engine: new CampaignEngine(LINJIANG_1942, state), events: [], createdAt: new Date().toISOString(), snapshots: new Map() });
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

  async deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean> {
    if (!this.findGame(gameInstanceId, ownerUserId)) return false;
    this.reports.delete(gameInstanceId);
    for (const [shareId, share] of this.shares) if (share.summary.gameInstanceId === gameInstanceId) this.shares.delete(shareId);
    return this.games.delete(gameInstanceId);
  }

  async execute(gameInstanceId: string, ownerUserId: string, action: GameAction) {
    const game = this.findGame(gameInstanceId, ownerUserId);
    if (!game) return null;
    const result = game.engine.execute(action);
    game.events.push(...result.events);
    if (result.state.status === "finished" && !this.reports.has(gameInstanceId)) {
      this.reports.set(gameInstanceId, buildCampaignReportBundle(LINJIANG_1942, result.state, game.events, randomUUID(), new Date().toISOString()));
    }
    return result;
  }

  async getEvents(gameInstanceId: string, ownerUserId: string): Promise<GameEvent[] | null> {
    const game = this.findGame(gameInstanceId, ownerUserId);
    return game ? structuredClone(game.events) : null;
  }

  async getReport(gameInstanceId: string, ownerUserId: string): Promise<CampaignReportBundle | null> {
    const game = this.findGame(gameInstanceId, ownerUserId);
    if (!game) return null;
    const state = game.engine.getState();
    if (state.status !== "finished") return null;
    let report = this.reports.get(gameInstanceId);
    if (!report) {
      report = buildCampaignReportBundle(LINJIANG_1942, state, game.events, randomUUID(), new Date().toISOString());
      this.reports.set(gameInstanceId, report);
    }
    return structuredClone(report);
  }

  async listShares(gameInstanceId: string, ownerUserId: string): Promise<CampaignShareSummary[] | null> {
    if (!this.findGame(gameInstanceId, ownerUserId)) return null;
    return [...this.shares.values()]
      .filter((share) => share.ownerUserId === ownerUserId && share.summary.gameInstanceId === gameInstanceId)
      .map((share) => structuredClone(share.summary))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createShare(gameInstanceId: string, ownerUserId: string, expiresAt: string | null): Promise<CampaignShareSummary | null> {
    const report = await this.getReport(gameInstanceId, ownerUserId);
    if (!report) return null;
    const shareId = randomUUID();
    const summary: CampaignShareSummary = {
      shareId, gameInstanceId, reportVersion: report.publicPreview.reportVersion,
      createdAt: new Date().toISOString(), expiresAt, revokedAt: null, accessCount: 0,
    };
    this.shares.set(shareId, { summary, ownerUserId, report: structuredClone(report.publicPreview) });
    return structuredClone(summary);
  }

  async revokeShare(shareId: string, ownerUserId: string): Promise<boolean> {
    const share = this.shares.get(shareId);
    if (!share || share.ownerUserId !== ownerUserId || share.summary.revokedAt) return false;
    share.summary.revokedAt = new Date().toISOString();
    return true;
  }

  async getPublicShare(shareId: string): Promise<SharedCampaignReport | null> {
    const share = this.shares.get(shareId);
    if (!share || share.summary.revokedAt || (share.summary.expiresAt && Date.parse(share.summary.expiresAt) <= Date.now())) return null;
    share.summary.accessCount += 1;
    return { share: structuredClone(share.summary), report: structuredClone(share.report) };
  }

  async listPlayerSnapshots(gameInstanceId: string, ownerUserId: string): Promise<PlayerSnapshotSummary[] | null> {
    const game = this.findGame(gameInstanceId, ownerUserId); if (!game) return null;
    return ([1, 2] as const).map((slot) => game.snapshots.get(slot)?.summary ?? { slot, label: "", savedAt: "", currentTime: "", stateVersion: 0, lastEventSeq: 0 });
  }

  async savePlayerSnapshot(gameInstanceId: string, ownerUserId: string, slot: 1 | 2, label: string): Promise<PlayerSnapshotSummary | null> {
    const game = this.findGame(gameInstanceId, ownerUserId); if (!game) return null;
    const state = game.engine.getState(); if (state.status !== "active" && state.status !== "paused") return null;
    const summary: PlayerSnapshotSummary = { slot, label, savedAt: new Date().toISOString(), currentTime: state.currentTime, stateVersion: state.stateVersion, lastEventSeq: state.lastEventSeq };
    game.snapshots.set(slot, { summary, state: structuredClone(state), eventCount: game.events.length });
    return summary;
  }

  async loadPlayerSnapshot(gameInstanceId: string, ownerUserId: string, slot: 1 | 2): Promise<{ state: WorldState; events: GameEvent[] } | null> {
    const game = this.findGame(gameInstanceId, ownerUserId); if (!game) return null;
    const saved = game.snapshots.get(slot); const current = game.engine.getState();
    if (!saved || current.status === "finished" || saved.state.campaignVersion !== current.campaignVersion || saved.state.engineVersion !== current.engineVersion) return null;
    game.engine = new CampaignEngine(LINJIANG_1942, structuredClone(saved.state));
    game.events = game.events.slice(0, saved.eventCount);
    return { state: game.engine.getState(), events: structuredClone(game.events) };
  }
}

// Kept as a compatibility name for tests and early integrations.
export { InMemoryGameRepository as GameStore };
