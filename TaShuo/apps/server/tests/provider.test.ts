import { describe, expect, it } from "vitest";
import { createRequiredAgentProvider, parseModelJson } from "../src/agents/provider.js";

describe("required model provider", () => {
  it("has no unconfigured fallback", () => {
    expect(() => createRequiredAgentProvider({})).toThrow("LLM_BASE_URL is required");
    expect(() => createRequiredAgentProvider({ LLM_BASE_URL: "http://llm-service.llm.svc.cluster.local/v1" }))
      .toThrow("LLM_SERVICE_TOKEN is required");
    expect(() => createRequiredAgentProvider({ LLM_BASE_URL: "  ", LLM_SERVICE_TOKEN: "  " }))
      .toThrow("LLM_BASE_URL is required");
  });

  it("targets the shared llm-service with the configured alias", () => {
    const provider = createRequiredAgentProvider({
      LLM_BASE_URL: "http://llm-service.llm.svc.cluster.local/v1",
      LLM_SERVICE_TOKEN: "test-token",
    });
    expect(provider.name).toBe("llm-service");
    expect(provider.model).toBe("deepseek-guarded");
  });

  it("honours an explicitly configured alias", () => {
    const provider = createRequiredAgentProvider({
      LLM_BASE_URL: "http://llm-service.llm.svc.cluster.local/v1",
      LLM_SERVICE_TOKEN: "test-token",
      LLM_MODEL: "deepseek-trusted",
    });
    expect(provider.model).toBe("deepseek-trusted");
  });

  it("parses fenced structured output", () => {
    expect(parseModelJson("```json\n{\"ok\":true}\n```")).toEqual({ ok: true });
  });
});

