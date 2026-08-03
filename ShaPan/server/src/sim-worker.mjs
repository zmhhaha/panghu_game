import { createStore } from "./store.mjs";

const store = await createStore();
const intervalMs = Number(process.env.SIM_TICK_MS || 5000);
let running = true;

async function tick() {
  if (!running) return;
  try {
    const events = await store.advanceRunningGames(intervalMs);
    if (events.length) console.log(`[shapan-sim] advanced ${events.length} game(s)`);
  } catch (error) {
    console.error(`[shapan-sim] tick failed: ${error.message}`);
  }
}

console.log(`[shapan-sim] worker started; tick=${intervalMs}ms`);
const timer = setInterval(tick, intervalMs);
await tick();

async function shutdown() {
  running = false;
  clearInterval(timer);
  await store.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
