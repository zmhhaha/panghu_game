import { describe, expect, it, vi } from "vitest";
import { ModelScheduler, limits } from "../src/agents/scheduler.js";

describe("shared model scheduler", () => {
  it("limits combined clients and rotates owners before draining one batch", async () => {
    const pool = new ModelScheduler(1);
    const signal = new AbortController().signal;
    const ownerA = {}, ownerB = {};
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const first = pool.run(ownerA, signal, async () => { order.push("a0"); await gate; });
    const second = pool.run(ownerA, signal, async () => { order.push("a1"); });
    const other = pool.run(ownerB, signal, async () => { order.push("b0"); });
    await Promise.resolve();
    expect(order).toEqual(["a0"]);
    release();
    await Promise.all([first, second, other]);
    expect(order).toEqual(["a0", "b0", "a1"]);
  });

  it("removes cancelled queued work and releases permits after failure", async () => {
    const pool = new ModelScheduler(1);
    const controller = new AbortController();
    const signal = new AbortController().signal;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const first = pool.run({}, signal, () => gate);
    const task = vi.fn(async () => undefined);
    const queued = pool.run({}, controller.signal, task);
    const rejected = expect(queued).rejects.toBeDefined();
    controller.abort();
    await rejected;
    release();
    await first;
    expect(task).not.toHaveBeenCalled();
    await expect(pool.run({}, signal, async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    await expect(pool.run({}, signal, async () => 42)).resolves.toBe(42);
  });

  it("expires queued work without starting it", async () => {
    vi.useFakeTimers();
    try {
      const pool = new ModelScheduler(1);
      const signal = new AbortController().signal;
      let release!: () => void;
      const first = pool.run({}, signal, () => new Promise<void>(resolve => { release = resolve; }));
      await Promise.resolve();
      const task = vi.fn(async () => undefined);
      const queued = pool.run({}, signal, task);
      const rejected = expect(queued).rejects.toThrow("queue_timeout");
      await vi.advanceTimersByTimeAsync(limits.wait);
      await rejected;
      expect(task).not.toHaveBeenCalled();
      release();
      await first;
    } finally { vi.useRealTimers(); }
  });
});
