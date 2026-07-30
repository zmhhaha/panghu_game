import { describe, expect, it } from "vitest";
import { CampaignEngine, createInitialWorld } from "@qianfu/core";
import { analyzeCampaignReachability, DEFAULT_CAMPAIGN_REF, getCampaignDefinition, HAIZHOU_1943, LINJIANG_1942, listCampaignCatalog, validateCampaign } from "../src/index.js";

describe("campaign content", () => {
  it("publishes a safe campaign catalog and resolves its versioned content", () => {
    const catalog = listCampaignCatalog();
    expect(catalog).toHaveLength(2);
    expect(catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ ...DEFAULT_CAMPAIGN_REF, name: LINJIANG_1942.name, estimatedDays: 10, objectiveCount: 3 }),
      expect.objectContaining({ id: HAIZHOU_1943.id, version: HAIZHOU_1943.version, name: HAIZHOU_1943.name, estimatedDays: 10, objectiveCount: 3 }),
    ]));
    for (const entry of catalog) {
      expect(getCampaignDefinition(entry.id, entry.version).name).toBe(entry.name);
      expect(entry.coverProfileIds).toEqual(["archive_clerk", "travelling_merchant", "freelance_writer"]);
    }
    expect(JSON.stringify(catalog)).not.toMatch(/hiddenAlignment|fieldValues|sourceCharacterIds/);
  });

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
    const chenFollowUp = LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-chen-missing-register");
    expect(chenFollowUp?.trigger.requiredLeadIds).toEqual(["archive-file-crosscheck"]);
    expect(chenFollowUp?.trigger.requiredEventIds).toEqual(["equipment-receipt-rumor"]);
    expect(LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-lin-source-check")?.trigger.requiredLeadIds).toEqual(["writer-copy-source"]);
    expect(LINJIANG_1942.narrativeEvents?.find((event) => event.id === "director-luo-account-question")?.trigger.requiredLeadIds).toEqual(["merchant-ledger-delay"]);
  });

  it("keeps every location, character, intel item and objective connected to each cover identity", () => {
    for (const campaign of [LINJIANG_1942, HAIZHOU_1943]) {
      for (const report of analyzeCampaignReachability(campaign)) {
        expect(report.unreachableLocationIds, `${campaign.id}/${report.profileId} location gaps`).toEqual([]);
        expect(report.unreachableCharacterIds, `${campaign.id}/${report.profileId} character gaps`).toEqual([]);
        expect(report.unreachableIntelIds, `${campaign.id}/${report.profileId} intel gaps`).toEqual([]);
        expect(report.unreachableObjectiveIds, `${campaign.id}/${report.profileId} objective gaps`).toEqual([]);
      }
    }
  });

  it("validates the Haizhou campaign and keeps each cover start private", () => {
    expect(validateCampaign(HAIZHOU_1943)).toEqual({ valid: true, errors: [] });
    expect(HAIZHOU_1943.locations).toHaveLength(8);
    expect(HAIZHOU_1943.characters).toHaveLength(9);
    expect(HAIZHOU_1943.intel).toHaveLength(11);
    expect(HAIZHOU_1943.objectives).toHaveLength(3);
    expect(HAIZHOU_1943.objectives.map((objective) => objective.deadline)).toEqual([
      "1943-09-09T14:00:00.000Z",
      "1943-09-12T14:00:00.000Z",
      "1943-09-16T14:00:00.000Z",
    ]);
    expect(new Set(HAIZHOU_1943.locations.map((location) => `${location.mapPosition?.x}:${location.mapPosition?.y}`)).size).toBe(HAIZHOU_1943.locations.length);
    for (const objective of HAIZHOU_1943.objectives) {
      for (const intelId of objective.requiredIntelIds) {
        expect(Date.parse(HAIZHOU_1943.intel.find((intel) => intel.id === intelId)!.expiresAt)).toBeGreaterThanOrEqual(Date.parse(objective.deadline));
      }
    }

    for (const profileId of ["archive_clerk", "travelling_merchant", "freelance_writer"] as const) {
      const entry = HAIZHOU_1943.coverProfiles[profileId];
      const state = createInitialWorld(HAIZHOU_1943, `haizhou-${profileId}`, "user-1", "undercover", profileId);
      expect(state.currentLocationId).toBe(entry.startingLocationId);
      expect(state.discoveredLocationIds.sort()).toEqual([entry.startingLocationId, "reed-safehouse"].sort());
      expect(state.knownCharacterIds).toEqual(entry.initialContactCharacterIds);
    }
  });

  it("spaces public-work discoveries instead of firing a director event in the same action", () => {
    const cases = [
      { profileId: "archive_clerk", workKind: "file_sorting", durationMinutes: 60, leadId: "archive-ticket-audit" },
      { profileId: "archive_clerk", workKind: "duty_shift", durationMinutes: 120, leadId: "archive-inspection-register" },
      { profileId: "archive_clerk", workKind: "submit_report", durationMinutes: 30, leadId: "archive-press-circular" },
      { profileId: "travelling_merchant", workKind: "settle_accounts", durationMinutes: 60, leadId: "merchant-warehouse-bill" },
      { profileId: "travelling_merchant", workKind: "visit_clients", durationMinutes: 120, leadId: "merchant-medicine-client" },
      { profileId: "travelling_merchant", workKind: "stock_check", durationMinutes: 30, leadId: "merchant-license-filing" },
      { profileId: "freelance_writer", workKind: "submit_column", durationMinutes: 30, leadId: "writer-teahouse-column" },
      { profileId: "freelance_writer", workKind: "street_research", durationMinutes: 60, leadId: "writer-station-notes" },
      { profileId: "freelance_writer", workKind: "proofread_copy", durationMinutes: 30, leadId: "writer-trading-proof" },
    ] as const;
    for (const item of cases) {
      const engine = new CampaignEngine(HAIZHOU_1943, createInitialWorld(HAIZHOU_1943, `work-${item.profileId}`, "user-1", "undercover", item.profileId));
      const result = engine.execute({ type: "cover_work", workKind: item.workKind, durationMinutes: item.durationMinutes, idempotencyKey: `work-${item.leadId}` });
      expect(result.state.resolvedLeadIds).toEqual([item.leadId]);
      expect(result.events.filter((event) => event.type === "lead.resolved")).toHaveLength(1);
      expect(result.events.filter((event) => event.type === "narrative.event_resolved")).toHaveLength(0);
    }
  });

  it("rejects a content island that cannot be reached from a cover identity", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.publicLeads = broken.publicLeads?.filter((lead) => lead.id !== "merchant-news-introduction");
    expect(validateCampaign(broken).errors).toContain("cover profile travelling_merchant cannot reach location linjiang-news");
    expect(validateCampaign(broken).errors).toContain("cover profile travelling_merchant cannot reach character lin-ruolan");
    expect(validateCampaign(broken).errors).toContain("cover profile travelling_merchant cannot complete objective trace-security-crackdown");
  });

  it("rejects invalid cover entry configuration instead of falling back to unrelated content", () => {
    const broken = structuredClone(HAIZHOU_1943);
    broken.coverProfiles.archive_clerk.startingLocationId = "missing-start";
    broken.coverProfiles.archive_clerk.workLocationIds = ["missing-workplace"];
    broken.coverProfiles.archive_clerk.initialContactCharacterIds = ["missing-contact"];
    expect(validateCampaign(broken).errors).toEqual(expect.arrayContaining([
      "cover profile archive_clerk has unknown starting location missing-start",
      "cover profile archive_clerk has unknown work location missing-workplace",
      "cover profile archive_clerk has unknown initial contact missing-contact",
    ]));
    expect(() => createInitialWorld(broken, "invalid-cover-entry", "user-1")).toThrow("has no valid starting location");
  });

  it("rejects an unknown cover profile scope on a public lead", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.publicLeads![0].profileIds = ["missing-profile" as never];
    expect(validateCampaign(broken).errors).toContain(`public lead ${broken.publicLeads![0].id} references unknown cover profile missing-profile`);
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

  it("rejects a location without a reusable map position", () => {
    const broken = structuredClone(HAIZHOU_1943);
    delete broken.locations[0].mapPosition;
    expect(validateCampaign(broken).errors).toContain(`location ${broken.locations[0].id} has no map position`);
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

  it("does not combine the archive filing lead with Chen's later follow-up", () => {
    const engine = new CampaignEngine(LINJIANG_1942, createInitialWorld(LINJIANG_1942, "archive-lead-before-follow-up", "user-1", "undercover", "archive_clerk"));
    const worked = engine.execute({ type: "cover_work", workKind: "file_sorting", durationMinutes: 60, idempotencyKey: "archive-file-sorting" });

    expect(worked.state.resolvedLeadIds).toContain("archive-file-crosscheck");
    expect(worked.state.discoveredLocationIds).toContain("radio-office");
    expect(worked.state.knownCharacterIds).toContain("zhou-qiming");
    expect(worked.state.pendingContact).toBeNull();
    expect(worked.state.resolvedNarrativeEventIds).not.toContain("director-chen-missing-register");
  });
});
