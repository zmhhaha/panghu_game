const CAMPAIGNS = [
  {
    id: "gestapo",
    code: "德国安全警察 · 1933—1945",
    name: "盖世太保",
    roman: "GESTAPO",
    era: "1933—1945 · 德国与占领区",
    setting: "柏林外环铁路检查站",
    sceneCaption: "柏林外环 · 23:40",
    description: "政治警察体系下的夜间身份核验。每一个盖章、口音和路线都可能把人推向另一条命运线。",
    briefing: "战时交通线正在收紧。你要在换岗前完成十名来客的初筛，找出借运输身份进入城市的地下联络者。",
    historical: "本机构背景聚焦纳粹德国的警察国家、占领区通行制度与抵抗网络，不把机构的暴力权力包装成英雄能力。",
    targetLabel: "地下抵抗联络者",
    terms: ["通行证", "铁路检查", "占领区", "地下联络"],
    route: "东线货运支线",
    office: "铁路警察档案室",
    authority: "地区安全警察办公室",
    names: ["弗里茨·霍夫曼", "伊尔莎·克莱因", "奥托·魏斯", "玛尔塔·布鲁恩", "海因里希·沃格尔", "格蕾塔·鲍姆", "保罗·里希特", "安雅·福格尔", "卡尔·梅尔滕斯", "克拉拉·诺伊曼"],
  },
  {
    id: "kgb",
    code: "苏联国家安全 · 1954—1991",
    name: "克格勃",
    roman: "KGB",
    era: "1954—1991 · 苏联",
    setting: "西部边境封闭城市入口",
    sceneCaption: "西部边境区 · 01:15",
    description: "冷战反间谍体系中的许可检查。证件上的一枚印章，可能比一个人的解释更有分量。",
    briefing: "边境区刚结束一次无线电静默。十名旅客会在凌晨进入封闭城市，其中一人携带的不是行李，而是一段尚未确认的联络链。",
    historical: "本机构背景使用冷战时期的边境、出入许可与反间谍制度背景，区分克格勃成立后的机构称谓与更早的安全机关沿革。",
    targetLabel: "未经许可的外部联络者",
    terms: ["出入许可", "边境区", "无线电静默", "反间谍处"],
    route: "第七边境铁路",
    office: "封闭城市登记处",
    authority: "州安全委员会边境处",
    names: ["谢尔盖·莫罗佐夫", "妮娜·别洛娃", "尤里·彼得罗夫", "加林娜·奥尔洛娃", "安东·索科洛夫", "维拉·卡尔波娃", "帕维尔·列文", "伊琳娜·马尔科娃", "维克托·达尼洛夫", "奥尔加·佐林"],
  },
  {
    id: "juntong",
    code: "战时军事调查 · 1938—1946",
    name: "军统",
    roman: "JUNTONG",
    era: "1938—1946 · 国民政府战时体系",
    setting: "重庆南岸交通线检查站",
    sceneCaption: "重庆南岸 · 22:05",
    description: "抗战时期的交通、军政与情报网络交错在一起。一个熟悉地名的人未必站在你这一边。",
    briefing: "陪都的夜雨让交通线变得拥挤。十名来客要通过南岸检查站，你需要找出伪装成运输人员的渗透者，同时避免误伤真正的难民与联络员。",
    historical: "本机构背景采用抗战时期国民政府军事委员会调查统计局的历史语境，展现战时情报、日伪渗透与军政关系的复杂性。",
    targetLabel: "日伪渗透人员",
    terms: ["交通线", "陪都", "军政联络", "战时通行证"],
    route: "嘉陵江水陆联运线",
    office: "南岸交通站档案室",
    authority: "军事委员会调查统计局交通处",
    names: ["陈复生", "沈月华", "林沧海", "赵文达", "何素琴", "唐景仪", "罗启明", "方若兰", "黄绍安", "顾怀远"],
  },
  {
    id: "zhongtong",
    code: "党务调查系统 · 1938—1945",
    name: "中统",
    roman: "ZHONGTONG",
    era: "1938—1945 · 国统区党务情报",
    setting: "昆明城北党政机关入口",
    sceneCaption: "昆明北门 · 20:50",
    description: "党务情报网络里的审查更接近关系学。职务、介绍信和谁愿意替你说话同样重要。",
    briefing: "一份组织名单在转运途中失去了一页。十名来客将在城北入口接受盘查，其中一人正在寻找名单上的缺口。",
    historical: "本机构背景采用中国国民党中央执行委员会调查统计局的党务情报语境，并把它与军统的军事调查职责区分开。",
    targetLabel: "组织名单窃取者",
    terms: ["介绍信", "党务关系", "组织名单", "机关门禁"],
    route: "滇缅公路东段",
    office: "城北党务登记处",
    authority: "中央执行委员会调查统计局联络科",
    names: ["李伯衡", "周婉秋", "徐景明", "宋致远", "许兰芝", "严克俭", "陆绍棠", "孟秋白", "蒋维新", "林佩珊"],
  },
  {
    id: "cia",
    code: "美国中央情报局 · 1947—1975",
    name: "中央情报局",
    roman: "CIA",
    era: "1947—1975 · 美国与西欧",
    setting: "西柏林联络站入口",
    sceneCaption: "西柏林 · 00:25",
    description: "混合冷战背景下的国内反共筛查。真正危险的不是带着密码的人，而是知道谁会替他担保的人。",
    briefing: "华盛顿的内部名单出现缺口。十名来客会在夜间进入联邦办公区，其中有人与美国共产主义组织保持秘密联络，你要在不看标签的情况下找出他。",
    historical: "本机构背景参考中央情报局成立后的冷战早期与欧洲联络网络；本作采用架空设定，让 CIA 承担美国国内反共筛查任务，现实中的国内调查分工并不完全如此。",
    terms: ["忠诚调查", "共产主义组织", "安全许可", "线人网络"],
    route: "华盛顿—纽约铁路联络线",
    office: "国内安全审查处",
    authority: "中央情报局国内联络组",
    targetLabel: "美国共产主义分子",
    names: ["托马斯·里德", "伊莱恩·哈里斯", "彼得·沃格特", "玛格丽特·科尔", "詹姆斯·贝克", "安娜·克劳斯", "威廉·格林", "苏珊·米勒", "罗伯特·海因斯", "露丝·卡特"],
  },
];

const NPC_BLUEPRINTS = [
  { id: "printer", role: "印刷厂校样员", origin: "西站货运线", target: true, public: "携带一只装满校样纸的旧公文包", signature: "把机关公文里的新称呼说得过分自然", tell: "时间线和证件上的岗位交接对不上" },
  { id: "nurse", role: "临时护士", origin: "南郊疗养院", target: false, public: "手提药箱，袖口有消毒水气味", signature: "会因为担心药品保存而打断盘查", tell: "能对上值班交接和药箱封签" },
  { id: "mechanic", role: "机车检修学徒", origin: "北线车辆段", target: false, public: "手指有油污，带着一只拆开的扳手盒", signature: "说起机器时比说起自己更有耐心", tell: "能解释检修记录里的小故障" },
  { id: "courier", role: "私人电台技师", origin: "西部公路检查点", target: true, public: "坚持自己只有普通修理工具", signature: "回避任何具体的接头时间", tell: "对岗亭换岗和无线电术语过于熟悉" },
  { id: "teacher", role: "临时教员", origin: "城南学校", target: false, public: "夹着一沓学生作业和一枚旧印章", signature: "会纠正地名读法，但不喜欢谈政治", tell: "学生姓名、校舍位置和来访日期一致" },
  { id: "merchant", role: "药品商行会计", origin: "东线货站", target: false, public: "主动把账本和税票放到桌上", signature: "对箱号和金额极其敏感", tell: "票据的顺序能被货运档案复核" },
  { id: "actor", role: "剧团替补演员", origin: "南门剧院区", target: true, public: "穿着不合身的演出服，声称只是临时替补", signature: "记得台词，却记不住后台的生活细节", tell: "公开身份和剧团当晚的演出安排冲突" },
  { id: "surveyor", role: "水文测绘员", origin: "河堤巡测线", target: false, public: "鞋底有湿泥，记录簿边缘微微卷曲", signature: "会先讲潮位和河流，再回答私人问题", tell: "测绘数据与公开水务记录吻合" },
  { id: "archivist", role: "旧档案修复员", origin: "东郊档案库", target: true, public: "携带没有编号的空白文件夹", signature: "对档案分类和机关旧称很熟，却混淆了当日路线", tell: "解释不出文件夹为什么没有入库章" },
  { id: "botanist", role: "植物标本采集员", origin: "西坡林场", target: false, public: "手提箱里有湿润泥土和压好的叶片", signature: "说起植物时会忘记保持警惕", tell: "采集许可、天气和绕行路线相互印证" },
];

const TOPICS = [
  { id: "identity", label: "身份与职责", keys: ["身份", "职业", "做什么", "姓名", "工作"] },
  { id: "route", label: "路线与时间", keys: ["路线", "从哪里", "几点", "车", "站", "路"] },
  { id: "document", label: "证件与物品", keys: ["证件", "文件", "印章", "箱子", "行李", "票"] },
  { id: "contact", label: "接头与关系", keys: ["谁", "接头", "认识", "联络", "朋友", "见面"] },
  { id: "local", label: "本地细节", keys: ["本地", "地名", "方言", "街", "天气", "习惯"] },
  { id: "purpose", label: "来访目的", keys: ["为什么", "目的", "要去", "来做", "留下"] },
  { id: "pressure", label: "压力测试", keys: ["如果", "扣留", "害怕", "紧张", "隐瞒", "最后"] },
];

const ordinaryLines = [
  (d, c) => `我叫${d.name}，是${d.role}。这次进城的事不复杂，${d.public}，东西都在这里。`,
  (d, c) => `我从${d.origin}过来，先走${c.route}，在旧检查棚换了一次车。大约是傍晚六点以后。`,
  (d, c) => `证件在这儿。你可以记下编号，至于那只箱子，里面是工作用品，封条没有动过。`,
  (d, c) => `我昨天还在原来的地方值班，交接的人是同一班的老同事。你们若要核对，找${c.office}就能查到。`,
  (d, c) => `我要见的是${d.id === "nurse" ? "疗养院的值班医生" : d.id === "merchant" ? "商行掌柜" : "我所在单位的负责人"}，不是秘密接头。时间晚了，只是怕耽误工作。`,
  (d, c) => `来这里是为了把事情办完。${d.role}的工作没有什么戏剧性，按清单来，按手续回去。`,
  (d, c) => `这座城的地名我能说清，但我不靠背口号过日子。要是你问${c.setting}附近的路，我只知道我真正走过的那一段。`,
  (d, c) => `我不认识${c.authority}里的人，最多见过窗口工作人员。我的关系都在公开的工作记录里。`,
  (d, c) => `我理解你要谨慎。你可以再问一遍，我前面说的时间、地点和物品不会变。`,
  (d, c) => `如果手续已经齐了，我想尽快过去。需要补充什么就写下来，我愿意留下可以复核的细节。`,
];

const targetLines = [
  (d, c) => `姓名和职业都在证件上。${d.public}，只是例行运送，不值得让你们浪费时间。`,
  (d, c) => `我从${d.origin}过来，路线很直，先走${c.route}。具体换车点我记不清，夜里看什么都差不多。`,
  (d, c) => `证件没有问题，箱子也只是工具。编号这种细节你们可以自己抄，我不想在这里把东西一件件摊开。`,
  (d, c) => `昨天的安排临时变过几次。我只负责执行，不负责记住每个交接人的名字，档案不一定跟得上现场。`,
  (d, c) => `我会和一个熟人碰面，姓名暂时不方便说。等我到${c.setting}附近，他自然会认出我。`,
  (d, c) => `我的目的就是办事，不需要把每一步都解释给你。越是把简单事情说复杂，越容易引来不必要的注意。`,
  (d, c) => `本地人怎么叫这里并不重要，文件上写什么我就用什么。你若要考我地名，我没有兴趣配合。`,
  (d, c) => `我没和${c.authority}打过交道，也不清楚你们内部的称呼。你们要的是身份，不是我的工作经历。`,
  (d, c) => `扣留我只会耽误一件本来能按时完成的事。你们已经问了很多，答案没有必要再换一种说法。`,
  (d, c) => `我能说的都说了。放行之后不会有人因为我来过这里而受牵连，你们也不必把今晚记得太清楚。`,
];

function cloneCampaign(id) {
  return CAMPAIGNS.find((campaign) => campaign.id === id) || CAMPAIGNS[0];
}

function inferTopic(text) {
  const normalized = String(text || "").toLowerCase();
  return TOPICS.find((topic) => topic.keys.some((key) => normalized.includes(key)))?.id || "general";
}

function topicLabel(id) {
  return TOPICS.find((topic) => topic.id === id)?.label || "综合观察";
}

async function requestNpcReply(controller, question, answer) {
  const response = await fetch("/api/npc/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaign: { name: controller.campaign.name, era: controller.campaign.era, setting: controller.campaign.setting },
      dossier: { name: controller.dossier.name, role: controller.dossier.role, origin: controller.dossier.origin, public: controller.dossier.public, signature: controller.dossier.signature, tell: controller.dossier.tell, isTarget: controller.dossier.isTarget },
      round: answer.round,
      question,
      history: controller.logs,
      fallback: answer.text,
    }),
  });
  if (!response.ok) throw new Error(`NPC API ${response.status}`);
  const payload = await response.json();
  if (!payload.speech) throw new Error("NPC API 返回为空");
  return payload;
}

function makeDossier(campaign, blueprint, index) {
  const persona = { ...blueprint, name: campaign.names[index] };
  const lines = (blueprint.target ? targetLines : ordinaryLines).map((line) => line(persona, campaign));
  const cautionRounds = blueprint.target ? [1, 2, 4, 5, 7, 9] : [2, 4, 6, 8];
  const observations = lines.map((_, roundIndex) => {
    const topic = ["identity", "route", "document", "route", "contact", "purpose", "local", "contact", "pressure", "pressure"][roundIndex];
    const caution = cautionRounds.includes(roundIndex + 1);
    return {
      topic,
      label: caution ? (blueprint.target ? "细节待复核" : "叙述略显保守") : (blueprint.target ? "表面一致" : "细节吻合"),
      level: caution ? (blueprint.target ? "caution" : "neutral") : (blueprint.target ? "neutral" : "good"),
    };
  });
  const topicReplies = blueprint.target ? {
    identity: [
      `我叫${campaign.names[index]}，是${blueprint.role}。职业和姓名都写在证件上，没什么好补充的。`,
      `你问的是我的身份，不是我的想法。我的工作内容很普通，按${campaign.authority}的要求办事。`,
    ],
    route: [
      `我从${blueprint.origin}来，沿${campaign.route}进城。夜里换过一次车，具体是哪一段我不想凭印象乱说。`,
      `路线我已经说过了，${campaign.route}。你若要精确到每个路口，应该去查站务记录，不该靠我回忆。`,
    ],
    document: [
      `证件是真的，至少我拿到它时是真的。编号你可以抄，箱子里只是工作用品，我不接受把每样东西都拆开。`,
      `那张介绍材料由上面发出，盖章的人不是我。你要核对就找${campaign.office}，不要让我替档案室解释。`,
    ],
    contact: [
      `我到${campaign.setting}附近会和一个熟人碰面，姓名不能在这里说。需要联系时，他会知道找谁。`,
      `你问了第二遍还是同一个答案：我不记陌生人的名字，也不会把联络安排写在纸上。`,
    ],
    local: [
      `这里的地名按文件上的称呼来就好。口头叫法每天都在变，我没有必要证明自己像个本地人。`,
      `我来过这附近，但只记得主路和岗亭。小巷、旧称和街坊习惯不在我的工作范围里。`,
    ],
    purpose: [
      `我进城是为了把一件工作交到该交的人手里。事情完成后就走，不想让普通任务变成一份长报告。`,
      `目的没有更多层次：送到、确认、离开。你若把每个停留都当成暗号，谁都会显得可疑。`,
    ],
    pressure: [
      `你可以扣留我，但那会让另一件事错过时间。别把我的不耐烦当成承认，我只是想结束这场盘查。`,
      `我已经回答了十轮，答案没有改变。你要的是一个方便的结论，而不是事实本身。`,
    ],
    general: lines,
  } : {
    identity: [
      `我叫${campaign.names[index]}，是${blueprint.role}。如果要核对，我的单位和工牌都在这里。`,
      `我的工作不需要秘密身份，${blueprint.role}就是我每天做的事。你可以先记下姓名，再查档案。`,
    ],
    route: [
      `我从${blueprint.origin}出发，沿${campaign.route}过来，在旧检查棚换车。大约是傍晚六点以后。`,
      `如果你们去查${campaign.route}的记录，会看到我说的时间。中途有一段施工，我绕到主路才赶上车。`,
    ],
    document: [
      `证件在这儿，编号、封签和携带物都可以登记。那只箱子装的是工作用品，没有夹层。`,
      `票据上的数字和箱号是连着的。我愿意把它们留在${campaign.office}复核，免得你们还要追着我问。`,
    ],
    contact: [
      `我要见的是单位里的负责人，不是秘密接头。你查${campaign.office}的值班名单，应该能找到那个人。`,
      `我没有需要隐藏的联络人。若有人替我担保，也会通过公开的工作关系，而不是在暗处叫住我。`,
    ],
    local: [
      `我不敢说自己熟悉整座城，只知道${campaign.setting}附近的主路。刚才那条小巷我还是问了路才走过去的。`,
      `本地人会用另一个旧称叫这条街，我是在工作时听来的。你要核对发音，我可以说出我真正去过的地方。`,
    ],
    purpose: [
      `我是来把工作办完的。手续齐了就回去，耽误太久反而会让药品、账目或标本出问题。`,
      `你问得很合理，但我的目的确实只有这一件。要是还有别的安排，我不会把可以复核的细节都带在身上。`,
    ],
    pressure: [
      `你们可以继续核对，我只希望别让需要交接的人等太久。紧张不等于隐瞒，夜里被拦下谁都会不舒服。`,
      `如果还缺一项材料，请直接写下来。我愿意等复核结果，也愿意让${campaign.office}的人来确认。`,
    ],
    general: lines,
  };
  const topicObservations = blueprint.target ? {
    identity: { topic: "identity", label: "身份表述偏硬", level: "neutral" },
    route: { topic: "route", label: "路线细节待复核", level: "caution" },
    document: { topic: "document", label: "证件核验受阻", level: "caution" },
    contact: { topic: "contact", label: "关系信息回避", level: "caution" },
    local: { topic: "local", label: "本地知识有限", level: "neutral" },
    purpose: { topic: "purpose", label: "目的表述抽象", level: "neutral" },
    pressure: { topic: "pressure", label: "压力反应升高", level: "caution" },
  } : {
    identity: { topic: "identity", label: "身份细节清楚", level: "good" },
    route: { topic: "route", label: "路线可以复核", level: "good" },
    document: { topic: "document", label: "证件愿意核对", level: "good" },
    contact: { topic: "contact", label: "关系链公开", level: "good" },
    local: { topic: "local", label: "本地细节自然", level: "neutral" },
    purpose: { topic: "purpose", label: "目的符合身份", level: "good" },
    pressure: { topic: "pressure", label: "配合复核", level: "neutral" },
  };
  return {
    id: `${campaign.id}-${blueprint.id}-${index + 1}`,
    name: campaign.names[index],
    role: blueprint.role,
    origin: blueprint.origin,
    public: blueprint.public,
    signature: blueprint.signature,
    tell: blueprint.tell,
    isTarget: blueprint.target,
    lines,
    observations,
    topicReplies,
    topicObservations,
  };
}

class NpcAgent {
  constructor(dossier) {
    this.dossier = dossier;
    this.round = 0;
    this.memory = [];
  }

  respond(question) {
    if (this.round >= 10) throw new Error("该 NPC 已完成十轮对话");
    const topic = inferTopic(question);
    const index = this.round;
    const topicBank = this.dossier.topicReplies[topic] || this.dossier.topicReplies.general;
    const previousTopicCount = this.memory.filter((item) => item.topic === topic).length;
    let text = topicBank[previousTopicCount % topicBank.length] || this.dossier.lines[index];
    if (previousTopicCount > 0 && topic !== "general") {
      text = `你刚才已经问过${topicLabel(topic)}。${text}`;
    }
    if (this.round >= 7 && topic === "pressure") {
      text = `${text} 现在轮到你把记录写清楚了。`;
    }
    const observation = this.dossier.topicObservations[topic] || { ...this.dossier.observations[index], topic: this.dossier.observations[index].topic };
    this.round += 1;
    this.memory.push({ question, answer: text, topic, round: this.round });
    return { text, round: this.round, observation };
  }

  snapshot() {
    return { round: this.round, memory: this.memory };
  }

  restore(snapshot) {
    this.round = snapshot?.round || 0;
    this.memory = (snapshot?.memory || []).map((item) => ({
      ...item,
      answer: String(item.answer || "").replaceAll("undefined", this.dossier.name),
    }));
  }
}

class WorldController {
  constructor(campaignId = CAMPAIGNS[0].id) {
    this.mode = "officer";
    this.campaign = cloneCampaign(campaignId);
    this.agents = NPC_BLUEPRINTS.map((blueprint, index) => new NpcAgent(makeDossier(this.campaign, blueprint, index)));
    this.status = "briefing";
    this.currentIndex = 0;
    this.logs = [];
    this.observations = [];
    this.decisions = [];
    this.lastDecision = null;
    this.awaitingNext = false;
    this.pending = false;
  }

  start() {
    this.status = "active";
    this.save();
  }

  get agent() {
    return this.agents[this.currentIndex];
  }

  get dossier() {
    return this.agent.dossier;
  }

  async ask(question) {
    const cleanQuestion = String(question || "").trim();
    if (this.status !== "active" || this.awaitingNext || this.pending || !cleanQuestion || this.agent.round >= 10) return false;
    this.pending = true;
    const answer = this.agent.respond(cleanQuestion);
    this.logs.push({ speaker: "player", text: cleanQuestion, round: answer.round });
    try {
      const remote = await requestNpcReply(this, cleanQuestion, answer);
      answer.text = remote.speech;
      this.agent.memory[this.agent.memory.length - 1].answer = answer.text;
    } catch (error) {
      console.warn("[TeWu Agent] 使用本地降级回答", error);
    }
    this.logs.push({ speaker: "npc", text: answer.text, round: answer.round });
    this.observations.push(answer.observation);
    this.pending = false;
    this.save();
    return true;
  }

  decide(action) {
    if (this.status !== "active" || this.awaitingNext || this.agent.round < 2) return false;
    const correct = (action === "detain" && this.dossier.isTarget) || (action === "release" && !this.dossier.isTarget);
    this.lastDecision = { action, correct, name: this.dossier.name, isTarget: this.dossier.isTarget, tell: this.dossier.tell };
    this.decisions.push(this.lastDecision);
    this.awaitingNext = true;
    this.save();
    return true;
  }

  next() {
    if (!this.awaitingNext) return false;
    if (this.currentIndex >= this.agents.length - 1) {
      this.status = "complete";
      this.save();
      return true;
    }
    this.currentIndex += 1;
    this.logs = [];
    this.observations = [];
    this.lastDecision = null;
    this.awaitingNext = false;
    this.save();
    return true;
  }

  accuracy() {
    return this.decisions.length ? (this.decisions.filter((decision) => decision.correct).length / this.decisions.length) * 100 : 0;
  }

  save() {
    const snapshot = {
      mode: this.mode,
      campaignId: this.campaign.id,
      status: this.status,
      currentIndex: this.currentIndex,
      logs: this.logs,
      observations: this.observations,
      decisions: this.decisions,
      lastDecision: this.lastDecision,
      awaitingNext: this.awaitingNext,
      agentStates: this.agents.map((agent) => agent.snapshot()),
    };
    localStorage.setItem("tewu-session", JSON.stringify(snapshot));
  }

  static restore(snapshot) {
    const controller = new WorldController(snapshot.campaignId);
    controller.status = snapshot.status || "briefing";
    controller.currentIndex = snapshot.currentIndex || 0;
    controller.logs = (snapshot.logs || []).map((line) => ({
      ...line,
      text: String(line.text || "").replaceAll("undefined", controller.dossier.name),
    }));
    controller.observations = snapshot.observations || [];
    controller.decisions = snapshot.decisions || [];
    controller.lastDecision = snapshot.lastDecision || null;
    controller.awaitingNext = Boolean(snapshot.awaitingNext);
    controller.agents.forEach((agent, index) => agent.restore(snapshot.agentStates?.[index]));
    return controller;
  }
}

const JUDGE_QUESTIONS = [
  { topic: "identity", make: (campaign, profile) => `先说清楚：你的姓名、职业，以及你声称所属的单位。` },
  { topic: "route", make: (campaign, profile) => `你从哪里进入这座城市？请按顺序说出经过的路线和最后一次换车。` },
  { topic: "document", make: (campaign, profile) => `把证件和随身物品放到桌面上。编号、封签和用途分别是什么？` },
  { topic: "chronology", make: (campaign, profile) => `从昨天晚上到现在，你见过哪些人？时间点不要用“大概”带过。` },
  { topic: "contact", make: (campaign, profile) => `你进城后要找谁？如果对方没有出现，你会通过什么公开渠道联系他？` },
  { topic: "purpose", make: (campaign, profile) => `你来这里真正要完成的事情是什么？说出一个可以被档案核验的结果。` },
  { topic: "local", make: (campaign, profile) => `说一个只有真正来过${campaign.setting}的人才会注意到的细节。` },
  { topic: "chronology", make: (campaign, profile) => `把你刚才的路线再复述一遍：哪一段最容易被记录证明，哪一段没有记录？` },
  { topic: "pressure", make: (campaign, profile) => `如果现在暂时扣留你，你最担心哪件事被耽误？为什么？` },
  { topic: "pressure", make: (campaign, profile) => `最后一次机会。还有什么必须主动告诉我、但你前面没有说的？` },
];

function makeInfiltratorProfile(campaign) {
  const blueprint = NPC_BLUEPRINTS.find((item) => item.target) || NPC_BLUEPRINTS[0];
  const dossier = makeDossier(campaign, blueprint, 0);
  return {
    name: dossier.name,
    role: dossier.role,
    origin: dossier.origin,
    public: dossier.public,
    expected: {
      identity: [dossier.name, dossier.role, "单位", "工作"],
      route: [dossier.origin, campaign.route, "换车", "车站", "路线"],
      document: ["证件", "编号", "封签", "用途", campaign.office],
      chronology: ["昨天", "今天", "晚上", "傍晚", "交接", "时间"],
      contact: [campaign.office, campaign.authority, "负责人", "联络", "公开"],
      purpose: [dossier.role, "工作", "交接", "办事", "档案"],
      local: [campaign.setting, "主路", "街", "岗亭", "本地"],
      pressure: ["复核", "记录", "等候", "工作", "交接", "可以"],
    },
  };
}

class JudgeAgent {
  constructor(campaign, profile) {
    this.campaign = campaign;
    this.profile = profile;
    this.round = 0;
    this.suspicion = 32;
    this.responses = [];
  }

  currentQuestion() {
    const question = JUDGE_QUESTIONS[this.round];
    return question ? question.make(this.campaign, this.profile) : "审查已经结束。";
  }

  evaluate(answer) {
    if (this.round >= 10) throw new Error("审查已经完成十轮");
    const question = JUDGE_QUESTIONS[this.round];
    const text = String(answer || "").trim();
    const normalized = text.toLowerCase();
    const keywords = this.profile.expected[question.topic] || [];
    const matches = keywords.filter((keyword) => normalized.includes(String(keyword).toLowerCase())).length;
    const evasive = /不知道|不清楚|忘了|没必要|不能说|不方便|随便|无可奉告/.test(text);
    const tooShort = text.length < 8;
    const change = evasive || tooShort ? 10 : matches >= 2 ? -7 : matches === 1 ? -2 : 7;
    this.suspicion = Math.max(0, Math.min(100, this.suspicion + change));
    const note = evasive ? "回答回避了可核验细节" : tooShort ? "回答过短，无法建立事实链" : matches >= 2 ? "回答包含可交叉核对的细节" : matches === 1 ? "回答只有一处可以核对" : "回答没有对上当前档案字段";
    const reaction = this.suspicion >= 65 ? "审查官低头重新看了一遍记录，房间里的停顿变长了。" : this.suspicion <= 28 ? "审查官在纸上做了一个简短标记，语气暂时放缓。" : "审查官没有表态，只把你的回答写进了记录。";
    const result = { round: this.round + 1, topic: question.topic, question: this.currentQuestion(), answer: text, change, note, reaction };
    this.responses.push(result);
    this.round += 1;
    return result;
  }

  verdict() {
    const release = this.suspicion < 56;
    return { action: release ? "release" : "detain", suspicion: this.suspicion, release, reason: release ? "十轮回答形成了基本连贯的身份、路线和关系链。" : "十轮回答里仍有关键字段无法相互印证，审查官选择暂时扣留。" };
  }

  snapshot() {
    return { round: this.round, suspicion: this.suspicion, responses: this.responses };
  }

  restore(snapshot) {
    this.round = snapshot?.round || 0;
    this.suspicion = snapshot?.suspicion ?? 32;
    this.responses = snapshot?.responses || [];
  }
}

class InfiltratorController {
  constructor(campaignId = CAMPAIGNS[0].id) {
    this.mode = "infiltrator";
    this.campaign = cloneCampaign(campaignId);
    this.profile = makeInfiltratorProfile(this.campaign);
    this.judge = new JudgeAgent(this.campaign, this.profile);
    this.status = "briefing";
    this.logs = [];
    this.lastDecision = null;
    this.awaitingNext = false;
  }

  start() {
    this.status = "active";
    this.logs = [{ speaker: "judge", text: `坐下。我们从你的公开身份开始。${this.currentQuestion()}`, round: 0 }];
    this.save();
  }

  currentQuestion() {
    return this.judge.currentQuestion();
  }

  ask(answer) {
    const cleanAnswer = String(answer || "").trim();
    if (this.status !== "active" || this.awaitingNext || !cleanAnswer || this.judge.round >= 10) return false;
    const result = this.judge.evaluate(cleanAnswer);
    this.logs.push({ speaker: "player", text: cleanAnswer, round: result.round });
    this.logs.push({ speaker: "judge", text: result.reaction, round: result.round });
    if (this.judge.round >= 10) {
      this.lastDecision = { ...this.judge.verdict(), name: this.profile.name };
      this.awaitingNext = true;
    }
    this.save();
    return true;
  }

  suspicion() {
    return this.judge.suspicion;
  }

  accuracy() {
    return Math.max(0, 100 - this.judge.suspicion);
  }

  next() {
    if (!this.awaitingNext) return false;
    this.status = "complete";
    this.save();
    return true;
  }

  save() {
    localStorage.setItem("tewu-session", JSON.stringify({
      mode: this.mode,
      campaignId: this.campaign.id,
      status: this.status,
      logs: this.logs,
      lastDecision: this.lastDecision,
      awaitingNext: this.awaitingNext,
      profile: this.profile,
      judge: this.judge.snapshot(),
    }));
  }

  static restore(snapshot) {
    const controller = new InfiltratorController(snapshot.campaignId);
    controller.status = snapshot.status || "briefing";
    controller.logs = snapshot.logs || [];
    controller.lastDecision = snapshot.lastDecision || null;
    controller.awaitingNext = Boolean(snapshot.awaitingNext);
    controller.profile = snapshot.profile || controller.profile;
    controller.judge.profile = controller.profile;
    controller.judge.restore(snapshot.judge);
    return controller;
  }
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const app = document.querySelector("#app");
let selectedCampaignId = CAMPAIGNS[0].id;
let selectedMode = "officer";
let controller = restoreController();

function restoreController() {
  try {
    const raw = localStorage.getItem("tewu-session");
    if (raw) {
      const snapshot = JSON.parse(raw);
      return snapshot.mode === "infiltrator" ? InfiltratorController.restore(snapshot) : WorldController.restore(snapshot);
    }
  } catch (error) {
    localStorage.removeItem("tewu-session");
  }
  return new WorldController();
}

function render() {
  if (controller.status === "briefing") app.innerHTML = renderBriefing();
  else if (controller.mode === "infiltrator") app.innerHTML = controller.status === "complete" ? renderInfiltratorSettlement() : renderInfiltratorGame();
  else if (controller.status === "complete") app.innerHTML = renderSettlement();
  else app.innerHTML = renderGame();
  bindEvents();
}

function renderHeader(showStats = false) {
  const metric = controller.mode === "infiltrator" ? `<span>可疑度 <strong>${controller.suspicion()}%</strong></span>` : `<span>准确率 <strong>${Math.round(controller.accuracy())}%</strong></span>`;
  const exit = controller.status === "active" ? `<button class="header-exit" data-action="exit">退出当前局</button>` : "";
  return `<header class="topbar"><div class="brand"><span class="brand-mark">特</span><div><p class="brand-title">特务</p><p class="brand-subtitle">机构档案 · ${escapeHtml(controller.campaign.name)}</p></div></div><div class="top-meta"><span><i class="lock-dot"></i>通讯加密</span><span>机构 <strong>${escapeHtml(controller.campaign.name)}</strong></span>${showStats ? metric : ""}${exit}</div></header>`;
}

function renderBriefing() {
  const campaign = cloneCampaign(selectedCampaignId);
  const body = `<main class="page"><section class="briefing-grid"><div><p class="eyebrow">主控档案 · 机构选择</p><h1>十个人里，谁不该出现在这里？</h1><p class="briefing-copy">选择一个真实历史机构，进入它的目标群体、审查方式和历史参考。五个机构可以在混合时空设定中共存，十名候选人由相互隔离的角色程序连续扮演。每人十轮问答，之后你必须做出一次不可撤销的处置。</p></div><div class="brief-note"><strong>混合时空设定</strong>主控允许不同机构的历史参考同场出现，但会明确标记哪些内容是史实参考、哪些内容是本作的玩法设定。刷新页面会保留当前机构。</div></section><div class="section-label"><h2>选择机构</h2><span>五个机构 · 目标各不相同</span></div><section class="campaign-grid">${CAMPAIGNS.map((item) => `<button class="campaign-card ${item.id === selectedCampaignId ? "selected" : ""}" data-campaign="${item.id}"><span class="campaign-code">${item.code}</span><h3>${item.name}</h3><span class="campaign-era">${item.era}</span><p>${item.description}</p><span class="campaign-tagline">${item.setting}</span></button>`).join("")}</section><div class="section-label"><h2>选择玩法</h2><span>两种角色视角</span></div><section class="mode-grid"><button class="mode-card ${selectedMode === "officer" ? "selected" : ""}" data-mode="officer"><strong>执行官模式</strong><span>你负责审问十名候选人，最后决定放行或扣留。</span></button><button class="mode-card ${selectedMode === "infiltrator" ? "selected" : ""}" data-mode="infiltrator"><strong>潜伏者模式</strong><span>你接受十轮审查，由审查官程序判定是否放行。</span></button></section><section class="historical-preview"><div class="history-box"><h3>${escapeHtml(campaign.name)} · 主控简报</h3><p>${escapeHtml(campaign.briefing)}</p></div><div class="history-box"><h3>历史边界</h3><p>${escapeHtml(campaign.historical)}</p></div></section><div class="brief-footer"><p>${selectedMode === "infiltrator" ? "你会拿到一份掩护身份，回答十轮追问；审查官会依据回答的一致性、细节和回避程度自动判定。" : "本局固定十名候选人，每名固定十轮问答。第十轮结束后才会解锁“放行”和“扣留”。标准一局共 100 轮对话。"}</p><button class="primary-button" data-action="start">进入 ${escapeHtml(campaign.name)}</button></div><div class="section-label" style="margin-top:17px"><h2>当时会听见的词</h2><span>${escapeHtml(campaign.setting)}</span></div><div class="term-row">${campaign.terms.map((term) => `<span class="term-chip">${escapeHtml(term)}</span>`).join("")}</div></main>`;
  const briefingBody = body.replace("本局固定十名候选人，每名固定十轮问答。第十轮结束后才会解锁“放行”和“扣留”。标准一局共 100 轮对话。", "本局固定十名候选人，每名至少问答两轮。证据足够时可以提前放行或扣留，也可以继续追问至十轮。标准一局最多 100 轮对话。");
  const infiltratorBrief = selectedMode === "infiltrator" ? `<section class="infiltrator-brief"><div><p class="eyebrow">进入前资料 · 潜伏者</p><h2>你要守住的身份</h2><p>${escapeHtml(campaign.briefing)}</p></div><div class="infiltrator-brief-facts"><div><span>机构目标</span><strong>${escapeHtml(campaign.targetLabel || "被审查对象")}</strong></div><div><span>你的处境</span><strong>身份已被注意</strong></div><div><span>审查重点</span><strong>身份、路线、物品、关系与时间</strong></div></div><p class="infiltrator-brief-note">你会以一名普通来客的掩护身份进入检查站。审查官不会提前公布判定标准，回答越具体且前后一致，越有机会获得放行。</p></section>` : "";
  const finalBriefingBody = briefingBody.replace('<section class="historical-preview">', `${infiltratorBrief}<section class="historical-preview">`);
  return `<div class="app-shell">${renderHeader()}${finalBriefingBody}</div>`;
}

function renderGameTop() {
  const done = controller.decisions.length;
  const currentRound = controller.agent.round;
  return `<div class="game-top"><div class="game-top-left"><strong>${String(controller.currentIndex + 1).padStart(2, "0")} / 10</strong><span>${escapeHtml(controller.campaign.setting)} · ${escapeHtml(controller.campaign.name)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${done * 10}%"></div></div><div class="game-stat"><span>回合 <strong>${currentRound} / 10</strong></span><span>已处置 <strong>${done} / 10</strong></span></div></div>`;
}

function renderQueue() {
  return `<div class="panel"><div class="panel-title">候选人队列 / 10</div><div class="queue">${controller.agents.map((agent, index) => `<div class="queue-row ${index === controller.currentIndex ? "current" : ""} ${index < controller.currentIndex ? "done" : ""}"><span class="queue-index">${String(index + 1).padStart(2, "0")}</span><span class="queue-name">${index <= controller.currentIndex ? escapeHtml(agent.dossier.name) : "待接触"}</span><i class="queue-dot"></i></div>`).join("")}</div></div>`;
}

function renderLeftRail() {
  const c = controller.campaign;
  return `<aside><div class="panel"><div class="panel-title">任务简报</div><ul class="brief-list"><li><b>01</b><span>完成十名来客的身份初筛。</span></li><li><b>02</b><span>每名候选人至少完成两轮问答。</span></li><li><b>03</b><span>证据足够时可提前放行或扣留，也可继续追问至十轮。</span></li><li><b>04</b><span>错误处置会记录为误捕或漏网。</span></li></ul></div>${renderQueue()}</aside>`;
}

function renderFacts() {
  const observations = controller.observations;
  const topics = ["route", "document", "contact", "local"];
  return `<div class="facts">${topics.map((topic) => { const found = [...observations].reverse().find((item) => item.topic === topic); return `<div class="fact"><div class="fact-head"><span>${topicLabel(topic)}</span><strong><i class="signal-dot ${found?.level || ""}"></i>${found ? escapeHtml(found.label) : "未核对"}</strong></div><p>${found ? "主控已将这条回答写入事实账本，仍需与其他轮次交叉验证。" : "还没有足够的公开回答建立证据链。"}</p></div>`; }).join("")}</div>`;
}

function renderRightRail() {
  const accuracy = Math.round(controller.accuracy());
  const round = controller.agent.round;
  const alert = Math.min(100, 22 + round * 7 + controller.decisions.filter((item) => !item.correct).length * 5);
  return `<aside><div class="panel"><div class="panel-title">案件状态</div><div class="meter-wrap"><div class="meter-row"><span>本轮警戒</span><strong>${alert}%</strong></div><div class="meter"><div class="alert" style="width:${alert}%"></div></div><div class="meter-row" style="margin-top:13px"><span>行动准确率</span><strong>${accuracy}%</strong></div><div class="meter"><div class="${accuracy >= 70 ? "teal" : "amber"}" style="width:${accuracy}%"></div></div><div class="meter-row" style="margin-top:13px"><span>已完成候选人</span><strong>${controller.decisions.length} / 10</strong></div><div class="meter"><div class="teal" style="width:${controller.decisions.length * 10}%"></div></div></div></div><div class="panel"><div class="panel-title">对话线索</div>${renderFacts()}</div><div class="panel"><div class="panel-title">历史资料</div><div class="facts"><div class="fact"><div class="fact-head"><span>当前地点</span><strong>${escapeHtml(controller.campaign.setting)}</strong></div><p>${escapeHtml(controller.campaign.historical)}</p></div><div class="fact"><div class="fact-head"><span>关键词</span></div><p>${controller.campaign.terms.map((term) => `#${escapeHtml(term)}`).join(" ")}</p></div></div></div></aside>`;
}

function renderDialogueLog() {
  const initial = `<div class="dialogue-line"><span class="line-label">候选人 · 初始陈述</span>${escapeHtml(controller.dossier.public)}。${escapeHtml(controller.dossier.role)}，${escapeHtml(controller.dossier.origin)}。</div>`;
  const lines = controller.logs.map((line) => `<div class="dialogue-line ${line.speaker === "player" ? "player" : ""}"><span class="line-label">${line.speaker === "player" ? `你 · 第 ${line.round} 轮` : `候选人 · 第 ${line.round} 轮`}</span>${escapeHtml(line.text)}</div>`).join("");
  return `${initial}${lines}`;
}

function renderObservationRow() {
  if (!controller.observations.length) return "";
  const recent = controller.observations.slice(-4);
  return `<div class="observation-row">${recent.map((item) => `<span class="observation ${item.level}">${escapeHtml(topicLabel(item.topic))} · ${escapeHtml(item.label)}</span>`).join("")}</div>`;
}

function renderQuestionArea() {
  const round = controller.agent.round;
  if (controller.awaitingNext) return "";
  const decision = round >= 2 ? `<div class="decision-area"><p class="decision-unlock">${round >= 10 ? "十轮回答已完成。" : `已完成 ${round} 轮问答，可根据现有证据提前处置，也可以继续追问。`}请选择放行或扣留。</p><div class="decision-grid"><button class="decision-button release" data-decision="release">放行 · 让他通过</button><button class="decision-button detain" data-decision="detain">扣留 · 交由复核</button></div></div>` : "";
  if (round >= 10) return decision;
  const hints = ["证件和编号怎么核对？", "你从哪里来，几点出发？", "进城后准备和谁见面？", "你对这里的地名熟悉吗？"];
  return `<div class="question-area"><div class="question-head"><strong>与候选人对话</strong><span>已完成 ${round} / 10 轮</span></div><form class="question-form" data-question-form><input class="question-input" name="question" autocomplete="off" placeholder="直接输入你要问的问题……" maxlength="180" /><button class="send-button" type="submit">发送问题</button></form><div class="prompt-chips">${hints.map((hint) => `<button type="button" class="prompt-chip" data-prompt="${escapeHtml(hint)}">${escapeHtml(hint)}</button>`).join("")}</div></div>${decision}`;
}

function renderResult() {
  const result = controller.lastDecision;
  if (!result) return "";
  const outcome = result.correct ? "判断正确" : result.action === "detain" ? "误捕" : "漏网";
  const actual = result.isTarget ? (controller.campaign.targetLabel || "目标") : "普通来客";
  return `<div class="result-box ${result.correct ? "" : "wrong"}"><h3>${outcome} · ${escapeHtml(result.name)} 的档案已核验</h3><p>真实身份：${actual}。主控记录的关键复核点：${escapeHtml(result.tell)}。</p></div><div class="next-row"><button class="next-button" data-action="next">${controller.currentIndex === 9 ? "查看行动结算 →" : "接触下一名候选人 →"}</button></div>`;
}

function renderInterview() {
  const d = controller.dossier;
  const badge = controller.awaitingNext ? "result" : controller.agent.round >= 10 ? "ready" : "";
  const badgeText = controller.awaitingNext ? "已处置" : controller.agent.round >= 10 ? "等待处置" : "对话中";
  return `<section class="interview"><div class="scene"><img src="assets/city-gate.svg" alt="夜间城市入口检查站"/><div class="scene-overlay"></div><span class="scene-caption">${escapeHtml(controller.campaign.sceneCaption)}</span></div><div class="candidate-header"><div><p class="eyebrow">当前候选人 / ${String(controller.currentIndex + 1).padStart(2, "0")}</p><h2>${escapeHtml(d.name)}</h2><p class="candidate-meta">${escapeHtml(d.role)} · 自称来自 ${escapeHtml(d.origin)}</p></div><span class="candidate-badge ${badge}">${badgeText}</span></div><div class="dialogue-log">${renderDialogueLog()}</div>${renderObservationRow()}${controller.awaitingNext ? renderResult() : renderQuestionArea()}</section>`;
}

function renderInfiltratorTop() {
  const round = controller.judge.round;
  const suspicion = controller.suspicion();
  return `<div class="game-top"><div class="game-top-left"><strong>潜伏者</strong><span>${escapeHtml(controller.campaign.setting)} · ${escapeHtml(controller.campaign.name)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${round * 10}%"></div></div><div class="game-stat"><span>已回答 <strong>${round} / 10</strong></span><span>可疑度 <strong>${suspicion}%</strong></span></div></div>`;
}

function renderInfiltratorLeft() {
  const profile = controller.profile;
  return `<aside><div class="panel"><div class="panel-title">掩护身份</div><ul class="brief-list"><li><b>姓名</b><span>${escapeHtml(profile.name)}</span></li><li><b>职业</b><span>${escapeHtml(profile.role)}</span></li><li><b>来处</b><span>${escapeHtml(profile.origin)}</span></li><li><b>携带物</b><span>${escapeHtml(profile.public)}</span></li></ul></div><div class="panel"><div class="panel-title">你的目标</div><div class="facts"><div class="fact"><div class="fact-head"><span>任务</span><strong>保持放行</strong></div><p>回答十轮审查，维持掩护身份的一致性。审查官不会提前告诉你判定规则。</p></div><div class="fact"><div class="fact-head"><span>风险</span><strong>细节越少越可疑</strong></div><p>回避、前后矛盾和无法核对的时间点都会提高可疑度。</p></div></div></div></aside>`;
}

function renderInfiltratorRight() {
  const suspicion = controller.suspicion();
  return `<aside><div class="panel"><div class="panel-title">审查状态</div><div class="meter-wrap"><div class="meter-row"><span>审查官可疑度</span><strong>${suspicion}%</strong></div><div class="meter"><div class="${suspicion >= 56 ? "alert" : suspicion >= 40 ? "amber" : "teal"}" style="width:${suspicion}%"></div></div><div class="meter-row" style="margin-top:13px"><span>剩余回答</span><strong>${10 - controller.judge.round}</strong></div><div class="meter"><div class="teal" style="width:${controller.judge.round * 10}%"></div></div></div></div><div class="panel"><div class="panel-title">审查记录</div><div class="facts"><div class="fact"><div class="fact-head"><span>当前主题</span><strong>${controller.judge.round < 10 ? topicLabel(JUDGE_QUESTIONS[controller.judge.round].topic) : "已结束"}</strong></div><p>${controller.judge.round < 10 ? "回答要尽量给出可被档案或路线核对的具体细节。" : "审查官正在形成最终判定。"}</p></div><div class="fact"><div class="fact-head"><span>审查方式</span><strong>逐轮核验</strong></div><p>审查官会记录你的回答，并比较身份、路线、物品、关系和时间线。</p></div></div></div></aside>`;
}

function renderInfiltratorLog() {
  return controller.logs.map((line) => `<div class="dialogue-line ${line.speaker === "player" ? "player" : ""}"><span class="line-label">${line.speaker === "player" ? `你 · 第 ${line.round} 轮` : `审查官 · ${line.round ? `第 ${line.round} 轮` : "开始"}`}</span>${escapeHtml(line.text)}</div>`).join("");
}

function renderInfiltratorQuestionArea() {
  const round = controller.judge.round;
  if (controller.awaitingNext) return "";
  return `<div class="question-area"><div class="question-head"><strong>审查官提问</strong><span>已回答 ${round} / 10 轮</span></div><div class="judge-prompt">${escapeHtml(controller.currentQuestion())}</div><form class="question-form" data-infiltrator-form><input class="question-input" name="answer" autocomplete="off" placeholder="以你的掩护身份回答……" maxlength="220" /><button class="send-button" type="submit">回答</button></form></div>`;
}

function renderInfiltratorResult() {
  const result = controller.lastDecision;
  if (!result) return "";
  const released = result.action === "release";
  return `<div class="result-box ${released ? "" : "wrong"}"><h3>审查官判定：${released ? "放行" : "扣留"}</h3><p>最终可疑度 ${result.suspicion}%。${escapeHtml(result.reason)}</p></div><div class="next-row"><button class="next-button" data-action="next">查看审查结论 →</button></div>`;
}

function renderInfiltratorInterview() {
  const profile = controller.profile;
  const badge = controller.awaitingNext ? "result" : "";
  const badgeText = controller.awaitingNext ? "已判定" : "接受审查";
  return `<section class="interview"><div class="scene"><img src="assets/city-gate.svg" alt="夜间城市入口检查站"/><div class="scene-overlay"></div><span class="scene-caption">${escapeHtml(controller.campaign.sceneCaption)}</span></div><div class="candidate-header"><div><p class="eyebrow">潜伏者模式 / 掩护身份</p><h2>${escapeHtml(profile.name)}</h2><p class="candidate-meta">${escapeHtml(profile.role)} · 自称来自 ${escapeHtml(profile.origin)}</p></div><span class="candidate-badge ${badge}">${badgeText}</span></div><div class="dialogue-log">${renderInfiltratorLog()}</div>${controller.awaitingNext ? renderInfiltratorResult() : renderInfiltratorQuestionArea()}</section>`;
}

function renderInfiltratorGame() {
  return `<div class="app-shell">${renderHeader(true)}<main class="page">${renderInfiltratorTop()}<div class="game-grid">${renderInfiltratorLeft()}${renderInfiltratorInterview()}${renderInfiltratorRight()}</div></main></div>`;
}

function renderInfiltratorSettlement() {
  const result = controller.lastDecision;
  const released = result?.action === "release";
  const rows = controller.judge.responses.map((item) => `<div class="review-row"><b>${String(item.round).padStart(2, "0")}</b><span>${topicLabel(item.topic)} · ${escapeHtml(item.note)}</span><strong class="review-result ${item.change <= 0 ? "correct" : "wrong"}">${item.change <= 0 ? "降低警戒" : "提高警戒"}</strong></div>`).join("");
  return `<div class="app-shell">${renderHeader(true)}<main class="page"><section class="settlement"><div class="settlement-head"><p class="eyebrow">审查报告 · 已结案</p><h1>${released ? "掩护通过" : "身份暴露"}</h1><p>审查官最终判定：${released ? "放行" : "扣留"}。${escapeHtml(result?.reason || "")}</p></div><div class="score-panel"><div class="grade">${released ? "过" : "疑"}</div><div><div class="score-line"><strong>${controller.suspicion()}%</strong><span>最终可疑度</span></div><div class="score-track"><div style="width:${controller.suspicion()}%"></div></div><p class="score-note">完成十轮回答 · 审查官自动作出判定</p></div></div><div class="stat-grid"><div class="stat-card"><span>审查轮数</span><strong>10</strong></div><div class="stat-card"><span>最终可疑度</span><strong>${controller.suspicion()}%</strong></div><div class="stat-card"><span>审查结果</span><strong>${released ? "放行" : "扣留"}</strong></div><div class="stat-card"><span>回答记录</span><strong>${controller.judge.responses.length}</strong></div></div><div class="review"><h2>逐轮审查记录</h2>${rows}</div><div class="settlement-actions"><button class="secondary-button" data-action="back">返回机构选择</button><button class="primary-button" data-action="restart">重新接受审查</button></div></section></main></div>`;
}

function renderGame() {
  return `<div class="app-shell">${renderHeader(true)}<main class="page">${renderGameTop()}<div class="game-grid">${renderLeftRail()}${renderInterview()}${renderRightRail()}</div></main></div>`;
}

function renderSettlement() {
  const accuracy = Math.round(controller.accuracy());
  const correct = controller.decisions.filter((decision) => decision.correct).length;
  const wrong = controller.decisions.length - correct;
  const detained = controller.decisions.filter((decision) => decision.action === "detain").length;
  const leaked = controller.decisions.filter((decision) => !decision.correct && decision.action === "release").length;
  const grade = accuracy === 100 ? "S" : accuracy >= 90 ? "A" : accuracy >= 80 ? "B" : accuracy >= 70 ? "C" : accuracy >= 60 ? "D" : "E";
  const summary = grade === "S" ? "十名候选人的处置全部正确，主控将本次行动记为无误判断。" : grade === "A" ? "大部分判断稳健，但仍有少数证据没有及时连成闭环。" : grade === "B" ? "你抓住了部分异常，不过行动记录显示还有明显的复核空档。" : "这次行动留下了较大判断风险，建议回到简报重新检查问题路径。";
  const rows = controller.decisions.map((decision, index) => `<div class="review-row"><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(decision.name)} · ${decision.action === "detain" ? "扣留" : "放行"}</span><strong class="review-result ${decision.correct ? "correct" : "wrong"}">${decision.correct ? "正确" : decision.action === "detain" ? "误捕" : "漏网"}</strong></div>`).join("");
  return `<div class="app-shell">${renderHeader(true)}<main class="page"><section class="settlement"><div class="settlement-head"><p class="eyebrow">行动报告 · 已结案</p><h1>行动结算</h1><p>${summary} 当前机构：${escapeHtml(controller.campaign.name)} · ${escapeHtml(controller.campaign.era)}。</p></div><div class="score-panel"><div class="grade">${grade}</div><div><div class="score-line"><strong>${accuracy}%</strong><span>十次处置的综合准确率</span></div><div class="score-track"><div style="width:${accuracy}%"></div></div><p class="score-note">正确 ${correct} · 错误 ${wrong} · 扣留 ${detained} · 漏网 ${leaked}</p></div></div><div class="stat-grid"><div class="stat-card"><span>正确判断</span><strong>${correct}</strong></div><div class="stat-card"><span>误捕</span><strong>${controller.decisions.filter((item) => !item.correct && item.action === "detain").length}</strong></div><div class="stat-card"><span>漏网</span><strong>${leaked}</strong></div><div class="stat-card"><span>完成对话</span><strong>100</strong></div></div><div class="review"><h2>逐人复盘</h2>${rows}</div><div class="settlement-actions"><button class="secondary-button" data-action="back">返回机构选择</button><button class="primary-button" data-action="restart">重新执行本局</button></div></section></main></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-campaign]").forEach((button) => button.addEventListener("click", () => { selectedCampaignId = button.dataset.campaign; render(); }));
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { selectedMode = button.dataset.mode; render(); }));
  document.querySelector("[data-action=\"start\"]")?.addEventListener("click", () => {
    controller = selectedMode === "infiltrator" ? new InfiltratorController(selectedCampaignId) : new WorldController(selectedCampaignId);
    controller.start();
    render();
  });
  document.querySelector("[data-question-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.question;
    const button = event.currentTarget.querySelector("button");
    if (button) button.disabled = true;
    if (await controller.ask(input.value)) render();
  });
  document.querySelector("[data-infiltrator-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.answer;
    const button = event.currentTarget.querySelector("button");
    if (button) button.disabled = true;
    if (await controller.ask(input.value)) render();
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
    const input = document.querySelector(".question-input");
    if (input) { input.value = button.dataset.prompt; input.focus(); }
  }));
  document.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => { if (controller.decide(button.dataset.decision)) render(); }));
  document.querySelector("[data-action=\"next\"]")?.addEventListener("click", () => { controller.next(); render(); });
  document.querySelector("[data-action=\"restart\"]")?.addEventListener("click", () => { controller = controller.mode === "infiltrator" ? new InfiltratorController(controller.campaign.id) : new WorldController(controller.campaign.id); selectedMode = controller.mode; controller.start(); render(); });
  document.querySelector("[data-action=\"exit\"]")?.addEventListener("click", () => { localStorage.removeItem("tewu-session"); controller = new WorldController(); selectedMode = "officer"; selectedCampaignId = CAMPAIGNS[0].id; render(); });
  document.querySelector("[data-action=\"back\"]")?.addEventListener("click", () => { localStorage.removeItem("tewu-session"); controller = new WorldController(); selectedMode = "officer"; selectedCampaignId = CAMPAIGNS[0].id; render(); });
}

render();
