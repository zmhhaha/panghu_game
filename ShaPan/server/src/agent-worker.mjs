import { createStore } from "./store.mjs";
import { runAgentJob } from "./agent-provider.mjs";
import { randomUUID } from "node:crypto";

const store = await createStore();
const intervalMs = Number(process.env.AGENT_POLL_MS || 2000);
const workerId = `shapan-agent-${randomUUID()}`;
let running = true;

async function poll() {
  if (!running) return;
  try {
    const jobs = await store.claimAgentJobs(workerId, 4);
    for (const job of jobs) {
      try {
        const result = await runAgentJob({ ...job, jobType: job.job_type ?? job.jobType, input: job.input });
        await store.completeAgentJob(job.id, result);
        console.log(`[shapan-agent] completed ${job.job_type ?? job.jobType} ${job.id} via ${result.run.provider}`);
      } catch (error) {
        await store.failAgentJob(job.id, error);
        console.error(`[shapan-agent] job ${job.id} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[shapan-agent] poll failed: ${error.message}`);
  }
}

console.log(`[shapan-agent] worker started; poll=${intervalMs}ms; worker=${workerId}`);
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
