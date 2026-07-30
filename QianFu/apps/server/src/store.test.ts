import { describe, expect, it } from "vitest";
import { DEFAULT_CAMPAIGN_REF } from "@qianfu/content";
import { GameStore } from "./store.js";
import type { AuthUser } from "./middleware/auth.js";

const user = (id: string): AuthUser => ({
  id: `casdoor:${id}`,
  authProvider: "casdoor",
  externalSubject: id,
  username: id,
  email: `${id}@example.test`,
});

const gameOptions = (difficultyId: "story" | "undercover" | "iron_curtain") => ({
  campaignId: DEFAULT_CAMPAIGN_REF.id,
  campaignVersion: DEFAULT_CAMPAIGN_REF.version,
  difficultyId,
  coverProfileId: "archive_clerk" as const,
});

describe("GameStore", () => {
  it("rejects an unregistered campaign version", async () => {
    const store = new GameStore();
    const owner = await store.ensureUser(user("unknown-campaign"));

    await expect(store.createGame(owner.id, {
      ...gameOptions("undercover"),
      campaignVersion: "2099.1.0",
    })).rejects.toThrow(`Unknown campaign content: ${DEFAULT_CAMPAIGN_REF.id}@2099.1.0`);
    expect(await store.listGames(owner.id)).toHaveLength(0);
  });

  it("isolates campaigns by owner", async () => {
    const store = new GameStore();
    const ownerA = await store.ensureUser(user("owner-a"));
    const ownerB = await store.ensureUser(user("owner-b"));
    const game = await store.createGame(ownerA.id, gameOptions("undercover"));

    expect(await store.getGame(game.gameInstanceId, ownerA.id)).not.toBeNull();
    expect(await store.getGame(game.gameInstanceId, ownerB.id)).toBeNull();
    expect(await store.listGames(ownerA.id)).toHaveLength(1);
    expect(await store.listGames(ownerB.id)).toHaveLength(0);
  });

  it("does not execute the same action twice", async () => {
    const store = new GameStore();
    const owner = await store.ensureUser(user("owner"));
    const game = await store.createGame(owner.id, gameOptions("story"));
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
    const game = await store.createGame(ownerA.id, gameOptions("story"));

    expect(await store.deleteGame(game.gameInstanceId, ownerB.id)).toBe(false);
    expect(await store.getGame(game.gameInstanceId, ownerA.id)).not.toBeNull();
    expect(await store.deleteGame(game.gameInstanceId, ownerA.id)).toBe(true);
    expect(await store.getGame(game.gameInstanceId, ownerA.id)).toBeNull();
  });

  it("freezes a report and serves only its public snapshot through a share", async () => {
    const store = new GameStore();
    const owner = await store.ensureUser(user("report-owner"));
    const outsider = await store.ensureUser(user("report-outsider"));
    const game = await store.createGame(owner.id, gameOptions("undercover"));

    expect(await store.getReport(game.gameInstanceId, owner.id)).toBeNull();
    const result = await store.execute(game.gameInstanceId, owner.id, { type: "wait", durationMinutes: 16000, idempotencyKey: "finish-shared-report" });
    expect(result?.state.status).toBe("finished");

    const report = await store.getReport(game.gameInstanceId, owner.id);
    expect(report?.ownerReport.visibility).toBe("owner");
    expect(report?.publicPreview.visibility).toBe("public");
    expect(await store.getReport(game.gameInstanceId, outsider.id)).toBeNull();

    const share = await store.createShare(game.gameInstanceId, owner.id, new Date(Date.now() + 86_400_000).toISOString());
    expect(share?.shareId).toBeTruthy();
    expect(await store.createShare(game.gameInstanceId, outsider.id, null)).toBeNull();
    const shared = await store.getPublicShare(share!.shareId);
    expect(shared?.report.visibility).toBe("public");
    expect(JSON.stringify(shared)).not.toContain("actualAlignment");
    expect(await store.revokeShare(share!.shareId, outsider.id)).toBe(false);
    expect(await store.revokeShare(share!.shareId, owner.id)).toBe(true);
    expect(await store.getPublicShare(share!.shareId)).toBeNull();
  });
});
