import assert from "node:assert/strict";
import test from "node:test";
import { applyAgentDecision, createInitialWorldState } from "../src/simulation.mjs";
import { getCampaign } from "../src/content.mjs";

test("multidimensional battlefield keeps the overall posture derived", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  assert.deepEqual(Object.keys(state.battlefield).sort(), ["combatPower", "communications", "enemyPressure", "morale", "objectiveControl", "overall", "supply"]);
  assert.equal(state.objectiveProgress, state.battlefield.overall);
});

test("objective-focused order improves control without a fixed score bonus", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  const job = { id: "test-order", jobType: "order_response", input: { order: { id: "order-1", text: "夺取并坚守阿纳姆公路桥", priority: "urgent" }, unit: { id: "uk2para", name: "第2伞兵营" } } };
  const result = applyAgentDecision(campaign, before, job, { subject: "命令确认", body: "执行", status: "执行军令", summary: "推进", morale: "稳定", comms: "无线电" }, 920);
  assert.ok(result.state.battlefield.objectiveControl > before.battlefield.objectiveControl);
  assert.ok(result.state.battlefield.morale > before.battlefield.morale);
  assert.equal(result.state.objectiveProgress, result.state.battlefield.overall);
});
