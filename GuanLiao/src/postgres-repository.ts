import { Pool } from "pg";
import type { AuthUser } from "./middleware/auth.js";
import type { GameStateRepository, StoredGameState } from "./repository.js";
import { InMemoryGameStateRepository } from "./store.js";

interface SaveRow {
  state: unknown;
  updated_at: Date;
}

export class PostgresGameStateRepository implements GameStateRepository {
  constructor(private readonly pool: Pool) {}

  async get(user: AuthUser): Promise<StoredGameState | null> {
    await this.ensureUser(user);
    const result = await this.pool.query<SaveRow>(
      "SELECT state, updated_at FROM player_saves WHERE owner_user_id = $1",
      [user.id],
    );
    return result.rows[0] ? mapSave(result.rows[0]) : null;
  }

  async put(user: AuthUser, state: unknown): Promise<StoredGameState> {
    await this.ensureUser(user);
    const result = await this.pool.query<SaveRow>(
      `INSERT INTO player_saves (owner_user_id, state)
       VALUES ($1, $2)
       ON CONFLICT (owner_user_id) DO UPDATE
       SET state = EXCLUDED.state, updated_at = now()
       RETURNING state, updated_at`,
      [user.id, state],
    );
    return mapSave(result.rows[0]);
  }

  async delete(user: AuthUser): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM player_saves WHERE owner_user_id = $1 RETURNING owner_user_id",
      [user.id],
    );
    return result.rowCount === 1;
  }

  async ready(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureUser(user: AuthUser): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, auth_provider, external_subject, username, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (auth_provider, external_subject) DO UPDATE
       SET username = EXCLUDED.username, email = EXCLUDED.email, last_login_at = now()`,
      [user.id, user.authProvider, user.externalSubject, user.username, user.email],
    );
  }
}

export function createGameStateRepository(): GameStateRepository {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
    console.warn("[GuanLiao] DATABASE_URL is not set; using non-persistent in-memory storage");
    return new InMemoryGameStateRepository();
  }
  return new PostgresGameStateRepository(new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
    options: "-c search_path=guanliao,public",
  }));
}

function mapSave(row: SaveRow): StoredGameState {
  return { state: row.state, updatedAt: new Date(row.updated_at).toISOString() };
}
