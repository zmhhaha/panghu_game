import type { SpeechFeatures } from "@tashuo/core";
import { describe, expect, it } from "vitest";
import { createConfirmationToken, verifyConfirmationToken } from "../src/confirmation-token.js";

const features: SpeechFeatures = { id: "speech", expressionType: "question", targetIds: [], supportedFactIds: [], deniedFactIds: [], certainty: 20, aggression: 0, provocation: 0, informationDensity: 60, citedContentIds: [], confidence: 40 };

describe("comment confirmation token", () => {
  it("binds analyzed speech to one user, game, state, content and exact text", () => {
    const context = { ownerUserId: "user-a", gameInstanceId: "game-a", contentId: "post-a", text: "这个结论有来源吗？", stateVersion: 3 };
    const token = createConfirmationToken({ ...context, speechFeatures: features }, "secret");
    expect(verifyConfirmationToken(token, context, "secret")).toEqual(features);
    expect(() => verifyConfirmationToken(token, { ...context, ownerUserId: "user-b" }, "secret")).toThrow("不匹配");
    expect(() => verifyConfirmationToken(token, { ...context, text: "被篡改的文本" }, "secret")).toThrow("不匹配");
  });
});
