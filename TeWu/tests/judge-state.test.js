const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function runCases() {
  const campaign = cloneCampaign(CAMPAIGNS[0].id);
  assert.deepEqual(CAMPAIGNS.map((item) => item.id), ["gestapo", "kgb", "tokko", "cia"], "机构顺序或数量异常");
  assert.equal(CAMPAIGNS.find((item) => item.id === "cia").setting, "华盛顿联邦办公区入口");
  assert.match(INSTITUTIONAL_AXES.cia.brief, /麦卡锡主义|忠诚调查/);

  function evaluation(overrides = {}) {
    return {
      relevance: 2,
      specificity: 2,
      dossierMatch: 2,
      consistency: 2,
      evasiveness: 0,
      evidenceFactIds: [],
      contradictions: [],
      unsupportedDetails: [],
      freeSlotClaims: [],
      summary: "回答与档案一致。",
      ...overrides,
    };
  }

  function answer(judge, text, remoteEvaluation, remote = {}) {
    const draft = judge.beginEvaluation(text);
    return judge.completeEvaluation(draft, { evaluation: remoteEvaluation, ...remote });
  }

{
  const judge = new JudgeAgent(campaign, makeInfiltratorProfile(campaign));
  const result = answer(judge, "我只记得这些，其他情况暂时说不清楚。", evaluation({ relevance: 1 }));
  assert.ok(result.change >= 0, "不完整回答不得降低警戒");
}

{
  const judge = new JudgeAgent(campaign, makeInfiltratorProfile(campaign));
  const result = answer(judge, "我的姓名和单位与证件完全不同。", evaluation({ dossierMatch: 0, contradictions: ["姓名与档案冲突"] }));
  assert.ok(result.change >= 5, "档案冲突至少提高 5 点警戒");
}

{
  const judge = new JudgeAgent(campaign, makeInfiltratorProfile(campaign));
  const result = answer(judge, judge.profile.cover.identity, evaluation());
  assert.ok(result.change >= -3, "单轮警戒最多降低 3 点");
}

{
  const judge = new JudgeAgent(campaign, makeInfiltratorProfile(campaign));
  answer(
    judge,
    "不清楚。",
    evaluation({ relevance: 0, specificity: 0, evasiveness: 2 }),
    { followupQuestion: "请逐项说明姓名、职业和所属单位。" },
  );
  assert.equal(judge.currentPrompt.source, "followup", "低质量回答应触发即时追问");
  assert.equal(judge.currentQuestion(), "请逐项说明姓名、职业和所属单位。");

  answer(judge, "还是不清楚。", evaluation({ relevance: 0, specificity: 0, evasiveness: 2 }));
  assert.equal(judge.followupUsed, true);
  assert.equal(judge.currentPrompt.source, "base", "整局只能使用一次即时追问");
  assert.equal(judge.currentTopic(), "route");
}

{
  const profile = makeInfiltratorProfile(campaign);
  const judge = new JudgeAgent(campaign, profile);
  answer(judge, profile.cover.identity, evaluation());
  const routeDetail = "我在换乘点下车后沿北侧围栏步行八分钟到公开入口。";
  answer(judge, routeDetail, evaluation({ freeSlotClaims: [{ slotId: "free.route_gap", value: "沿北侧围栏步行八分钟" }] }));
  assert.equal(profile.freeSlots.find((slot) => slot.slotId === "free.route_gap").value, "沿北侧围栏步行八分钟");

  const restoredProfile = JSON.parse(JSON.stringify(profile));
  const restored = new JudgeAgent(campaign, restoredProfile);
  restored.restore(JSON.parse(JSON.stringify(judge.snapshot())));
  assert.equal(restored.profile.freeSlots.find((slot) => slot.slotId === "free.route_gap").value, "沿北侧围栏步行八分钟");
}

{
  const profile = makeInfiltratorProfile(campaign);
  const judge = new JudgeAgent(campaign, profile);
  answer(judge, profile.cover.identity, evaluation());
  answer(judge, profile.cover.route, evaluation());
  assert.equal(profile.freeSlots.find((slot) => slot.slotId === "free.route_gap").value, "", "照抄固定路线不能锁定自由口径");
}

{
  const profile = makeInfiltratorProfile(campaign);
  const judge = new JudgeAgent(campaign, profile);
  answer(judge, profile.cover.identity, evaluation());
  answer(judge, "不知道，但我在十九点十分走到了入口。", evaluation({ relevance: 1, specificity: 1, evasiveness: 2 }));
  assert.equal(profile.freeSlots.find((slot) => slot.slotId === "free.route_gap").value, "", "明显回避的回答不能锁定自由口径");
}

{
  const judge = new JudgeAgent(campaign, makeInfiltratorProfile(campaign));
  for (let index = 0; index < 8; index += 1) answer(judge, `第${index + 1}项回答包含登记时间和单位记录。`, evaluation());
  assert.equal(judge.currentPrompt.source, "verification", "没有即时追问时第九轮应复核最弱主题");
  answer(judge, "补充此前最薄弱主题的可核验记录。", evaluation());
  assert.equal(judge.currentPrompt.source, "final", "第十轮必须进入最终补充");
  assert.equal(judge.currentQuestion(), JUDGE_FINAL_QUESTION);
}

{
  const officer = new WorldController(campaign.id);
  officer.start();
  assert.equal(officer.status, "active", "执行官模式应直接进入十人名单");
  assert.equal(officer.agents.length, 10, "执行官模式必须同时生成十名候选人");
  assert.ok(officer.relationshipGroups.length >= 2 && officer.relationshipGroups.length <= 4, "每局应生成 2 至 4 组熟人关系");
  assert.ok(officer.relationshipGroups.some((group) => group.members.length >= 2), "关系组至少包含两名成员");
  assert.ok(officer.agents.some((agent) => agent.dossier.relationships.length > 0), "候选人档案应包含各自所知的关系组片段");
  assert.ok(officer.agents.some((agent) => agent.dossier.testimonyPlan?.disclosureTriggers?.length >= 2), "候选人应拥有预备口径和泄露触发器");

  const first = officer.agents[0];
  for (let index = 0; index < 12; index += 1) first.respond(`第${index + 1}次追问：请补充你知道的时间和关系细节。`);
  assert.equal(first.round, 12, "执行官盘问不应有十轮上限");
  assert.equal(officer.switchCandidate(1), true, "可以从名单切换到任意候选人");
  assert.equal(officer.agent, officer.agents[1]);
  assert.equal(officer.toggleSelection(1), true, "活动阶段即可编辑扣留名单");
  assert.equal(officer.submitSelections(), true, "未盘问完十人也可以提交名单");
  assert.equal(officer.status, "complete");
}

{
  const officer = new WorldController(campaign.id);
  officer.start();
  officer.agents[0].respond("你从哪里来？");
  officer.currentIndex = 2;
  officer.agents[2].respond("你认识谁？");
  const restored = WorldController.restore({ campaignId: campaign.id, status: "active", currentIndex: 0, roster: officer.roster, relationshipGroups: officer.relationshipGroups, agentStates: officer.agents.map((agent) => agent.snapshot()), selectedTargets: [] });
  assert.equal(restored.relationshipGroups[0].factId, officer.relationshipGroups[0].factId, "恢复存档不得重新生成关系事实");
  assert.equal(restored.agents[0].round, 1, "恢复存档应保留各人物独立对话轮数");
  assert.equal(restored.agents[2].round, 1, "恢复存档应保留其他人物的独立对话轮数");
}

  console.log("judge-state: all assertions passed");
}

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const browserEntry = 'const app = document.querySelector("#app");';
const browserEntryIndex = appSource.indexOf(browserEntry);
if (browserEntryIndex < 0) throw new Error("无法定位 app.js 的浏览器入口");

vm.runInNewContext(
  `${appSource.slice(0, browserEntryIndex)}\n(${runCases.toString()})();`,
  { assert: require("node:assert/strict"), console, setTimeout, clearTimeout, fetch: () => Promise.resolve({ ok: true }), persistSession() {}, clearPersistedSession() {}, localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} } },
  { filename: "judge-state.bundle.js" },
);
