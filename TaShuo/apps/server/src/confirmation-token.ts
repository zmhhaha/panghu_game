import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SpeechFeatures } from "@tashuo/core";

interface ConfirmationPayload {
  ownerUserId: string;
  gameInstanceId: string;
  contentId: string;
  textHash: string;
  stateVersion: number;
  speechFeatures: SpeechFeatures;
  expiresAt: number;
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const textHash = (text: string) => createHash("sha256").update(text).digest("hex");

export function createConfirmationToken(
  context: Omit<ConfirmationPayload, "textHash" | "expiresAt"> & { text: string },
  secret: string,
): string {
  const payload: ConfirmationPayload = { ...context, textHash: textHash(context.text), expiresAt: Date.now() + 15 * 60_000 };
  const encoded = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyConfirmationToken(
  token: string,
  expected: { ownerUserId: string; gameInstanceId: string; contentId: string; text: string; stateVersion: number },
  secret: string,
): SpeechFeatures {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("确认令牌无效");
  const actual = Buffer.from(signature, "base64url");
  const calculated = createHmac("sha256", secret).update(encoded).digest();
  if (actual.length !== calculated.length || !timingSafeEqual(actual, calculated)) throw new Error("确认令牌无效");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ConfirmationPayload;
  if (payload.expiresAt < Date.now()) throw new Error("确认令牌已过期");
  if (payload.ownerUserId !== expected.ownerUserId || payload.gameInstanceId !== expected.gameInstanceId || payload.contentId !== expected.contentId || payload.stateVersion !== expected.stateVersion || payload.textHash !== textHash(expected.text)) throw new Error("确认令牌与当前评论不匹配");
  return payload.speechFeatures;
}

