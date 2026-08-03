import { randomUUID } from "node:crypto";
import { getCampaign, listCampaigns } from "./content.mjs";

const CHANNEL_DELAY = { radio: 12, phone: 5, courier: 35, underground: 240 };

function gameView(game) {
  return {
    id: game.id,
    campaignId: game.campaignId,
    ownerUserId: game.ownerUserId,
    status: game.status,
    clockMinute: game.clockMinute,
    eventSequence: game.lastSequence,
    contentVersion: game.contentVersion,
    objective: game.objective,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

function eventView(row) {
  return {
    id: Number(row.sequence ?? row.id),
    gameId: row.game_id ?? row.gameId,
    type: row.type,
    clockMinute: row.clock_minute ?? row.clockMinute,
    payload: row.payload,
    createdAt: row.created_at ?? row.createdAt
  };
}

class MemoryStore {
  constructor() {
    this.games = new Map();
    this.users = new Map();
  }

  async health() { return { database: "memory", ok: true }; }
  async close() {}
  async ensureUser(user) { this.users.set(user.id, user); return user; }
  async listCampaigns() { return listCampaigns(); }

  async listGames(userId) {
    return [...this.games.values()].filter((game) => game.ownerUserId === userId).map(gameView);
  }

  async createGame(userId, campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    const now = new Date().toISOString();
    const game = {
      id: randomUUID(),
      ownerUserId: userId,
      campaignId,
      contentVersion: campaign.contentVersion,
      status: "running",
      clockMinute: campaign.startMinute,
      lastSequence: 0,
      objective: campaign.objective,
      createdAt: now,
      updatedAt: now,
      events: [],
      orders: new Map(),
      state: { units: campaign.units, contacts: [], lastTickMinute: campaign.startMinute }
    };
    this.games.set(game.id, game);
    this.appendEvent(game, "GAME_CREATED", { campaignId });
    return gameView(game);
  }

  async getGame(userId, gameId) {
    const game = this.games.get(gameId);
    return game && game.ownerUserId === userId ? game : null;
  }

  async getState(userId, gameId) {
    const game = await this.getGame(userId, gameId);
    if (!game) return null;
    return { game: gameView(game), state: game.state };
  }

  async getEvents(userId, gameId, after = 0) {
    const game = await this.getGame(userId, gameId);
    if (!game) return null;
    return game.events.filter((event) => event.id > after);
  }

  async createOrder(userId, gameId, input) {
    const game = await this.getGame(userId, gameId);
    if (!game) return { kind: "missing" };
    const key = input.clientCommandId || randomUUID();
    if (game.orders.has(key)) return { kind: "ok", order: game.orders.get(key), duplicate: true };
    const channel = input.channel || "radio";
    const delay = CHANNEL_DELAY[channel];
    if (!delay) return { kind: "invalid", message: "unsupported communication channel" };
    const order = {
      id: randomUUID(),
      clientCommandId: key,
      recipientId: input.recipientId,
      channel,
      text: input.text,
      status: "queued",
      sentAtMinute: game.clockMinute,
      arriveAtMinute: game.clockMinute + delay
    };
    game.orders.set(key, order);
    this.appendEvent(game, "ORDER_SENT", order);
    return { kind: "ok", order, duplicate: false };
  }

  async advanceRunningGames() {
    const advanced = [];
    for (const game of this.games.values()) {
      if (game.status !== "running") continue;
      game.clockMinute += 1;
      game.state.lastTickMinute = game.clockMinute;
      game.updatedAt = new Date().toISOString();
      advanced.push(this.appendEvent(game, "TIME_TICK", { clockMinute: game.clockMinute }));
    }
    return advanced;
  }

  appendEvent(game, type, payload) {
    game.lastSequence += 1;
    const event = { id: game.lastSequence, gameId: game.id, type, clockMinute: game.clockMinute, payload, createdAt: new Date().toISOString() };
    game.events.push(event);
    return event;
  }

  async claimAgentJobs() { return []; }
}

class PostgresStore {
  constructor(pool) { this.pool = pool; }
  async close() { await this.pool.end(); }
  async health() { await this.pool.query("select 1"); return { database: "postgres", ok: true }; }
  async ensureUser(user) {
    await this.pool.query(
      `insert into shapan.users (id, email, display_name) values ($1, $2, $3)
       on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, updated_at = now()`,
      [user.id, user.email, user.name]
    );
    return user;
  }
  async listCampaigns() { return listCampaigns(); }
  async listGames(userId) {
    const { rows } = await this.pool.query(
      `select id, owner_user_id, campaign_id, status, clock_minute, last_sequence, content_version, objective, created_at, updated_at
       from shapan.campaign_instances where owner_user_id = $1 order by updated_at desc`, [userId]
    );
    return rows.map((row) => gameView({ id: row.id, ownerUserId: row.owner_user_id, campaignId: row.campaign_id, status: row.status, clockMinute: row.clock_minute, lastSequence: row.last_sequence, contentVersion: row.content_version, objective: row.objective, createdAt: row.created_at, updatedAt: row.updated_at }));
  }
  async createGame(userId, campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const id = randomUUID();
      const state = { units: campaign.units, contacts: [], lastTickMinute: campaign.startMinute };
      await client.query(
        `insert into shapan.campaign_instances (id, owner_user_id, campaign_id, content_version, status, clock_minute, objective, random_seed, last_sequence)
         values ($1, $2, $3, $4, 'running', $5, $6, $7, 1)`,
        [id, userId, campaign.id, campaign.contentVersion, campaign.startMinute, campaign.objective, randomUUID()]
      );
      await client.query(`insert into shapan.world_snapshots (game_id, sequence, state) values ($1, 1, $2)`, [id, state]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, 1, 'GAME_CREATED', $2, $3)`, [id, campaign.startMinute, { campaignId }]);
      await client.query("commit");
      return { id, campaignId: campaign.id, ownerUserId: userId, status: "running", clockMinute: campaign.startMinute, eventSequence: 1, contentVersion: campaign.contentVersion, objective: campaign.objective };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async getGame(userId, gameId) {
    const { rows } = await this.pool.query(`select id, owner_user_id, campaign_id, status, clock_minute, last_sequence, content_version, objective, created_at, updated_at from shapan.campaign_instances where id = $1 and owner_user_id = $2`, [gameId, userId]);
    if (!rows[0]) return null;
    const row = rows[0];
    return { id: row.id, ownerUserId: row.owner_user_id, campaignId: row.campaign_id, status: row.status, clockMinute: row.clock_minute, lastSequence: row.last_sequence, contentVersion: row.content_version, objective: row.objective, createdAt: row.created_at, updatedAt: row.updated_at };
  }
  async getState(userId, gameId) {
    const game = await this.getGame(userId, gameId);
    if (!game) return null;
    const { rows } = await this.pool.query(`select state from shapan.world_snapshots where game_id = $1`, [gameId]);
    return { game: gameView(game), state: rows[0]?.state || {} };
  }
  async getEvents(userId, gameId, after = 0) {
    if (!await this.getGame(userId, gameId)) return null;
    const { rows } = await this.pool.query(`select sequence, game_id, type, clock_minute, payload, created_at from shapan.world_events where game_id = $1 and sequence > $2 order by sequence asc limit 100`, [gameId, after]);
    return rows.map(eventView);
  }
  async createOrder(userId, gameId, input) {
    const channel = input.channel || "radio";
    const delay = CHANNEL_DELAY[channel];
    if (!delay) return { kind: "invalid", message: "unsupported communication channel" };
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows: games } = await client.query(`select * from shapan.campaign_instances where id = $1 and owner_user_id = $2 for update`, [gameId, userId]);
      if (!games[0]) { await client.query("rollback"); return { kind: "missing" }; }
      const game = games[0];
      const key = input.clientCommandId || randomUUID();
      const { rows: existing } = await client.query(`select id, client_command_id, recipient_id, channel, text, status, sent_at_minute, arrive_at_minute from shapan.orders where game_id = $1 and client_command_id = $2`, [gameId, key]);
      if (existing[0]) { await client.query("commit"); return { kind: "ok", order: existing[0], duplicate: true }; }
      const order = { id: randomUUID(), clientCommandId: key, recipientId: input.recipientId, channel, text: input.text, status: "queued", sentAtMinute: game.clock_minute, arriveAtMinute: game.clock_minute + delay };
      const sequence = Number(game.last_sequence) + 1;
      await client.query(`insert into shapan.orders (id, game_id, owner_user_id, client_command_id, recipient_id, channel, text, status, sent_at_minute, arrive_at_minute) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [order.id, gameId, userId, key, order.recipientId, channel, order.text, order.status, order.sentAtMinute, order.arriveAtMinute]);
      await client.query(`update shapan.campaign_instances set last_sequence = $2, updated_at = now() where id = $1`, [gameId, sequence]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, 'ORDER_SENT', $3, $4)`, [gameId, sequence, game.clock_minute, order]);
      await client.query("commit");
      return { kind: "ok", order, duplicate: false };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async advanceRunningGames(intervalMs = 5000) {
    const { rows } = await this.pool.query(
      `with due as (
         select id from shapan.campaign_instances
         where status = 'running' and next_tick_at <= now()
         order by next_tick_at
         for update skip locked
         limit 64
       )
       update shapan.campaign_instances game
       set next_tick_at = now() + ($1::text || ' milliseconds')::interval
       from due
       where game.id = due.id
       returning game.id`,
      [intervalMs]
    );
    const events = [];
    for (const row of rows) {
      const event = await this.advanceGame(row.id);
      if (event) events.push(event);
    }
    return events;
  }
  async advanceGame(gameId) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows: locks } = await client.query(`select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as acquired`, [gameId]);
      if (!locks[0]?.acquired) { await client.query("rollback"); return null; }
      const { rows } = await client.query(`select id, clock_minute, last_sequence, status from shapan.campaign_instances where id = $1 for update`, [gameId]);
      const game = rows[0];
      if (!game || game.status !== "running") { await client.query("rollback"); return null; }
      const clock = Number(game.clock_minute) + 1;
      const sequence = Number(game.last_sequence) + 1;
      const payload = { clockMinute: clock };
      await client.query(`update shapan.campaign_instances set clock_minute = $2, last_sequence = $3, updated_at = now() where id = $1`, [gameId, clock, sequence]);
      await client.query(`update shapan.world_snapshots set sequence = $2, state = jsonb_set(state, '{lastTickMinute}', to_jsonb($3::int)) where game_id = $1`, [gameId, sequence, clock]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, 'TIME_TICK', $3, $4)`, [gameId, sequence, clock, payload]);
      await client.query("commit");
      return { id: sequence, gameId, type: "TIME_TICK", clockMinute: clock, payload };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async claimAgentJobs() { return []; }
}

export async function createStore() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import("pg");
      return new PostgresStore(new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 10) }));
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn(`[shapan] pg unavailable, using memory store: ${error.message}`);
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }
  return new MemoryStore();
}
