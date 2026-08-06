import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, applyAgentDecision, createInitialWorldState } from "../src/simulation.mjs";
import { getCampaign } from "../src/content.mjs";

const decision = {
  subject: "军令确认",
  body: "部队已经收到命令并开始执行。",
  status: "执行中",
  summary: "按军令行动",
  morale: "稳定",
  comms: "无线电联络"
};

test("an infantry assault remains a maneuver when fire preparation is subordinate", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  state.unitStates.uk2para = { x: 58, y: 67, status: "待命" };
  state.orders = [{ id: "infantry-order", recipientId: "uk2para", sentAtMinute: 905 }];
  const result = applyAgentDecision(campaign, state, {
    id: "infantry-job",
    jobType: "order_response",
    input: {
      clockMinute: 910,
      order: { id: "infantry-order", recipientId: "uk2para", sentAtMinute: 905, text: "夺取并坚守公路桥，炮火结束后控制坐标75,68北侧道路。", priority: "urgent" },
      unit: { id: "uk2para", name: "第2伞兵营" }
    }
  }, decision, 910);

  assert.notEqual(result.state.unitStates.uk2para.movement.kind, "fire_support");
  assert.deepEqual(result.state.unitStates.uk2para.movement.to, { x: 75, y: 68 });
});

test("an artillery unit still receives a stationary fire mission", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  state.unitStates.ukart = { x: 17, y: 39, status: "待命" };
  state.orders = [{ id: "artillery-order", recipientId: "ukart", sentAtMinute: 905 }];
  const result = applyAgentDecision(campaign, state, {
    id: "artillery-job",
    jobType: "order_response",
    input: {
      clockMinute: 910,
      order: { id: "artillery-order", recipientId: "ukart", sentAtMinute: 905, text: "立即对坐标75,68实施炮火压制并持续校射。", priority: "urgent" },
      unit: { id: "ukart", name: "师属轻炮兵" }
    }
  }, decision, 910);

  assert.equal(result.state.unitStates.ukart.movement.kind, "fire_support");
  assert.deepEqual({ x: result.state.unitStates.ukart.x, y: result.state.unitStates.ukart.y }, { x: 17, y: 39 });
});

test("enemy agent output is rewritten as limited friendly intelligence", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  const result = applyAgentDecision(campaign, state, {
    id: "enemy-job",
    jobType: "enemy_action",
    input: { clockMinute: 915, unit: { id: "de9ss", name: "德军装甲部队？", role: "向桥区组织反击" } }
  }, {
    ...decision,
    subject: "装甲反击作战命令",
    body: "我装甲部队奉命反击。当前战场压力46，任务进度52。"
  }, 915);

  assert.equal(result.message.source, "战区情报汇总");
  assert.match(result.message.body, /战区情报官/);
  assert.match(result.message.body, /尚未证实/);
  assert.doesNotMatch(result.message.body, /我装甲部队|战场压力46|任务进度52/);
  assert.equal(result.state.unitStates.de9ss.morale, "不明");
});

test("agent jobs receive only their own known state, not global percentages", () => {
  const campaign = getCampaign("arnhem");
  const result = advanceWorld(campaign, createInitialWorldState(campaign), { clockMinute: campaign.startMinute + 10 });
  const autonomousJobs = result.jobs.filter((job) => ["unit_autonomy", "enemy_action"].includes(job.jobType));
  assert.equal(autonomousJobs.length, 2);
  for (const job of autonomousJobs) {
    assert.ok("knownContext" in job.input);
    assert.ok(!("world" in job.input));
  }
});

test("local battle reports use Chinese player-facing terminology and update report time", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  state.unitStates.uk1para = { x: 75, y: 68, status: "固守中", movement: { kind: "order", phase: "moving", route: [{ x: 70, y: 65 }, { x: 75, y: 68 }], from: { x: 70, y: 65 }, to: { x: 75, y: 68 }, startedAtMinute: 910, durationMinutes: 30 } };
  const result = applyAgentDecision(campaign, state, {
    id: "battle-job",
    jobType: "local_battle",
    input: {
      battleId: "deinf:uk1para",
      participants: [
        { id: "uk1para", name: "第1伞兵旅", side: "friendly" },
        { id: "deinf", name: "德军步兵？", side: "enemy" }
      ]
    }
  }, decision, 930);

  assert.equal(result.message.outcome, "局部战局指挥组回传");
  assert.doesNotMatch(result.message.outcome, /Agent/);
  assert.equal(result.state.unitStates.uk1para.lastReportAtMinute, 930);
  assert.equal(result.state.unitStates.uk1para.status, "局部交战");
  assert.equal(result.state.unitStates.uk1para.movement.phase, "engaged");
});

test("an LLM mention of contact cannot start a battle without confirmed proximity", () => {
  const campaign = getCampaign("arnhem");
  const state = createInitialWorldState(campaign);
  state.unitStates.uk1para = { x: 29, y: 59, status: "待命" };
  state.orders = [{ id: "advance-order", recipientId: "uk1para", sentAtMinute: 940 }];
  const result = applyAgentDecision(campaign, state, {
    id: "advance-job",
    jobType: "order_response",
    input: {
      clockMinute: 945,
      order: { id: "advance-order", recipientId: "uk1para", sentAtMinute: 940, text: "立即向坐标60,60推进。", priority: "urgent" },
      unit: { id: "uk1para", name: "第1伞兵旅" }
    }
  }, {
    ...decision,
    status: "与敌交战中",
    body: "部队开始前进，预计途中可能与敌交战。"
  }, 945);

  assert.notEqual(result.state.unitStates.uk1para.movement.phase, "engaged");
  assert.equal(result.state.unitStates.uk1para.status, "执行中");
});
