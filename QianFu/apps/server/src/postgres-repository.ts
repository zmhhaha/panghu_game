import { randomUUID } from "node:crypto";
import {
  CampaignEngine, createInitialWorld, type CampaignReport, type CampaignReportBundle,
  type CampaignShareSummary, type DifficultyConfig, type GameAction, type GameEvent,
  type SharedCampaignReport, type WorldState,
} from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import { Pool, type PoolClient } from "pg";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, UserRecord } from "./repository.js";
import { buildCampaignReportBundle } from "./reports.js";

interface GameRow {
  state: WorldState;
}

interface ReportRow {
  owner_report: CampaignReport;
  public_report: CampaignReport;
}

interface ShareRow {
  id: string;
  game_instance_id: string;
  report_version: number;
  created_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
  access_count: string | number;
  public_report?: CampaignReport;
}

const mapShare = (row: ShareRow): CampaignShareSummary => ({
  shareId: row.id,
  gameInstanceId: row.game_instance_id,
  reportVersion: row.report_version,
  createdAt: new Date(row.created_at).toISOString(),
  expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
  accessCount: Number(row.access_count),
});

const mapUser = (row: Record<string, string>): UserRecord => ({
  id: row.id,
  authProvider: row.auth_provider as AuthUser["authProvider"],
  externalSubject: row.external_subject,
  username: row.username,
  email: row.email,
  createdAt: new Date(row.created_at).toISOString(),
  lastLoginAt: new Date(row.last_login_at).toISOString(),
});

export class PostgresGameRepository implements GameRepository {
  constructor(private readonly pool: Pool) {}

  async ensureUser(user: AuthUser): Promise<UserRecord> {
    const result = await this.pool.query<Record<string, string>>(
      `INSERT INTO users (id, auth_provider, external_subject, username, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (auth_provider, external_subject) DO UPDATE
       SET username = EXCLUDED.username, email = EXCLUDED.email, last_login_at = now()
       RETURNING *`,
      [user.id, user.authProvider, user.externalSubject, user.username, user.email],
    );
    return mapUser(result.rows[0]);
  }

  async createGame(ownerUserId: string, difficultyId: DifficultyConfig["id"], coverProfileId: WorldState["cover"]["profileId"] = "archive_clerk"): Promise<WorldState> {
    const gameInstanceId = randomUUID();
    const state = createInitialWorld(LINJIANG_1942, gameInstanceId, ownerUserId, difficultyId, coverProfileId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO game_instances
          (id, owner_user_id, campaign_id, campaign_version, engine_version, status, state_version, last_event_seq, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [gameInstanceId, ownerUserId, state.campaignId, state.campaignVersion, state.engineVersion, state.status, state.stateVersion, state.lastEventSeq, state],
      );
      await this.insertSnapshot(client, state);
      await client.query("COMMIT");
      return state;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listGames(ownerUserId: string): Promise<WorldState[]> {
    const result = await this.pool.query<GameRow>(
      "SELECT state FROM game_instances WHERE owner_user_id = $1 ORDER BY updated_at DESC",
      [ownerUserId],
    );
    return result.rows.map((row) => row.state);
  }

  async getGame(gameInstanceId: string, ownerUserId: string): Promise<WorldState | null> {
    const result = await this.pool.query<GameRow>(
      "SELECT state FROM game_instances WHERE id = $1 AND owner_user_id = $2",
      [gameInstanceId, ownerUserId],
    );
    return result.rows[0]?.state ?? null;
  }

  async deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM game_instances WHERE id = $1 AND owner_user_id = $2 RETURNING id",
      [gameInstanceId, ownerUserId],
    );
    return result.rowCount === 1;
  }

  async execute(gameInstanceId: string, ownerUserId: string, action: GameAction) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const gameResult = await client.query<GameRow>(
        "SELECT state FROM game_instances WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [gameInstanceId, ownerUserId],
      );
      const state = gameResult.rows[0]?.state;
      if (!state) {
        await client.query("ROLLBACK");
        return null;
      }

      const duplicate = await client.query(
        "SELECT 1 FROM game_actions WHERE game_instance_id = $1 AND idempotency_key = $2",
        [gameInstanceId, action.idempotencyKey],
      );
      if (duplicate.rowCount) {
        await client.query("COMMIT");
        return { state, events: [], narration: "该行动已经处理。", duplicate: true, notices: [] };
      }

      const result = new CampaignEngine(LINJIANG_1942, state).execute(action);
      await client.query(
        `INSERT INTO game_actions (game_instance_id, idempotency_key, action_type, action)
         VALUES ($1, $2, $3, $4)`,
        [gameInstanceId, action.idempotencyKey, action.type, action],
      );
      for (const event of result.events) {
        await client.query(
          `INSERT INTO game_events
            (id, game_instance_id, event_seq, idempotency_key, type, occurred_at, payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [event.id, event.gameInstanceId, event.eventSeq, event.idempotencyKey, event.type, event.occurredAt, event.payload],
        );
      }
      await client.query(
        `UPDATE game_instances SET status = $3, state_version = $4, last_event_seq = $5,
          state = $6, closed_at = $7, updated_at = now()
         WHERE id = $1 AND owner_user_id = $2`,
        [gameInstanceId, ownerUserId, result.state.status, result.state.stateVersion, result.state.lastEventSeq, result.state, result.state.closedAt],
      );
      await this.insertSnapshot(client, result.state);
      if (result.state.status === "finished") await this.ensureReport(client, result.state, ownerUserId);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(gameInstanceId: string, ownerUserId: string): Promise<GameEvent[] | null> {
    const ownership = await this.pool.query("SELECT 1 FROM game_instances WHERE id = $1 AND owner_user_id = $2", [gameInstanceId, ownerUserId]);
    if (!ownership.rowCount) return null;
    const result = await this.pool.query<GameEvent>(
      `SELECT id, game_instance_id AS "gameInstanceId", event_seq AS "eventSeq",
        idempotency_key AS "idempotencyKey", type, occurred_at AS "occurredAt", payload
       FROM game_events WHERE game_instance_id = $1 ORDER BY event_seq`,
      [gameInstanceId],
    );
    return result.rows.map((event) => ({ ...event, occurredAt: new Date(event.occurredAt).toISOString() }));
  }

  async getReport(gameInstanceId: string, ownerUserId: string): Promise<CampaignReportBundle | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const game = await client.query<GameRow>(
        "SELECT state FROM game_instances WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [gameInstanceId, ownerUserId],
      );
      const state = game.rows[0]?.state;
      if (!state || state.status !== "finished") { await client.query("ROLLBACK"); return null; }
      await this.ensureReport(client, state, ownerUserId);
      const report = await client.query<ReportRow>(
        "SELECT owner_report, public_report FROM campaign_reports WHERE game_instance_id = $1 AND owner_user_id = $2",
        [gameInstanceId, ownerUserId],
      );
      await client.query("COMMIT");
      return report.rows[0] ? { ownerReport: report.rows[0].owner_report, publicPreview: report.rows[0].public_report } : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listShares(gameInstanceId: string, ownerUserId: string): Promise<CampaignShareSummary[] | null> {
    const ownership = await this.pool.query("SELECT 1 FROM game_instances WHERE id = $1 AND owner_user_id = $2", [gameInstanceId, ownerUserId]);
    if (!ownership.rowCount) return null;
    const result = await this.pool.query<ShareRow>(
      `SELECT id, game_instance_id, report_version, created_at, expires_at, revoked_at, access_count
       FROM campaign_shares WHERE game_instance_id = $1 AND owner_user_id = $2 ORDER BY created_at DESC`,
      [gameInstanceId, ownerUserId],
    );
    return result.rows.map(mapShare);
  }

  async createShare(gameInstanceId: string, ownerUserId: string, expiresAt: string | null): Promise<CampaignShareSummary | null> {
    const report = await this.getReport(gameInstanceId, ownerUserId);
    if (!report) return null;
    const shareId = randomUUID();
    const result = await this.pool.query<ShareRow>(
      `INSERT INTO campaign_shares
        (id, game_instance_id, owner_user_id, report_version, public_report, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, game_instance_id, report_version, created_at, expires_at, revoked_at, access_count`,
      [shareId, gameInstanceId, ownerUserId, report.publicPreview.reportVersion, report.publicPreview, expiresAt],
    );
    return mapShare(result.rows[0]);
  }

  async revokeShare(shareId: string, ownerUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE campaign_shares SET revoked_at = now()
       WHERE id = $1 AND owner_user_id = $2 AND revoked_at IS NULL RETURNING id`,
      [shareId, ownerUserId],
    );
    return result.rowCount === 1;
  }

  async getPublicShare(shareId: string): Promise<SharedCampaignReport | null> {
    const result = await this.pool.query<ShareRow>(
      `UPDATE campaign_shares SET access_count = access_count + 1
       WHERE id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
       RETURNING id, game_instance_id, report_version, created_at, expires_at, revoked_at, access_count, public_report`,
      [shareId],
    );
    const row = result.rows[0];
    return row?.public_report ? { share: mapShare(row), report: row.public_report } : null;
  }

  private async insertSnapshot(client: PoolClient, state: WorldState) {
    await client.query(
      `INSERT INTO game_snapshots
        (game_instance_id, state_version, last_applied_event_seq, campaign_version, engine_version, state)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [state.gameInstanceId, state.stateVersion, state.lastEventSeq, state.campaignVersion, state.engineVersion, state],
    );
  }

  private async ensureReport(client: PoolClient, state: WorldState, ownerUserId: string) {
    const existing = await client.query("SELECT 1 FROM campaign_reports WHERE game_instance_id = $1", [state.gameInstanceId]);
    if (existing.rowCount) return;
    const eventRows = await client.query<GameEvent>(
      `SELECT id, game_instance_id AS "gameInstanceId", event_seq AS "eventSeq",
        idempotency_key AS "idempotencyKey", type, occurred_at AS "occurredAt", payload
       FROM game_events WHERE game_instance_id = $1 ORDER BY event_seq`,
      [state.gameInstanceId],
    );
    const events = eventRows.rows.map((event) => ({ ...event, occurredAt: new Date(event.occurredAt).toISOString() }));
    const reportId = randomUUID();
    const bundle = buildCampaignReportBundle(LINJIANG_1942, state, events, reportId, new Date().toISOString());
    await client.query(
      `INSERT INTO campaign_reports
        (id, game_instance_id, owner_user_id, report_version, owner_report, public_report)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (game_instance_id) DO NOTHING`,
      [reportId, state.gameInstanceId, ownerUserId, bundle.ownerReport.reportVersion, bundle.ownerReport, bundle.publicPreview],
    );
  }
}
