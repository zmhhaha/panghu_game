import { describe, expect, it } from "vitest";
import { CampaignEngine, createInitialWorld, type CampaignDefinition, type GameEvent } from "@qianfu/core";
import { LINJIANG_1942 } from "@qianfu/content";
import { buildCampaignReportBundle, renderReportHtml } from "./reports.js";

function finishedFixture(campaign: CampaignDefinition = LINJIANG_1942) {
  const state = createInitialWorld(campaign, "00000000-0000-4000-8000-000000000001", "owner", "undercover");
  state.knownCharacterIds.push("han-shijie");
  state.intel["false-warehouse"].knownFields = ["warehouse"];
  state.intel["false-warehouse"].confidence = 0.8;
  const engine = new CampaignEngine(campaign, state);
  const result = engine.execute({ type: "wait", durationMinutes: 6000, idempotencyKey: "finish-report-test" });
  return { state: result.state, events: result.events as GameEvent[] };
}

describe("campaign reports", () => {
  it("keeps hidden truth and alignment out of the public snapshot", () => {
    const fixture = finishedFixture();
    const bundle = buildCampaignReportBundle(LINJIANG_1942, fixture.state, fixture.events, "report-id", "2026-07-26T00:00:00.000Z");

    expect(bundle.ownerReport.visibility).toBe("owner");
    expect(bundle.ownerReport.intel.find((item) => item.id === "false-warehouse")?.actualTruth).toBe("false");
    expect(bundle.ownerReport.comrades.find((item) => item.id === "han-shijie")?.actualAlignment).toBe("enemy");
    expect(bundle.publicPreview.visibility).toBe("public");
    expect(bundle.publicPreview.intel.some((item) => "actualTruth" in item)).toBe(false);
    expect(bundle.publicPreview.comrades.some((item) => "actualAlignment" in item)).toBe(false);
    expect(JSON.stringify(bundle.publicPreview)).not.toContain("enemy");
  });

  it("rejects report generation before settlement", () => {
    const state = createInitialWorld(LINJIANG_1942, "active-game", "owner", "undercover");
    expect(() => buildCampaignReportBundle(LINJIANG_1942, state, [], "report-id", new Date().toISOString())).toThrow("must be finished");
  });

  it("escapes report content in HTML exports", () => {
    const campaign = { ...LINJIANG_1942, name: "<script>alert('x')</script>" };
    const fixture = finishedFixture(campaign);
    const bundle = buildCampaignReportBundle(campaign, fixture.state, fixture.events, "report-id", "2026-07-26T00:00:00.000Z");
    const html = renderReportHtml(bundle.ownerReport);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain('name="robots" content="noindex,nofollow"');
  });
});
