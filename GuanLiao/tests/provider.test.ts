import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentProvider, optionalMaxTokens, parseModelJson } from "../src/agents/provider.js";

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

describe("optionalMaxTokens", () => {
  it("omits max_tokens unless LLM_MAX_TOKENS is set", () => {
    // 上游是推理模型：卡住 max_tokens 会让思考吃光预算、正文为空，所以默认不发送。
    vi.stubEnv("LLM_MAX_TOKENS", "");
    expect(optionalMaxTokens()).toBeNull();

    vi.stubEnv("LLM_MAX_TOKENS", "   ");
    expect(optionalMaxTokens()).toBeNull();

    vi.stubEnv("LLM_MAX_TOKENS", "2048");
    expect(optionalMaxTokens()).toBe(2048);
  });

  it("ignores a value that is not a positive number", () => {
    vi.stubEnv("LLM_MAX_TOKENS", "not-a-number");
    expect(optionalMaxTokens()).toBeNull();

    vi.stubEnv("LLM_MAX_TOKENS", "0");
    expect(optionalMaxTokens()).toBeNull();

    vi.stubEnv("LLM_MAX_TOKENS", "-1");
    expect(optionalMaxTokens()).toBeNull();
  });
});

describe("createAgentProvider", () => {
  it("targets the in-cluster llm-service", () => {
    vi.stubEnv("LLM_BASE_URL", "http://llm-service.llm.svc.cluster.local/v1");
    vi.stubEnv("LLM_SERVICE_TOKEN", "test-token");
    vi.stubEnv("LLM_MODEL", "deepseek-guarded");

    expect(createAgentProvider()?.name).toBe("llm-service");
  });

  it("stays enabled when LLM_MODEL is unset, defaulting to the guarded alias", () => {
    vi.stubEnv("LLM_BASE_URL", "http://llm-service.llm.svc.cluster.local/v1");
    vi.stubEnv("LLM_SERVICE_TOKEN", "test-token");
    vi.stubEnv("LLM_MODEL", "");

    expect(createAgentProvider()?.name).toBe("llm-service");
  });

  it("falls back to controller text when the llm-service entry is missing", () => {
    vi.stubEnv("LLM_BASE_URL", "");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("missing LLM_BASE_URL"));
  });

  it("treats a whitespace-only token as missing", () => {
    vi.stubEnv("LLM_BASE_URL", "http://llm-service.llm.svc.cluster.local/v1");
    vi.stubEnv("LLM_SERVICE_TOKEN", "   ");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("missing LLM_SERVICE_TOKEN"));
  });

  it("rejects a non-http LLM_BASE_URL", () => {
    vi.stubEnv("LLM_BASE_URL", "llm-service.llm.svc.cluster.local");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(createAgentProvider()).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("invalid LLM_BASE_URL"));
  });
});
