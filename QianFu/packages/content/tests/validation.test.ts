import { describe, expect, it } from "vitest";
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
});
