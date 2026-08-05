import { randomUUID } from "node:crypto";
import { getCampaign, getUnitProfile, listCampaigns } from "./content.mjs";
import { applyAgentDecision, advanceWorld, createInitialWorldState, normalizeWorldState, recordOrder } from "./simulation.mjs";

const CHANNEL_DELAY = { radio: 12, phone: 5, courier: 35, underground: 240 };
const VALID_TIME_SCALES = new Set([1, 2, 4]);

function gameView(game) {
  return {
    id: game.id,
    campaignId: game.campaignId ?? game.campaign_id,
    ownerUserId: game.ownerUserId ?? game.owner_user_id,
    status: game.status,
    clockMinute: Number(game.clockMinute ?? game.clock_minute),
    eventSequence: Number(game.lastSequence ?? game.last_sequence),
    contentVersion: game.contentVersion ?? game.content_version,
    objective: game.objective,
    timeScale: Number(game.timeScale ?? game.time_scale ?? 1),
    startedAt: game.startedAt ?? game.started_at ?? null,
    createdAt: game.createdAt ?? game.created_at,
    updatedAt: game.updatedAt ?? game.updated_at
  };
}

function eventView(row) {
  return {
    id: Number(row.sequence ?? row.id),
    gameId: row.game_id ?? row.gameId,
    type: row.type,
    clockMinute: Number(row.clock_minute ?? row.clockMinute),
    payload: row.payload,
    createdAt: row.created_at ?? row.createdAt
  };
}

function orderView(row) {
  return {
    id: row.id,
    clientCommandId: row.client_command_id ?? row.clientCommandId,
    recipientId: row.recipient_id ?? row.recipientId,
    channel: row.channel,
    priority: row.priority ?? "normal",
    text: row.text,
    status: row.status,
    sentAtMinute: Number(row.sent_at_minute ?? row.sentAtMinute),
    arriveAtMinute: Number(row.arrive_at_minute ?? row.arriveAtMinute),
    deliveredAtMinute: row.delivered_at_minute ?? row.deliveredAtMinute ?? null
  };
}

function reportMessageView(message) {
  return {
    ...message,
    deliveredAtMinute: message.deliveredAtMinute ?? message.availableAtMinute ?? null
  };
}

function gameFromRow(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    campaignId: row.campaign_id,
    status: row.status,
    clockMinute: row.clock_minute,
    lastSequence: row.last_sequence,
    contentVersion: row.content_version,
    objective: row.objective,
    timeScale: row.time_scale,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function applyWorldEvents(game, worldResult) {
  const events = [];
  events.push({ type: "TIME_TICK", payload: { clockMinute: game.clockMinute, timeScale: game.timeScale } });
  events.push(...worldResult.events);
  if (worldResult.status) events.push({ type: worldResult.status === "won" ? "GAME_WON" : "GAME_LOST", payload: { progress: worldResult.state.objectiveProgress } });
  return events;
}

export class MemoryStore {
  constructor() {
    this.games = new Map();
    this.users = new Map();
    this.agentJobs = new Map();
  }

  async health() { return { database: "memory", ok: true }; }
  async close() {}
  async ensureUser(user) { this.users.set(user.id, user); return user; }
  async listCampaigns() { return listCampaigns(); }

  async listGames(userId) {
    return [...this.games.values()].filter((game) => game.ownerUserId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(gameView);
  }

  async createGame(userId, campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    const now = new Date().toISOString();
    const game = {
      id: randomUUID(), ownerUserId: userId, campaignId, contentVersion: campaign.contentVersion,
      status: "paused", clockMinute: campaign.startMinute, lastSequence: 0, objective: campaign.objective,
      timeScale: 1, startedAt: null, createdAt: now, updatedAt: now, events: [], orders: new Map(),
      state: createInitialWorldState(campaign)
    };
    this.games.set(game.id, game);
    this.appendEvent(game, "GAME_CREATED", { campaignId });
    return gameView(game);
  }

  async getGame(userId, gameId) {
    const game = this.games.get(gameId);
    return game && game.ownerUserId === userId ? game : null;
  }

  async startGame(userId, gameId) {
    const game = await this.getGame(userId, gameId);
    if (!game) return { kind: "missing" };
    if (game.status === "running") return { kind: "ok", game: gameView(game), alreadyStarted: true };
    if (game.status !== "paused" || game.startedAt) return { kind: "invalid", message: "game cannot be started in its current state" };
    game.status = "running";
    game.startedAt = new Date().toISOString();
    game.updatedAt = new Date().toISOString();
    this.appendEvent(game, "GAME_STARTED", { campaignId: game.campaignId });
    return { kind: "ok", game: gameView(game), alreadyStarted: false };
  }

  async controlGame(userId, gameId, input) {
    const game = await this.getGame(userId, gameId);
    if (!game) return { kind: "missing" };
    const action = input.action;
    if (action === "pause") {
      if (game.status !== "running") return { kind: "invalid", message: "game is not running" };
      game.status = "paused";
      this.appendEvent(game, "GAME_PAUSED", {});
    } else if (action === "resume") {
      if (game.status !== "paused" || !game.startedAt) return { kind: "invalid", message: "game cannot be resumed" };
      game.status = "running";
      this.appendEvent(game, "GAME_RESUMED", {});
    } else if (action === "set_speed") {
      const speed = Number(input.speed);
      if (!VALID_TIME_SCALES.has(speed)) return { kind: "invalid", message: "speed must be 1, 2, or 4" };
      if (!game.startedAt) return { kind: "invalid", message: "game has not started" };
      game.timeScale = speed;
      this.appendEvent(game, "GAME_SPEED_CHANGED", { timeScale: speed });
    } else return { kind: "invalid", message: "unsupported control action" };
    game.updatedAt = new Date().toISOString();
    return { kind: "ok", game: gameView(game) };
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
    if (game.status !== "running" && !(game.status === "paused" && game.startedAt)) return { kind: "invalid", message: "game has not started" };
    const key = input.clientCommandId || randomUUID();
    if (game.orders.has(key)) return { kind: "ok", order: game.orders.get(key), duplicate: true };
    const channel = input.channel || "radio";
    const delay = CHANNEL_DELAY[channel];
    if (!delay) return { kind: "invalid", message: "unsupported communication channel" };
    const order = { id: randomUUID(), clientCommandId: key, recipientId: input.recipientId, channel, priority: input.priority === "urgent" ? "urgent" : "normal", text: input.text, status: "queued", sentAtMinute: game.clockMinute, arriveAtMinute: game.clockMinute + delay, deliveredAtMinute: null };
    game.orders.set(key, order);
    game.state = recordOrder(game.state, order);
    game.updatedAt = new Date().toISOString();
    this.appendEvent(game, "ORDER_SENT", { order });
    return { kind: "ok", order, duplicate: false };
  }

  async advanceRunningGames() {
    const advanced = [];
    for (const game of this.games.values()) {
      if (game.status !== "running") continue;
      const campaign = getCampaign(game.campaignId);
      const previousMinute = game.clockMinute;
      game.clockMinute += game.timeScale;
      const dueOrders = [...game.orders.values()].filter((order) => order.status === "queued" && order.arriveAtMinute <= game.clockMinute);
      const result = advanceWorld(campaign, game.state, { clockMinute: game.clockMinute, dueOrders });
      game.state = result.state;
      for (const order of dueOrders) {
        const delivered = { ...order, status: "delivered", deliveredAtMinute: game.clockMinute };
        game.orders.set(order.clientCommandId, delivered);
      }
      for (const job of result.status ? [] : result.jobs) this.agentJobs.set(job.id, { ...job, gameId: game.id, ownerUserId: game.ownerUserId, status: "queued", attempts: 0, availableAt: Date.now() });
      for (const event of applyWorldEvents({ ...game, clockMinute: game.clockMinute }, result)) advanced.push(this.appendEvent(game, event.type, event.payload));
      if (result.status) game.status = result.status;
      game.updatedAt = new Date().toISOString();
      if (previousMinute !== game.clockMinute) game.state.lastTickMinute = game.clockMinute;
    }
    return advanced;
  }

  appendEvent(game, type, payload) {
    game.lastSequence += 1;
    const event = { id: game.lastSequence, gameId: game.id, type, clockMinute: game.clockMinute, payload, createdAt: new Date().toISOString() };
    game.events.push(event);
    return event;
  }

  async claimAgentJobs(workerId = "memory-agent", limit = 8) {
    const jobs = [...this.agentJobs.values()].filter((job) => job.status === "queued" && job.availableAt <= Date.now()).slice(0, limit);
    for (const job of jobs) { job.status = "running"; job.lockedBy = workerId; job.attempts += 1; job.lockedAt = Date.now(); }
    return jobs;
  }

  async completeAgentJob(jobId, result) {
    const job = this.agentJobs.get(jobId);
    if (!job || job.status !== "running") return { kind: "missing" };
    const game = this.games.get(job.gameId);
    if (!game) return { kind: "missing" };
    const campaign = getCampaign(game.campaignId);
    const applied = applyAgentDecision(campaign, game.state, job, result.decision, game.clockMinute);
    game.state = applied.state;
    const eventType = job.jobType === "enemy_action" ? "ENEMY_ACTION" : "AGENT_REPORT";
    this.appendEvent(game, eventType, { message: applied.message, unitState: applied.state.unitStates[applied.message.location], jobType: job.jobType, provider: result.run?.provider });
    this.appendEvent(game, "OBJECTIVE_UPDATED", { progress: applied.objectiveProgress });
    if (applied.status) this.appendEvent(game, applied.status === "won" ? "GAME_WON" : "GAME_LOST", { progress: applied.objectiveProgress });
    if (applied.status) game.status = applied.status;
    job.status = "succeeded";
    job.updatedAt = Date.now();
    game.updatedAt = new Date().toISOString();
    return { kind: "ok", message: applied.message };
  }

  async failAgentJob(jobId, error) {
    const job = this.agentJobs.get(jobId);
    if (!job) return { kind: "missing" };
    if (job.attempts < 3) { job.status = "queued"; job.availableAt = Date.now() + job.attempts * 5000; }
    else job.status = "failed";
    job.lastError = String(error?.message || error).slice(0, 500);
    return { kind: "ok" };
  }
}

class PostgresStore {
  constructor(pool) { this.pool = pool; }
  async close() { await this.pool.end(); }
  async health() { await this.pool.query("select 1"); return { database: "postgres", ok: true }; }
  async ensureUser(user) {
    await this.pool.query(`insert into shapan.users (id, email, display_name) values ($1, $2, $3) on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, updated_at = now()`, [user.id, user.email, user.name]);
    return user;
  }
  async listCampaigns() { return listCampaigns(); }
  async listGames(userId) {
    const { rows } = await this.pool.query(`select id, owner_user_id, campaign_id, status, clock_minute, last_sequence, content_version, objective, time_scale, started_at, created_at, updated_at from shapan.campaign_instances where owner_user_id = $1 order by updated_at desc`, [userId]);
    return rows.map(gameFromRow).map(gameView);
  }
  async createGame(userId, campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const id = randomUUID();
      const state = createInitialWorldState(campaign);
      await client.query(`insert into shapan.campaign_instances (id, owner_user_id, campaign_id, content_version, status, clock_minute, objective, random_seed, last_sequence) values ($1, $2, $3, $4, 'paused', $5, $6, $7, 1)`, [id, userId, campaign.id, campaign.contentVersion, campaign.startMinute, campaign.objective, randomUUID()]);
      await client.query(`insert into shapan.world_snapshots (game_id, sequence, state) values ($1, 1, $2)`, [id, state]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, 1, 'GAME_CREATED', $2, $3)`, [id, campaign.startMinute, { campaignId }]);
      await client.query("commit");
      return { id, campaignId: campaign.id, ownerUserId: userId, status: "paused", clockMinute: campaign.startMinute, eventSequence: 1, contentVersion: campaign.contentVersion, objective: campaign.objective, timeScale: 1, startedAt: null };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async getGame(userId, gameId) {
    const { rows } = await this.pool.query(`select id, owner_user_id, campaign_id, status, clock_minute, last_sequence, content_version, objective, time_scale, started_at, created_at, updated_at from shapan.campaign_instances where id = $1 and owner_user_id = $2`, [gameId, userId]);
    return rows[0] ? gameFromRow(rows[0]) : null;
  }
  async startGame(userId, gameId) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(`select id, owner_user_id, campaign_id, status, clock_minute, last_sequence, content_version, objective, time_scale, started_at, created_at, updated_at from shapan.campaign_instances where id = $1 and owner_user_id = $2 for update`, [gameId, userId]);
      const row = rows[0];
      if (!row) { await client.query("rollback"); return { kind: "missing" }; }
      const game = gameFromRow(row);
      if (game.status === "running") { await client.query("commit"); return { kind: "ok", game: gameView(game), alreadyStarted: true }; }
      if (game.status !== "paused" || game.startedAt) { await client.query("rollback"); return { kind: "invalid", message: "game cannot be started in its current state" }; }
      const sequence = Number(game.lastSequence) + 1;
      const startedAt = new Date().toISOString();
      await client.query(`update shapan.campaign_instances set status = 'running', started_at = now(), next_tick_at = now(), last_sequence = $2, updated_at = now() where id = $1`, [gameId, sequence]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, 'GAME_STARTED', $3, $4)`, [gameId, sequence, game.clockMinute, { campaignId: game.campaignId }]);
      await client.query("commit");
      return { kind: "ok", game: gameView({ ...game, status: "running", startedAt, lastSequence: sequence, updatedAt: startedAt }), alreadyStarted: false };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async controlGame(userId, gameId, input) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(`select * from shapan.campaign_instances where id = $1 and owner_user_id = $2 for update`, [gameId, userId]);
      const row = rows[0];
      if (!row) { await client.query("rollback"); return { kind: "missing" }; }
      if (!["running", "paused"].includes(row.status)) { await client.query("rollback"); return { kind: "invalid", message: "game is already finished" }; }
      let status = row.status;
      let speed = Number(row.time_scale || 1);
      let type;
      let payload = {};
      if (input.action === "pause") { if (status !== "running") { await client.query("rollback"); return { kind: "invalid", message: "game is not running" }; } status = "paused"; type = "GAME_PAUSED"; }
      else if (input.action === "resume") { if (status !== "paused" || !row.started_at) { await client.query("rollback"); return { kind: "invalid", message: "game cannot be resumed" }; } status = "running"; type = "GAME_RESUMED"; }
      else if (input.action === "set_speed") { speed = Number(input.speed); if (!VALID_TIME_SCALES.has(speed)) { await client.query("rollback"); return { kind: "invalid", message: "speed must be 1, 2, or 4" }; } if (!row.started_at) { await client.query("rollback"); return { kind: "invalid", message: "game has not started" }; } type = "GAME_SPEED_CHANGED"; payload = { timeScale: speed }; }
      else { await client.query("rollback"); return { kind: "invalid", message: "unsupported control action" }; }
      const sequence = Number(row.last_sequence) + 1;
      await client.query(`update shapan.campaign_instances set status = $2, time_scale = $3, next_tick_at = case when $2 = 'running' then now() else next_tick_at end, last_sequence = $4, updated_at = now() where id = $1`, [gameId, status, speed, sequence]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, $3, $4, $5)`, [gameId, sequence, row.clock_minute, type, payload]);
      await client.query("commit");
      return { kind: "ok", game: gameView({ ...gameFromRow(row), status, timeScale: speed, lastSequence: sequence }) };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async getState(userId, gameId) {
    const game = await this.getGame(userId, gameId);
    if (!game) return null;
    const campaign = getCampaign(game.campaignId);
    const { rows: snapshots } = await this.pool.query(`select state from shapan.world_snapshots where game_id = $1`, [gameId]);
    const state = normalizeWorldState(campaign, snapshots[0]?.state || {});
    const { rows: orders } = await this.pool.query(`select id, client_command_id, recipient_id, channel, priority, text, status, sent_at_minute, arrive_at_minute, delivered_at_minute from shapan.orders where game_id = $1 order by created_at desc limit 100`, [gameId]);
    const { rows: messages } = await this.pool.query(`select external_id, source, message_type, subject, body, delivered_at_minute, payload from shapan.messages where game_id = $1 order by delivered_at_minute desc nulls last, created_at desc limit 200`, [gameId]);
    state.orders = orders.map(orderView);
    state.messages = messages.filter((row) => row.external_id).map((row) => reportMessageView({ id: row.external_id, source: row.source, type: row.message_type, subject: row.subject, body: row.body, deliveredAtMinute: row.delivered_at_minute, ...(row.payload || {}) }));
    return { game: gameView(game), state };
  }
  async getEvents(userId, gameId, after = 0) {
    if (!await this.getGame(userId, gameId)) return null;
    const { rows } = await this.pool.query(`select sequence, game_id, type, clock_minute, payload, created_at from shapan.world_events where game_id = $1 and sequence > $2 order by sequence asc limit 200`, [gameId, after]);
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
      if (game.status !== "running" && !(game.status === "paused" && game.started_at)) { await client.query("rollback"); return { kind: "invalid", message: "game has not started" }; }
      const key = input.clientCommandId || randomUUID();
      const { rows: existing } = await client.query(`select id, client_command_id, recipient_id, channel, priority, text, status, sent_at_minute, arrive_at_minute, delivered_at_minute from shapan.orders where game_id = $1 and client_command_id = $2`, [gameId, key]);
      if (existing[0]) { await client.query("commit"); return { kind: "ok", order: orderView(existing[0]), duplicate: true }; }
      const order = { id: randomUUID(), clientCommandId: key, recipientId: input.recipientId, channel, priority: input.priority === "urgent" ? "urgent" : "normal", text: input.text, status: "queued", sentAtMinute: Number(game.clock_minute), arriveAtMinute: Number(game.clock_minute) + delay, deliveredAtMinute: null };
      const { rows: snapshots } = await client.query(`select state from shapan.world_snapshots where game_id = $1 for update`, [gameId]);
      const state = recordOrder(normalizeWorldState(getCampaign(game.campaign_id), snapshots[0]?.state || {}), order);
      const sequence = Number(game.last_sequence) + 1;
      await client.query(`insert into shapan.orders (id, game_id, owner_user_id, client_command_id, recipient_id, channel, priority, text, status, sent_at_minute, arrive_at_minute) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [order.id, gameId, userId, key, order.recipientId, channel, order.priority, order.text, order.status, order.sentAtMinute, order.arriveAtMinute]);
      await client.query(`update shapan.campaign_instances set last_sequence = $2, updated_at = now() where id = $1`, [gameId, sequence]);
      await client.query(`update shapan.world_snapshots set sequence = $2, state = $3, updated_at = now() where game_id = $1`, [gameId, sequence, state]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, 'ORDER_SENT', $3, $4)`, [gameId, sequence, game.clock_minute, { order }]);
      await client.query("commit");
      return { kind: "ok", order, duplicate: false };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async advanceRunningGames(intervalMs = 5000) {
    const { rows } = await this.pool.query(`with due as (select id from shapan.campaign_instances where status = 'running' and next_tick_at <= now() order by next_tick_at for update skip locked limit 64) update shapan.campaign_instances game set next_tick_at = now() + ($1::text || ' milliseconds')::interval from due where game.id = due.id returning game.id`, [intervalMs]);
    const events = [];
    for (const row of rows) { const event = await this.advanceGame(row.id); if (event) events.push(event); }
    return events;
  }
  async advanceGame(gameId) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows: locks } = await client.query(`select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as acquired`, [gameId]);
      if (!locks[0]?.acquired) { await client.query("rollback"); return null; }
      const { rows: games } = await client.query(`select * from shapan.campaign_instances where id = $1 for update`, [gameId]);
      const game = games[0];
      if (!game || game.status !== "running") { await client.query("rollback"); return null; }
      const campaign = getCampaign(game.campaign_id);
      const { rows: snapshots } = await client.query(`select state from shapan.world_snapshots where game_id = $1 for update`, [gameId]);
      const { rows: queued } = await client.query(`select id, client_command_id, recipient_id, channel, priority, text, status, sent_at_minute, arrive_at_minute, delivered_at_minute from shapan.orders where game_id = $1 and status = 'queued' and arrive_at_minute <= $2 for update`, [gameId, Number(game.clock_minute) + Number(game.time_scale || 1)]);
      const clockMinute = Number(game.clock_minute) + Number(game.time_scale || 1);
      const result = advanceWorld(campaign, snapshots[0]?.state || {}, { clockMinute, dueOrders: queued.map(orderView) });
      let sequence = Number(game.last_sequence);
      const eventRows = [{ type: "TIME_TICK", payload: { clockMinute, timeScale: Number(game.time_scale || 1) } }, ...result.events];
      if (result.status) eventRows.push({ type: result.status === "won" ? "GAME_WON" : "GAME_LOST", payload: { progress: result.state.objectiveProgress } });
      for (const message of result.messages) {
        await client.query(`insert into shapan.messages (game_id, owner_user_id, external_id, source, message_type, subject, body, delivered_at_minute, payload) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (game_id, external_id) do nothing`, [gameId, game.owner_user_id, message.id, message.source, message.type, message.subject, message.body, message.deliveredAtMinute, message]);
      }
      for (const order of queued) await client.query(`update shapan.orders set status = 'delivered', delivered_at_minute = $2 where id = $1`, [order.id, clockMinute]);
      for (const job of result.status ? [] : result.jobs) {
        await client.query(`insert into shapan.agent_jobs (id, game_id, owner_user_id, job_type, input) values ($1, $2, $3, $4, $5)`, [job.id, gameId, game.owner_user_id, job.jobType, job.input]);
      }
      const nextStatus = result.status || "running";
      for (const event of eventRows) {
        sequence += 1;
        await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, $3, $4, $5)`, [gameId, sequence, event.type, clockMinute, event.payload]);
      }
      await client.query(`update shapan.campaign_instances set status = $2, clock_minute = $3, last_sequence = $4, updated_at = now() where id = $1`, [gameId, nextStatus, clockMinute, sequence]);
      await client.query(`update shapan.world_snapshots set sequence = $2, state = $3, updated_at = now() where game_id = $1`, [gameId, sequence, result.state]);
      await client.query("commit");
      return { id: sequence, gameId, type: "TIME_TICK", clockMinute, payload: { clockMinute, timeScale: Number(game.time_scale || 1) } };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async claimAgentJobs(workerId = randomUUID(), limit = 8) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(`with picked as (select id from shapan.agent_jobs where (status = 'queued' and available_at <= now()) or (status = 'running' and locked_at < now() - interval '2 minutes') order by available_at, created_at for update skip locked limit $1) update shapan.agent_jobs job set status = 'running', attempts = job.attempts + 1, locked_at = now(), locked_by = $2, updated_at = now() from picked where job.id = picked.id returning job.*`, [limit, workerId]);
      await client.query("commit");
      return rows;
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async completeAgentJob(jobId, result) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows: jobs } = await client.query(`select * from shapan.agent_jobs where id = $1 for update`, [jobId]);
      const job = jobs[0];
      if (!job || job.status !== "running") { await client.query("rollback"); return { kind: "missing" }; }
      const { rows: games } = await client.query(`select * from shapan.campaign_instances where id = $1 for update`, [job.game_id]);
      const game = games[0];
      if (!game) { await client.query("rollback"); return { kind: "missing" }; }
      if (["won", "lost", "finished"].includes(game.status)) {
        await client.query(`update shapan.agent_jobs set status = 'failed', updated_at = now() where id = $1`, [job.id]);
        await client.query("commit");
        return { kind: "invalid", message: "game has already finished" };
      }
      const campaign = getCampaign(game.campaign_id);
      const { rows: snapshots } = await client.query(`select state from shapan.world_snapshots where game_id = $1 for update`, [game.id]);
      const applied = applyAgentDecision(campaign, snapshots[0]?.state || {}, { ...job, jobType: job.job_type, input: job.input }, result.decision, Number(game.clock_minute));
      let sequence = Number(game.last_sequence) + 1;
      const eventType = job.job_type === "enemy_action" ? "ENEMY_ACTION" : "AGENT_REPORT";
      await client.query(`insert into shapan.messages (game_id, owner_user_id, external_id, source, message_type, subject, body, delivered_at_minute, payload) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (game_id, external_id) do nothing`, [game.id, game.owner_user_id, applied.message.id, applied.message.source, applied.message.type, applied.message.subject, applied.message.body, applied.message.deliveredAtMinute, applied.message]);
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, $3, $4, $5)`, [game.id, sequence, eventType, game.clock_minute, { message: applied.message, unitState: applied.state.unitStates[applied.message.location], jobType: job.job_type, provider: result.run?.provider }]);
      sequence += 1;
      await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, 'OBJECTIVE_UPDATED', $3, $4)`, [game.id, sequence, game.clock_minute, { progress: applied.objectiveProgress }]);
      if (applied.status) {
        sequence += 1;
        await client.query(`insert into shapan.world_events (game_id, sequence, type, clock_minute, payload) values ($1, $2, $3, $4, $5)`, [game.id, sequence, applied.status === "won" ? "GAME_WON" : "GAME_LOST", game.clock_minute, { progress: applied.objectiveProgress }]);
      }
      await client.query(`update shapan.campaign_instances set status = case when $2::text is null then status else $2::text end, last_sequence = $3, updated_at = now() where id = $1`, [game.id, applied.status || null, sequence]);
      await client.query(`update shapan.world_snapshots set sequence = $2, state = $3, updated_at = now() where game_id = $1`, [game.id, sequence, applied.state]);
      await client.query(`update shapan.agent_jobs set status = 'succeeded', updated_at = now(), locked_at = null, locked_by = null where id = $1`, [job.id]);
      await client.query(`insert into shapan.agent_runs (job_id, provider, model, prompt_version, duration_ms, result_status, structured_output) values ($1, $2, $3, 'shapan-agent-v1', $4, $5, $6)`, [job.id, result.run?.provider || "fallback", result.run?.model || "rules-v1", result.run?.durationMs || null, result.run?.resultStatus || "succeeded", result.decision]);
      await client.query("commit");
      return { kind: "ok", message: applied.message };
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  async failAgentJob(jobId, error) {
    const message = String(error?.message || error).slice(0, 500);
    await this.pool.query(`update shapan.agent_jobs set status = case when attempts >= 3 then 'failed' else 'queued' end, available_at = case when attempts >= 3 then available_at else now() + interval '5 seconds' end, updated_at = now() where id = $1`, [jobId]);
    return { kind: "ok", message };
  }
}

export async function createStore() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import("pg");
      return new PostgresStore(new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 10), options: "-c search_path=shapan,public" }));
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn(`[shapan] pg unavailable, using memory store: ${error.message}`);
    }
  } else if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
  return new MemoryStore();
}
