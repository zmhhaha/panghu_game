import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const warRoomSource = await readFile(new URL("../../web/components/war-room.tsx", import.meta.url), "utf8");
const tacticalMapSource = await readFile(new URL("../../web/components/tactical-map.tsx", import.meta.url), "utf8");

test("delivering an order preserves its sent timestamp", () => {
  assert.match(warRoomSource, /deliveredAtMinute: order\.deliveredAtMinute/);
  assert.match(warRoomSource, /orderStatus: order\.status, deliveredAtMinute: order\.deliveredAtMinute/);
  assert.doesNotMatch(warRoomSource, /received: formatClock\(order\.deliveredAtMinute\)/);
});

test("delivery events that race the order response are retained", () => {
  assert.match(warRoomSource, /pendingOrderUpdates/);
  assert.match(warRoomSource, /knownOrderIds\.current\.has\(order\.id\)/);
  assert.match(warRoomSource, /Object\.assign\(message, pendingUpdate\)/);
});

test("all order controls remain disabled before the battle starts", () => {
  assert.match(warRoomSource, /id="priority" disabled=\{!battleStarted\}/);
});

test("the tactical map exposes the authoritative coordinate system", () => {
  assert.match(tacticalMapSource, /OperationalCoordinateGrid/);
  assert.match(tacticalMapSource, /网格 \{cursorCoordinate/);
  assert.match(tacticalMapSource, /Math\.round\(movement\.to\.x\)/);
  assert.match(tacticalMapSource, /preserveAspectRatio="none"/);
  assert.doesNotMatch(tacticalMapSource, /preserveAspectRatio="xMidYMid slice"/);
  assert.doesNotMatch(tacticalMapSource, /<text x="7" y="14" fill="#5c6657" fontSize="8">E8<\/text>/);
});

test("overlapping markers are offset without changing authoritative unit positions", () => {
  assert.match(tacticalMapSource, /markerLayouts/);
  assert.match(tacticalMapSource, /marginLeft: layout\.offsetX/);
  assert.match(tacticalMapSource, /onClearFocus/);
});

test("after-action rendering filters raw engine events and links order responses", () => {
  assert.match(warRoomSource, /isMeaningfulTimelineEvent/);
  assert.match(warRoomSource, /胜负原因/);
  assert.match(warRoomSource, /最佳决策提示/);
  assert.match(warRoomSource, /respondedOrderIds/);
  assert.doesNotMatch(warRoomSource, /event\.payload\?\.message\?\.subject \|\| event\.type/);
});

test("message details can expand and never clamp the original text", () => {
  assert.match(warRoomSource, /messageDetailExpanded/);
  assert.match(warRoomSource, /展开通信原文/);
  assert.match(warRoomSource, /whitespace-pre-wrap text-xs leading-5/);
  assert.doesNotMatch(warRoomSource, /line-clamp-4 text-xs leading-5 text-muted/);
});
