import { randomUUID } from "node:crypto";
import { getUnitProfile } from "./content.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clone(value) {
  return structuredClone(value);
}

export function normalizeWorldState(campaign, input = {}) {
  const lastTickMinute = Number(input.lastTickMinute ?? campaign.startMinute);
  return {
    units: Array.isArray(input.units) ? input.units : campaign.units,
    unitStates: input.unitStates && typeof input.unitStates === "object" ? input.unitStates : {},
    contacts: Array.isArray(input.contacts) ? input.contacts : [],
    messages: Array.isArray(input.messages) ? input.messages : [],
    orders: Array.isArray(input.orders) ? input.orders : [],
    lastTickMinute,
    objectiveProgress: clamp(input.objectiveProgress ?? 30, 0, 100),
    nextAgentMinute: Number(input.nextAgentMinute ?? Math.max(campaign.startMinute + 10, lastTickMinute + 1)),
    agentCursor: Number(input.agentCursor ?? 0),
    enemyPressure: clamp(input.enemyPressure ?? 0, 0, 100)
  };
}

export function createInitialWorldState(campaign) {
  return normalizeWorldState(campaign, { lastTickMinute: campaign.startMinute, nextAgentMinute: campaign.startMinute + 10 });
}

export function recordOrder(worldState, order) {
  const state = clone(worldState);
  state.orders = [order, ...state.orders.filter((item) => item.id !== order.id)].slice(0, 100);
  return state;
}

function objectiveStatus(campaign, state, clockMinute) {
  if (clockMinute < campaign.deadlineMinute) return null;
  return state.objectiveProgress >= 50 ? "won" : "lost";
}

export function advanceWorld(campaign, worldState, { clockMinute, dueOrders = [] }) {
  const state = normalizeWorldState(campaign, worldState);
  const messages = [];
  const events = [];
  const jobs = [];
  const deliveredOrderIds = [];
  const knownMessageIds = new Set(state.messages.map((message) => message.id));

  for (const report of campaign.reports ?? []) {
    if (report.availableAtMinute > clockMinute || knownMessageIds.has(report.id)) continue;
    const message = { ...report, deliveredAtMinute: report.availableAtMinute, generatedBy: "scenario" };
    state.messages.unshift(message);
    knownMessageIds.add(message.id);
    messages.push(message);
    events.push({ type: "REPORT_RECEIVED", payload: { message } });
    state.objectiveProgress = clamp(state.objectiveProgress + (report.type === "intel" ? 1 : 2), 0, 100);
  }

  for (const order of dueOrders) {
    deliveredOrderIds.push(order.id);
    state.orders = state.orders.map((item) => item.id === order.id ? { ...item, status: "delivered", deliveredAtMinute: clockMinute } : item);
    events.push({ type: "ORDER_DELIVERED", payload: { order: { ...order, status: "delivered", deliveredAtMinute: clockMinute } } });
    jobs.push({
      id: randomUUID(),
      jobType: "order_response",
      input: {
        campaignId: campaign.id,
        clockMinute,
        objective: campaign.objective,
        order,
        unit: getUnitProfile(campaign.id, order.recipientId)
      }
    });
  }

  if (clockMinute < campaign.deadlineMinute && clockMinute >= state.nextAgentMinute) {
    const friendlyId = campaign.units[state.agentCursor % campaign.units.length];
    const enemyId = campaign.enemyUnits[state.agentCursor % campaign.enemyUnits.length];
    jobs.push({
      id: randomUUID(),
      jobType: "unit_autonomy",
      input: {
        campaignId: campaign.id,
        clockMinute,
        objective: campaign.objective,
        unit: getUnitProfile(campaign.id, friendlyId),
        world: { objectiveProgress: state.objectiveProgress, enemyPressure: state.enemyPressure }
      }
    });
    jobs.push({
      id: randomUUID(),
      jobType: "enemy_action",
      input: {
        campaignId: campaign.id,
        clockMinute,
        objective: campaign.objective,
        unit: getUnitProfile(campaign.id, enemyId),
        world: { objectiveProgress: state.objectiveProgress, enemyPressure: state.enemyPressure }
      }
    });
    state.nextAgentMinute = clockMinute + Number(campaign.agentIntervalMinutes || 15);
    state.agentCursor += 1;
    events.push({ type: "AGENT_CYCLE_SCHEDULED", payload: { friendlyId, enemyId } });
  }

  state.messages = state.messages.slice(0, 200);
  state.lastTickMinute = clockMinute;
  const status = objectiveStatus(campaign, state, clockMinute);
  events.push({ type: "OBJECTIVE_UPDATED", payload: { progress: state.objectiveProgress, status } });
  return { state, messages, events, jobs, deliveredOrderIds, status };
}

export function applyAgentDecision(campaign, worldState, job, decision, clockMinute) {
  const state = normalizeWorldState(campaign, worldState);
  const unit = job.input.unit ?? getUnitProfile(campaign.id, decision.unitId);
  const enemy = job.jobType === "enemy_action";
  const orderResponse = job.jobType === "order_response";
  const unitId = unit.id;
  const objectiveDelta = enemy ? -3 : orderResponse ? 5 : 2;
  state.objectiveProgress = clamp(state.objectiveProgress + objectiveDelta, 0, 100);
  state.enemyPressure = clamp(state.enemyPressure + (enemy ? 5 : -1), 0, 100);
  state.unitStates[unitId] = {
    ...(state.unitStates[unitId] ?? {}),
    status: decision.status,
    summary: decision.summary,
    morale: decision.morale,
    comms: decision.comms,
    updatedAtMinute: clockMinute
  };

  const message = {
    id: `agent-${job.id}`,
    type: enemy ? "intel" : orderResponse && job.input.order?.priority === "urgent" ? "urgent" : "normal",
    source: enemy ? "战区情报汇总" : unit.name,
    subject: decision.subject,
    body: decision.body,
    received: null,
    deliveredAtMinute: clockMinute,
    availableAtMinute: clockMinute,
    location: unitId,
    generatedBy: decision.provider ?? "fallback",
    orderId: job.input.order?.id ?? null
  };
  state.messages.unshift(message);
  state.messages = state.messages.slice(0, 200);
  const status = objectiveStatus(campaign, state, clockMinute);
  return { state, message, status, objectiveProgress: state.objectiveProgress };
}
