import { getUnitProfile } from "./content.mjs";

const PUBLIC_EVENT_TYPES = new Set([
  "GAME_CREATED", "GAME_STARTED", "GAME_PAUSED", "GAME_RESUMED", "GAME_SPEED_CHANGED",
  "GAME_FINISHED", "GAME_WON", "GAME_LOST", "TIME_TICK", "ORDER_SENT", "ORDER_DELIVERED",
  "REPORT_RECEIVED", "AGENT_REPORT", "ENEMY_ACTION", "OBJECTIVE_UPDATED"
]);

function reportMinute(message) {
  return Number(message?.availableAtMinute ?? message?.deliveredAtMinute ?? -Infinity);
}

function hasArrived(message, clockMinute) {
  return reportMinute(message) <= clockMinute;
}

function validPosition(value) {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y)
    && value.x >= 0 && value.x <= 100 && value.y >= 0 && value.y <= 100;
}

function publicMovement(movement, enemy, message) {
  if (!movement || typeof movement !== "object") return undefined;
  if (enemy) return {
    kind: "intel",
    confidence: message.confidence || movement.confidence || "estimated",
    updatedAtMinute: message.reportedPosition?.atMinute ?? movement.updatedAtMinute
  };
  // These are the route and intention supplied by this report, never live simulation state.
  const keys = ["kind", "from", "to", "route", "segment", "progress", "phase", "updatedAtMinute", "startedAtMinute", "durationMinutes", "confidence", "label", "blockedReason", "blocked"];
  return Object.fromEntries(keys.filter((key) => movement[key] !== undefined).map((key) => [key, structuredClone(movement[key])]));
}

function unitView(campaignId, message) {
  if (message.updatesUnitState === false || !message.location || !validPosition(message.reportedPosition)) return null;
  const snapshot = message.reportedUnitState;
  if (!snapshot || !validPosition(snapshot)) return null;
  const enemy = getUnitProfile(campaignId, message.location).side !== "friendly";
  const reportedAt = Number(message.reportedPosition.atMinute);
  if (!Number.isFinite(reportedAt)) return null;
  const result = {
    x: message.reportedPosition.x,
    y: message.reportedPosition.y,
    status: snapshot.status || (enemy ? "活动迹象" : "等待报告"),
    summary: enemy ? "该位置来自已收到的敌情报告，兵力、状态和真实行动意图尚待复核。" : snapshot.summary || message.body || "尚无详细行动报告。",
    lastReportAtMinute: reportedAt,
    updatedAtMinute: reportedAt,
    reportSource: message.source,
    confidence: message.confidence,
    expiresAtMinute: message.expiresAtMinute,
    reportedPosition: { ...message.reportedPosition }
  };
  if (!enemy) {
    for (const key of ["morale", "comms", "strength"]) if (snapshot[key] !== undefined) result[key] = snapshot[key];
  }
  const movement = publicMovement(snapshot.movement, enemy, message);
  if (movement) result.movement = movement;
  return result;
}

function messageView(campaignId, message) {
  const fields = ["id", "type", "source", "subject", "body", "received", "availableAtMinute", "deliveredAtMinute", "location", "orderId", "orderStatus", "confidence", "expiresAtMinute", "outcome", "requiresDecision", "updatesUnitState"];
  const copy = Object.fromEntries(fields.filter((key) => message[key] !== undefined).map((key) => [key, structuredClone(message[key])]));
  if (validPosition(message.reportedPosition) && Number.isFinite(message.reportedPosition.atMinute)) {
    const { x, y, atMinute } = message.reportedPosition;
    copy.reportedPosition = { x, y, atMinute };
  }
  const snapshot = unitView(campaignId, message);
  // A report without its own recorded position must not gain one from world state.
  if (snapshot) copy.reportedUnitState = snapshot;
  return copy;
}

function eventView(campaignId, event, clockMinute) {
  if (!PUBLIC_EVENT_TYPES.has(event.type)) return null;
  const message = event.payload?.message;
  if (message && !hasArrived(message, clockMinute)) return null;
  const payload = structuredClone(event.payload || {});
  delete payload.unitState;
  delete payload.localBattles;
  delete payload.participants;
  delete payload.jobType;
  delete payload.provider;
  if (message) {
    payload.message = messageView(campaignId, message);
    const snapshot = unitView(campaignId, message);
    if (snapshot) payload.unitState = snapshot;
  }
  return { ...event, payload };
}

export function playerState(campaignId, state, clockMinute, timeline = []) {
  const messages = (state.messages || []).filter((message) => hasArrived(message, clockMinute));
  const unitStates = {};
  const latest = new Map();
  for (const message of messages) {
    const snapshot = unitView(campaignId, message);
    if (!snapshot) continue;
    const previous = latest.get(message.location);
    if (previous && (previous.atMinute > snapshot.lastReportAtMinute
      || (previous.atMinute === snapshot.lastReportAtMinute && previous.arrivedAt >= reportMinute(message)))) continue;
    latest.set(message.location, { atMinute: snapshot.lastReportAtMinute, arrivedAt: reportMinute(message) });
    unitStates[message.location] = snapshot;
  }
  return {
    units: [...(state.units || [])],
    unitStates,
    messages: messages.map((message) => messageView(campaignId, message)),
    orders: structuredClone(state.orders || []),
    objectiveProgress: state.objectiveProgress,
    battlefield: structuredClone(state.battlefield),
    lastTickMinute: state.lastTickMinute,
    timeline: timeline.map((event) => eventView(campaignId, event, clockMinute)).filter(Boolean)
  };
}

export function playerEvents(campaignId, events, clockMinute, after = 0) {
  const visible = [];
  let nextCursor = after;
  for (const event of events) {
    // Never consume a future report's sequence: later ticks would otherwise hide it forever.
    if (event.payload?.message && !hasArrived(event.payload.message, clockMinute)) break;
    nextCursor = Number(event.id);
    const projected = eventView(campaignId, event, clockMinute);
    if (projected) visible.push(projected);
  }
  visible.nextCursor = nextCursor;
  return visible;
}

export function playerEventCursor(events, clockMinute, lastSequence) {
  const pending = events.find((event) => event.payload?.message && !hasArrived(event.payload.message, clockMinute));
  return pending ? Math.min(lastSequence, Number(pending.id) - 1) : lastSequence;
}
