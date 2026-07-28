import { beforeEach, describe, expect, it } from "vitest";
import { issueRadioChallenge, scoreRadioAttempt, verifyRadioChallenge } from "./radio-challenge.js";

const base = {
  userId: "user-1", gameInstanceId: "game-1", stateVersion: 3,
  items: [{ intelId: "shipment", fields: ["date", "hour"] }],
  format: "compressed" as const, codebookId: "book_cipher" as const, timing: "immediate" as const,
  locationId: "safe-flat", difficultyId: "undercover" as const,
};

describe("radio challenges", () => {
  beforeEach(() => { process.env.RADIO_CHALLENGE_SECRET = "test-radio-secret"; });

  it("shows every dot and dash and binds the challenge to the current game state", () => {
    const challenge = issueRadioChallenge(base, 1_000);
    expect(challenge.sequence).toMatch(/^[.\- /]+$/);
    expect(challenge.sequence.replace(/[ /]/g, "")).toHaveLength(10);
    expect(verifyRadioChallenge(challenge.token, base, 2_000).sequence).toBe(challenge.sequence);
    expect(() => verifyRadioChallenge(challenge.token, { ...base, stateVersion: 4 }, 2_000)).toThrow("已经变化");
    expect(() => verifyRadioChallenge(`${challenge.token}x`, base, 2_000)).toThrow("签名无效");
    expect(() => verifyRadioChallenge(challenge.token, base, 700_001)).toThrow("已经过期");
  });

  it("recomputes performance from raw symbols and timings", () => {
    const challenge = issueRadioChallenge(base, 1_000);
    const payload = verifyRadioChallenge(challenge.token, base, 2_000);
    const symbols = [...challenge.sequence].filter((symbol): symbol is "." | "-" => symbol === "." || symbol === "-");
    const perfect = scoreRadioAttempt(payload, symbols.map((symbol, index) => ({ symbol, offsetMs: index * challenge.config.unitMs })), 0, 20_000);
    expect(perfect.grade).toBe("excellent");
    expect(perfect.accuracy).toBe(1);
    const rough = scoreRadioAttempt(payload, [{ symbol: symbols[0] === "." ? "-" : ".", offsetMs: 0 }], 8, 20_000);
    expect(rough.grade).toBe("rough");
    expect(rough.errorCount).toBeGreaterThan(1);
  });
});
