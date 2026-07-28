import { createHmac, timingSafeEqual } from "node:crypto";
import { getRadioMinigameConfig, type DifficultyConfig, type RadioManualPerformance, type RadioMessageFormat, type RadioMessageItem, type RadioMinigameConfig, type RadioTiming } from "@qianfu/core";

export interface RadioAttemptInput {
  symbol: "." | "-";
  offsetMs: number;
}

interface RadioChallengePayload {
  version: 1;
  userId: string;
  gameInstanceId: string;
  stateVersion: number;
  items: RadioMessageItem[];
  format: RadioMessageFormat;
  codebookId: "one_time_pad" | "book_cipher";
  timing: RadioTiming;
  locationId: string;
  difficultyId: DifficultyConfig["id"];
  sequence: string;
  issuedAt: number;
  expiresAt: number;
}

export interface PublicRadioChallenge {
  token: string;
  sequence: string;
  groups: string[];
  config: RadioMinigameConfig;
  expiresAt: string;
}

const MORSE_DIGITS = ["-----", ".----", "..---", "...--", "....-", ".....", "-....", "--...", "---..", "----."];

function secret(): string {
  const value = process.env.RADIO_CHALLENGE_SECRET ?? process.env.DATABASE_URL;
  if (!value && process.env.NODE_ENV === "production") throw new Error("RADIO_CHALLENGE_SECRET 未配置");
  return value ?? "qianfu-development-radio-challenge";
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

function fieldGroups(items: RadioMessageItem[], format: RadioMessageFormat, salt: string): string[] {
  const groups: string[] = [];
  for (const item of items) for (const field of item.fields) {
    const digest = createHmac("sha256", secret()).update(`${salt}:${item.intelId}:${field}`).digest();
    const digitCount = format === "full" ? 2 : 1;
    groups.push(Array.from({ length: digitCount }, (_, index) => MORSE_DIGITS[digest[index] % 10]).join(" "));
  }
  return groups;
}

export function issueRadioChallenge(input: Omit<RadioChallengePayload, "version" | "sequence" | "issuedAt" | "expiresAt">, now = Date.now()): PublicRadioChallenge {
  const groups = fieldGroups(input.items, input.format, `${input.gameInstanceId}:${input.stateVersion}:${now}`);
  const payload: RadioChallengePayload = { ...input, version: 1, sequence: groups.join(" / "), issuedAt: now, expiresAt: now + 10 * 60_000 };
  const encoded = encode(JSON.stringify(payload));
  return {
    token: `${encoded}.${sign(encoded)}`,
    sequence: payload.sequence,
    groups,
    config: getRadioMinigameConfig(input.difficultyId),
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}

export function verifyRadioChallenge(token: string, expected: {
  userId: string;
  gameInstanceId: string;
  stateVersion: number;
  items: RadioMessageItem[];
  format: RadioMessageFormat;
  codebookId: "one_time_pad" | "book_cipher";
  timing: RadioTiming;
  locationId: string;
  difficultyId: DifficultyConfig["id"];
}, now = Date.now()): RadioChallengePayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new Error("发报挑战令牌无效");
  const expectedSignature = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error("发报挑战签名无效");
  let payload: RadioChallengePayload;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RadioChallengePayload; }
  catch { throw new Error("发报挑战内容无效"); }
  if (payload.version !== 1 || payload.expiresAt < now) throw new Error("发报挑战已经过期，请重新编制电文");
  const bound = ["userId", "gameInstanceId", "stateVersion", "format", "codebookId", "timing", "locationId", "difficultyId"] as const;
  if (bound.some((key) => payload[key] !== expected[key]) || JSON.stringify(payload.items) !== JSON.stringify(expected.items)) {
    throw new Error("战役状态或电文内容已经变化，请重新编制电文");
  }
  return payload;
}

export function scoreRadioAttempt(payload: RadioChallengePayload, inputs: RadioAttemptInput[], correctionCount: number, now = Date.now()): RadioManualPerformance {
  const expected = [...payload.sequence].filter((symbol): symbol is "." | "-" => symbol === "." || symbol === "-");
  if (inputs.length > 2000 || !Number.isInteger(correctionCount) || correctionCount < 0) throw new Error("发报操作记录无效");
  let previous = -1;
  for (const input of inputs) {
    if (!Number.isInteger(input.offsetMs) || input.offsetMs < 0 || input.offsetMs < previous || input.offsetMs > now - payload.issuedAt + 3000) throw new Error("发报操作时间记录无效");
    previous = input.offsetMs;
  }
  const correct = expected.reduce((total, symbol, index) => total + (inputs[index]?.symbol === symbol ? 1 : 0), 0);
  const accuracy = expected.length ? correct / Math.max(expected.length, inputs.length) : 0;
  const completion = expected.length ? Math.min(1, inputs.length / expected.length) : 0;
  const config = getRadioMinigameConfig(payload.difficultyId);
  const intervals = inputs.slice(1).map((input, index) => input.offsetMs - inputs[index].offsetMs);
  const timingScore = intervals.length
    ? intervals.reduce((sum, interval) => sum + Math.max(0, 1 - Math.abs(interval - config.unitMs) / Math.max(1, config.timingToleranceMs * 2)), 0) / intervals.length
    : 0;
  const excessCorrections = Math.max(0, correctionCount - config.correctionAllowance);
  const errorCount = Math.max(expected.length, inputs.length) - correct + excessCorrections;
  const quality = accuracy * 0.65 + timingScore * 0.25 + completion * 0.1 - Math.min(0.2, excessCorrections * 0.025);
  const grade = quality >= 0.88 ? "excellent" : quality >= 0.62 ? "steady" : "rough";
  return {
    accuracy: Number(accuracy.toFixed(4)), timingScore: Number(timingScore.toFixed(4)), completion: Number(completion.toFixed(4)),
    grade, errorCount, correctionCount, sequence: payload.sequence,
  };
}
