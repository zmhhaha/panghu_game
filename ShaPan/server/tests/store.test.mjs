import assert from "node:assert/strict";
import test from "node:test";
import { MemoryStore } from "../src/store.mjs";
import { runAgentJob } from "../src/agent-provider.mjs";

const user = { id: "test-commander", email: "commander@example.test", name: "Test Commander" };

async function createGame() {
  const store = new MemoryStore();
  await store.ensureUser(user);
  const game = await store.createGame(user.id, "taierzhuang");
  return { store, game };
}

test("server-authoritative time controls pause, resume, and change speed", async () => {
  const { store, game } = await createGame();
  assert.equal(game.status, "paused");
  assert.equal(game.startedAt, null);
  assert.equal(game.timeScale, 1);

  const started = await store.startGame(user.id, game.id);
  assert.equal(started.kind, "ok");
  assert.equal(started.game.status, "running");
  assert.ok(started.game.startedAt);

  await store.advanceRunningGames();
  let state = await store.getState(user.id, game.id);
  assert.equal(state.game.clockMinute, 1081);

  const faster = await store.controlGame(user.id, game.id, { action: "set_speed", speed: 4 });
  assert.equal(faster.kind, "ok");
  assert.equal(faster.game.timeScale, 4);
  await store.advanceRunningGames();
  state = await store.getState(user.id, game.id);
  assert.equal(state.game.clockMinute, 1085);

  const paused = await store.controlGame(user.id, game.id, { action: "pause" });
  assert.equal(paused.game.status, "paused");
  assert.deepEqual(await store.advanceRunningGames(), []);
  state = await store.getState(user.id, game.id);
  assert.equal(state.game.clockMinute, 1085);

  const order = await store.createOrder(user.id, game.id, {
    recipientId: "cn31",
    channel: "phone",
    text: "Hold the east gate and report ammunition state.",
    clientCommandId: "paused-order"
  });
  assert.equal(order.kind, "ok");
  assert.equal(order.order.sentAtMinute, 1085);
  assert.equal(order.order.arriveAtMinute, 1090);

  const resumed = await store.controlGame(user.id, game.id, { action: "resume" });
  assert.equal(resumed.game.status, "running");
  const events = await store.getEvents(user.id, game.id, 0);
  assert.deepEqual(events.map((event) => event.type), [
    "GAME_CREATED",
    "GAME_STARTED",
    "TIME_TICK",
    "REPORT_RECEIVED",
    "OBJECTIVE_UPDATED",
    "GAME_SPEED_CHANGED",
    "TIME_TICK",
    "REPORT_RECEIVED",
    "OBJECTIVE_UPDATED",
    "GAME_PAUSED",
    "ORDER_SENT",
    "GAME_RESUMED"
  ]);
});

test("reports, order delivery, and Agent response are persisted in the world state", async () => {
  const { store, game } = await createGame();
  await store.startGame(user.id, game.id);
  await store.controlGame(user.id, game.id, { action: "set_speed", speed: 4 });
  const order = await store.createOrder(user.id, game.id, {
    recipientId: "cn31",
    channel: "phone",
    priority: "urgent",
    text: "固守东门并回报伤亡。",
    clientCommandId: "delivery-order"
  });
  assert.equal(order.order.status, "queued");
  await store.advanceRunningGames();
  await store.advanceRunningGames();
  const stateBeforeAgent = await store.getState(user.id, game.id);
  assert.equal(stateBeforeAgent.state.orders[0].status, "delivered");
  const jobs = await store.claimAgentJobs("test-agent", 8);
  assert.ok(jobs.some((job) => job.jobType === "order_response"));
  for (const job of jobs) await store.completeAgentJob(job.id, await runAgentJob(job));
  const stateAfterAgent = await store.getState(user.id, game.id);
  assert.ok(stateAfterAgent.state.messages.some((message) => message.orderId === order.order.id));
  assert.equal(stateAfterAgent.state.unitStates.cn31.status, "执行军令");
});

test("prebattle games cannot resume, change speed, or accept orders", async () => {
  const { store, game } = await createGame();
  assert.equal((await store.controlGame(user.id, game.id, { action: "resume" })).kind, "invalid");
  assert.equal((await store.controlGame(user.id, game.id, { action: "set_speed", speed: 2 })).kind, "invalid");
  assert.equal((await store.createOrder(user.id, game.id, {
    recipientId: "cn31",
    channel: "radio",
    text: "This order must not be accepted.",
    clientCommandId: "prebattle-order"
  })).kind, "invalid");
});

test("objective resolves when the campaign deadline is reached", async () => {
  const { store, game } = await createGame();
  await store.startGame(user.id, game.id);
  await store.controlGame(user.id, game.id, { action: "set_speed", speed: 4 });
  for (let index = 0; index < 180; index += 1) await store.advanceRunningGames();
  const state = await store.getState(user.id, game.id);
  assert.equal(state.game.status, "lost");
  assert.equal(state.game.clockMinute, 1800);
  assert.ok((await store.getEvents(user.id, game.id, 0)).some((event) => event.type === "GAME_LOST"));
  assert.deepEqual(await store.advanceRunningGames(), []);
});
