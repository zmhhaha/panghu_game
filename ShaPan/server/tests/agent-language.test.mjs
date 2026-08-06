import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/agent-provider.mjs", import.meta.url), "utf8");

test("agent reports require Chinese and reject English-dominant fields", () => {
  assert.match(source, /所有字段必须使用简体中文/);
  assert.match(source, /\[A-Za-z\]\{3,\}/);
  assert.match(source, /chineseReport/);
});
