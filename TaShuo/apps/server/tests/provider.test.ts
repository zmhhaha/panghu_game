import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequiredAgentProvider, parseModelJson } from "../src/agents/provider.js";

afterEach(() => vi.unstubAllGlobals());

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
    expect(provider.model).toBe("llm-guarded");
  });

  it("honours an explicitly configured alias", () => {
    const provider = createRequiredAgentProvider({
      LLM_BASE_URL: "http://llm-service.llm.svc.cluster.local/v1",
      LLM_SERVICE_TOKEN: "test-token",
      LLM_MODEL: "custom-trusted",
    });
    expect(provider.model).toBe("custom-trusted");
  });

  it("parses fenced structured output", () => {
    expect(parseModelJson("```json\n{\"ok\":true}\n```")).toEqual({ ok: true });
  });

  it("uses stateless Responses and preserves full repair history", async () => {
    const provider = createRequiredAgentProvider({ LLM_BASE_URL: "https://example.test/v1/", LLM_SERVICE_TOKEN: "test-token" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "invalid" }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "completed", output: [
        { type: "reasoning", content: [{ type: "output_text", text: "ignored reasoning" }] },
        { type: "message", content: [{ type: "output_text", text: '{"ok":' }, { type: "output_text", text: "true}" }] },
      ] }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await provider.complete("system", "user")).toEqual({ ok: true });
    expect(fetchMock.mock.calls.every(([url]) => url === "https://example.test/v1/responses")).toBe(true);
    const first = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const repair = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(first.store).toBe(false);
    expect(first.input).toEqual([{ role: "system", content: "system" }, { role: "user", content: "user" }]);
    expect(first).not.toHaveProperty("messages");
    expect(repair.store).toBe(false);
    expect(repair.input[2]).toEqual({ role: "assistant", content: "invalid" });
    expect(repair.input[3].role).toBe("user");
  });

  it.each([
    { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }, { type: "refusal", refusal: "不能协助" }] }] },
    { status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }] },
  ])("rejects refusal or unfinished output", async payload => {
    const provider = createRequiredAgentProvider({ LLM_BASE_URL: "https://example.test/v1", LLM_SERVICE_TOKEN: "test-token" });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider.complete("system", "user")).rejects.toThrow(/LLM/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

