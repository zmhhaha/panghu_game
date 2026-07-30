import { CampaignEngine, createInitialWorld } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { PostgresGameRepository } from "./postgres-repository.js";

describe("PostgresGameRepository", () => {
  it("keeps a work discovery separate from later director contacts when reading a game", async () => {
    const persistedState = new CampaignEngine(
      LINJIANG_1942,
      createInitialWorld(LINJIANG_1942, "staged-postgres-contact", "user-1", "undercover", "archive_clerk"),
    ).execute({ type: "cover_work", workKind: "file_sorting", durationMinutes: 60, idempotencyKey: "legacy-file-sorting" }).state;
    expect(persistedState.resolvedLeadIds).toContain("archive-file-crosscheck");
    expect(persistedState.pendingContact).toBeNull();

    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ state: persistedState }], rowCount: 1 }),
    } as unknown as Pool;
    const loaded = await new PostgresGameRepository(pool).getGame(persistedState.gameInstanceId, persistedState.ownerUserId);

    expect(loaded?.resolvedLeadIds).toContain("archive-file-crosscheck");
    expect(loaded?.pendingContact).toBeNull();
    expect(loaded?.resolvedNarrativeEventIds).not.toContain("director-chen-missing-register");
  });
});
