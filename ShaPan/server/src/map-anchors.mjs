import { readFileSync } from "node:fs";

// The browser and simulation use one versioned source of geographic truth.
const definitions = JSON.parse(readFileSync(new URL("../../shared/battlefield-maps.json", import.meta.url), "utf8"));

export const MAP_VERSION = definitions.version;
export const MAP_CANVAS = definitions.canvas;

export function campaignMap(campaignId) {
  return definitions.campaigns[campaignId] ?? null;
}

export function campaignAnchors(campaignId) {
  return Object.fromEntries((campaignMap(campaignId)?.anchors || []).map((anchor) => [anchor.id, anchor]));
}

export function initialPosition(campaignId, unitId, fallback = { x: 50, y: 50 }) {
  return { ...(campaignMap(campaignId)?.initialPositions?.[unitId] || fallback) };
}

export function mapDistance(from, to) {
  return Math.hypot(to.x - from.x, (to.y - from.y) * MAP_CANVAS.height / MAP_CANVAS.width);
}

export function riverCenterY(map, x) {
  const points = map.river.points;
  const segment = points.slice(1).findIndex((point) => x <= point.x);
  const index = segment < 0 ? points.length - 2 : segment;
  const from = points[index];
  const to = points[index + 1];
  const progress = Math.max(0, Math.min(1, (x - from.x) / (to.x - from.x || 1)));
  return from.y + (to.y - from.y) * progress;
}

function bankOf(map, point) {
  const offset = point.y - riverCenterY(map, point.x);
  return Math.abs(offset) <= map.river.width / 2 ? 0 : Math.sign(offset);
}

function landConnection(map, from, to) {
  const bank = bankOf(map, from);
  if (!bank || bank !== bankOf(map, to)) return false;
  // Signed distance is linear between river polyline breakpoints.
  const progress = [0, 1];
  if (from.x !== to.x) {
    for (const point of map.river.points) {
      const t = (point.x - from.x) / (to.x - from.x);
      if (t > 0 && t < 1) progress.push(t);
    }
  }
  return progress.every((t) => bankOf(map, {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t
  }) === bank);
}

function bridgeAccess(map, point, anchors) {
  for (const bridge of map.bridges) {
    const north = anchors.find((anchor) => anchor.id === bridge.north);
    const south = anchors.find((anchor) => anchor.id === bridge.south);
    if (!north || !south) continue;
    const dx = south.x - north.x;
    const dy = south.y - north.y;
    const t = ((point.x - north.x) * dx + (point.y - north.y) * dy) / (dx * dx + dy * dy || 1);
    if (t < 0 || t > 1) continue;
    if (mapDistance(point, { x: north.x + dx * t, y: north.y + dy * t }) < 0.55) {
      return anchors.filter((anchor) => [bridge.north, bridge.anchorId, bridge.south].includes(anchor.id));
    }
  }
  return [];
}

function accessNodes(map, point, anchors) {
  const exact = anchors.filter((anchor) => mapDistance(anchor, point) < 0.05);
  if (exact.length) return exact;
  if (!bankOf(map, point)) return bridgeAccess(map, point, anchors);
  return anchors
    .filter((anchor) => landConnection(map, point, anchor))
    .sort((left, right) => mapDistance(point, left) - mapDistance(point, right))
    .slice(0, 3);
}

/** All river crossings must use bridge edges from the shared map. */
export function planMapRoute(campaignId, start, target) {
  const map = campaignMap(campaignId);
  const failed = (reason) => ({ reachable: false, points: [{ ...start }], anchorIds: [], distance: 0, reason });
  if (!map) return failed("当前战役缺少地图通行资料，请等待参谋部校核。");
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return failed("军令目标尚未识别，请提供明确地点或地图坐标。");
  if (mapDistance(start, target) < 0.1) return { reachable: true, points: [{ ...start }], anchorIds: target.id ? [target.id] : [], distance: 0, targetAnchorId: target.id || null };

  const anchors = map.anchors;
  const byId = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  if (!target.id && !bankOf(map, target) && !bridgeAccess(map, target, anchors).length) return failed("指定坐标位于河道内，无法直接行军到达。请指定桥头、桥面或河岸上的集结点。");
  const starts = accessNodes(map, start, anchors);
  const goals = target.id && byId.has(target.id) ? [byId.get(target.id)] : accessNodes(map, target, anchors);
  if (!starts.length) return failed("当前位置无法接入陆上道路。请核实位置并确认可用渡河点，部队暂留原地。");
  if (!goals.length) return failed("目标缺少可通行的接近路线，部队暂留原地并请求新的集结地点。");

  const graph = new Map(anchors.map((anchor) => [anchor.id, []]));
  for (const edge of map.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const declaredBridge = edge.kind === "bridge" && map.bridges.some((bridge) =>
      [bridge.north, bridge.south].some((head) =>
        (edge.from === head && edge.to === bridge.anchorId) || (edge.to === head && edge.from === bridge.anchorId)));
    if (!declaredBridge && !landConnection(map, from, to)) continue;
    const cost = Math.max(0.01, mapDistance(from, to)) * Number(edge.cost || 1);
    graph.get(from.id).push({ id: to.id, cost });
    graph.get(to.id).push({ id: from.id, cost });
  }

  const distance = new Map();
  const previous = new Map();
  const pending = new Set();
  for (const anchor of starts) {
    distance.set(anchor.id, mapDistance(start, anchor) * 1.6);
    pending.add(anchor.id);
  }
  while (pending.size) {
    const current = [...pending].reduce((best, id) => distance.get(id) < distance.get(best) ? id : best);
    pending.delete(current);
    for (const neighbor of graph.get(current) || []) {
      const nextDistance = distance.get(current) + neighbor.cost;
      if (nextDistance >= (distance.get(neighbor.id) ?? Infinity)) continue;
      distance.set(neighbor.id, nextDistance);
      previous.set(neighbor.id, current);
      pending.add(neighbor.id);
    }
  }
  const goal = goals
    .filter((anchor) => distance.has(anchor.id))
    .sort((left, right) => (distance.get(left.id) + mapDistance(left, target) * 1.6) - (distance.get(right.id) + mapDistance(right, target) * 1.6))[0];
  if (!goal) return failed("当前道路网络无法抵达目标；跨河行动必须经过已知桥梁。部队暂留原地，请调整路线或目标。");

  const anchorIds = [goal.id];
  while (previous.has(anchorIds[0])) anchorIds.unshift(previous.get(anchorIds[0]));
  const points = [{ ...start }, ...anchorIds.map((id) => ({ x: byId.get(id).x, y: byId.get(id).y })), { x: target.x, y: target.y }]
    .filter((point, index, all) => index === 0 || mapDistance(point, all[index - 1]) > 0.01);
  return {
    reachable: true,
    points,
    anchorIds,
    targetAnchorId: target.id || null,
    distance: points.slice(1).reduce((total, point, index) => total + mapDistance(points[index], point), 0)
  };
}

export function targetForOrder(campaignId, unitId, text, coordinate = null) {
  if (coordinate) return coordinate;
  const map = campaignMap(campaignId);
  if (!map) return null;
  const anchors = campaignAnchors(campaignId);
  const normalized = String(text || "").toLowerCase();
  const retreat = normalized.match(/撤退|回撤|后撤|退至|退回|撤至/);
  const afterRetreat = retreat ? normalized.slice(retreat.index + retreat[0].length) : normalized;
  const beforeRetreat = retreat ? normalized.slice(0, retreat.index) : "";
  // “撤至南桥头” and “向南桥头撤退” both specify a destination.
  // A source-only phrase such as “从阿纳姆回撤” still uses the default retreat area.
  const directedDestination = beforeRetreat.match(/(?:向|往|至|到)([^，。；,;]+)$/)?.[1] || "";
  const destinationText = `${afterRetreat} ${directedDestination}`;
  const matches = map.anchors.flatMap((anchor) => [anchor.label, ...(anchor.aliases || [])]
    .filter((alias) => destinationText.includes(alias.toLowerCase()))
    .map((alias) => ({ anchor, score: alias.length })));
  matches.sort((left, right) => right.score - left.score);
  if (matches.length) return matches[0].anchor;
  if (retreat) return anchors[map.retreatAnchorId];
  if (/向东|往东|东进/.test(normalized)) return anchors[campaignId === "arnhem" ? "ar-east-road" : "tz-east-gate"];
  if (/向西|往西|西进|牵制/.test(normalized)) return anchors[campaignId === "arnhem" ? "ar-west-road" : "tz-west-road"];
  if (/向北|往北|北进/.test(normalized)) return anchors[campaignId === "arnhem" ? "ar-north-road" : "tz-north-gate"];
  if (/桥/.test(normalized)) return anchors[campaignId === "arnhem" ? "ar-bridge-north" : "tz-bridge-north"];
  return anchors[map.defaultTargets[unitId]] || map.anchors[0];
}
