import { describe, expect, it } from "vitest";
import { issueRadioChallenge, scoreRadioAttempt, verifyRadioChallenge } from "./radio-challenge.js";

const base = {
  userId: "user-1", gameInstanceId: "game-1", stateVersion: 3,
  items: [{ intelId: "shipment", fields: ["date", "hour"] }],
  format: "compressed" as const, codebookId: "book_cipher" as const, timing: "immediate" as const,
  locationId: "safe-flat", difficultyId: "undercover" as const,
};

describe("radio challenges", () => {
  it("shows every dot and dash and binds the challenge to the current game state", () => {
    const challenge = issueRadioChallenge(base, 1_000);
    expect(challenge.sequence).toMatch(/^[.\- /]+$/);
    expect(challenge.sequence.replace(/[ /]/g, "")).toHaveLength(5);
    expect(verifyRadioChallenge(challenge.token, base, 2_000).sequence).toBe(challenge.sequence);
    expect(() => verifyRadioChallenge(challenge.token, { ...base, stateVersion: 4 }, 2_000)).toThrow("已经变化");
    expect(() => verifyRadioChallenge(`${challenge.token}x`, base, 2_000)).toThrow("签名无效");
    expect(() => verifyRadioChallenge(challenge.token, base, 700_001)).toThrow("已经过期");
  });

  it("recomputes performance from raw symbols and timings", () => {
    const challenge = issueRadioChallenge(base, 1_000);
    const payload = verifyRadioChallenge(challenge.token, base, 2_000);
    const symbols = [...challenge.sequence].filter((symbol): symbol is "." | "-" => symbol === "." || symbol === "-");
    const decisions = challenge.interruptions.map((item) => ({ interruptionId: item.id, decision: "pause" as const }));
    const perfect = scoreRadioAttempt(payload, symbols.map((symbol, index) => ({ symbol, offsetMs: index * challenge.config.unitMs })), 0, decisions, 20_000);
    expect(perfect.grade).toBe("excellent");
    expect(perfect.accuracy).toBe(1);
    const rough = scoreRadioAttempt(payload, [{ symbol: symbols[0] === "." ? "-" : ".", offsetMs: 0 }], 8, decisions, 20_000);
    expect(rough.grade).toBe("rough");
    expect(rough.errorCount).toBeGreaterThan(1);
  });

  it("checks every ten game minutes, validates event decisions, and limits manual message length", () => {
    const challenge = Array.from({ length: 100 }, (_, index) => issueRadioChallenge({ ...base, difficultyId: "iron_curtain" as const }, 10_000 + index)).find((item) => item.interruptions.length > 0)!;
    expect(challenge.checksPerformed).toBe(2);
    expect(challenge.interruptions[0]?.atSymbol).toBeGreaterThan(0);
    const payload = verifyRadioChallenge(challenge.token, { ...base, difficultyId: "iron_curtain" }, 20_000);
    expect(() => scoreRadioAttempt(payload, [], 0, [], 20_000)).toThrow("尚未全部处置");
    expect(() => issueRadioChallenge({ ...base, items: [{ intelId: "shipment", fields: Array.from({ length: 13 }, (_, index) => `field-${index}`) }] }, 30_000)).toThrow("最多选择 12 个字段");
  });
});
