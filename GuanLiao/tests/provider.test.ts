import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentProvider, parseModelJson } from "../src/agents/provider.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("parseModelJson", () => {
  it("accepts fenced JSON and ignores surrounding prose", () => {
    expect(parseModelJson('```json\n{"reportText":"奉结。已经办毕。"}\n```')).toEqual({ reportText: "奉结。已经办毕。" });
    expect(parseModelJson('回文如下： {"reportText":"奉结。已经办毕。"} 请查收')).toEqual({ reportText: "奉结。已经办毕。" });
  });

  it("rejects content without a recoverable JSON object", () => {
    expect(() => parseModelJson("奉结。已经办毕。")).toThrow("LLM returned invalid JSON");
  });
});

describe("createAgentProvider", () => {
  it.each([
    ["openai", "OPENAI_API_KEY"],
    ["deepseek", "DEEPSEEK_API_KEY"],
    ["anthropic", "ANTHROPIC_API_KEY"],
  ])("falls back when %s has no API key", (provider, key) => {
    vi.stubEnv("PROVIDER", provider);
    vi.stubEnv(key, "");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("using fallback"));
  });

  it("falls back when a custom provider has no URL", () => {
    vi.stubEnv("PROVIDER", "custom");
    vi.stubEnv("CUSTOM_BASE_URL", "");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("missing base URL"));
  });

  it("treats whitespace-only credentials as missing", () => {
    vi.stubEnv("PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "   ");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("missing API key"));
  });

  it("allows an unauthenticated custom provider on localhost", () => {
    vi.stubEnv("PROVIDER", "custom");
    vi.stubEnv("CUSTOM_BASE_URL", "http://127.0.0.1:11434/v1");
    vi.stubEnv("CUSTOM_API_KEY", "");

    expect(createAgentProvider()?.name).toBe("custom");
  });
});
