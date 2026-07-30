import { CampaignEngine, createInitialWorld, type CampaignDefinition } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { PostgresGameRepository } from "./postgres-repository.js";

describe("PostgresGameRepository", () => {
  it("normalizes a stale director contact when reading a persisted game", async () => {
    const legacyCampaign = structuredClone(LINJIANG_1942) as CampaignDefinition;
    const chenContact = legacyCampaign.narrativeEvents?.find((event) => event.id === "director-chen-missing-register");
    if (!chenContact) throw new Error("Chen contact fixture is missing");
    chenContact.trigger.requiredEventIds = [];

    const staleState = new CampaignEngine(
      legacyCampaign,
      createInitialWorld(legacyCampaign, "stale-postgres-contact", "user-1", "undercover", "archive_clerk"),
    ).execute({ type: "cover_work", workKind: "file_sorting", durationMinutes: 60, idempotencyKey: "legacy-file-sorting" }).state;
    expect(staleState.pendingContact?.eventId).toBe("director-chen-missing-register");

    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ state: staleState }], rowCount: 1 }),
    } as unknown as Pool;
    const loaded = await new PostgresGameRepository(pool).getGame(staleState.gameInstanceId, staleState.ownerUserId);

    expect(loaded?.resolvedLeadIds).toContain("archive-file-crosscheck");
    expect(loaded?.pendingContact).toBeNull();
    expect(loaded?.resolvedNarrativeEventIds).not.toContain("director-chen-missing-register");
  });
});
