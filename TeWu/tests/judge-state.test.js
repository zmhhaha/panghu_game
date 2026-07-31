const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function runCases() {
  const campaign = cloneCampaign(CAMPAIGNS[0].id);
  assert.deepEqual(CAMPAIGNS.map((item) => item.id), ["gestapo", "kgb", "tokko", "cia"], "机构顺序或数量异常");
  assert.equal(CAMPAIGNS.find((item) => item.id === "cia").setting, "华盛顿联邦办公区入口");
  assert.match(INSTITUTIONAL_AXES.cia.brief, /麦卡锡主义|忠诚调查/);
  assert.equal(selfLabelsConflict("这项记录确实跟我此前说的对不上。"), true, "目标主动宣布前后矛盾时必须触发重试");
  assert.equal(selfLabelsConflict("我刚才的说法有问题，那不是完整事实。"), true, "目标主动否定此前口供时必须触发重试");
  assert.equal(selfLabelsConflict("记录里确实有那支试管，但它的用途应由领用单解释。"), false, "目标可以承认具体记录并继续维护自身解释");

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
  const targetCount = officer.agents.filter((agent) => agent.dossier.isTarget).length;
  assert.ok(targetCount >= TARGET_COUNT_RANGE.min && targetCount <= TARGET_COUNT_RANGE.max, "每局目标数量必须随机落在公开的 2 至 4 人范围内");
  assert.ok(officer.agents.filter((agent) => agent.dossier.isTarget).every((agent) => agent.dossier.fairnessClue?.kind === "conflict" && agent.dossier.fairnessClue.factId && agent.dossier.fairnessClue.evidence.length), "每名目标必须有固定且可核验的冲突线索");
  assert.ok(officer.agents.filter((agent) => !agent.dossier.isTarget).every((agent) => agent.dossier.fairnessClue?.kind === "closure" && agent.dossier.fairnessClue.resolution && agent.dossier.fairnessClue.evidence.length), "每名普通人必须有能闭环表面异常的记录");
  assert.ok(officer.relationshipGroups.length >= 2 && officer.relationshipGroups.length <= 4, "每局应生成 2 至 4 组熟人关系");
  assert.ok(officer.relationshipGroups.some((group) => group.members.length >= 2), "关系组至少包含两名成员");
  assert.ok(officer.relationshipGroups.every((group) => group.eventId && group.location && group.timeWindow && group.anchorFacts?.length >= 2 && group.sequence?.length >= 2), "关系组应包含具体事件锚点和固定顺序");
  assert.ok(officer.relationshipGroups.every((group) => Object.values(group.memberViews || {}).every((view) => view.knows?.length && view.doesNotKnow?.length && !String(view.summary).includes("我作为"))), "成员视角不得退化为职业模板台词");
  assert.ok(officer.relationshipGroups.every((group) => group.targetRelated === group.members.some((id) => officer.roster.find((item) => item.id === id)?.target)), "关系事件必须根据实际成员重新判定是否涉及目标");
  assert.ok(officer.relationshipGroups.filter((group) => !group.targetRelated).every((group) => group.members.every((id) => !officer.roster.find((item) => item.id === id)?.target)), "普通关系事件不得混入目标");
  assert.ok(officer.relationshipGroups.filter((group) => group.targetRelated).every((group) => group.targetContradiction?.targetId && group.targetContradiction?.recordTruth && group.targetContradiction?.witnessStatement), "目标关系事件必须生成可交叉核对的固定冲突");
  assert.equal(inferTopic("今晚你见过名单里的谁？"), "contact", "常见的见证人问题必须进入关系主题和横向对照板");
  assert.ok(officer.agents.every((agent) => agent.dossier.relationships.every((relationship) => {
    const conflict = relationship.targetContradiction;
    if (!conflict) return true;
    if (conflict.role === "target") return Boolean(conflict.targetClaim && conflict.recordTruth) && !conflict.witnessStatement;
    if (conflict.role === "witness") return Boolean(conflict.witnessStatement) && !conflict.targetClaim && !conflict.recordTruth;
    return false;
  })), "子 Agent 只能读取自己在关系冲突中的目标口径或见证片段");
  assert.ok(officer.relationshipGroups.some((group) => group.targetRelated && group.members.some((id) => officer.roster.find((item) => item.id === id)?.target)), "每局至少要有一组与潜伏目标相关的共同事件");
  assert.ok(officer.relationshipGroups.some((group) => group.members.every((id) => !officer.roster.find((item) => item.id === id)?.target)), "每局至少要有一组普通人的交集事件");
  assert.ok(officer.agents.some((agent) => agent.dossier.relationships.length > 0), "候选人档案应包含各自所知的关系组片段");
  assert.ok(officer.agents.some((agent) => agent.dossier.testimonyPlan?.disclosureTriggers?.length >= 2), "候选人应拥有预备口径和泄露触发器");

  const targetWithClue = officer.agents.find((agent) => agent.dossier.isTarget);
  assert.match(targetWithClue.dossier.tell, /不能同时成立/, "目标的核验要点必须按本局身份生成，不能沿用角色池旧标签");
  const questionByTopic = {
    route: "你从哪里来，几点到达，有什么路线记录？",
    document: "把证件、物品和编号说明清楚。",
    contact: "今晚你认识或见过谁？",
    institution: "你如何证明自己的政治忠诚？",
    general: "请补充可以核验的细节。",
  };
  const targetQuestion = questionByTopic[targetWithClue.dossier.fairnessClue.topic] || questionByTopic.general;
  const targetLead = targetWithClue.prepareResponse(targetQuestion);
  assert.equal(targetLead.fairnessStage, "lead", "目标第一次进入关键主题时应留下可继续核验的引线");
  targetWithClue.commitResponse(targetLead, "第一次固定口径", targetLead.claims);
  const targetReveal = targetWithClue.prepareResponse(targetQuestion);
  assert.equal(targetReveal.fairnessStage, "reveal", "重复追问目标关键主题时必须触发固定冲突");
  assert.ok(targetReveal.disclosureFacts.includes(targetWithClue.dossier.fairnessClue.factId), "目标冲突必须进入本轮允许披露的事实范围");

  const ordinaryWithClue = officer.agents.find((agent) => !agent.dossier.isTarget);
  assert.equal(ordinaryWithClue.dossier.tell, ordinaryWithClue.dossier.fairnessClue.resolution, "普通人的核验要点必须使用本局闭环说明");
  assert.match(ordinaryWithClue.dossier.fairnessClue.resolution, /不能单独证明/, "普通人闭环必须明确区分手续异常与潜伏证据");
  const ordinaryQuestion = questionByTopic[ordinaryWithClue.dossier.fairnessClue.topic] || questionByTopic.general;
  const ordinaryLead = ordinaryWithClue.prepareResponse(ordinaryQuestion);
  assert.equal(ordinaryLead.fairnessStage, "lead", "普通人第一次进入异常主题时应提供核验引线");
  ordinaryWithClue.commitResponse(ordinaryLead, "第一次固定说明", ordinaryLead.claims);
  assert.equal(ordinaryWithClue.prepareResponse(ordinaryQuestion).fairnessStage, "closure", "重复追问普通人关键主题时必须触发闭环解释");

  const targetIndex = officer.agents.indexOf(targetWithClue);
  officer.switchCandidate(targetIndex);
  assert.equal(officer.verifyCurrent(), true, "目标应能执行机构核验");
  const targetVerification = officer.caseClues.find((item) => item.key === `${targetWithClue.dossier.id}:fairness`);
  const ordinaryIndex = officer.agents.indexOf(ordinaryWithClue);
  officer.switchCandidate(ordinaryIndex);
  assert.equal(officer.verifyCurrent(), true, "普通人应能执行机构核验");
  const ordinaryVerification = officer.caseClues.find((item) => item.key === `${ordinaryWithClue.dossier.id}:fairness`);
  [targetVerification, ordinaryVerification].forEach((verification) => {
    assert.equal(verification.label, "记录核验", "核验标题不得暴露内部公平性机制");
    assert.match(verification.text, /^核验类别：.+。.+原始记录：/, "两类候选人必须使用相同的中性核验结构");
    assert.match(verification.text, /候选人相关口供：/, "有口供时应中性并列原始记录和候选人陈述");
    assert.doesNotMatch(verification.text, /表面异常|目标|潜伏|公平核验/, "核验文案不得通过措辞泄露身份类型");
  });

  const first = officer.agents[0];
  const firstStartRound = first.round;
  for (let index = 0; index < 12; index += 1) first.respond(`第${index + 1}次追问：请补充你知道的时间和关系细节。`);
  assert.equal(first.round, firstStartRound + 12, "执行官盘问不应有十轮上限");
  assert.equal(officer.switchCandidate(1), true, "可以从名单切换到任意候选人");
  assert.equal(officer.agent, officer.agents[1]);
  assert.equal(officer.toggleSelection(1), true, "活动阶段即可编辑扣留名单");
  assert.equal(officer.submitSelections(), true, "未盘问完十人也可以提交名单");
  assert.equal(officer.status, "complete");
}

{
  const releaseAll = new WorldController(campaign.id);
  releaseAll.start();
  releaseAll.submitSelections();
  assert.equal(releaseAll.accuracy(), 50, "全部放行的平衡分必须为 50");

  const detainAll = new WorldController(campaign.id);
  detainAll.start();
  detainAll.agents.forEach((_, index) => detainAll.toggleSelection(index));
  detainAll.submitSelections();
  assert.equal(detainAll.accuracy(), 50, "全部扣留的平衡分必须为 50");

  const perfect = new WorldController(campaign.id);
  perfect.start();
  perfect.agents.forEach((agent, index) => { if (agent.dossier.isTarget) perfect.toggleSelection(index); });
  perfect.submitSelections();
  assert.equal(perfect.accuracy(), 100, "完整命中且无误捕时平衡分必须为 100");
  assert.ok(perfect.decisions.every((decision) => decision.review && decision.evidenceSource), "逐人结算必须包含实际冲突或闭环依据及记录来源");
}

{
  for (let run = 0; run < 40; run += 1) {
    const generated = new WorldController(campaign.id);
    const targetCount = generated.roster.filter((item) => item.target).length;
    assert.ok(targetCount >= TARGET_COUNT_RANGE.min && targetCount <= TARGET_COUNT_RANGE.max, "批量生成时目标数量不得越界");
    assert.ok(generated.relationshipGroups.length >= 2 && generated.relationshipGroups.length <= 4, "批量生成时关系组数量不得越界");
    assert.ok(generated.relationshipGroups.some((group) => group.targetRelated), "批量生成时至少保留一组目标关系");
    assert.ok(generated.relationshipGroups.some((group) => !group.targetRelated), "批量生成时至少保留一组普通关系");
    assert.ok(generated.relationshipGroups.every((group) => group.targetRelated === group.members.some((id) => generated.roster.find((item) => item.id === id)?.target)), "批量生成时关系组分类必须与实际成员一致");
  }
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

{
  const failingOfficer = new WorldController(campaign.id);
  failingOfficer.start();
  const beforeMemory = failingOfficer.agents[0].memory.length;
  const beforeLogs = failingOfficer.agents[0].logs.length;
  const completed = await failingOfficer.ask("请说明你从哪里来，几点到达？");
  assert.equal(completed, false, "模型失败时本轮不能伪造成功");
  assert.equal(failingOfficer.agents[0].memory.length, beforeMemory, "模型失败不得写入 NPC memory");
  assert.equal(failingOfficer.agents[0].logs.length, beforeLogs, "模型失败不得写入 NPC logs");
  assert.equal(failingOfficer.draftQuestion, "请说明你从哪里来，几点到达？", "失败问题应保留在输入草稿");
  assert.equal(failingOfficer.requestNotice, "模型正在忙，请稍后再提问");
}

{
  const failingInfiltrator = new InfiltratorController(campaign.id);
  failingInfiltrator.start();
  const beforeRound = failingInfiltrator.judge.round;
  const beforeLogs = failingInfiltrator.logs.length;
  const completed = await failingInfiltrator.ask("我按档案回答，姓名职业和单位都没有变化。");
  assert.equal(completed, false, "审查官模型失败时本轮不能伪造成功");
  assert.equal(failingInfiltrator.judge.round, beforeRound, "审查官模型失败不得推进轮数");
  assert.equal(failingInfiltrator.logs.length, beforeLogs, "审查官模型失败不得写入审查记录");
  assert.equal(failingInfiltrator.draftAnswer, "我按档案回答，姓名职业和单位都没有变化。", "失败回答应保留在输入草稿");
  assert.equal(failingInfiltrator.requestNotice, "模型正在忙，请稍后再提问");
}

  console.log("judge-state: all assertions passed");
}

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server", "server.js"), "utf8");
const browserEntry = 'const app = document.querySelector("#app");';
const browserEntryIndex = appSource.indexOf(browserEntry);
if (browserEntryIndex < 0) throw new Error("无法定位 app.js 的浏览器入口");
const cleanTextStart = serverSource.indexOf("function cleanText");
const cleanTextEnd = serverSource.indexOf("\n\nfunction providerConfig", cleanTextStart);
const conflictGuardStart = serverSource.indexOf("function selfLabelsConflict");
const conflictGuardEnd = serverSource.indexOf("\n\nasync function roleplay", conflictGuardStart);
if ([cleanTextStart, cleanTextEnd, conflictGuardStart, conflictGuardEnd].some((index) => index < 0)) throw new Error("无法定位 server.js 的目标自曝校验器");

vm.runInNewContext(
  `${serverSource.slice(cleanTextStart, cleanTextEnd)}\n${serverSource.slice(conflictGuardStart, conflictGuardEnd)}\n${appSource.slice(0, browserEntryIndex)}\n(async () => { await (${runCases.toString()})(); })();`,
  { assert: require("node:assert/strict"), console, setTimeout, clearTimeout, fetch: () => Promise.resolve({ ok: false, status: 503 }), persistSession() {}, clearPersistedSession() {}, localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} } },
  { filename: "judge-state.bundle.js" },
);
