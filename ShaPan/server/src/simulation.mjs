import { randomUUID } from "node:crypto";
import { getUnitProfile } from "./content.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clone(value) {
  return structuredClone(value);
}

function initialBattlefield(campaignId) {
  return campaignId === "arnhem"
    ? { objectiveControl: 28, combatPower: 72, morale: 66, supply: 58, communications: 55, enemyPressure: 38, overall: 30 }
    : { objectiveControl: 52, combatPower: 68, morale: 62, supply: 60, communications: 58, enemyPressure: 42, overall: 30 };
}

function normalizeBattlefield(campaign, input = {}) {
  const fallback = initialBattlefield(campaign.id);
  const battlefield = {
    objectiveControl: clamp(input.objectiveControl ?? fallback.objectiveControl, 0, 100),
    combatPower: clamp(input.combatPower ?? fallback.combatPower, 0, 100),
    morale: clamp(input.morale ?? fallback.morale, 0, 100),
    supply: clamp(input.supply ?? fallback.supply, 0, 100),
    communications: clamp(input.communications ?? fallback.communications, 0, 100),
    enemyPressure: clamp(input.enemyPressure ?? fallback.enemyPressure, 0, 100),
    overall: 0
  };
  battlefield.overall = clamp(Math.round(
    battlefield.objectiveControl * 0.46 +
    battlefield.combatPower * 0.18 +
    battlefield.morale * 0.12 +
    battlefield.supply * 0.12 +
    battlefield.communications * 0.07 -
    battlefield.enemyPressure * 0.15
  ), 0, 100);
  return battlefield;
}

function refreshBattlefield(campaign, state) {
  state.battlefield = normalizeBattlefield(campaign, state.battlefield);
  state.enemyPressure = state.battlefield.enemyPressure;
  state.objectiveProgress = state.battlefield.overall;
  return state.battlefield;
}

function changeBattlefield(campaign, state, changes) {
  const battlefield = normalizeBattlefield(campaign, state.battlefield);
  for (const [key, delta] of Object.entries(changes)) {
    if (key in battlefield && key !== "overall") battlefield[key] = clamp(battlefield[key] + delta, 0, 100);
  }
  state.battlefield = battlefield;
  return refreshBattlefield(campaign, state);
}

function isArtilleryUnit(unitId) {
  return /art$/i.test(String(unitId || ""));
}

function isPrimaryFireMission(text, unitId) {
  const order = String(text || "");
  const mentionsFire = /炮火|炮击|火力|压制|轰击|校射|射击/.test(order);
  if (!mentionsFire) return false;
  if (isArtilleryUnit(unitId)) return true;
  const maneuverTask = /推进|前往|开进|进攻|夺取|控制|占领|固守|坚守|防御|撤退|回撤|绕行|机动|增援/.test(order);
  const explicitFireTask = /(?:实施|执行|组织|提供|呼叫|请求|开始|持续).{0,10}(?:炮击|炮火|火力压制|火力支援|轰击|校射|射击)|(?:炮击|轰击|火力压制).{0,8}(?:目标|阵地|部队)/.test(order);
  return explicitFireTask && !maneuverTask;
}

function orderImpact(campaignId, text, unitId) {
  const order = String(text || "");
  const logistics = /补给|弹药|伤员|后方|集结|运输/.test(order);
  const reconnaissance = /侦察|观察|情报|搜索/.test(order);
  const fireSupport = isPrimaryFireMission(order, unitId);
  const objective = campaignId === "arnhem" ? /桥|桥头|阿纳姆/.test(order) : /台儿庄|城|阵地|东门/.test(order);
  return {
    objectiveControl: objective ? 5 : 1,
    combatPower: fireSupport ? 2 : 1,
    morale: 3,
    supply: logistics ? 5 : 0,
    communications: reconnaissance ? 4 : 2,
    enemyPressure: fireSupport ? -3 : objective ? -1 : 0
  };
}

function orderDoctrine(campaignId, text, unitId) {
  const impact = orderImpact(campaignId, text, unitId);
  if (impact.supply > 0) return "logistics";
  if (impact.enemyPressure < 0 && impact.combatPower > 1) return "fire_support";
  if (impact.communications > 2) return "reconnaissance";
  if (impact.objectiveControl > 1) return "objective";
  return "general";
}

const doctrineLabels = {
  logistics: "补给保障",
  fire_support: "火力支援",
  reconnaissance: "侦察搜索",
  objective: "目标作战",
  general: "一般行动"
};

function positionOf(unit, fallback = { x: 50, y: 50 }) {
  const x = Number(unit?.x);
  const y = Number(unit?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : fallback;
}

function coordinateFromOrder(text) {
  const match = String(text || "").match(/(?:坐标|网格|位置)?\s*(\d{1,3}(?:\.\d+)?)\s*[,，、/]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  return { x: clamp(match[1], 3, 97), y: clamp(match[2], 3, 97) };
}

function routeLabel(campaignId, text, doctrine) {
  if (doctrine === "fire_support") return "火力目标";
  if (doctrine === "reconnaissance") return "侦察地域";
  if (doctrine === "logistics") return "补给节点";
  if (/撤|退|回撤/.test(text)) return "撤退地域";
  if (/固守|防御|坚守|保持/.test(text)) return "防御地域";
  return campaignId === "arnhem" ? "阿纳姆作战目标" : "台儿庄作战目标";
}

function impactSummary(changes) {
  const labels = { objectiveControl: "目标控制", combatPower: "战斗力", morale: "士气", supply: "补给", communications: "通信", enemyPressure: "敌军压力" };
  const parts = Object.entries(changes)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${labels[key] || key}${Number(value) > 0 ? "+" : ""}${value}`);
  return parts.length ? parts.join("，") : "态势暂未发生可确认变化";
}

function completionStatus(movement) {
  if (movement.kind === "fire_support") return "火力任务完成";
  if (movement.kind === "reconnaissance") return "已到达侦察地域";
  if (movement.kind === "logistics") return "补给节点已建立";
  if (movement.kind === "hold") return "固守中";
  if (movement.phase === "retreating") return "已撤至指定地域";
  return "已到达目标";
}

function requiresDecision(message) {
  const text = `${message?.subject || ""} ${message?.body || ""}`;
  return /请示|请求(?:批准|指示|增援)|是否|等待(?:上级)?指示|需(?:要)?决定|待确认|未决/.test(text);
}

function scaledOrderImpact(campaign, state, unitId, text, clockMinute) {
  const doctrine = orderDoctrine(campaign.id, text, unitId);
  const key = `${unitId}:${doctrine}`;
  const previous = Number(state.orderDoctrineAt?.[key] ?? -Infinity);
  const elapsed = clockMinute - previous;
  const factor = elapsed < 30 ? 0 : elapsed < 75 ? 0.35 : 1;
  state.orderDoctrineAt = { ...(state.orderDoctrineAt || {}), [key]: clockMinute };
  const impact = orderImpact(campaign.id, text, unitId);
  return Object.fromEntries(Object.entries(impact).map(([name, value]) => [name, Math.round(value * factor)]));
}

function applyOperationalRecovery(campaign, state) {
  const field = normalizeBattlefield(campaign, state.battlefield);
  return changeBattlefield(campaign, state, {
    combatPower: field.supply >= 50 ? 2 : field.supply >= 30 ? 1 : 0,
    morale: field.communications >= 50 ? 1 : 0,
    enemyPressure: field.communications >= 55 ? -2 : -1
  });
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

const routeSegments = {
  taierzhuang: {
    cn31: [{ x: 46, y: 55 }, { x: 52, y: 49 }, { x: 55, y: 46 }],
    cn30: [{ x: 29, y: 78 }, { x: 36, y: 69 }, { x: 43, y: 64 }],
    cn27: [{ x: 18, y: 35 }, { x: 27, y: 39 }, { x: 34, y: 43 }],
    jpseya: [{ x: 73, y: 44 }, { x: 67, y: 47 }, { x: 61, y: 50 }],
    jparmor: [{ x: 78, y: 61 }, { x: 71, y: 57 }, { x: 65, y: 53 }]
  },
  arnhem: {
    uk1para: [{ x: 29, y: 59 }, { x: 38, y: 56 }, { x: 46, y: 52 }],
    uk2para: [{ x: 58, y: 67 }, { x: 65, y: 71 }, { x: 75, y: 76 }],
    deinf: [{ x: 70, y: 50 }, { x: 73, y: 59 }, { x: 75, y: 68 }],
    de9ss: [{ x: 79, y: 66 }, { x: 77, y: 71 }, { x: 75, y: 76 }]
  }
};

function interpolateRoute(points, progress) {
  if (!points?.length) return null;
  if (points.length === 1) return { ...points[0], segment: 0, progress: 1 };
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (points.length - 1);
  const segment = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - segment;
  const from = points[segment];
  const to = points[segment + 1];
  return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local, segment, progress: clamped };
}

function routeForOrder(campaignId, unit, text) {
  const normalized = String(text || "");
  const current = positionOf(unit);
  const anchors = campaignId === "arnhem"
    ? { bridge: { x: 75, y: 76 }, north: { x: 66, y: 38 }, west: { x: 42, y: 57 }, retreat: { x: 30, y: 68 } }
    : { city: { x: 52, y: 49 }, east: { x: 67, y: 36 }, west: { x: 34, y: 43 }, retreat: { x: 28, y: 68 } };
  const coordinate = coordinateFromOrder(normalized);
  const target = coordinate || (/撤|退|回撤/.test(normalized) ? anchors.retreat
    : campaignId === "arnhem" && /北|北侧|北岸/.test(normalized) ? anchors.north
    : campaignId === "arnhem" && /桥|桥头|阿纳姆/.test(normalized) ? anchors.bridge
    : campaignId === "arnhem" ? anchors.west
    : /东/.test(normalized) ? anchors.east
    : /西|阻击|牵制/.test(normalized) ? anchors.west
    : anchors.city);
  if (Math.hypot(current.x - target.x, current.y - target.y) < 0.5) return [current];
  const direction = unit?.id?.charCodeAt?.(0) % 2 ? 1 : -1;
  const mid = {
    x: clamp((current.x + target.x) / 2 + direction * Math.min(3, Math.abs(target.y - current.y) * 0.08), 2, 98),
    y: clamp((current.y + target.y) / 2 - direction * Math.min(3, Math.abs(target.x - current.x) * 0.08), 2, 98)
  };
  return [current, mid, target];
}

function movementForOrder(campaignId, unitId, currentState, text, clockMinute, priority) {
  const doctrine = orderDoctrine(campaignId, text, unitId);
  const fallback = movementRoutes[campaignId]?.[unitId]?.from || { x: 50, y: 50 };
  const current = positionOf(currentState, fallback);
  const route = routeForOrder(campaignId, { id: unitId, ...currentState, ...current }, text);
  const target = route.at(-1) || current;
  const relocation = /机动|转移|前移|推进|前往|开进|撤|退|回撤/.test(text);
  const fireMission = doctrine === "fire_support" && !relocation;
  const holding = /固守|防御|坚守|保持|待命/.test(text) && route.length === 1;
  return {
    from: current,
    to: target,
    route: fireMission ? [current, target] : route,
    label: routeLabel(campaignId, text, doctrine),
    kind: fireMission ? "fire_support" : doctrine === "reconnaissance" ? "reconnaissance" : doctrine === "logistics" ? "logistics" : holding ? "hold" : "order",
    confidence: "已确认",
    startedAtMinute: clockMinute,
    durationMinutes: priority === "urgent" ? 18 : 30,
    progress: 0,
    phase: fireMission ? "firing" : holding ? "halted" : /撤|退|回撤/.test(text) ? "retreating" : "moving",
    updatedAtMinute: clockMinute
  };
}

function updateUnitMovements(campaign, state, clockMinute) {
  for (const [unitId, unitState] of Object.entries(state.unitStates)) {
    const movement = unitState.movement;
    if (!movement?.route?.length || typeof movement.startedAtMinute !== "number") continue;
    const duration = Math.max(1, Number(movement.durationMinutes || 30));
    if (movement.kind === "fire_support" || movement.kind === "hold") {
      const progress = clamp((clockMinute - movement.startedAtMinute) / duration, 0, 1);
      const phase = movement.kind === "fire_support" && progress < 1 ? "firing" : movement.kind === "hold" ? "halted" : "completed";
      state.unitStates[unitId] = { ...unitState, status: progress >= 1 ? completionStatus(movement) : unitState.status, movement: { ...movement, progress, phase } };
      continue;
    }
    const position = interpolateRoute(movement.route, (clockMinute - movement.startedAtMinute) / duration);
    if (!position) continue;
    const activePhase = movement.phase === "retreating" && position.progress < 1 ? "retreating" : movement.phase === "engaged" ? "engaged" : position.progress >= 1 ? "completed" : "moving";
    state.unitStates[unitId] = { ...unitState, x: position.x, y: position.y, status: position.progress >= 1 && movement.phase !== "engaged" ? completionStatus(movement) : unitState.status, movement: { ...movement, progress: position.progress, segment: position.segment, phase: activePhase } };
  }
}

function movementFor(campaignId, unitId, clockMinute, enemy, currentState = {}) {
  const route = movementRoutes[campaignId]?.[unitId];
  if (!route) return null;
  const current = positionOf(currentState, route.from);
  const routePoints = [current, route.to];
  return {
    from: current,
    to: route.to,
    route: routePoints,
    label: route.label,
    kind: enemy ? "intel" : "order",
    confidence: enemy ? "推定" : "已确认",
    startedAtMinute: clockMinute,
    durationMinutes: enemy ? 36 : 30,
    progress: 0,
    phase: "moving",
    updatedAtMinute: clockMinute
  };
}

export function normalizeWorldState(campaign, input = {}) {
  const lastTickMinute = Number(input.lastTickMinute ?? campaign.startMinute);
  const state = {
    units: Array.isArray(input.units) ? input.units : campaign.units,
    unitStates: input.unitStates && typeof input.unitStates === "object" ? input.unitStates : {},
    contacts: Array.isArray(input.contacts) ? input.contacts : [],
    messages: Array.isArray(input.messages) ? input.messages : [],
    orders: Array.isArray(input.orders) ? input.orders : [],
    lastTickMinute,
    // objectiveProgress is a derived, player-facing overall posture.
    objectiveProgress: clamp(input.objectiveProgress ?? 30, 0, 100),
    nextAgentMinute: Number(input.nextAgentMinute ?? Math.max(campaign.startMinute + 10, lastTickMinute + 1)),
    agentCursor: Number(input.agentCursor ?? 0),
    enemyPressure: clamp(input.enemyPressure ?? 0, 0, 100),
    battlefield: normalizeBattlefield(campaign, input.battlefield),
    orderDoctrineAt: input.orderDoctrineAt && typeof input.orderDoctrineAt === "object" ? input.orderDoctrineAt : {},
    localBattles: input.localBattles && typeof input.localBattles === "object" ? input.localBattles : {},
    decisiveSinceMinute: input.decisiveSinceMinute !== null && input.decisiveSinceMinute !== undefined && Number.isFinite(Number(input.decisiveSinceMinute)) ? Number(input.decisiveSinceMinute) : null,
    collapseSinceMinute: input.collapseSinceMinute !== null && input.collapseSinceMinute !== undefined && Number.isFinite(Number(input.collapseSinceMinute)) ? Number(input.collapseSinceMinute) : null
  };
  refreshBattlefield(campaign, state);
  return state;
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
  const battlefield = refreshBattlefield(campaign, state);
  const decisive = battlefield.objectiveControl >= 65 && battlefield.combatPower >= 45 && battlefield.supply >= 35 && battlefield.enemyPressure <= 65;
  const collapse = battlefield.objectiveControl <= 18 || battlefield.combatPower <= 18 || battlefield.morale <= 18 || battlefield.supply <= 12;
  state.decisiveSinceMinute = decisive ? (state.decisiveSinceMinute ?? clockMinute) : null;
  state.collapseSinceMinute = collapse ? (state.collapseSinceMinute ?? clockMinute) : null;
  if (collapse && clockMinute - state.collapseSinceMinute >= 30) return "lost";
  if (campaign.victoryMode !== "hold_until_deadline" && decisive && clockMinute - state.decisiveSinceMinute >= 45) return "won";
  if (clockMinute < campaign.deadlineMinute) return null;
  return battlefield.objectiveControl >= 55 && battlefield.combatPower >= 40 && battlefield.supply >= 30 ? "won" : "lost";
}

export function advanceWorld(campaign, worldState, { clockMinute, dueOrders = [] }) {
  const state = normalizeWorldState(campaign, worldState);
  updateUnitMovements(campaign, state, clockMinute);
  const startingProgress = state.objectiveProgress;
  const messages = [];
  const events = [];
  const jobs = [];
  const deliveredOrderIds = [];
  const knownMessageIds = new Set(state.messages.map((message) => message.id));

  // A local battle coordinator is created when known friendly and enemy
  // positions enter the same tactical area. It receives only the two units'
  // known state and reports an aggregated situation back through normal jobs.
  const friendly = campaign.units.map((id) => getUnitProfile(campaign.id, id));
  const enemyUnits = campaign.enemyUnits.map((id) => getUnitProfile(campaign.id, id));
  for (const own of friendly) {
    const ownState = state.unitStates[own.id];
    if (typeof ownState?.x !== "number" || typeof ownState?.y !== "number") continue;
    for (const hostile of enemyUnits) {
      const hostileState = state.unitStates[hostile.id];
      if (typeof hostileState?.x !== "number" || typeof hostileState?.y !== "number") continue;
      const distance = Math.hypot(ownState.x - hostileState.x, ownState.y - hostileState.y);
      const battleId = [own.id, hostile.id].sort().join(":");
      const lastReportedAt = Number(state.localBattles[battleId]?.lastReportedAt ?? -Infinity);
      // A local commander reports material changes, not every simulation tick.
      if (distance > 9 || clockMinute - lastReportedAt < 30) continue;
      state.localBattles[battleId] = { id: battleId, unitIds: [own.id, hostile.id], x: (ownState.x + hostileState.x) / 2, y: (ownState.y + hostileState.y) / 2, lastReportedAt: clockMinute };
      jobs.push({ id: randomUUID(), jobType: "local_battle", input: { campaignId: campaign.id, clockMinute, objective: campaign.objective, battleId, participants: [{ ...getUnitProfile(campaign.id, own.id), knownState: { status: ownState.status, x: ownState.x, y: ownState.y, morale: ownState.morale } }, { ...hostile, knownState: { status: hostileState.status, x: hostileState.x, y: hostileState.y, morale: hostileState.morale } }] } });
    }
  }

  for (const report of campaign.reports ?? []) {
    if (report.availableAtMinute > clockMinute || knownMessageIds.has(report.id)) continue;
    const message = {
      ...report,
      deliveredAtMinute: report.availableAtMinute,
      generatedBy: "scenario",
      confidence: report.type === "intel" ? "estimated" : "confirmed",
      expiresAtMinute: report.availableAtMinute + (report.type === "intel" ? 120 : 360),
      requiresDecision: requiresDecision(report)
    };
    state.messages.unshift(message);
    knownMessageIds.add(message.id);
    messages.push(message);
    events.push({ type: "REPORT_RECEIVED", payload: { message } });
    changeBattlefield(campaign, state, report.type === "intel"
      ? { communications: 2 }
      : { morale: 1, communications: 1 });
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
        knownContext: { ownState: state.unitStates[friendlyId] || null }
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
        knownContext: { ownState: state.unitStates[enemyId] || null }
      }
    });
    state.nextAgentMinute = clockMinute + Number(campaign.agentIntervalMinutes || 15);
    state.agentCursor += 1;
    applyOperationalRecovery(campaign, state);
    events.push({ type: "AGENT_CYCLE_SCHEDULED", payload: { friendlyId, enemyId } });
  }

  state.messages = state.messages.slice(0, 200);
  state.lastTickMinute = clockMinute;
  const status = objectiveStatus(campaign, state, clockMinute);
  events.push({ type: "OBJECTIVE_UPDATED", payload: { progress: state.objectiveProgress, delta: state.objectiveProgress - startingProgress, battlefield: state.battlefield, status } });
  return { state, messages, events, jobs, deliveredOrderIds, status };
}

export function applyAgentDecision(campaign, worldState, job, decision, clockMinute) {
  const state = normalizeWorldState(campaign, worldState);
  const startingProgress = state.objectiveProgress;
  if (job.jobType === "local_battle") {
    const friendly = job.input.participants?.find((participant) => participant.side === "friendly");
    const battle = state.localBattles[job.input.battleId] || {};
    // Contact is costly, but it is not a predetermined loss. The local commander
    // affects readiness and pressure at a controlled cadence; the player sees its report.
    changeBattlefield(campaign, state, { combatPower: -1, morale: -1, enemyPressure: 1 });
    if (friendly?.id) {
      const friendlyState = state.unitStates[friendly.id] || {};
      state.unitStates[friendly.id] = {
        ...friendlyState,
        status: "局部交战",
        summary: decision.summary || friendlyState.summary,
        morale: decision.morale || friendlyState.morale,
        comms: decision.comms || friendlyState.comms,
        movement: friendlyState.movement ? { ...friendlyState.movement, phase: "engaged", updatedAtMinute: clockMinute } : friendlyState.movement,
        lastReportAtMinute: clockMinute
      };
    }
    const message = {
      id: `battle-${job.id}`,
      type: "urgent",
      source: `${friendly?.name || "前沿部队"}电台`,
      subject: decision.subject,
      body: decision.body,
      deliveredAtMinute: clockMinute,
      availableAtMinute: clockMinute + 3,
      location: friendly?.id,
      generatedBy: decision.provider ?? "fallback",
      confidence: "confirmed",
      expiresAtMinute: clockMinute + 90,
      outcome: "局部战局指挥组回传",
      requiresDecision: requiresDecision(decision)
    };
    state.messages.unshift(message);
    state.messages = state.messages.slice(0, 200);
    const status = objectiveStatus(campaign, state, clockMinute);
    return { state, message, status, objectiveProgress: state.objectiveProgress, objectiveDelta: state.objectiveProgress - startingProgress, battlefield: state.battlefield };
  }
  const unit = job.input.unit ?? getUnitProfile(campaign.id, decision.unitId);
  const enemy = job.jobType === "enemy_action";
  const orderResponse = job.jobType === "order_response";
  const unitId = unit.id;
  const currentState = state.unitStates[unitId] ?? {};
  const defaultPosition = movementRoutes[campaign.id]?.[unitId]?.from || positionOf(unit);
  const orderText = String(job.input.order?.text || "");
  const reportedContact = /交战|接敌|受阻|遭到射击/.test(String(decision.status || "")) || /交战|接敌|受阻|遭到射击/.test(String(decision.body || ""));
  const activeLocalBattle = Object.values(state.localBattles || {}).some((battle) =>
    Array.isArray(battle?.unitIds) && battle.unitIds.includes(unitId) && clockMinute - Number(battle.lastReportedAt ?? -Infinity) <= 45
  );
  const engaged = reportedContact && activeLocalBattle;
  const jobMinute = Number(job.input.clockMinute ?? clockMinute);
  const latestOrderMinute = Math.max(-Infinity, ...state.orders
    .filter((order) => order.recipientId === unitId)
    .map((order) => Number(order.sentAtMinute ?? -Infinity)));
  const orderMinute = Number(job.input.order?.sentAtMinute ?? clockMinute);
  const supersededOrder = orderResponse && latestOrderMinute > orderMinute;
  const staleAutonomy = !orderResponse && Number(currentState.updatedAtMinute ?? -Infinity) > jobMinute;
  const preserveCommandStatus = !orderResponse && currentState.movement && currentState.movement.kind !== "intel";
  let changes;
  if (enemy) {
    changes = { objectiveControl: -1, combatPower: -1, morale: -1, enemyPressure: 2 };
  } else if (orderResponse) {
    changes = scaledOrderImpact(campaign, state, unitId, orderText, clockMinute);
  } else {
    changes = { objectiveControl: 1, morale: 1, communications: 1, enemyPressure: -1 };
  }
  const battlefieldBefore = { ...state.battlefield };
  changeBattlefield(campaign, state, changes);
  const appliedChanges = Object.fromEntries(Object.keys(changes).map((key) => [key, Number(state.battlefield[key] ?? 0) - Number(battlefieldBefore[key] ?? 0)]));

  const currentPosition = positionOf(currentState, defaultPosition);
  let movement = currentState.movement ?? null;
  if (orderResponse && !supersededOrder) movement = movementForOrder(campaign.id, unitId, { ...currentState, ...currentPosition }, orderText, clockMinute, job.input.order?.priority);
  else if (!orderResponse && !movement && !staleAutonomy) movement = movementFor(campaign.id, unitId, clockMinute, enemy, currentState);
  if (engaged && movement && movement.kind !== "fire_support") movement = { ...movement, phase: "engaged" };

  const intelligenceReport = enemy ? {
    subject: `${unit.name}活动情报更新`,
    body: `战区情报官综合前沿观察与截获片段研判：${unit.name}在${movement?.label || "当前地域"}附近出现活动迹象，可能正在${unit.role || "调整部署"}。其番号、兵力、状态与真实意图尚未证实；地图位置仅为当前推定，需以后续侦察继续复核。`,
    status: "活动迹象",
    summary: `${unit.name}的行动方向尚在研判，现有位置属于情报推定。`,
    morale: "不明",
    comms: "情报推定"
  } : null;
  const reportedStatus = reportedContact && !activeLocalBattle
    ? orderResponse ? movement?.kind === "fire_support" ? "执行火力任务" : movement?.kind === "hold" ? "固守中" : "执行中" : "自主行动"
    : decision.status;

  state.unitStates[unitId] = {
    ...currentState,
    x: currentPosition.x,
    y: currentPosition.y,
    status: staleAutonomy || supersededOrder || preserveCommandStatus ? currentState.status : intelligenceReport?.status || reportedStatus,
    summary: staleAutonomy || supersededOrder ? currentState.summary : intelligenceReport?.summary || decision.summary,
    morale: staleAutonomy || supersededOrder ? currentState.morale : intelligenceReport?.morale || decision.morale,
    comms: staleAutonomy || supersededOrder ? currentState.comms : intelligenceReport?.comms || decision.comms,
    updatedAtMinute: staleAutonomy || supersededOrder ? currentState.updatedAtMinute : clockMinute,
    lastReportAtMinute: staleAutonomy || supersededOrder ? currentState.lastReportAtMinute : clockMinute,
    lastOrderSentAtMinute: orderResponse && !supersededOrder ? orderMinute : currentState.lastOrderSentAtMinute,
    movement
  };

  const doctrine = orderResponse ? orderDoctrine(campaign.id, orderText, unitId) : null;
  const outcome = supersededOrder
    ? "该军令回报已被更新军令替代，未改写当前行动路线"
    : staleAutonomy
      ? "迟到的自主回报仅归档，未改写当前部队位置"
      : orderResponse
        ? `${doctrineLabels[doctrine] || "军令"}已生效 · ${impactSummary(appliedChanges)}`
        : enemy ? "敌情推定，位置将随情报时效衰减" : "部队自主行动回报";

  const message = {
    id: `agent-${job.id}`,
    type: enemy ? "intel" : orderResponse && job.input.order?.priority === "urgent" ? "urgent" : "normal",
    source: enemy ? "战区情报汇总" : unit.name,
    subject: intelligenceReport?.subject || decision.subject,
    body: intelligenceReport?.body || decision.body,
    received: null,
    deliveredAtMinute: clockMinute,
    availableAtMinute: clockMinute,
    location: unitId,
    generatedBy: decision.provider ?? "fallback",
    orderId: job.input.order?.id ?? null,
    confidence: enemy ? "estimated" : "confirmed",
    expiresAtMinute: clockMinute + (enemy ? 90 : 360),
    outcome,
    requiresDecision: requiresDecision(decision)
  };
  state.messages.unshift(message);
  state.messages = state.messages.slice(0, 200);
  const status = objectiveStatus(campaign, state, clockMinute);
  return { state, message, status, objectiveProgress: state.objectiveProgress, objectiveDelta: state.objectiveProgress - startingProgress, battlefield: state.battlefield };
}
