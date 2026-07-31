import { describe, expect, it } from "vitest";
import { createRequiredAgentProvider, parseModelJson } from "../src/agents/provider.js";

describe("required model provider", () => {
  it("has no unconfigured fallback", () => {
    expect(() => createRequiredAgentProvider({})).toThrow("PROVIDER is required");
    expect(() => createRequiredAgentProvider({ PROVIDER: "unknown" })).toThrow("no fallback provider");
  });

  it("creates an independent custom provider from TaShuo configuration", () => {
    const provider = createRequiredAgentProvider({ PROVIDER: "custom", CUSTOM_BASE_URL: "https://llm.example/v1", CUSTOM_API_KEY: "test-key", CUSTOM_MODEL: "test-model" });
    expect(provider.name).toBe("custom");
    expect(provider.model).toBe("test-model");
  });

  it("parses fenced structured output", () => {
    expect(parseModelJson("```json\n{\"ok\":true}\n```")).toEqual({ ok: true });
  });
});

