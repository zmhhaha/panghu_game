import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryGameStateRepository } from "../src/store.js";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

function validState() {
  return {
    version: 4 as const,
    era: "ming",
    route: "local",
    difficulty: "guided",
    name: "顾惟诚",
    day: 1,
    seed: 1709,
    stats: { livelihood: 62, treasury: 52, reputation: 50, favor: 43 },
    merit: 0,
    rankIndex: 0,
    docket: ["riverbank"],
    decisions: {},
    pending: [],
    reports: [],
    unreadReports: 0,
    deck: [],
    agents: [{ id: "local-0" }],
    savedAt: new Date().toISOString(),
  };
}

describe("state API", () => {
  it("isolates saves by authenticated subject", async () => {
    process.env.NODE_ENV = "test";
    const repository = new InMemoryGameStateRepository();
    const server = createApp(repository, process.cwd()).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}/api/state`;
    const headers = (subject: string) => ({
      "content-type": "application/json",
      "x-auth-request-sub": subject,
      "x-forwarded-user": subject,
    });

    try {
      const saved = await fetch(base, {
        method: "PUT",
        headers: headers("official-a"),
        body: JSON.stringify({ state: validState() }),
      });
      expect(saved.status).toBe(200);

      const otherUser = await fetch(base, { headers: headers("official-b") });
      expect(otherUser.status).toBe(404);

      const owner = await fetch(base, { headers: headers("official-a") });
      expect(owner.status).toBe(200);
      expect((await owner.json()).state.name).toBe("顾惟诚");

      const removed = await fetch(base, { method: "DELETE", headers: headers("official-a") });
      expect(removed.status).toBe(204);
      expect((await fetch(base, { headers: headers("official-a") })).status).toBe(404);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await repository.close();
    }
  });
});
