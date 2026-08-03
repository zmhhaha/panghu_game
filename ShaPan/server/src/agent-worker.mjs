import { createStore } from "./store.mjs";

const store = await createStore();
const intervalMs = Number(process.env.AGENT_POLL_MS || 2000);
let running = true;

async function poll() {
  if (!running) return;
  try {
    const jobs = await store.claimAgentJobs();
    if (jobs.length) console.log(`[shapan-agent] claimed ${jobs.length} job(s)`);
  } catch (error) {
    console.error(`[shapan-agent] poll failed: ${error.message}`);
  }
}

console.log(`[shapan-agent] worker started; poll=${intervalMs}ms`);
const timer = setInterval(poll, intervalMs);
await poll();

async function shutdown() {
  running = false;
  clearInterval(timer);
  await store.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
