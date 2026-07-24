import { describe, expect, it } from "vitest";
import { LINJIANG_1942, validateCampaign } from "../src/index.js";

describe("campaign content", () => {
  it("validates the Linjiang campaign", () => {
    expect(validateCampaign(LINJIANG_1942)).toEqual({ valid: true, errors: [] });
    expect(LINJIANG_1942.locations).toHaveLength(6);
    expect(LINJIANG_1942.characters).toHaveLength(8);
    expect(LINJIANG_1942.intel).toHaveLength(10);
  });

  it("rejects broken references", () => {
    const broken = structuredClone(LINJIANG_1942);
    broken.objectives[0].requiredIntelIds.push("missing-intel");
    expect(validateCampaign(broken).errors).toContain("objective confirm-radio-shipment references unknown intel missing-intel");
  });
});
