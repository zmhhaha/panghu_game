import type { CaseDefinition, FactAssessmentRule } from "@tashuo/core";
import { describe, expect, it } from "vitest";
import { CASES, getCase, validateCase } from "../src/index.js";

const demo = getCase("lost-control-demo")!;
const river = getCase("blue-river")!;
const ruleFor = (definition: CaseDefinition, factId: string): FactAssessmentRule => definition.reportRubric!.find((rule) => rule.factId === factId)!;
const earliestScheduledRoute = (definition: CaseDefinition, rule: FactAssessmentRule, judgment?: "true" | "false" | "partial") => Math.min(...rule.routes
  .filter((route) => !judgment || route.acceptedJudgments.includes(judgment))
  .map((route) => Math.max(...route.contentIds.map((contentId) => definition.contents.find((content) => content.id === contentId)!.publishedAtMinute))));

describe("authored report evidence rubrics", () => {
  it("covers all 17 facts in the two current event versions", () => {
    expect(CASES.reduce((count, definition) => count + definition.reportRubric!.length, 0)).toBe(17);
    for (const definition of CASES) {
      expect(definition.version).toBe("2.1.0");
      expect(definition.reportRubric!.map((rule) => rule.factId).sort()).toEqual(definition.facts.map((fact) => fact.id).sort());
      expect(validateCase(definition)).toEqual([]);
    }
  });

  it("requires mechanism records before rejecting the network and tracer causal claims", () => {
    const network = ruleFor(demo, "network_cause");
    expect(earliestScheduledRoute(demo, network, "false")).toBe(4320);
    expect(network.evidence.find((evidence) => evidence.contentId === "former_engineer_logs")!.role).toBe("claim");
    expect(network.evidence.find((evidence) => evidence.contentId === "industry_test_records")!.role).toBe("context");
    expect(network.routes.some((route) => route.contentIds.length === 1 && route.contentIds[0] === "industry_test_records")).toBe(false);
    const fish = ruleFor(river, "fish_due_tracer");
    expect(earliestScheduledRoute(river, fish, "false")).toBe(6480);
    expect(fish.evidence.find((evidence) => evidence.contentId === "angler_timeline")!.role).toBe("context");
    expect(fish.routes.every((route) => route.contentIds.includes("oxygen_investigation") || route.contentIds.includes("official_full_notice"))).toBe(true);
    expect(fish.routes.some((route) => route.contentIds.includes("official_preliminary"))).toBe(false);
  });

  it("accepts a partial compound claim while dose is known but the discharge path remains unverified", () => {
    const overdose = ruleFor(river, "tracer_overdose");
    expect(earliestScheduledRoute(river, overdose, "partial")).toBe(4320);
    expect(earliestScheduledRoute(river, overdose, "true")).toBe(5760);
    expect(overdose.routes.find((route) => route.contentIds.length === 1 && route.contentIds[0] === "contractor_records_report")!.acceptedJudgments).toEqual(["partial"]);
    expect(overdose.routes.find((route) => route.id === "river_overdose_and_misconnection")!.contentIds).toEqual(["contractor_records_report", "factory_violation"]);
    expect(ruleFor(demo, "former_employee_truth").routes.every((route) => route.acceptedJudgments.includes("partial") && route.acceptedJudgments.includes("false"))).toBe(true);
  });

  it("uses origins relevant to each claim and permits valid comparison of versions from the same recording", () => {
    const video = ruleFor(demo, "video_edited");
    const comparison = video.routes.find((route) => route.id === "demo_clip_version_comparison")!;
    const origins = comparison.contentIds.flatMap((contentId) => video.evidence.find((evidence) => evidence.contentId === contentId)!.originIds);
    expect(new Set(origins)).toEqual(new Set(["lin_phone_recording"]));
    expect(ruleFor(river, "factory_compliant").evidence.find((evidence) => evidence.contentId === "factory_violation")!.originIds).toEqual(["factory_outfall_monitoring"]);
    expect(ruleFor(river, "tracer_primary").evidence.find((evidence) => evidence.contentId === "factory_violation")!.originIds).toEqual(["municipal_pipe_survey"]);
    expect(ruleFor(river, "old_fish_photo").evidence.find((evidence) => evidence.contentId === "factory_violation")!.originIds).toEqual(["old_bridge_news_archive"]);
    expect(ruleFor(demo, "known_instability").evidence.find((evidence) => evidence.contentId === "independent_mechanism_report")!.originIds).toEqual(["historical_test_archive"]);
    expect(ruleFor(demo, "network_cause").evidence.find((evidence) => evidence.contentId === "independent_mechanism_report")!.originIds).toEqual(["independent_bench_examination"]);
  });

  it("treats a public correction as evidence instead of repeating the original misleading claim tag", () => {
    const post = river.contents.find((content) => content.id === "dead_fish_old_photo")!;
    expect(post.claims).toContainEqual({ factId: "old_fish_photo", relation: "supports" });
    expect(post.body).toContain("两年前公开报道");
    const photo = ruleFor(river, "old_fish_photo");
    expect(photo.routes.find((route) => route.contentIds.length === 1 && route.contentIds[0] === post.id)!.acceptedJudgments).toEqual(["false"]);
    expect(ruleFor(river, "fish_due_tracer").evidence.find((evidence) => evidence.contentId === post.id)!.role).toBe("claim");
  });

  it("assigns support direction per fact instead of awarding credit for citing any related record", () => {
    const direction = (definition: CaseDefinition, factId: string, contentId: string) => ruleFor(definition, factId).evidence.find((evidence) => evidence.contentId === contentId)!.supportsJudgments;
    expect(direction(demo, "human_assist", "company_correction")).toEqual(["true"]);
    expect(direction(demo, "fully_remote", "company_correction")).toEqual(["false"]);
    expect(direction(demo, "network_cause", "company_correction")).toEqual(["false"]);
    expect(direction(river, "sewer_overflow", "oxygen_investigation")).toEqual(["true"]);
    expect(direction(river, "fish_due_tracer", "oxygen_investigation")).toEqual(["false"]);
    expect(direction(river, "old_fish_photo", "dead_fish_old_photo")).toEqual(["false"]);
    for (const definition of CASES) {
      for (const rule of definition.reportRubric!) {
        expect(rule.evidence.filter((evidence) => evidence.role === "claim").every((evidence) => !evidence.supportsJudgments?.length)).toBe(true);
      }
    }
  });

  it("reserves comparison-only records for complete routes while allowing partial compound support", () => {
    const shortClip = ruleFor(demo, "video_edited").evidence.find((evidence) => evidence.contentId === "demo_clip_viral")!;
    const originalClaims = ruleFor(demo, "former_employee_truth").evidence.find((evidence) => evidence.contentId === "former_engineer_logs")!;
    expect(shortClip.supportsJudgments).toBeUndefined();
    expect(originalClaims.supportsJudgments).toBeUndefined();
    expect(ruleFor(demo, "video_edited").routes.every((route) => route.contentIds.length > 1)).toBe(true);
    expect(ruleFor(demo, "former_employee_truth").routes.every((route) => route.contentIds.length > 1)).toBe(true);
    const dosage = ruleFor(river, "tracer_overdose").evidence.find((evidence) => evidence.contentId === "contractor_records_report")!;
    expect(dosage.supportsJudgments).toEqual(["partial", "true"]);
    expect(ruleFor(river, "tracer_overdose").routes.filter((route) => route.contentIds.length === 1 && route.contentIds[0] === dosage.contentId).every((route) => !route.acceptedJudgments.includes("true"))).toBe(true);
  });
});

describe("report rubric validation", () => {
  it("rejects absent critical fact coverage, unknown facts and duplicate rules", () => {
    const missing = structuredClone(demo);
    missing.reportRubric = missing.reportRubric!.filter((rule) => rule.factId !== "network_cause");
    expect(validateCase(missing)).toContain("critical fact network_cause requires an assessment rule");
    const unknown = structuredClone(demo);
    unknown.reportRubric![0]!.factId = "hidden-answer";
    expect(validateCase(unknown)).toContain("assessment hidden-answer references unknown fact");
    const duplicate = structuredClone(demo);
    duplicate.reportRubric!.push(structuredClone(duplicate.reportRubric![0]!));
    expect(validateCase(duplicate)).toContain("duplicate assessment rule: robot_failed");
  });

  it("rejects unknown content and origins absent from that publication even if another publication uses them", () => {
    const unknown = structuredClone(demo);
    ruleFor(unknown, "robot_failed").evidence[0]!.contentId = "nonexistent-report";
    expect(validateCase(unknown)).toContain("assessment robot_failed references unknown evidence nonexistent-report");
    const foreignOrigin = structuredClone(river);
    ruleFor(foreignOrigin, "blue_video_real").evidence[0]!.originIds = ["factory_outfall_monitoring"];
    expect(validateCase(foreignOrigin)).toContain("assessment blue_video_real evidence river_first_clip does not contain origin factory_outfall_monitoring");
    const missingOrigin = structuredClone(river);
    ruleFor(missingOrigin, "blue_video_real").evidence[0]!.originIds = [];
    expect(validateCase(missingOrigin)).toContain("assessment blue_video_real evidence river_first_clip requires origins");
  });

  it("rejects a route or counterargument with no fact-specific mapping and routes made only of rumors", () => {
    const unmapped = structuredClone(demo);
    ruleFor(unmapped, "robot_failed").routes[0]!.contentIds = ["sponsor_disclosure"];
    expect(validateCase(unmapped)).toContain("assessment robot_failed route demo_visible_collision has no evidence mapping for sponsor_disclosure");
    const rumors = structuredClone(demo);
    ruleFor(rumors, "network_cause").routes[0]!.contentIds = ["fraud_thread", "former_engineer_logs"];
    expect(validateCase(rumors)).toContain("assessment network_cause route demo_network_path_and_actual_input requires substantive record evidence");
    const counter = structuredClone(demo);
    ruleFor(counter, "network_cause").counterContentIds = ["sponsor_disclosure", "nonexistent-report"];
    expect(validateCase(counter)).toContain("assessment network_cause has no evidence mapping for counter content sponsor_disclosure");
    expect(validateCase(counter)).toContain("assessment network_cause references unknown counter evidence nonexistent-report");
  });

  it("rejects invalid confidence intervals and routes without a judgment or explanatory scope", () => {
    for (const interval of [[80, 80], [96, 84], [-1, 70], [75, 101], [Number.NaN, 90], [80, Number.POSITIVE_INFINITY]]) {
      const invalid = structuredClone(demo);
      ruleFor(invalid, "robot_failed").routes[0]!.confidenceRange = interval as [number, number];
      expect(validateCase(invalid)).toContain("assessment robot_failed route demo_visible_collision requires a finite increasing confidence range within 0..100");
    }
    const invalidRoute = structuredClone(demo);
    ruleFor(invalidRoute, "robot_failed").routes[0]!.acceptedJudgments = [];
    ruleFor(invalidRoute, "robot_failed").routes[0]!.explanation = " ";
    expect(validateCase(invalidRoute)).toContain("assessment robot_failed route demo_visible_collision requires valid judgments");
    expect(validateCase(invalidRoute)).toContain("assessment robot_failed route demo_visible_collision requires identity and explanation");
  });

  it("rejects invalid supporting directions and unverified allegations marked as judgment support", () => {
    const invalid = structuredClone(demo);
    ruleFor(invalid, "robot_failed").evidence[0]!.supportsJudgments = ["unknown"] as unknown as Array<"true">;
    expect(validateCase(invalid)).toContain("assessment robot_failed evidence demo_clip_viral has invalid supporting judgment");
    const duplicate = structuredClone(demo);
    ruleFor(duplicate, "robot_failed").evidence[0]!.supportsJudgments = ["true", "true"];
    expect(validateCase(duplicate)).toContain("assessment robot_failed evidence demo_clip_viral duplicates supporting judgment true");
    const allegation = structuredClone(demo);
    ruleFor(allegation, "network_cause").evidence.find((evidence) => evidence.contentId === "fraud_thread")!.supportsJudgments = ["true"];
    expect(validateCase(allegation)).toContain("assessment network_cause unverified claim fraud_thread cannot support a judgment");
  });
});
