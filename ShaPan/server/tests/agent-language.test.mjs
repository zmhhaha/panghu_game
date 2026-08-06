import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAgentPromptInput, normalizeReportText } from "../src/agent-provider.mjs";

const source = await readFile(new URL("../src/agent-provider.mjs", import.meta.url), "utf8");

test("agent reports require Chinese and reject English-dominant fields", () => {
  assert.match(source, /所有字段必须使用简体中文/);
  assert.match(source, /\[A-Za-z\]\{3,\}/);
  assert.match(source, /chineseReport/);
});

test("agent prompt times use clock labels instead of accumulated minutes", () => {
  assert.deepEqual(buildAgentPromptInput({ clockMinute: 1187, order: { sentAtMinute: 1119, durationMinutes: 30 } }), {
    clockTime: "19:47",
    order: { sentAtTime: "18:39", durationMinutes: 30 }
  });
});

test("malformed accumulated-minute report times are normalized", () => {
  assert.equal(normalizeReportText("我部于1119分钟抵达指定位置。"), "我部于18:39抵达指定位置。");
  assert.equal(normalizeReportText("预计持续120分钟。"), "预计持续120分钟。");
  assert.equal(normalizeReportText("在240分钟内完成集结。"), "在240分钟内完成集结。");
});
