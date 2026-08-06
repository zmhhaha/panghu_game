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

test("a late autonomous report cannot overwrite a newer player route", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  before.unitStates.uk1para = { x: 46, y: 52, status: "待命" };
  before.orders = [{ id: "new-order", recipientId: "uk1para", sentAtMinute: 1010 }];
  const orderJob = { id: "new-order-job", jobType: "order_response", input: { clockMinute: 1015, order: { id: "new-order", recipientId: "uk1para", sentAtMinute: 1010, text: "向坐标75,68推进", priority: "urgent" }, unit: { id: "uk1para", name: "第1伞兵旅" } } };
  const decision = { subject: "军令确认", body: "开始推进", status: "执行中", summary: "向桥区推进", morale: "稳定", comms: "无线电" };
  const ordered = applyAgentDecision(campaign, before, orderJob, decision, 1015).state;
  const progressed = advanceWorld(campaign, ordered, { clockMinute: 1024 }).state;
  const positionBeforeReport = { x: progressed.unitStates.uk1para.x, y: progressed.unitStates.uk1para.y };
  const lateJob = { id: "late-autonomy", jobType: "unit_autonomy", input: { clockMinute: 1000, unit: { id: "uk1para", name: "第1伞兵旅" } } };
  const reported = applyAgentDecision(campaign, progressed, lateJob, { ...decision, subject: "迟到报告" }, 1025).state;
  assert.deepEqual({ x: reported.unitStates.uk1para.x, y: reported.unitStates.uk1para.y }, positionBeforeReport);
  assert.deepEqual(reported.unitStates.uk1para.movement.to, { x: 75, y: 68 });

  const arrived = advanceWorld(campaign, reported, { clockMinute: 1040 }).state;
  const laterAutonomy = { id: "later-autonomy", jobType: "unit_autonomy", input: { clockMinute: 1040, unit: { id: "uk1para", name: "第1伞兵旅" } } };
  const afterArrivalReport = applyAgentDecision(campaign, arrived, laterAutonomy, { ...decision, status: "继续推进中" }, 1041).state;
  assert.deepEqual({ x: afterArrivalReport.unitStates.uk1para.x, y: afterArrivalReport.unitStates.uk1para.y }, { x: 75, y: 68 });
  assert.equal(afterArrivalReport.unitStates.uk1para.status, "已到达目标");
});

test("artillery fire missions draw a target without moving the battery", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  before.unitStates.ukart = { x: 32, y: 43, status: "待命" };
  before.orders = [{ id: "fire-order", recipientId: "ukart", sentAtMinute: 1100 }];
  const job = { id: "fire-job", jobType: "order_response", input: { clockMinute: 1105, order: { id: "fire-order", recipientId: "ukart", sentAtMinute: 1100, text: "立即对坐标75,68实施炮火压制", priority: "urgent" }, unit: { id: "ukart", name: "师属轻炮兵" } } };
  const decision = { subject: "火力任务确认", body: "开始射击", status: "执行中", summary: "实施压制", morale: "稳定", comms: "野战电话" };
  const ordered = applyAgentDecision(campaign, before, job, decision, 1105);
  assert.equal(ordered.state.unitStates.ukart.movement.kind, "fire_support");
  assert.deepEqual(ordered.state.unitStates.ukart.movement.to, { x: 75, y: 68 });
  const progressed = advanceWorld(campaign, ordered.state, { clockMinute: 1114 }).state;
  assert.deepEqual({ x: progressed.unitStates.ukart.x, y: progressed.unitStates.ukart.y }, { x: 32, y: 43 });
  assert.match(ordered.message.outcome, /火力支援已生效/);
});

test("logistics and reconnaissance orders honor explicit map coordinates", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  before.unitStates.ukairland = { x: 35, y: 61, status: "集结完成" };
  before.orders = [{ id: "supply-order", recipientId: "ukairland", sentAtMinute: 1200 }];
  const job = { id: "supply-job", jobType: "order_response", input: { order: { id: "supply-order", recipientId: "ukairland", sentAtMinute: 1200, text: "向坐标75,70机动并建立弹药补给点", priority: "normal" }, unit: { id: "ukairland", name: "第1机降旅" } } };
  const decision = { subject: "补给行动确认", body: "开始机动", status: "执行中", summary: "建立补给点", morale: "稳定", comms: "野战电话" };
  const result = applyAgentDecision(campaign, before, job, decision, 1205);
  assert.equal(result.state.unitStates.ukairland.movement.kind, "logistics");
  assert.deepEqual(result.state.unitStates.ukairland.movement.to, { x: 75, y: 70 });
  assert.ok(result.state.unitStates.ukairland.movement.route.length >= 3);

  const reconState = createInitialWorldState(campaign);
  reconState.unitStates.ukrecon = { x: 62, y: 48, status: "待命" };
  reconState.orders = [{ id: "recon-order", recipientId: "ukrecon", sentAtMinute: 1210 }];
  const reconJob = { id: "recon-job", jobType: "order_response", input: { order: { id: "recon-order", recipientId: "ukrecon", sentAtMinute: 1210, text: "侦察至坐标75,60并持续监视道路", priority: "urgent" }, unit: { id: "ukrecon", name: "第1空降侦察中队" } } };
  const reconResult = applyAgentDecision(campaign, reconState, reconJob, { ...decision, subject: "侦察任务确认", summary: "侦察道路" }, 1215);
  assert.equal(reconResult.state.unitStates.ukrecon.movement.kind, "reconnaissance");
  assert.deepEqual(reconResult.state.unitStates.ukrecon.movement.to, { x: 75, y: 60 });
});

test("a decisive posture wins after being sustained for 45 minutes", () => {
  const campaign = getCampaign("arnhem");
  const before = createInitialWorldState(campaign);
  before.battlefield = { objectiveControl: 70, combatPower: 60, morale: 65, supply: 50, communications: 60, enemyPressure: 45, overall: 0 };
  const established = advanceWorld(campaign, before, { clockMinute: 1200 });
  assert.equal(established.status, null);
  assert.equal(established.state.decisiveSinceMinute, 1200);
  const won = advanceWorld(campaign, established.state, { clockMinute: 1245 });
  assert.equal(won.status, "won");
});

test("a hold-until-deadline campaign cannot win early", () => {
  const campaign = getCampaign("taierzhuang");
  const before = createInitialWorldState(campaign);
  before.battlefield = { objectiveControl: 90, combatPower: 90, morale: 90, supply: 90, communications: 90, enemyPressure: 10, overall: 0 };
  const established = advanceWorld(campaign, before, { clockMinute: 1200 });
  const stillHolding = advanceWorld(campaign, established.state, { clockMinute: 1300 });
  assert.equal(stillHolding.status, null);

  const resolved = advanceWorld(campaign, stillHolding.state, { clockMinute: campaign.deadlineMinute });
  assert.equal(resolved.status, "won");
});
