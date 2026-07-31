import { describe, expect, it } from "vitest";
import { CASES, validateCase } from "../src/index.js";

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
});
