import { createInitialGameState, pauseGame } from "@tashuo/core";
import { LOST_CONTROL_DEMO } from "@tashuo/content";
import { describe, expect, it } from "vitest";
import { InMemoryGameRepository } from "../src/memory-repository.js";

describe("user isolated repository", () => {
  it("does not expose or mutate another user's game", async () => {
    const repository = new InMemoryGameRepository();
    const state = createInitialGameState(LOST_CONTROL_DEMO, "game-a", "user-a", "2026-01-01T00:00:00.000Z");
    await repository.createGame("user-a", state);
    expect(await repository.getGame("game-a", "user-b")).toBeNull();
    expect(await repository.listGames("user-b")).toEqual([]);
    expect(await repository.deleteGame("game-a", "user-b")).toBe(false);
    const forged = pauseGame(state, LOST_CONTROL_DEMO, "2026-01-01T00:00:00.000Z");
    expect(await repository.saveGame({ gameInstanceId: "game-a", ownerUserId: "user-b", expectedStateVersion: state.stateVersion, idempotencyKey: "other-user-action", actionType: "pause", action: {}, nextState: forged })).toBeNull();
  });

  it("applies an idempotency key only once", async () => {
    const repository = new InMemoryGameRepository();
    const state = createInitialGameState(LOST_CONTROL_DEMO, "game-a", "user-a", "2026-01-01T00:00:00.000Z");
    await repository.createGame("user-a", state);
    const paused = pauseGame(state, LOST_CONTROL_DEMO, "2026-01-01T00:00:00.000Z");
    const input = { gameInstanceId: "game-a", ownerUserId: "user-a", expectedStateVersion: state.stateVersion, idempotencyKey: "pause-action-0001", actionType: "pause", action: {}, nextState: paused };
    expect((await repository.saveGame(input))?.duplicate).toBe(false);
    expect((await repository.saveGame(input))?.duplicate).toBe(true);
  });
});

