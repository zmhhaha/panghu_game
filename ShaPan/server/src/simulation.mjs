import { randomUUID } from "node:crypto";
import { getUnitProfile } from "./content.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clone(value) {
  return structuredClone(value);
}

const movementRoutes = {
  taierzhuang: {
    cn31: { from: { x: 46, y: 55 }, to: { x: 52, y: 49 }, label: "东门防御" },
    cn30: { from: { x: 29, y: 78 }, to: { x: 43, y: 64 }, label: "增援台儿庄" },
    cn27: { from: { x: 18, y: 35 }, to: { x: 34, y: 43 }, label: "牵制西北" },
    cnart: { from: { x: 77, y: 25 }, to: { x: 66, y: 36 }, label: "火力支援" },
    cnreserve: { from: { x: 78, y: 69 }, to: { x: 67, y: 58 }, label: "预备队机动" },
    jpseya: { from: { x: 73, y: 44 }, to: { x: 61, y: 50 }, label: "城东突击" },
    jparmor: { from: { x: 78, y: 61 }, to: { x: 65, y: 53 }, label: "战车突进" }
  },
  arnhem: {
    uk1para: { from: { x: 29, y: 59 }, to: { x: 46, y: 52 }, label: "向桥区推进" },
    uk2para: { from: { x: 58, y: 67 }, to: { x: 75, y: 76 }, label: "保持桥头" },
    ukairland: { from: { x: 20, y: 72 }, to: { x: 35, y: 61 }, label: "机降部队集结" },
    ukrecon: { from: { x: 49, y: 55 }, to: { x: 62, y: 48 }, label: "侦察支路" },
    ukart: { from: { x: 17, y: 39 }, to: { x: 32, y: 43 }, label: "炮兵跟进" },
    deinf: { from: { x: 70, y: 50 }, to: { x: 75, y: 68 }, label: "桥区增援" },
    de9ss: { from: { x: 79, y: 66 }, to: { x: 75, y: 76 }, label: "装甲机动" }
  }
};

function movementFor(campaignId, unitId, clockMinute, enemy) {
  const route = movementRoutes[campaignId]?.[unitId];
  if (!route) return null;
  return {
    from: route.from,
    to: route.to,
    label: route.label,
    kind: enemy ? "intel" : "order",
    confidence: enemy ? "推定" : "已确认",
    updatedAtMinute: clockMinute
  };
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
  const startingProgress = state.objectiveProgress;
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
  events.push({ type: "OBJECTIVE_UPDATED", payload: { progress: state.objectiveProgress, delta: state.objectiveProgress - startingProgress, status } });
  return { state, messages, events, jobs, deliveredOrderIds, status };
}

export function applyAgentDecision(campaign, worldState, job, decision, clockMinute) {
  const state = normalizeWorldState(campaign, worldState);
  const startingProgress = state.objectiveProgress;
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
    updatedAtMinute: clockMinute,
    movement: movementFor(campaign.id, unitId, clockMinute, enemy)
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
  return { state, message, status, objectiveProgress: state.objectiveProgress, objectiveDelta: state.objectiveProgress - startingProgress };
}
