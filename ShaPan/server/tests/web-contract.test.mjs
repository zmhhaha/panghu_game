import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const warRoomSource = await readFile(new URL("../../web/components/war-room.tsx", import.meta.url), "utf8");

test("delivering an order preserves its sent timestamp", () => {
  assert.match(warRoomSource, /deliveredAtMinute: order\.deliveredAtMinute/);
  assert.match(warRoomSource, /orderStatus: order\.status, deliveredAtMinute: order\.deliveredAtMinute/);
  assert.doesNotMatch(warRoomSource, /received: formatClock\(order\.deliveredAtMinute\)/);
});

test("all order controls remain disabled before the battle starts", () => {
  assert.match(warRoomSource, /id="priority" disabled=\{!battleStarted\}/);
});
