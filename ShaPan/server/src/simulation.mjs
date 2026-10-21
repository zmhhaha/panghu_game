import { randomUUID } from "node:crypto";
import { getUnitProfile } from "./content.mjs";
import { campaignMap, initialPosition, MAP_VERSION, mapDistance, planMapRoute, targetForOrder } from "./map-anchors.mjs";

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
  // A map click appends an explicit target; it overrides older coordinates in prose.
  const instruction = String(text || "").split(/地图目标[:：]/).at(-1) || "";
  const match = instruction.match(/(?:坐标|网格|位置)?\s*(\d{1,3}(?:\.\d+)?)\s*[,，、/]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  return { x: clamp(match[1], 0, 100), y: clamp(match[2], 0, 100) };
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

function interpolateRoute(points, progress) {
  if (!points?.length) return null;
  if (points.length === 1) return { ...points[0], segment: 0, progress: 1 };
  const clamped = Math.min(1, Math.max(0, progress));
  const lengths = points.slice(1).map((point, index) => mapDistance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!total) return { ...points.at(-1), segment: points.length - 2, progress: clamped };
  let distance = total * clamped;
  let segment = 0;
  while (segment < lengths.length - 1 && distance > lengths[segment]) distance -= lengths[segment++];
  const local = lengths[segment] ? distance / lengths[segment] : 1;
  const from = points[segment];
  const to = points[segment + 1];
  return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local, segment, progress: clamped };
}

function reportSnapshot(campaign, state, unitId, atMinute, { updatesUnitState = true, summary, status } = {}) {
  const profile = getUnitProfile(campaign.id, unitId);
  let known = state.unitStates[unitId] || {};
  if (Number(known.updatedAtMinute ?? -Infinity) > atMinute) {
    // A scenario report delivered late must not borrow a state learned afterwards.
    const previous = state.messages
      .filter((message) => message.location === unitId && message.reportedUnitState && Number(message.reportedPosition?.atMinute) <= atMinute)
      .sort((left, right) => right.reportedPosition.atMinute - left.reportedPosition.atMinute)[0];
    known = previous?.reportedUnitState || {};
  }
  let position = positionOf(known, initialPosition(campaign.id, unitId));
  const movement = known.movement;
  if (movement?.route?.length && Number(movement.startedAtMinute) <= atMinute && !movement.blocked && !["engaged", "delayed"].includes(movement.phase) && !["fire_support", "hold"].includes(movement.kind)) {
    const interpolated = interpolateRoute(movement.route, (atMinute - movement.startedAtMinute) / Math.max(1, Number(movement.durationMinutes || 30)));
    if (interpolated) position = { x: interpolated.x, y: interpolated.y };
  }
  const enemy = profile.side === "enemy";
  const reportedMovement = enemy
    ? { kind: "intel", confidence: "推定", updatedAtMinute: atMinute }
    : movement ? clone(movement) : null;
  return {
    updatesUnitState,
    reportedPosition: { ...position, atMinute },
    reportedUnitState: {
      ...position,
      status: status || known.status || (enemy ? "敌情待核" : "已回报"),
      summary: summary || known.summary || profile.role || "暂无详细报告",
      morale: enemy ? "不明" : known.morale || "尚未报告",
      comms: enemy ? "情报推定" : known.comms || "报文已送达",
      movement: reportedMovement,
      lastReportAtMinute: atMinute
    }
  };
}

function queueArrivalReport(campaign, state, unitId, movement, atMinute) {
  const unit = getUnitProfile(campaign.id, unitId);
  if (unit.side !== "friendly") return;
  const channel = movement.reportChannel || "radio";
  const channelName = { radio: "电台", phone: "电话", courier: "通信员", underground: "联络员" }[channel] || "电台";
  const delay = Math.max(1, Number(movement.reportDelayMinutes) || (channel === "courier" ? 35 : 12));
  const position = positionOf(state.unitStates[unitId], movement.to);
  const grid = `${Math.round(position.x)},${Math.round(position.y)}`;
  const label = movement.label || "指定地域";
  const summary = movement.holdOnArrival ? `已抵达${label}，开始组织防御。` : `已抵达${label}，等待后续指示。`;
  state.pendingMovementReports.push({
    id: `arrival-${randomUUID()}`,
    type: "normal",
    source: `${unit.name}${channelName}`,
    subject: movement.holdOnArrival ? "已抵达目标，转入固守" : "已抵达指定目标",
    body: `${summary}本部位置为网格 ${grid}。本报经${channelName}回传。`,
    received: null,
    deliveredAtMinute: atMinute + delay,
    availableAtMinute: atMinute + delay,
    location: unitId,
    orderId: movement.orderId || null,
    generatedBy: "simulation",
    confidence: "confirmed",
    expiresAtMinute: atMinute + 360,
    outcome: movement.holdOnArrival ? "军令结果：抵达目标并转入防御" : "军令结果：行军完成",
    requiresDecision: false,
    ...reportSnapshot(campaign, state, unitId, atMinute, { summary, status: movement.holdOnArrival ? "固守中" : completionStatus(movement) })
  });
}

function movementForOrder(campaignId, unitId, currentState, text, clockMinute, priority) {
  const doctrine = orderDoctrine(campaignId, text, unitId);
  const current = positionOf(currentState, initialPosition(campaignId, unitId));
  const relocation = /机动|转移|前移|推进|前往|开进|撤|退|回撤/.test(text);
  const fireMission = doctrine === "fire_support" && !relocation;
  const holdHere = !relocation && /原地|就地|保持位置|待命/.test(text);
  const target = holdHere ? current : targetForOrder(campaignId, unitId, text, coordinateFromOrder(text));
  const planned = fireMission && target
    ? { reachable: true, points: [current, target], anchorIds: [], targetAnchorId: target?.id, distance: 0 }
    : planMapRoute(campaignId, current, target);
  const holding = planned.reachable && /固守|防御|坚守|保持|待命/.test(text) && planned.points.length === 1;
  return {
    from: current,
    to: target ? { x: target.x, y: target.y } : current,
    route: planned.points,
    routeAnchorIds: planned.anchorIds,
    targetAnchorId: planned.targetAnchorId || null,
    mapVersion: MAP_VERSION,
    routeDistance: planned.distance,
    blocked: !planned.reachable,
    blockedReason: planned.reason || null,
    holdOnArrival: /固守|防御|坚守|保持/.test(text),
    label: target?.label || routeLabel(campaignId, text, doctrine),
    kind: fireMission ? "fire_support" : doctrine === "reconnaissance" ? "reconnaissance" : doctrine === "logistics" ? "logistics" : holding ? "hold" : "order",
    confidence: "已确认",
    startedAtMinute: clockMinute,
    durationMinutes: fireMission ? (priority === "urgent" ? 12 : 20) : Math.max(6, Math.ceil(planned.distance / (priority === "urgent" ? 1.2 : 0.9))),
    progress: 0,
    phase: !planned.reachable ? "delayed" : fireMission ? "firing" : holding ? "halted" : /撤|退|回撤/.test(text) ? "retreating" : "moving",
    updatedAtMinute: clockMinute
  };
}

function updateUnitMovements(campaign, state, clockMinute) {
  for (const [unitId, unitState] of Object.entries(state.unitStates)) {
    const movement = unitState.movement;
    if (!movement?.route?.length || typeof movement.startedAtMinute !== "number") continue;
    const duration = Math.max(1, Number(movement.durationMinutes || 30));
    if (movement.blocked || movement.phase === "engaged" || movement.phase === "delayed") {
      state.unitStates[unitId] = { ...unitState, movement: { ...movement, startedAtMinute: clockMinute - Number(movement.progress || 0) * duration, updatedAtMinute: clockMinute } };
      continue;
    }
    if (movement.kind === "fire_support" || movement.kind === "hold") {
      const progress = clamp((clockMinute - movement.startedAtMinute) / duration, 0, 1);
      const phase = movement.kind === "fire_support" && progress < 1 ? "firing" : movement.kind === "hold" ? "halted" : "completed";
      state.unitStates[unitId] = { ...unitState, status: progress >= 1 ? completionStatus(movement) : unitState.status, movement: { ...movement, progress, phase, updatedAtMinute: clockMinute } };
      continue;
    }
    const position = interpolateRoute(movement.route, (clockMinute - movement.startedAtMinute) / duration);
    if (!position) continue;
    const justArrived = position.progress >= 1 && ["moving", "retreating"].includes(movement.phase) && !movement.arrivalReported;
    const holdAtTarget = position.progress >= 1 && movement.holdOnArrival;
    const activePhase = holdAtTarget ? "halted" : movement.phase === "retreating" && position.progress < 1 ? "retreating" : position.progress >= 1 ? "completed" : "moving";
    state.unitStates[unitId] = {
      ...unitState,
      x: position.x,
      y: position.y,
      status: holdAtTarget ? "固守中" : position.progress >= 1 ? completionStatus(movement) : unitState.status,
      movement: { ...movement, kind: holdAtTarget ? "hold" : movement.kind, progress: position.progress, segment: position.segment, phase: activePhase, arrivalReported: movement.arrivalReported || justArrived, updatedAtMinute: clockMinute }
    };
    if (justArrived) queueArrivalReport(campaign, state, unitId, state.unitStates[unitId].movement, Math.min(clockMinute, Math.ceil(movement.startedAtMinute + duration)));
  }
}

function movementFor(campaignId, unitId, clockMinute, enemy, currentState = {}) {
  const map = campaignMap(campaignId);
  const target = map?.anchors.find((anchor) => anchor.id === map.defaultTargets[unitId]);
  if (!target) return null;
  const current = positionOf(currentState, initialPosition(campaignId, unitId));
  const route = planMapRoute(campaignId, current, target);
  return {
    from: current,
    to: { x: target.x, y: target.y },
    route: route.points,
    routeAnchorIds: route.anchorIds,
    targetAnchorId: target.id,
    mapVersion: MAP_VERSION,
    routeDistance: route.distance,
    blocked: !route.reachable,
    blockedReason: route.reason || null,
    label: target.label,
    kind: enemy ? "intel" : "order",
    confidence: enemy ? "推定" : "已确认",
    startedAtMinute: clockMinute,
    durationMinutes: Math.max(6, Math.ceil(route.distance / (enemy ? 0.7 : 0.9))),
    progress: 0,
    phase: !route.reachable ? "delayed" : route.points.length <= 1 ? "completed" : "moving",
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
    pendingMovementReports: Array.isArray(input.pendingMovementReports) ? input.pendingMovementReports : [],
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

  // Completion can be detected while an asynchronous agent response is applied.
  // Persist its report in the world snapshot until normal communication delivers it.
  const arrivedReports = state.pendingMovementReports.filter((message) => message.availableAtMinute <= clockMinute);
  state.pendingMovementReports = state.pendingMovementReports.filter((message) => message.availableAtMinute > clockMinute);
  for (const message of arrivedReports) {
    if (knownMessageIds.has(message.id)) continue;
    state.messages.unshift(message);
    knownMessageIds.add(message.id);
    messages.push(message);
    events.push({ type: "REPORT_RECEIVED", payload: { message } });
  }

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
      ...reportSnapshot(campaign, state, report.location, report.availableAtMinute, { summary: report.body }),
      received: null,
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
  updateUnitMovements(campaign, state, clockMinute);
  const startingProgress = state.objectiveProgress;
  if (job.jobType === "local_battle") {
    const friendly = job.input.participants?.find((participant) => participant.side === "friendly");
    const battleMinute = Number(job.input.clockMinute ?? clockMinute);
    const supersededBattle = Number(state.unitStates[friendly?.id]?.lastOrderSentAtMinute ?? -Infinity) > battleMinute;
    // Contact is costly, but it is not a predetermined loss. The local commander
    // affects readiness and pressure at a controlled cadence; the player sees its report.
    if (!supersededBattle) changeBattlefield(campaign, state, { combatPower: -1, morale: -1, enemyPressure: 1 });
    if (friendly?.id && !supersededBattle) {
      const friendlyState = state.unitStates[friendly.id] || {};
      state.unitStates[friendly.id] = {
        ...friendlyState,
        status: "局部交战",
        summary: decision.summary || friendlyState.summary,
        morale: decision.morale || friendlyState.morale,
        comms: decision.comms || friendlyState.comms,
        movement: friendlyState.movement ? { ...friendlyState.movement, phase: "engaged", updatedAtMinute: clockMinute } : friendlyState.movement,
        updatedAtMinute: clockMinute,
        lastReportAtMinute: clockMinute
      };
    }
    const message = {
      id: `battle-${job.id}`,
      type: "urgent",
      source: `${friendly?.name || "前沿部队"}电台`,
      subject: decision.subject,
      body: decision.body,
      deliveredAtMinute: clockMinute + 3,
      availableAtMinute: clockMinute + 3,
      location: friendly?.id,
      generatedBy: decision.provider ?? "fallback",
      confidence: "confirmed",
      expiresAtMinute: clockMinute + 90,
      outcome: supersededBattle ? "迟到的局部战况仅归档，未覆盖后续军令" : "局部战局指挥组回传",
      ...reportSnapshot(campaign, state, friendly?.id, supersededBattle ? battleMinute : clockMinute, { updatesUnitState: !supersededBattle }),
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
  const defaultPosition = initialPosition(campaign.id, unitId, positionOf(unit));
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
  const currentPosition = positionOf(currentState, defaultPosition);
  let movement = currentState.movement ?? null;
  if (orderResponse && !supersededOrder) {
    movement = movementForOrder(campaign.id, unitId, { ...currentState, ...currentPosition }, orderText, clockMinute, job.input.order?.priority);
    movement.orderId = job.input.order?.id || null;
    movement.reportChannel = job.input.order?.channel || "radio";
    const channelDelay = Number(job.input.order?.arriveAtMinute) - Number(job.input.order?.sentAtMinute);
    movement.reportDelayMinutes = Number.isFinite(channelDelay) && channelDelay > 0 ? channelDelay : movement.reportChannel === "courier" ? 35 : 12;
  }
  else if (!orderResponse && !movement && !staleAutonomy) movement = movementFor(campaign.id, unitId, clockMinute, enemy, currentState);
  if (!staleAutonomy && !supersededOrder && engaged && movement && !movement.blocked && movement.kind !== "fire_support") movement = { ...movement, phase: "engaged" };
  let changes;
  if (supersededOrder || staleAutonomy || (orderResponse && movement?.blocked)) {
    changes = {};
  } else if (enemy) {
    changes = { objectiveControl: -1, combatPower: -1, morale: -1, enemyPressure: 2 };
  } else if (orderResponse) {
    changes = scaledOrderImpact(campaign, state, unitId, orderText, clockMinute);
  } else {
    changes = { objectiveControl: 1, morale: 1, communications: 1, enemyPressure: -1 };
  }
  const battlefieldBefore = { ...state.battlefield };
  changeBattlefield(campaign, state, changes);
  const appliedChanges = Object.fromEntries(Object.keys(changes).map((key) => [key, Number(state.battlefield[key] ?? 0) - Number(battlefieldBefore[key] ?? 0)]));

  const reportAtMinute = staleAutonomy || supersededOrder ? jobMinute : clockMinute;
  const observedPosition = reportAtMinute < clockMinute
    ? reportSnapshot(campaign, state, unitId, reportAtMinute, { updatesUnitState: false }).reportedPosition
    : currentPosition;
  const observedGrid = `${Math.round(observedPosition.x)},${Math.round(observedPosition.y)}`;
  const observedActivity = /armor|9ss/i.test(unitId) ? "履带车辆与伴随人员" : "步兵及运输车辆";
  const intelligenceReport = enemy ? {
    subject: `网格 ${observedGrid} 附近发现敌军活动`,
    body: `前沿观察与截获片段显示：网格 ${observedGrid} 附近发现${observedActivity}的活动迹象。暂不能确认其番号、兵力、行动目标或下一步方向。地图标记仅代表本次观测形成的推定区域，需要后续侦察复核。`,
    status: "活动迹象",
    summary: `网格 ${observedGrid} 附近有${observedActivity}活动，目标和行动方向未确认。`,
    morale: "不明",
    comms: "情报推定"
  } : null;
  const reportedStatus = movement?.blocked ? "行军暂缓，等待改令" : reportedContact && !activeLocalBattle
    ? orderResponse ? movement?.kind === "fire_support" ? "执行火力任务" : movement?.kind === "hold" ? "固守中" : "执行中" : "自主行动"
    : decision.status;

  state.unitStates[unitId] = {
    ...currentState,
    x: currentPosition.x,
    y: currentPosition.y,
    status: staleAutonomy || supersededOrder || preserveCommandStatus ? currentState.status : intelligenceReport?.status || reportedStatus || "已回报",
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
      : movement?.blocked && !enemy
        ? `路线未执行 · ${movement.blockedReason}`
        : orderResponse
        ? `${doctrineLabels[doctrine] || "军令"}已生效 · ${impactSummary(appliedChanges)}`
        : enemy ? "敌情推定，位置将随情报时效衰减" : "部队自主行动回报";

  const message = {
    id: `agent-${job.id}`,
    type: enemy ? "intel" : orderResponse && job.input.order?.priority === "urgent" ? "urgent" : "normal",
    source: enemy ? "战区情报汇总" : unit.name,
    subject: !enemy && movement?.blocked ? "行军路线受阻，请示调整目标" : intelligenceReport?.subject || decision.subject,
    body: !enemy && movement?.blocked ? `${movement.blockedReason}\n原回报：${decision.body || decision.summary || "部队暂留原地。"}` : intelligenceReport?.body || decision.body,
    received: null,
    deliveredAtMinute: clockMinute,
    availableAtMinute: clockMinute,
    location: unitId,
    generatedBy: decision.provider ?? "fallback",
    orderId: job.input.order?.id ?? null,
    confidence: enemy ? "estimated" : "confirmed",
    expiresAtMinute: reportAtMinute + (enemy ? 90 : 360),
    outcome,
    ...reportSnapshot(campaign, state, unitId, reportAtMinute, { updatesUnitState: !staleAutonomy && !supersededOrder }),
    requiresDecision: requiresDecision(decision)
  };
  state.messages.unshift(message);
  state.messages = state.messages.slice(0, 200);
  const status = objectiveStatus(campaign, state, clockMinute);
  return { state, message, status, objectiveProgress: state.objectiveProgress, objectiveDelta: state.objectiveProgress - startingProgress, battlefield: state.battlefield };
}
