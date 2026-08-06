import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, applyAgentDecision, createInitialWorldState } from "../src/simulation.mjs";
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

test("repeated doctrine has a cooldown while a supplied force recovers", () => {
  const campaign = getCampaign("arnhem");
  const base = createInitialWorldState(campaign);
  const job = { id: "cooldown-order", jobType: "order_response", input: { order: { id: "order-cooldown", text: "夺取并坚守阿纳姆公路桥", priority: "urgent" }, unit: { id: "uk2para", name: "第2伞兵营" } } };
  const decision = { subject: "命令确认", body: "执行", status: "执行军令", summary: "推进", morale: "稳定", comms: "无线电" };
  const first = applyAgentDecision(campaign, base, job, decision, 1000).state;
  const repeated = applyAgentDecision(campaign, first, job, decision, 1010).state;
  assert.equal(repeated.battlefield.objectiveControl, first.battlefield.objectiveControl);

  const recovered = advanceWorld(campaign, first, { clockMinute: 1015 }).state;
  assert.ok(recovered.battlefield.combatPower > first.battlefield.combatPower);
  assert.ok(recovered.battlefield.enemyPressure < first.battlefield.enemyPressure);
});

test("autonomous movement continues from the last confirmed position", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  before.unitStates.uk1para = { x: 51, y: 54, status: "推进中" };
  const job = { id: "continue-position", jobType: "unit_autonomy", input: { unit: { id: "uk1para", name: "第1伞兵旅" } } };
  const decision = { subject: "部队报告", body: "继续推进", status: "推进中", summary: "沿既定路线前进", morale: "稳定", comms: "无线电" };
  const result = applyAgentDecision(campaign, before, job, decision, 980);
  assert.deepEqual(result.state.unitStates.uk1para.movement.from, { x: 51, y: 54 });
  assert.deepEqual({ x: result.state.unitStates.uk1para.x, y: result.state.unitStates.uk1para.y }, { x: 51, y: 54 });
});
