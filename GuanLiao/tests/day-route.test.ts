import express from "express";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createAgentsRouter } from "../src/routes/agents.js";
import type { BureaucracyOrchestrator } from "../src/agents/orchestrator.js";

describe("day stream route", () => {
  it("flushes progress before settlement and disables proxy buffering", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const dayRunId = "59c84758-9b7c-4d20-9da1-caa0909c7f23";
    const orchestrator = {
      async prepareDay(_raw: unknown, progress: (event: unknown) => void) {
        progress({ dayRunId, status: "started", elapsedMs: 0 });
        await gate;
        return { dayRunId, propagation: [], completions: [] };
      },
    } as unknown as BureaucracyOrchestrator;
    const app = express();
    app.use(express.json(), createAgentsRouter(orchestrator));
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    try {
      const response = await fetch("http://127.0.0.1:" + (server.address() as AddressInfo).port + "/day", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ protocolVersion: 1, dayRunId, difficulty: "opaque", propagation: [], completions: [] }),
      });
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-accel-buffering")).toBe("no");
      expect(response.headers.get("cache-control")).toContain("no-transform");
      const reader = response.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      expect(first).toContain("event: progress");
      expect(first).not.toContain("event: result");
      release();
      let rest = "";
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        rest += new TextDecoder().decode(item.value);
      }
      expect(rest).toContain("event: result");
    } finally {
      release();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
