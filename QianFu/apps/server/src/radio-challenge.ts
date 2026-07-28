import { createHmac, timingSafeEqual } from "node:crypto";
import { getRadioMinigameConfig, type DifficultyConfig, type RadioInterruption, type RadioInterruptionDecision, type RadioManualPerformance, type RadioMessageFormat, type RadioMessageItem, type RadioMinigameConfig, type RadioTiming } from "@qianfu/core";

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
  interruptions: RadioInterruption[];
  checksPerformed: number;
  issuedAt: number;
  expiresAt: number;
}

export interface PublicRadioChallenge {
  token: string;
  sequence: string;
  groups: string[];
  interruptions: RadioInterruption[];
  checksPerformed: number;
  config: RadioMinigameConfig;
  expiresAt: string;
}

const MORSE_DIGITS = ["-----", ".----", "..---", "...--", "....-", ".....", "-....", "--...", "---..", "----."];
const RADIO_CHALLENGE_SECRET = "qianfu-radio-challenge-v1-7d4b9c2f1a6e8d3c";

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", RADIO_CHALLENGE_SECRET).update(encodedPayload).digest("base64url");
}

function fieldGroups(items: RadioMessageItem[], format: RadioMessageFormat, salt: string): string[] {
  const fields = items.flatMap((item) => item.fields.map((field) => `${item.intelId}:${field}`));
  const fieldsPerGroup = format === "compressed" ? 2 : 1;
  const groups: string[] = [];
  for (let offset = 0; offset < fields.length; offset += fieldsPerGroup) {
    const chunk = fields.slice(offset, offset + fieldsPerGroup).join("|");
    const digest = createHmac("sha256", RADIO_CHALLENGE_SECRET).update(`${salt}:${chunk}`).digest();
    groups.push(MORSE_DIGITS[digest[0] % 10]);
  }
  return groups;
}

function operationMinutes(input: Pick<RadioChallengePayload, "items" | "format" | "codebookId">): number {
  const fieldCount = input.items.reduce((sum, item) => sum + item.fields.length, 0);
  const encoding = input.codebookId === "one_time_pad" ? 20 : 10;
  const transmission = Math.max(10, Math.ceil(fieldCount / (input.format === "compressed" ? 4 : 2)) * 10);
  return encoding + transmission + 10;
}

function makeInterruptions(input: Omit<RadioChallengePayload, "version" | "sequence" | "interruptions" | "checksPerformed" | "issuedAt" | "expiresAt">, sequenceLength: number, now: number) {
  const checksPerformed = Math.max(1, Math.floor(operationMinutes(input) / 10) - 1);
  const digest = createHmac("sha256", RADIO_CHALLENGE_SECRET).update(`${input.gameInstanceId}:${input.stateVersion}:${now}:interruptions`).digest();
  const probability = input.difficultyId === "story" ? 0.2 : input.difficultyId === "undercover" ? 0.38 : 0.58;
  const kinds: RadioInterruption["kind"][] = ["static", "patrol", "power_flicker"];
  const copy = {
    static: ["频率突发杂波", "耳机里涌入连续杂音，报码节奏开始漂移。"],
    patrol: ["窗外脚步停驻", "巷口有人放慢脚步，手电光扫过窗帘边缘。"],
    power_flicker: ["电压突然波动", "电台灯丝忽明忽暗，继续发射可能留下异常信号。"],
  } as const;
  const interruptions: RadioInterruption[] = [];
  for (let check = 1; check <= checksPerformed && interruptions.length < 2; check += 1) {
    if (digest[check - 1] / 255 > probability) continue;
    const kind = kinds[digest[check + 7] % kinds.length];
    interruptions.push({
      id: `radio-check-${check}`, atSymbol: Math.max(1, Math.min(sequenceLength - 1, Math.round(sequenceLength * check / (checksPerformed + 1)))),
      gameMinute: check * 10, kind, title: copy[kind][0], description: copy[kind][1],
    });
  }
  return { interruptions, checksPerformed };
}

export function issueRadioChallenge(input: Omit<RadioChallengePayload, "version" | "sequence" | "interruptions" | "checksPerformed" | "issuedAt" | "expiresAt">, now = Date.now()): PublicRadioChallenge {
  const fieldCount = input.items.reduce((sum, item) => sum + item.fields.length, 0);
  const config = getRadioMinigameConfig(input.difficultyId);
  if (fieldCount > config.maxManualFields) throw new Error(`手动发报一次最多选择 ${config.maxManualFields} 个字段，请拆分电文`);
  const groups = fieldGroups(input.items, input.format, `${input.gameInstanceId}:${input.stateVersion}:${now}`);
  const sequence = groups.join(" / ");
  const eventPlan = makeInterruptions(input, sequence.replace(/[ /]/g, "").length, now);
  const payload: RadioChallengePayload = { ...input, ...eventPlan, version: 1, sequence, issuedAt: now, expiresAt: now + 10 * 60_000 };
  const encoded = encode(JSON.stringify(payload));
  return {
    token: `${encoded}.${sign(encoded)}`,
    sequence: payload.sequence,
    groups,
    interruptions: payload.interruptions,
    checksPerformed: payload.checksPerformed,
    config,
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

export function scoreRadioAttempt(payload: RadioChallengePayload, inputs: RadioAttemptInput[], correctionCount: number, interruptionDecisions: RadioInterruptionDecision[], now = Date.now()): RadioManualPerformance {
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
  const expectedInterruptionIds = payload.interruptions.map((item) => item.id);
  if (interruptionDecisions.length !== expectedInterruptionIds.length
    || new Set(interruptionDecisions.map((item) => item.interruptionId)).size !== interruptionDecisions.length
    || interruptionDecisions.some((item) => !expectedInterruptionIds.includes(item.interruptionId) || (item.decision !== "pause" && item.decision !== "force"))) {
    throw new Error("发报途中事件尚未全部处置");
  }
  const intervals = inputs.slice(1).map((input, index) => input.offsetMs - inputs[index].offsetMs);
  const timingScore = intervals.length
    ? intervals.reduce((sum, interval) => sum + Math.max(0, 1 - Math.abs(interval - config.unitMs) / Math.max(1, config.timingToleranceMs * 2)), 0) / intervals.length
    : 0;
  const excessCorrections = Math.max(0, correctionCount - config.correctionAllowance);
  const errorCount = Math.max(expected.length, inputs.length) - correct + excessCorrections;
  const interruptionTimeMinutes = interruptionDecisions.filter((item) => item.decision === "pause").length * 10;
  const interruptionRiskDelta = interruptionDecisions.reduce((sum, decision) => {
    if (decision.decision === "pause") return sum - 2;
    const kind = payload.interruptions.find((item) => item.id === decision.interruptionId)?.kind;
    return sum + (kind === "patrol" ? 6 : kind === "power_flicker" ? 5 : 4);
  }, 0);
  const forcedCount = interruptionDecisions.filter((item) => item.decision === "force").length;
  const quality = accuracy * 0.65 + timingScore * 0.25 + completion * 0.1 - Math.min(0.2, excessCorrections * 0.025) - forcedCount * 0.04;
  const grade = quality >= 0.88 ? "excellent" : quality >= 0.62 ? "steady" : "rough";
  return {
    accuracy: Number(accuracy.toFixed(4)), timingScore: Number(timingScore.toFixed(4)), completion: Number(completion.toFixed(4)),
    grade, errorCount, correctionCount, sequence: payload.sequence,
    interruptionDecisions, interruptionTimeMinutes, interruptionRiskDelta,
  };
}
