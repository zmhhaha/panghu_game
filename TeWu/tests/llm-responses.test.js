const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../server/server.js"), "utf8");

function load(payload) {
  const calls = [];
  const context = {
    process: { env: { LLM_BASE_URL: "https://example.test/v1/", LLM_SERVICE_TOKEN: "test-token", LLM_MODEL: "llm-guarded" } },
    console: { log() {}, error() {}, info() {} },
    setTimeout, clearTimeout, AbortController, Buffer,
    require(name) {
      if (name === "node:http") return { createServer: () => ({ listen() {} }) };
      if (name === "pg") return { Pool: class {} };
      throw new Error(`Unexpected dependency ${name}`);
    },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => payload };
    },
  };
  vm.runInNewContext(source + "\nglobalThis.testApi = { roleplay, judgeReply };", context);
  return { calls, api: context.testApi };
}

test("NPC uses stateless Responses with reasoning excluded from parsed JSON", async () => {
  const { api, calls } = load({ status: "completed", output: [
    { type: "reasoning", content: [{ type: "output_text", text: "ignore me" }] },
    { type: "message", content: [{ type: "output_text", text: '{"speech":' }, { type: "output_text", text: '"我刚从车站过来。","claims":[]}' }] },
  ] });
  const result = await api.roleplay({ dossier: {}, question: "你从哪里来？" });
  assert.equal(result.speech, "我刚从车站过来。");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.test/v1/responses");
  assert.equal(calls[0].body.store, false);
  assert.equal(calls[0].body.model, "llm-guarded");
  assert.equal(calls[0].body.input[0].role, "system");
  assert.equal(JSON.parse(calls[0].body.input[1].content).question, "你从哪里来？");
  assert.equal("messages" in calls[0].body, false);
});

test("judge uses the same Responses contract", async () => {
  const { api, calls } = load({ status: "completed", output: [
    { type: "message", content: [{ type: "output_text", text: '{"speech":"这项记录我会继续核实。","evaluation":{},"nextQuestion":"请说明当天行程？","followupQuestion":""}' }] },
  ] });
  const result = await api.judgeReply({ profile: {}, answer: "我从车站过来。", round: 1 });
  assert.equal(result.provider, "llm-service");
  assert.equal(calls[0].url, "https://example.test/v1/responses");
  assert.equal(calls[0].body.store, false);
  assert.equal(calls[0].body.input[1].role, "user");
});

test("Responses text mixed with refusal is rejected through the existing retry budget", async () => {
  const { api, calls } = load({ status: "completed", output: [
    { type: "message", content: [{ type: "output_text", text: '{"speech":"不应采用","claims":[]}' }, { type: "refusal", refusal: "不能协助" }] },
  ] });
  await assert.rejects(api.roleplay({ dossier: {}, question: "问题" }), /LLM refused request/);
  assert.equal(calls.length, 3);
});
