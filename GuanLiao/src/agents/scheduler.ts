export function setting(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return process.env[name]?.trim() && Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export const limits = {
  concurrency: setting("LLM_CONCURRENCY", 2, 1, 3),
  chunk: setting("LLM_PROPAGATION_CHUNK_SIZE", 2, 1, 4),
  queue: setting("LLM_QUEUE_MAX", 32, 1, 128),
  wait: setting("LLM_QUEUE_WAIT_MS", 10000, 1000, 30000),
  deadline: setting("LLM_BATCH_DEADLINE_MS", 60000, 10000, 65000),
};
console.info("[GuanLiao Agent] limits=" + JSON.stringify(limits));

export function budget(parent?: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort(parent?.reason);
  if (parent?.aborted) cancel();
  else parent?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("deadline")), limits.deadline);
  return { signal: controller.signal, close() { clearTimeout(timer); parent?.removeEventListener("abort", cancel); } };
}

type Waiting = { start: () => void; owner: object };
export class ModelScheduler {
  private active = 0;
  private queue: Waiting[] = [];
  private lastOwner?: object;
  constructor(private readonly concurrency = limits.concurrency) {}

  async run<T>(owner: object, signal: AbortSignal, task: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    const queuedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      if (this.queue.length >= limits.queue) { reject(new Error("overload")); return; }
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); };
      const remove = (reason: unknown) => {
        this.queue = this.queue.filter(item => item !== entry);
        cleanup(); reject(reason);
      };
      const cancel = () => remove(signal.reason ?? new Error("cancelled"));
      const entry: Waiting = { owner, start: () => { cleanup(); this.active++; resolve(); } };
      const timer = setTimeout(() => remove(new Error("queue_timeout")), limits.wait);
      signal.addEventListener("abort", cancel, { once: true });
      this.queue.push(entry);
      this.drain();
    });
    const started = Date.now();
    try { signal.throwIfAborted(); return await task(); }
    finally {
      this.active--;
      console.info(`[GuanLiao Agent] queue_ms=${started - queuedAt} call_ms=${Date.now() - started}`);
      this.drain();
    }
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length) {
      const different = this.queue.findIndex(item => item.owner !== this.lastOwner);
      const [entry] = this.queue.splice(different < 0 ? 0 : different, 1);
      this.lastOwner = entry.owner;
      entry.start();
    }
  }
}
export const modelScheduler = new ModelScheduler();
