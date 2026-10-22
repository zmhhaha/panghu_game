import { createInitialGameState, pauseGame } from "@tashuo/core";
import { LOST_CONTROL_DEMO } from "@tashuo/content";
import { describe, expect, it } from "vitest";
import { InMemoryGameRepository } from "../src/memory-repository.js";
import { IdempotencyConflictError, StateConflictError } from "../src/repository.js";

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

  it("keeps action lookup private and returns an immutable copy", async () => {
    const repository = new InMemoryGameRepository();
    const state = createInitialGameState(LOST_CONTROL_DEMO, "game-a", "user-a", "2026-01-01T00:00:00.000Z");
    await repository.createGame("user-a", state);
    const action = { contentId: "demo_clip_viral", text: "前面还有视频吗？" };
    await repository.saveGame({ gameInstanceId: state.id, ownerUserId: state.ownerUserId, expectedStateVersion: state.stateVersion, idempotencyKey: "comment-1", actionType: "publish_comment", action, nextState: { ...state, stateVersion: 2 } });
    action.text = "修改原始调用对象";
    expect(await repository.findAction(state.id, "user-b", "comment-1")).toBeNull();
    expect(await repository.findAction("missing", "user-a", "comment-1")).toBeNull();
    const stored = await repository.findAction(state.id, "user-a", "comment-1");
    expect(stored).toEqual({ actionType: "publish_comment", action: { contentId: "demo_clip_viral", text: "前面还有视频吗？" } });
    stored!.action.text = "修改读取副本";
    expect((await repository.findAction(state.id, "user-a", "comment-1"))!.action.text).toBe("前面还有视频吗？");
  });

  it("rejects reusing a key for another action or body while accepting reordered JSON keys", async () => {
    const repository = new InMemoryGameRepository();
    const state = createInitialGameState(LOST_CONTROL_DEMO, "game-a", "user-a", "2026-01-01T00:00:00.000Z");
    await repository.createGame("user-a", state);
    const input = { gameInstanceId: state.id, ownerUserId: state.ownerUserId, expectedStateVersion: 1, idempotencyKey: "comment-1", actionType: "publish_comment", action: { text: "请提供来源", context: { contentId: "demo_clip_viral", replyId: "account-1" } }, nextState: { ...state, stateVersion: 2 } };
    await repository.saveGame(input);
    expect((await repository.saveGame({ ...input, action: { context: { replyId: "account-1", contentId: "demo_clip_viral" }, text: "请提供来源" } }))?.duplicate).toBe(true);
    await expect(repository.saveGame({ ...input, action: { ...input.action, text: "另一条评论" } })).rejects.toBeInstanceOf(IdempotencyConflictError);
    await expect(repository.saveGame({ ...input, actionType: "submit_report" })).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect((await repository.getGame(state.id, state.ownerUserId))?.stateVersion).toBe(2);
    await expect(repository.saveGame({ ...input, idempotencyKey: "fresh-key" })).rejects.toBeInstanceOf(StateConflictError);
  });
});

