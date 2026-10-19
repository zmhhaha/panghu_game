import assert from "node:assert/strict";
import test from "node:test";
import { runAgentJob } from "../src/agent-provider.mjs";

const job = { jobType: "enemy_action", input: { unit: { name: "一团", role: "执行警戒" }, clockMinute: 120 } };

function setup(t, payload) {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const calls = [];
  process.env.LLM_BASE_URL = "https://example.test/v1/";
  process.env.LLM_SERVICE_TOKEN = "test-token";
  process.env.LLM_MODEL = "llm-guarded";
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => payload };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const name of ["LLM_BASE_URL", "LLM_SERVICE_TOKEN", "LLM_MODEL"]) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
  });
  return calls;
}

test("agent uses Responses and reads text parts while ignoring reasoning", async t => {
  const decision = { subject: "前沿警戒", body: "一团按既定路线执行警戒。", status: "警戒", summary: "前沿维持观察。", morale: "稳定", comms: "畅通" };
  const text = JSON.stringify(decision);
  const calls = setup(t, { status: "completed", output: [
    { type: "reasoning", content: [{ type: "output_text", text: "must not be parsed" }] },
    { type: "message", content: [{ type: "output_text", text: text.slice(0, 20) }, { type: "output_text", text: text.slice(20) }] },
  ] });
  const result = await runAgentJob(job);
  assert.equal(result.run.resultStatus, "succeeded");
  assert.equal(result.decision.subject, decision.subject);
  assert.equal(calls[0].url, "https://example.test/v1/responses");
  assert.equal(calls[0].body.store, false);
  assert.equal(calls[0].body.model, "llm-guarded");
  assert.equal(calls[0].body.input[0].role, "system");
  assert.equal(JSON.parse(calls[0].body.input[1].content).clockTime, "02:00");
  assert.equal("messages" in calls[0].body, false);
});

for (const payload of [
  { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"subject":"不应采用"}' }, { type: "refusal", refusal: "不能协助" }] }] },
  { status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: '{"subject":"不应采用"}' }] }] },
]) {
  test(`agent keeps its existing fallback when Responses has ${payload.status} without usable output`, async t => {
    setup(t, payload);
    const result = await runAgentJob(job);
    assert.equal(result.run.resultStatus, "fallback");
    assert.equal(result.decision.provider, "fallback");
    assert.match(result.run.error, /LLM/);
  });
}
