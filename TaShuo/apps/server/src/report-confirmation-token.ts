import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ReportAnalysis } from "@tashuo/core";

interface ReportConfirmationContext {
  ownerUserId: string;
  gameInstanceId: string;
  actionKey: string;
  snapshotId: string;
  text: string;
  analysis: ReportAnalysis;
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
// JSONB preserves JSON values, not object insertion order. Keep arrays ordered while
// canonicalizing nested objects so a stored interpretation retains the same binding.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
  );
  return value;
};
const binding = (context: ReportConfirmationContext) => ({
  operation: "report", ownerUserId: context.ownerUserId, gameInstanceId: context.gameInstanceId,
  actionKey: context.actionKey, snapshotId: context.snapshotId,
  textHash: hash(context.text), analysisHash: hash(JSON.stringify(canonical(context.analysis))),
});

export function createReportConfirmationToken(context: ReportConfirmationContext, secret: string): string {
  const encoded = Buffer.from(JSON.stringify({ ...binding(context), expiresAt: Date.now() + 15 * 60_000 })).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

export function verifyReportConfirmationToken(token: string, context: ReportConfirmationContext, secret: string): void {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("报告确认令牌无效");
  const [encoded, signature] = parts;
  const actual = Buffer.from(signature!, "base64url");
  const expected = createHmac("sha256", secret).update(encoded!).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("报告确认令牌无效");
  const payload = JSON.parse(Buffer.from(encoded!, "base64url").toString("utf8")) as Record<string, unknown>;
  if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) throw new Error("报告确认令牌已过期，请重新查看解析结果");
  for (const [key, value] of Object.entries(binding(context))) {
    if (payload[key] !== value) throw new Error("报告确认令牌与原报告或解析结果不匹配");
  }
}
