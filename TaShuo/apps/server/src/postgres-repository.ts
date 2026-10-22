import type { GameState, PublicationRecord } from "@tashuo/core";
import { Pool } from "pg";
import type { AuthUser } from "./middleware/auth.js";
import type { GameRepository, PublicationKey, SaveGameInput, SaveGameResult, StoredAction, UserRecord } from "./repository.js";
import { assertPublicationMatchesKey, assertSameAction, normalizeAction, publicationCacheKey, StateConflictError } from "./repository.js";

interface GameRow { state: GameState }
interface ActionRow { action_type: string; action: Record<string, unknown> }

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

  async createGame(ownerUserId: string, state: GameState): Promise<GameState> {
    if (state.ownerUserId !== ownerUserId) throw new Error("游戏所有者不匹配");
    await this.pool.query(
      `INSERT INTO game_instances
        (id, owner_user_id, case_id, case_version, status, state_version, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [state.id, ownerUserId, state.caseId, state.caseVersion, state.status, state.stateVersion, state],
    );
    return structuredClone(state);
  }

  async listGames(ownerUserId: string): Promise<GameState[]> {
    const result = await this.pool.query<GameRow>(
      "SELECT state FROM game_instances WHERE owner_user_id = $1 ORDER BY updated_at DESC",
      [ownerUserId],
    );
    return result.rows.map((row) => row.state);
  }

  async getGame(gameInstanceId: string, ownerUserId: string): Promise<GameState | null> {
    const result = await this.pool.query<GameRow>(
      "SELECT state FROM game_instances WHERE id = $1 AND owner_user_id = $2",
      [gameInstanceId, ownerUserId],
    );
    return result.rows[0]?.state ?? null;
  }

  async findAction(gameInstanceId: string, ownerUserId: string, idempotencyKey: string): Promise<StoredAction | null> {
    const result = await this.pool.query<ActionRow>(
      `SELECT actions.action_type, actions.action FROM game_actions actions
       JOIN game_instances games ON games.id = actions.game_instance_id
       WHERE games.id = $1 AND games.owner_user_id = $2 AND actions.idempotency_key = $3`,
      [gameInstanceId, ownerUserId, idempotencyKey],
    );
    const row = result.rows[0];
    return row ? { actionType: row.action_type, action: row.action } : null;
  }

  async getOrCreatePublication(key: PublicationKey, generate: () => Promise<PublicationRecord>): Promise<PublicationRecord> {
    const client = await this.pool.connect();
    let releaseError: Error | undefined;
    try {
      await client.query("BEGIN");
      // This transaction-scoped lock also serializes generation across API processes.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`tashuo:publication:${publicationCacheKey(key)}`]);
      const parameters = [key.caseId, key.caseVersion, key.contentId, key.promptVersion];
      const existing = await client.query<{ publication: PublicationRecord }>(
        "SELECT publication FROM publications WHERE case_id = $1 AND case_version = $2 AND content_id = $3 AND prompt_version = $4",
        parameters,
      );
      let publication = existing.rows[0]?.publication;
      if (!publication) {
        publication = await generate();
        assertPublicationMatchesKey(key, publication);
        await client.query(
          "INSERT INTO publications (case_id, case_version, content_id, prompt_version, publication) VALUES ($1, $2, $3, $4, $5)",
          [...parameters, publication],
        );
      }
      assertPublicationMatchesKey(key, publication);
      await client.query("COMMIT");
      return structuredClone(publication);
    } catch (error) {
      try { await client.query("ROLLBACK"); }
      catch (rollbackError) { releaseError = rollbackError instanceof Error ? rollbackError : new Error("数据库事务回滚失败"); }
      throw error;
    } finally { client.release(releaseError); }
  }

  async saveGame(input: SaveGameInput): Promise<SaveGameResult | null> {
    const client = await this.pool.connect();
    let releaseError: Error | undefined;
    try {
      await client.query("BEGIN");
      const locked = await client.query<GameRow>(
        "SELECT state FROM game_instances WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [input.gameInstanceId, input.ownerUserId],
      );
      const current = locked.rows[0]?.state;
      if (!current) { await client.query("ROLLBACK"); return null; }
      const duplicate = await client.query<ActionRow>(
        "SELECT action_type, action FROM game_actions WHERE game_instance_id = $1 AND idempotency_key = $2",
        [input.gameInstanceId, input.idempotencyKey],
      );
      const previous = duplicate.rows[0];
      if (previous) {
        assertSameAction({ actionType: previous.action_type, action: previous.action }, input.actionType, input.action);
        await client.query("COMMIT");
        return { state: current, duplicate: true };
      }
      if (current.stateVersion !== input.expectedStateVersion) throw new StateConflictError();
      if (input.nextState.ownerUserId !== input.ownerUserId || input.nextState.id !== input.gameInstanceId) throw new Error("禁止跨实例写入状态");
      await client.query(
        `INSERT INTO game_actions (game_instance_id, idempotency_key, action_type, action, resulting_state_version)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.gameInstanceId, input.idempotencyKey, input.actionType, normalizeAction(input.action), input.nextState.stateVersion],
      );
      await client.query(
        `UPDATE game_instances SET status = $3, state_version = $4, state = $5, updated_at = now(),
          closed_at = CASE WHEN $3 = 'finished' THEN now() ELSE NULL END
         WHERE id = $1 AND owner_user_id = $2`,
        [input.gameInstanceId, input.ownerUserId, input.nextState.status, input.nextState.stateVersion, input.nextState],
      );
      await client.query("COMMIT");
      return { state: structuredClone(input.nextState), duplicate: false };
    } catch (error) {
      try { await client.query("ROLLBACK"); }
      catch (rollbackError) { releaseError = rollbackError instanceof Error ? rollbackError : new Error("数据库事务回滚失败"); }
      throw error;
    } finally { client.release(releaseError); }
  }

  async deleteGame(gameInstanceId: string, ownerUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM game_instances WHERE id = $1 AND owner_user_id = $2 RETURNING id",
      [gameInstanceId, ownerUserId],
    );
    return result.rowCount === 1;
  }
}

export function createPostgresRepository(connectionString: string): PostgresGameRepository {
  return new PostgresGameRepository(new Pool({ connectionString, options: "-c search_path=tashuo,public" }));
}

