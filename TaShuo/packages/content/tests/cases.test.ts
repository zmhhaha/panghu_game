import { describe, expect, it } from "vitest";
import { CASES, getCase, validateCase } from "../src/index.js";

describe("case packages", () => {
  it("ships two independent valid cases", () => {
    expect(CASES.map((item) => item.id)).toEqual(["lost-control-demo", "blue-river"]);
    for (const definition of CASES) {
      expect(validateCase(definition)).toEqual([]);
      expect(definition.facts.length).toBeGreaterThanOrEqual(8);
      expect(definition.contents.length).toBeGreaterThanOrEqual(12);
      expect(definition.groups.length).toBeGreaterThanOrEqual(4);
      expect(definition.durationMinutes).toBeGreaterThanOrEqual(7 * 24 * 60);
    }
  });

  it("keeps identifiers isolated between cases", () => {
    expect(CASES[0].id).not.toBe(CASES[1].id);
    expect(CASES[0].title).not.toBe(CASES[1].title);
  });

  it("never exposes comment sections on television or newspaper content", () => {
    for (const definition of CASES) {
      const traditional = definition.contents.filter((item) => item.kind === "tv_news" || item.kind === "newspaper");
      expect(traditional.length).toBeGreaterThan(0);
      expect(traditional.every((item) => item.commentsEnabled === false)).toBe(true);
      expect(new Set(traditional.filter((item) => item.kind === "tv_news").map((item) => item.sourceId)).size).toBeGreaterThanOrEqual(2);
      expect(new Set(traditional.filter((item) => item.kind === "newspaper").map((item) => item.sourceId)).size).toBeGreaterThanOrEqual(2);
      expect(traditional.every((item) => item.body.split("\n\n").length >= 2)).toBe(true);
    }
  });

  it("provides only current definitions and rejects a mismatched requested version", () => {
    for (const definition of CASES) {
      expect(getCase(definition.id)).toBe(definition);
      expect(getCase(definition.id, definition.version)).toBe(definition);
      expect(getCase(definition.id, "1.0.0")).toBeNull();
      expect(getCase(definition.id, "2.0.0")).toBeNull();
      expect(getCase(definition.id, "9.9.9")).toBeNull();
    }
    expect(getCase("unknown-event")).toBeNull();
    expect(getCase("lost-control-demo")?.facts.find((fact) => fact.id === "network_cause")?.explanation).toContain("本机规划器");
    expect(getCase("blue-river")?.facts.find((fact) => fact.id === "fish_due_tracer")?.explanation).toContain("不能仅凭先后顺序");
  });

  it("opens each event with substantive reporting, public discussion and a three-step account thread", () => {
    for (const definition of CASES) {
      const openingReport = definition.contents.find((content) => content.publishedAtMinute === 0 && (content.kind === "tv_news" || content.kind === "newspaper"));
      expect(openingReport?.body.length).toBeGreaterThan(300);
      expect(openingReport?.editorial?.materialIds.length).toBeGreaterThan(0);
      const openingSourceText = definition.materials!.filter((material) => openingReport!.editorial!.materialIds.includes(material.id)).map((material) => material.text).join("");
      expect(openingSourceText.length).toBeGreaterThan(600);
      const leads = definition.publicLeads!;
      expect(leads).toHaveLength(3);
      expect(leads[0]!.requiresLeadIds).toEqual([]);
      expect(leads[1]!.requiresLeadIds).toContain(leads[0]!.id);
      expect(leads[2]!.requiresLeadIds).toContain(leads[1]!.id);
      expect(new Set(leads.map((lead) => lead.accountId)).size).toBe(1);
      expect(new Set(leads.map((lead) => lead.contentId)).size).toBe(1);
      const comments = definition.accounts!.flatMap((account) => account.initialComments);
      expect(comments.filter((comment) => comment.contentId === leads[0]!.contentId && comment.publishedAtMinute === 0).length).toBeGreaterThanOrEqual(2);
      for (const lead of leads) {
        expect(lead.responseMaterialIds.length).toBeGreaterThan(0);
        const account = definition.accounts!.find((item) => item.id === lead.accountId)!;
        expect(lead.responseMaterialIds.every((materialId) => account.knownMaterialIds.includes(materialId))).toBe(true);
        for (const contentId of lead.unlockContentIds) {
          const content = definition.contents.find((item) => item.id === contentId)!;
          expect(content.publishedAtMinute).toBeGreaterThan(lead.availableAtMinute);
          expect(content.publishedAtMinute).toBeLessThan(definition.durationMinutes);
        }
      }
    }
  });

  it("scopes each disclosure to exact materials instead of unlocking every record with the same origin", () => {
    for (const definition of CASES) {
      const [first, second, third] = definition.publicLeads!;
      expect(first!.responseMaterialIds).toHaveLength(1);
      expect(second!.responseMaterialIds).toHaveLength(1);
      expect(third!.responseMaterialIds).toHaveLength(1);
      expect(first!.responseMaterialIds).not.toEqual(second!.responseMaterialIds);
      expect(first!.responseMaterialIds).not.toEqual(third!.responseMaterialIds);
      expect(second!.responseMaterialIds).not.toEqual(third!.responseMaterialIds);
      const responseMaterials = definition.publicLeads!.map((lead) => definition.materials!.find((material) => material.id === lead.responseMaterialIds[0])!);
      expect(new Set(responseMaterials.map((material) => material.originId)).size).toBe(1);
      expect(responseMaterials.every((material) => material.availableAtMinute === 0)).toBe(true);
    }
    expect(getCase("lost-control-demo")!.publicLeads![0]!.responseMaterialIds).not.toContain("lin_observation_scope");
    expect(getCase("blue-river")!.publicLeads![0]!.responseMaterialIds).not.toContain("he_source_relationship");
  });

  it("records common origins and gives causal conclusions mechanism evidence beyond timestamps", () => {
    const demo = getCase("lost-control-demo")!;
    const river = getCase("blue-river")!;
    expect(demo.contents.find((content) => content.id === "demo_clip_viral")!.evidenceOriginIds).toEqual(demo.contents.find((content) => content.id === "fuller_angle")!.evidenceOriginIds);
    const mechanismReport = demo.contents.find((content) => content.id === "independent_mechanism_report")!;
    const timelineReport = demo.contents.find((content) => content.id === "timeline_analysis")!;
    expect(timelineReport.evidenceOriginIds).toContain("sealed_controller_export");
    expect(mechanismReport.evidenceOriginIds).toContain("independent_bench_examination");
    expect(mechanismReport.claims).toContainEqual({ factId: "network_cause", relation: "denies" });
    expect(river.contents.find((content) => content.id === "angler_timeline")!.claims).toContainEqual({ factId: "fish_due_tracer", relation: "speculates" });
    const oxygenReport = river.contents.find((content) => content.id === "oxygen_investigation")!;
    expect(oxygenReport.evidenceOriginIds).toEqual(expect.arrayContaining(["river_sensor_and_gate_archive", "university_ecology_samples"]));
    expect(oxygenReport.claims).toContainEqual({ factId: "fish_due_tracer", relation: "denies" });
  });

  it("lets later reporting cite published corrections without treating a speaker's future willingness as a publication", () => {
    const correctionCases = [
      { definition: getCase("lost-control-demo")!, materialId: "lin_public_correction", contentId: "lin_scope_clarification", reportIds: ["public_safety_special", "closing_summary_demo"], openingId: "tv_breaking" },
      { definition: getCase("blue-river")!, materialId: "he_public_correction", contentId: "angler_scope_note", reportIds: ["resident_safety_report", "tv_evening_river"], openingId: "tv_morning_river" },
    ];
    for (const { definition, materialId, contentId, reportIds, openingId } of correctionCases) {
      const material = definition.materials!.find((entry) => entry.id === materialId)!;
      const correction = definition.contents.find((entry) => entry.id === contentId)!;
      expect(material.availableAtMinute).toBe(correction.publishedAtMinute);
      expect(material.availableAtMinute).toBeGreaterThan(0);
      for (const reportId of reportIds) {
        const report = definition.contents.find((entry) => entry.id === reportId)!;
        expect(report.editorial!.materialIds).toContain(materialId);
        expect(material.sourceIds).toContain(report.sourceId);
        expect(material.availableAtMinute).toBeLessThanOrEqual(report.publishedAtMinute);
      }
      expect(definition.contents.find((entry) => entry.id === openingId)!.editorial!.materialIds).not.toContain(materialId);
      expect(definition.publicLeads!.every((lead) => !lead.responseMaterialIds.includes(materialId))).toBe(true);
    }
  });

  it("gives summary claims the matching public records instead of unassigned background knowledge", () => {
    const demo = getCase("lost-control-demo")!;
    const summary = demo.contents.find((entry) => entry.id === "closing_summary_demo")!;
    expect(summary.editorial!.materialIds).toEqual(expect.arrayContaining(["company_first_statement", "sealed_control_export", "safety_interface_manual", "independent_bench_report"]));
    expect(summary.evidenceOriginIds).toContain("company_first_statement");
    const firstStatement = demo.materials!.find((entry) => entry.id === "company_first_statement")!;
    expect(firstStatement.sourceIds).toContain(summary.sourceId);
    expect(demo.contents.find((entry) => entry.id === "timeline_analysis")!.editorial!.materialIds).toContain("historic_test_sheet");
    expect(demo.materials!.find((entry) => entry.id === "historic_test_sheet")!.sourceIds).toContain("city_tv_tech");
    const sponsorship = demo.contents.find((entry) => entry.id === "sponsor_disclosure")!;
    expect(sponsorship.editorial!.materialIds).toEqual(["promotion_payment_attachment"]);
    expect(sponsorship.body).not.toContain("企业曾收到风险记录");
  });

  it("rejects missing material references and unauthorized publisher or account knowledge", () => {
    const missing = structuredClone(CASES[0]);
    missing.contents.find((content) => content.editorial)!.editorial!.materialIds.push("nonexistent-material");
    expect(validateCase(missing)).toContain("editorial tv_breaking references unknown material nonexistent-material");
    const unauthorized = structuredClone(CASES[0]);
    unauthorized.contents.find((content) => content.id === "tv_breaking")!.editorial!.materialIds = ["independent_bench_report"];
    expect(validateCase(unauthorized)).toContain("editorial tv_breaking is not authorized for material independent_bench_report");
    const privateKnowledge = structuredClone(CASES[0]);
    privateKnowledge.accounts![0]!.knownMaterialIds.push("sealed_control_export");
    expect(validateCase(privateKnowledge)).toContain("account lin_at_demo is not authorized for material sealed_control_export");
  });

  it("rejects circular or impossible lead prerequisites and inaccessible early disclosures", () => {
    const cyclic = structuredClone(CASES[0]);
    cyclic.publicLeads![0]!.requiresLeadIds = [cyclic.publicLeads![2]!.id];
    expect(validateCase(cyclic)).toContain("cyclic lead prerequisites: demo_original_context");
    const unknown = structuredClone(CASES[0]);
    unknown.publicLeads![1]!.requiresLeadIds = ["never-existed"];
    expect(validateCase(unknown)).toContain("lead demo_observation_boundary references unknown prerequisite never-existed");
    const forbiddenDisclosure = structuredClone(CASES[0]);
    forbiddenDisclosure.publicLeads![0]!.unlockContentIds = ["timeline_analysis"];
    expect(validateCase(forbiddenDisclosure)).toContain("lead demo_original_context unlocks unavailable editorial material sealed_control_export");
    expect(validateCase(forbiddenDisclosure)).toContain("lead demo_original_context exceeds account knowledge for origin sealed_controller_export");
    const expired = structuredClone(CASES[0]);
    expired.publicLeads![1]!.expiresAtMinute = 1;
    expired.publicLeads![0]!.availableAtMinute = 2;
    expect(validateCase(expired)).toContain("lead demo_observation_boundary expires before prerequisite demo_original_context is available");
  });

  it("rejects unspecified, unknown, unauthorized and premature response materials", () => {
    const unspecified = structuredClone(CASES[0]);
    unspecified.publicLeads![0]!.responseMaterialIds = [];
    expect(validateCase(unspecified)).toContain("lead demo_original_context requires explicit response materials");
    const unknown = structuredClone(CASES[0]);
    unknown.publicLeads![0]!.responseMaterialIds = ["missing-response-record"];
    expect(validateCase(unknown)).toContain("lead demo_original_context references unknown response material missing-response-record");
    const unauthorized = structuredClone(CASES[0]);
    unauthorized.publicLeads![0]!.responseMaterialIds = ["sealed_control_export"];
    expect(validateCase(unauthorized)).toContain("lead demo_original_context is not authorized for response material sealed_control_export");
    expect(validateCase(unauthorized)).toContain("lead demo_original_context uses future response material sealed_control_export");
    expect(validateCase(unauthorized)).toContain("lead demo_original_context omits response material for unlocked origin lin_phone_recording");
  });

  it("validates content consistently across semantic versions and rejects invalid temporal values", () => {
    const versioned = structuredClone(CASES[0]);
    versioned.version = "3.4.5";
    expect(validateCase(versioned)).toEqual([]);
    versioned.version = "unversioned";
    expect(validateCase(versioned)).toContain("case version must be a stable semantic version");
    const missingMaterials = structuredClone(CASES[0]);
    missingMaterials.materials = [];
    expect(validateCase(missingMaterials)).toContain("case requires materials, accounts and public leads");
    const invalidTime = structuredClone(CASES[1]);
    invalidTime.contents[0]!.publishedAtMinute = Number.NaN;
    expect(validateCase(invalidTime)).toContain("content river_first_clip has invalid publish minute");
    const oldMaterial = structuredClone(CASES[1]);
    oldMaterial.contents.find((content) => content.id === "tv_morning_river")!.editorial!.materialIds = ["preliminary_sampling_sheet"];
    expect(validateCase(oldMaterial)).toContain("editorial tv_morning_river uses future material preliminary_sampling_sheet");
  });
});
