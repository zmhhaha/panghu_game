import { describe, expect, it } from "vitest";
import { GameStore } from "./store.js";
import type { AuthUser } from "./middleware/auth.js";

const user = (id: string): AuthUser => ({
  id: `casdoor:${id}`,
  authProvider: "casdoor",
  externalSubject: id,
  username: id,
  email: `${id}@example.test`,
});

describe("GameStore", () => {
  it("isolates campaigns by owner", async () => {
    const store = new GameStore();
    const ownerA = await store.ensureUser(user("owner-a"));
    const ownerB = await store.ensureUser(user("owner-b"));
    const game = await store.createGame(ownerA.id, "undercover");

    expect(await store.getGame(game.gameInstanceId, ownerA.id)).not.toBeNull();
    expect(await store.getGame(game.gameInstanceId, ownerB.id)).toBeNull();
    expect(await store.listGames(ownerA.id)).toHaveLength(1);
    expect(await store.listGames(ownerB.id)).toHaveLength(0);
  });

  it("does not execute the same action twice", async () => {
    const store = new GameStore();
    const owner = await store.ensureUser(user("owner"));
    const game = await store.createGame(owner.id, "story");
    const action = { type: "wait" as const, durationMinutes: 10, idempotencyKey: "wait-action-0001" };

    const first = await store.execute(game.gameInstanceId, owner.id, action);
    const duplicate = await store.execute(game.gameInstanceId, owner.id, action);

    expect(first?.duplicate).toBe(false);
    expect(duplicate?.duplicate).toBe(true);
    expect(duplicate?.state.currentTime).toBe(first?.state.currentTime);
    expect(await store.getEvents(game.gameInstanceId, owner.id)).toHaveLength(1);
  });

  it("only lets an owner delete their campaign", async () => {
    const store = new GameStore();
    const ownerA = await store.ensureUser(user("delete-owner-a"));
    const ownerB = await store.ensureUser(user("delete-owner-b"));
    const game = await store.createGame(ownerA.id, "story");

    expect(await store.deleteGame(game.gameInstanceId, ownerB.id)).toBe(false);
    expect(await store.getGame(game.gameInstanceId, ownerA.id)).not.toBeNull();
    expect(await store.deleteGame(game.gameInstanceId, ownerA.id)).toBe(true);
    expect(await store.getGame(game.gameInstanceId, ownerA.id)).toBeNull();
  });
});
