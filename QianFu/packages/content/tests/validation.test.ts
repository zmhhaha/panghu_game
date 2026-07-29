import { describe, expect, it } from "vitest";
import { CampaignEngine, createInitialWorld } from "@qianfu/core";
import { LINJIANG_1942, validateCampaign } from "../src/index.js";

describe("campaign content", () => {
  it("validates the Linjiang campaign", () => {
    expect(validateCampaign(LINJIANG_1942)).toEqual({ valid: true, errors: [] });
    expect(LINJIANG_1942.locations).toHaveLength(7);
    expect(LINJIANG_1942.characters).toHaveLength(8);
    expect(LINJIANG_1942.intel).toHaveLength(13);
    expect(LINJIANG_1942.objectives).toHaveLength(3);
    expect(LINJIANG_1942.locations.filter((location) => location.radioSite?.initiallyAvailable).map((location) => location.id)).toEqual(["safe-flat"]);
    expect(LINJIANG_1942.startTime).toBe("1942-05-12T00:00:00.000Z");
    expect(LINJIANG_1942.objectives.map((objective) => objective.deadline)).toEqual([
      "1942-05-15T14:00:00.000Z",
      "1942-05-18T14:00:00.000Z",
      "1942-05-22T14:00:00.000Z",
    ]);
    for (const objective of LINJIANG_1942.objectives) {
      for (const intelId of objective.requiredIntelIds) {
        expect(Date.parse(LINJIANG_1942.intel.find((intel) => intel.id === intelId)!.expiresAt)).toBeGreaterThanOrEqual(Date.parse(objective.deadline));
      }
    }
    expect(LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-chen-missing-register")?.trigger.requiredLeadIds).toEqual(["archive-file-crosscheck"]);
    expect(LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-lin-source-check")?.trigger.requiredLeadIds).toEqual(["writer-copy-source"]);
    expect(LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-luo-account-question")?.trigger.requiredLeadIds).toEqual(["merchant-ledger-delay"]);
  });

  it("rejects broken references", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.objectives[0].requiredIntelIds.push("missing-intel");
    expect(validateCampaign(broken).errors).toContain("objective confirm-radio-shipment references unknown intel missing-intel");
  });

  it("rejects invalid field labels and source provenance mappings", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.intel[0].fieldLabels = { missing: "Missing" };
    broken.intel[0].sourceOrigins = { "not-a-source": "shared-document" };
    expect(validateCampaign(broken).errors).toContain(`intel ${broken.intel[0].id} labels unknown field missing`);
    expect(validateCampaign(broken).errors).toContain(`intel ${broken.intel[0].id} maps origin for non-source not-a-source`);
  });

  it("rejects a narrative event that requires an unknown public lead", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.narrativeEvents![0].trigger.requiredLeadIds = ["missing-public-lead"];
    expect(validateCampaign(broken).errors).toContain(`narrative event ${broken.narrativeEvents![0].id} requires unknown public lead missing-public-lead`);
  });

  it("does not make Chen discuss equipment records with a writer who only unlocked the archive filing lead", () => {
    const engine = new CampaignEngine(LINJIANG_1942, createInitialWorld(LINJIANG_1942, "writer-archive-contact", "user-1", "undercover", "freelance_writer"));
    const worked = engine.execute({ type: "cover_work", workKind: "submit_column", durationMinutes: 30, idempotencyKey: "writer-submit-column" });
    expect(worked.state.resolvedLeadIds).toContain("writer-filing-contact");
    expect(worked.state.discoveredLocationIds).toContain("archive-office");
    engine.execute({ type: "move", destinationId: "archive-office", durationMinutes: 20, idempotencyKey: "writer-move-archive" });
    const atNine = engine.execute({ type: "wait", durationMinutes: 10, idempotencyKey: "writer-wait-nine" });
    expect(atNine.state.pendingContact).toBeNull();
    expect(atNine.state.resolvedNarrativeEventIds).not.toContain("director-chen-missing-register");
  });
});
