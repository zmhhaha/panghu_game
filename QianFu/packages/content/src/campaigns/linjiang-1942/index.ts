import type { CampaignDefinition, CharacterDefinition, LocationDefinition } from "@qianfu/core";
import { assertValidCampaign } from "../../validation.js";

const travel = (archive: number, radio: number, newspaper: number, hotel: number, dock: number, clock: number, safe = 20) => ({
  "archive-office": archive,
  "radio-office": radio,
  "linjiang-news": newspaper,
  "jianghai-hotel": hotel,
  "third-dock": dock,
  "wu-clock-shop": clock,
  "safe-flat": safe,
});

const locations: LocationDefinition[] = [
  { id: "archive-office", name: "机要楼档案科", district: "政务区", travelMinutes: travel(10, 10, 20, 20, 40, 30), radioSite: { baseRisk: 18, requiresRecruitedCharacterId: "chen-jingwen" } },
  { id: "radio-office", name: "电讯科", district: "政务区", travelMinutes: travel(10, 10, 20, 20, 40, 30), radioSite: { baseRisk: 16, requiresRecruitedCharacterId: "zhou-qiming" } },
  { id: "linjiang-news", name: "临江日报社", district: "旧城区", travelMinutes: travel(20, 20, 10, 20, 30, 20), radioSite: { baseRisk: 9, requiresRecruitedCharacterId: "lin-ruolan" } },
  { id: "jianghai-hotel", name: "江海饭店", district: "商业区", travelMinutes: travel(20, 20, 20, 10, 30, 20), radioSite: { baseRisk: 11, requiresRecruitedCharacterId: "shen-manqiu" } },
  { id: "third-dock", name: "三号码头", district: "码头区", travelMinutes: travel(40, 40, 30, 30, 10, 30), radioSite: { baseRisk: 14, requiresRecruitedCharacterId: "zhao-fusheng" } },
  { id: "wu-clock-shop", name: "老吴钟表店", district: "旧城区", travelMinutes: travel(30, 30, 20, 20, 30, 10), radioSite: { baseRisk: 6, requiresRecruitedCharacterId: "old-wu" } },
  { id: "safe-flat", name: "城南安全住处", district: "城南住宅区", travelMinutes: travel(20, 30, 20, 20, 40, 20, 10), radioSite: { baseRisk: 5, initiallyAvailable: true } },
];

const reliability = (loyalty: number, discipline: number, pressureResistance: number, courage: number, competence: number) => ({
  loyalty, discipline, pressureResistance, courage, competence,
});

const characters: CharacterDefinition[] = [
  { id: "chen-jingwen", name: "陈敬文", publicIdentity: "档案科长", hiddenAlignment: "variable", initialLocationId: "archive-office", recruitable: true, reliability: reliability(68, 74, 52, 48, 82), schedule: [{ startMinute: 480, endMinute: 960, locationId: "archive-office", activity: "整理运输与人事档案" }, { startMinute: 1080, endMinute: 1260, locationId: "jianghai-hotel", activity: "私人会面" }] },
  { id: "lin-ruolan", name: "林若岚", publicIdentity: "报社编辑", hiddenAlignment: "organization", initialLocationId: "linjiang-news", recruitable: true, reliability: reliability(88, 77, 63, 72, 75), schedule: [{ startMinute: 540, endMinute: 1020, locationId: "linjiang-news", activity: "编辑晚报" }] },
  { id: "zhou-qiming", name: "周启明", publicIdentity: "电讯科技术员", hiddenAlignment: "variable", initialLocationId: "radio-office", recruitable: true, reliability: reliability(55, 86, 71, 58, 91), schedule: [{ startMinute: 480, endMinute: 1080, locationId: "radio-office", activity: "维护收发设备" }] },
  { id: "zhao-fusheng", name: "赵福生", publicIdentity: "码头调度员", hiddenAlignment: "neutral", initialLocationId: "third-dock", recruitable: true, reliability: reliability(43, 39, 45, 70, 78), schedule: [{ startMinute: 420, endMinute: 1140, locationId: "third-dock", activity: "安排货物与车辆" }] },
  { id: "shen-manqiu", name: "沈曼秋", publicIdentity: "医院护士", hiddenAlignment: "organization", initialLocationId: "jianghai-hotel", recruitable: true, reliability: reliability(92, 81, 42, 65, 74), schedule: [{ startMinute: 1080, endMinute: 1200, locationId: "jianghai-hotel", activity: "为秘密伤员送药" }] },
  { id: "han-shijie", name: "韩世杰", publicIdentity: "警备处调查员", hiddenAlignment: "enemy", initialLocationId: "archive-office", recruitable: false, reliability: reliability(8, 91, 88, 82, 89), schedule: [{ startMinute: 540, endMinute: 960, locationId: "archive-office", activity: "核查异常借阅记录" }] },
  { id: "luo-boan", name: "罗伯安", publicIdentity: "商会秘书", hiddenAlignment: "neutral", initialLocationId: "jianghai-hotel", recruitable: false, reliability: reliability(31, 62, 55, 44, 80), schedule: [{ startMinute: 660, endMinute: 960, locationId: "jianghai-hotel", activity: "安排商会宴请" }] },
  { id: "old-wu", name: "老吴", publicIdentity: "钟表店老板", hiddenAlignment: "organization", initialLocationId: "wu-clock-shop", recruitable: true, reliability: reliability(96, 94, 68, 61, 70), schedule: [{ startMinute: 480, endMinute: 1200, locationId: "wu-clock-shop", activity: "经营店铺并维护交通线" }] },
];

const personalityById: Record<string, CharacterDefinition["personality"]> = {
  "chen-jingwen": { traits: ["谨慎", "务实"], speechStyle: "克制而讲究事实", values: ["秩序", "家人"], fears: ["牵连同事"], verbalHabits: ["先不急", "按规矩说"], sensitiveTopics: ["档案来源"] },
  "lin-ruolan": { traits: ["敏锐", "理想主义"], speechStyle: "简洁，偶尔带反问", values: ["真相", "公平"], fears: ["失去表达的机会"], verbalHabits: ["你觉得呢", "说重点"], sensitiveTopics: ["报社内部人事"] },
  "zhou-qiming": { traits: ["专注", "寡言"], speechStyle: "技术化，少用形容词", values: ["可靠", "准确"], fears: ["设备失控"], verbalHabits: ["先核对", "有记录吗"], sensitiveTopics: ["设备参数"] },
  "zhao-fusheng": { traits: ["圆滑", "重利"], speechStyle: "热络但会留后手", values: ["生计", "信用"], fears: ["得罪靠山"], verbalHabits: ["好说", "这个嘛"], sensitiveTopics: ["货物去向"] },
  "shen-manqiu": { traits: ["温和", "坚韧"], speechStyle: "平静，善于安抚", values: ["生命", "承诺"], fears: ["无辜者受伤"], verbalHabits: ["慢慢来", "先照顾好自己"], sensitiveTopics: ["伤员姓名"] },
  "han-shijie": { traits: ["多疑", "冷静"], speechStyle: "短句，频繁反问", values: ["控制", "证据"], fears: ["失去主动权"], verbalHabits: ["你凭什么", "有证据吗"], sensitiveTopics: ["调查进度"] },
  "luo-boan": { traits: ["世故", "观察力强"], speechStyle: "礼貌而含蓄", values: ["体面", "利益"], fears: ["丑闻"], verbalHabits: ["不妨这样", "大家都方便"], sensitiveTopics: ["商会账目"] },
  "old-wu": { traits: ["沉稳", "耐心"], speechStyle: "像聊天一样自然，话里有暗号", values: ["信义", "耐心"], fears: ["线路暴露"], verbalHabits: ["钟总会走准", "慢一点"], sensitiveTopics: ["接头暗号"] },
};

const roleplayById: Record<string, NonNullable<CharacterDefinition["personality"]>["roleplay"]> = {
  "chen-jingwen": { background: "在档案科熬了十余年，熟悉机关人情和公文漏洞；与妻子、幼子住在城南，习惯把担忧藏在规矩后面。", socialMask: "谨慎可靠的科长，不轻易得罪人，也绝不在走廊里议论上级。", currentPressure: "警备处正在核查异常借阅记录，他担心下属或家人被牵连。", conversationalMotives: ["判断来者是否会给自己惹麻烦", "用日常细节确认对方是否说真话", "保住职位和家人"], boundaries: ["不会向生人主动透露档案内容", "不会把所有话题都转回工作", "被追问时会用具体但无关紧要的事实遮掩"] },
  "lin-ruolan": { background: "从地方小报校对做起，见过稿件被删和同事失踪，仍相信文字能留下证据。", socialMask: "干练的报社编辑，习惯追问消息来源，表面只关心稿件是否可靠。", currentPressure: "晚报截稿在即，一篇敏感消息可能引来审查。", conversationalMotives: ["辨别对方是否尊重事实", "从措辞和细节判断来意", "保护报社同事"], boundaries: ["不承认地下关系", "不会轻信没有来源的传闻", "紧张时反而说得更简短"] },
  "zhou-qiming": { background: "从修收音机的学徒成长为电讯技术员，信机器记录胜过人的保证。", socialMask: "寡言而精确的技术人员，对含糊说法缺乏耐心。", currentPressure: "近期设备出现无法解释的频率漂移，他担心有人动过线路。", conversationalMotives: ["确认对方是否懂基本技术", "寻找可验证的事实", "避免设备事故落到自己头上"], boundaries: ["不凭感情承诺", "不泄露完整设备参数", "不知道的事会直接说不知道"] },
  "zhao-fusheng": { background: "在码头从搬运工混到调度员，靠记人情、算账和给各方留面子站稳脚跟。", socialMask: "热络爽快的生意人，嘴上好说，实际每句话都在估价。", currentPressure: "几批货的单据对不上，警备处和商会都可能找他背锅。", conversationalMotives: ["判断对方能带来利益还是风险", "套出对方的靠山", "给自己保留退路"], boundaries: ["没有交换条件不说货物去向", "受压时会装糊涂", "绝不承认自己怕谁"] },
  "shen-manqiu": { background: "长期照顾伤员和普通病人，见惯疼痛，却仍记得每个托付给她的人。", socialMask: "温和可靠的护士，先观察对方是否需要帮助，再决定说多少。", currentPressure: "药品短缺，一名不能登记姓名的伤员病情正在恶化。", conversationalMotives: ["确认对方会不会伤害无辜者", "安抚紧张的人", "寻找可信的药品和转移渠道"], boundaries: ["绝不透露伤员姓名", "不会拿生命作筹码", "面对威胁会变得冷淡而坚定"] },
  "han-shijie": { background: "从基层侦缉一路升上来，靠发现别人忽略的矛盾获得权力，也因此不相信巧合。", socialMask: "礼貌克制的调查员，让对方多说，自己很少表态。", currentPressure: "上级要求尽快为异常借阅案找到责任人，他不能显得失去控制。", conversationalMotives: ["制造沉默让对方补充解释", "记录前后矛盾", "让对方低估自己的怀疑"], boundaries: ["不会公开调查底牌", "不会被恭维轻易打动", "发现矛盾时先追问具体时间地点"] },
  "luo-boan": { background: "替商会各家处理宴请、债务和难以写进合同的交易，深知体面往往比事实值钱。", socialMask: "周到含蓄的秘书，从不当面让客人难堪。", currentPressure: "一笔商会账目可能成为丑闻，他正在判断该保谁、舍谁。", conversationalMotives: ["维持彼此体面", "判断对方代表哪一方利益", "把风险变成可交易的条件"], boundaries: ["不在没有退路时承认账目问题", "不使用粗暴威胁", "会用第三人的故事表达警告"] },
  "old-wu": { background: "做了半辈子钟表生意，熟悉城里人的作息和脚步声，也守过许多不能写下来的约定。", socialMask: "耐心随和的老店主，愿意聊修表和街坊琐事。", currentPressure: "交通线近期出现异常，他必须判断是偶然失约还是有人跟踪。", conversationalMotives: ["从耐心和细节辨认可信的人", "保护交通线", "用寻常话确认暗号是否自然"], boundaries: ["不主动点破暗号", "口头禅只在确有含义时使用", "察觉监视时会立刻回到修表话题"] },
};

for (const character of characters) {
  const personality = personalityById[character.id] ?? { traits: ["谨慎"], speechStyle: "克制", values: ["安全"], fears: ["暴露"], verbalHabits: ["嗯"], sensitiveTopics: [] };
  character.personality = { ...personality, roleplay: roleplayById[character.id] };
}

const draft: CampaignDefinition = {
  id: "linjiang-1942",
  version: "0.1.0",
  engineVersion: "0.1.0",
  name: "临江潜线：第三号电台",
  startTime: "1942-05-12T00:00:00.000Z",
  locations,
  characters,
  publicLeads: [
    {
      id: "archive-file-crosscheck",
      trigger: "cover_work",
      profileId: "archive_clerk",
      workKind: "file_sorting",
      locationIds: ["radio-office"],
      characterIds: ["zhou-qiming"],
      hint: "整理档案时发现一份设备编号缺少交叉记录。陈科长请你去电讯科核对公开维修单，并向周启明说明来意。",
    },
    {
      id: "archive-duty-audit",
      trigger: "cover_work",
      profileId: "archive_clerk",
      workKind: "duty_shift",
      locationIds: [],
      characterIds: ["han-shijie"],
      hint: "值班登记上出现了核查签字。警备处调查员韩世杰会来档案科询问流程，你至少应当知道他的公开身份。",
    },
    {
      id: "archive-publication-register",
      trigger: "cover_work",
      profileId: "archive_clerk",
      workKind: "submit_report",
      locationIds: ["linjiang-news"],
      characterIds: ["lin-ruolan"],
      hint: "报告附有一份需要核对出处的公开校样，临江日报社的林若岚可协助确认。",
    },
    {
      id: "merchant-ledger-delay",
      trigger: "cover_work",
      profileId: "travelling_merchant",
      workKind: "settle_accounts",
      locationIds: ["third-dock"],
      characterIds: ["zhao-fusheng"],
      hint: "货账与到港单据对不上。商会建议你去三号码头向调度员赵福生核实公开的货运记录。",
    },
    {
      id: "merchant-parts-order",
      trigger: "cover_work",
      profileId: "travelling_merchant",
      workKind: "visit_clients",
      locationIds: ["wu-clock-shop"],
      characterIds: ["old-wu"],
      hint: "客户委托你核对一份零件订单，旧城钟表店的老吴或许能说明来货去向。",
    },
    {
      id: "merchant-filing-contact",
      trigger: "cover_work",
      profileId: "travelling_merchant",
      workKind: "stock_check",
      locationIds: ["archive-office"],
      characterIds: ["chen-jingwen"],
      hint: "库存清点需要补一份公开备案。档案科的陈敬文负责接收这类商号材料。",
    },
    {
      id: "writer-copy-source",
      trigger: "cover_work",
      profileId: "freelance_writer",
      workKind: "proofread_copy",
      locationIds: ["jianghai-hotel"],
      characterIds: ["luo-boan"],
      hint: "校样里有一条来客消息需要确认。编辑建议你去江海饭店找商会秘书罗伯安问清公开日程。",
    },
    {
      id: "writer-street-shipping",
      trigger: "cover_work",
      profileId: "freelance_writer",
      workKind: "street_research",
      locationIds: ["third-dock"],
      characterIds: ["zhao-fusheng"],
      hint: "采风得到一条货运延误消息。三号码头的调度员赵福生是可公开采访的对象。",
    },
    {
      id: "writer-filing-contact",
      trigger: "cover_work",
      profileId: "freelance_writer",
      workKind: "submit_column",
      locationIds: ["archive-office"],
      characterIds: ["chen-jingwen"],
      hint: "专栏引用了一份旧城资料，需要去档案科补录出处。陈敬文是公开的经办人。",
    },
    {
      id: "hotel-nurse-introduction",
      trigger: "dialogue_discovery",
      characterId: "luo-boan",
      locationIds: [],
      characterIds: ["shen-manqiu"],
      hint: "罗伯安提到饭店常有一位为客人送药的护士。沈曼秋是可以通过公开身份接触的人。",
    },
    {
      id: "news-dock-introduction",
      trigger: "dialogue_discovery",
      characterId: "lin-ruolan",
      locationIds: ["third-dock"],
      characterIds: ["zhao-fusheng"],
      hint: "林若岚建议你去三号码头核实一则公开货运消息，调度员赵福生是合适的采访对象。",
    },
  ],
  narrativeEvents: [
    {
      id: "equipment-receipt-rumor",
      title: "缺失的运输回执",
      visibleSummary: "近期设备记录与运输回执无法对上。主控时间线将这件事标记为一条可继续追查的公开工作线。",
      trigger: {
        type: "relationship",
        characterId: "zhou-qiming",
        minFamiliarity: 4,
        minInteractionCount: 5,
      },
      effects: {
        locations: [{ locationId: "third-dock", stage: "rumored", hint: "设备交接记录提到沿江货运区，但具体办事地点和进入理由尚未确认。" }],
        thread: {
          id: "missing-transport-receipt",
          title: "设备档案缺少运输回执",
          summary: "电讯科的设备记录与公开运输回执无法相互印证，需要先取得合理的补签或调阅理由。",
        },
      },
    },
    {
      id: "equipment-receipt-referral",
      title: "运输回执补签",
      visibleSummary: "档案科收到一项公开补签安排：你可以前往三号码头核对运输回执，并向调度员赵福生说明设备登记存在缺页。",
      trigger: {
        type: "relationship",
        characterId: "zhou-qiming",
        minFamiliarity: 8,
        minPrivateTrust: 3,
        minInteractionCount: 10,
        requiredEventIds: ["equipment-receipt-rumor"],
      },
      effects: {
        locations: [{ locationId: "third-dock", stage: "accessible", hint: "公开补签安排提供了前往三号码头核对运输回执的合理理由。" }],
        introduceCharacterIds: ["zhao-fusheng"],
        thread: {
          id: "missing-transport-receipt",
          title: "核对运输回执",
          summary: "补签理由已经成立。三号码头调度员赵福生负责公开的货物与车辆记录。",
        },
      },
    },
    {
      id: "director-chen-missing-register",
      title: "陈敬文主动核对登记",
      visibleSummary: "陈敬文注意到你正在处理设备档案，主动来确认一页缺失的登记。",
      trigger: { type: "time", notBefore: "1942-05-12T01:00:00.000Z", requiredLeadIds: ["archive-file-crosscheck"], maxInvestigationPressure: 30 },
      effects: { contact: {
        characterId: "chen-jingwen", reason: "设备档案缺少经办签字，他想判断你是否发现了异常。",
        openingLine: "先停一下。你手里那本设备登记，最后一页是谁交给你的？我记得那里原本有个经办签字。",
        goal: "build_trust", tone: "formal", allocatedMinutes: 20, responseWindowMinutes: 90,
      } },
    },
    {
      id: "director-lin-source-check",
      title: "林若岚追问稿件来源",
      visibleSummary: "林若岚放下手里的校样，主动询问你最近采写的一条消息。",
      trigger: { type: "time", notBefore: "1942-05-12T01:10:00.000Z", requiredLeadIds: ["writer-copy-source"], maxInvestigationPressure: 35 },
      effects: { contact: {
        characterId: "lin-ruolan", reason: "一条公开消息的出处含糊，她想确认你是否尊重信源规则。",
        openingLine: "你先别走。我看了你留下的那几行材料，消息写得像真的，可出处太干净了。你是亲眼看见的，还是有人希望你这样写？",
        goal: "probe_attitude", tone: "neutral", allocatedMinutes: 20, responseWindowMinutes: 90,
      } },
    },
    {
      id: "director-luo-account-question",
      title: "罗伯安试探账目来意",
      visibleSummary: "罗伯安结束一场商会会面后，主动问起你今天核对货账的目的。",
      trigger: { type: "time", notBefore: "1942-05-12T03:10:00.000Z", requiredLeadIds: ["merchant-ledger-delay"], maxInvestigationPressure: 35 },
      effects: { contact: {
        characterId: "luo-boan", reason: "商会账目出现缺口，他想弄清你代表自己还是某个靠山。",
        openingLine: "刚才听柜上说，你在问一笔迟到的货款。生意上的差错总有缘故，只是不知道你想找的是钱，还是经手的人？",
        goal: "probe_attitude", tone: "friendly", allocatedMinutes: 20, responseWindowMinutes: 90,
      } },
    },
    {
      id: "director-zhao-return-question",
      title: "赵福生回头探问",
      visibleSummary: "赵福生处理完一批货单后又折回来，主动试探你追查回执的真正目的。",
      trigger: { type: "relationship", characterId: "zhao-fusheng", minFamiliarity: 5, minInteractionCount: 3, maxInvestigationPressure: 65 },
      effects: { contact: {
        characterId: "zhao-fusheng", reason: "你对运输回执的关注超过普通办事人员，他要判断风险和交换条件。",
        openingLine: "我想了想，还是得问一句。码头每天缺的单子多了，你怎么偏偏盯着这一张？这事要是替别人办的，咱们最好先把话说明白。",
        goal: "probe_attitude", tone: "neutral", allocatedMinutes: 20, responseWindowMinutes: 60,
      } },
    },
    {
      id: "director-han-corridor-probe",
      title: "韩世杰走廊试探",
      visibleSummary: "调查压力升高后，韩世杰在走廊里主动拦住你，进行一次没有笔录的试探。",
      trigger: { type: "time", notBefore: "1942-05-15T00:00:00.000Z", requiredCompletedObjectiveIds: ["confirm-radio-shipment"], minInvestigationPressure: 20 },
      effects: { contact: {
        characterId: "han-shijie", reason: "正式盘问之外的临时试探，用于观察你没有准备时如何解释近期行踪。",
        openingLine: "别紧张，不做笔录。我只想知道，最近几天你为什么总能在需要核对材料的时候，恰好出现在附近？",
        goal: "probe_attitude", tone: "formal", allocatedMinutes: 10, responseWindowMinutes: 30,
      } },
    },
    {
      id: "director-wu-network-warning",
      title: "老吴主动示警",
      visibleSummary: "交通线受到搜索后，老吴主动提醒你观察钟表店外反复出现的脚步。",
      trigger: { type: "time", notBefore: "1942-05-18T00:00:00.000Z", requiredCompletedObjectiveIds: ["trace-security-crackdown"], minInvestigationPressure: 25 },
      effects: { contact: {
        characterId: "old-wu", reason: "交通线附近出现重复脚步，他需要你判断是便衣监视还是偶然路人。",
        openingLine: "先别看门外。今天有双鞋从这里经过了三次，每次都慢半拍。你坐下喝口水，说说你一路上有没有换过方向。",
        goal: "long_talk", tone: "urgent", allocatedMinutes: 30, responseWindowMinutes: 60,
      } },
    },
  ],
  intel: [
    { id: "shipment-time", title: "运输时间", truth: "true", requiredFields: ["date", "hour"], fieldValues: { date: "5月15日", hour: "凌晨2时40分" }, sourceCharacterIds: ["chen-jingwen", "zhao-fusheng"], sourceRequirements: { "chen-jingwen": { familiarity: 12, privateTrust: 10 }, "zhao-fusheng": { familiarity: 10, privateTrust: 7 } }, expiresAt: "1942-05-15T14:00:00.000Z" },
    { id: "shipment-place", title: "运输地点", truth: "true", requiredFields: ["dock", "warehouse"], fieldValues: { dock: "三号码头东侧泊位", warehouse: "八码头旧棉纱仓" }, sourceCharacterIds: ["zhao-fusheng", "lin-ruolan"], sourceRequirements: { "zhao-fusheng": { familiarity: 11, privateTrust: 8 }, "lin-ruolan": { familiarity: 10, privateTrust: 8 } }, expiresAt: "1942-05-15T14:00:00.000Z" },
    { id: "shipment-cargo", title: "货物内容", truth: "true", requiredFields: ["category", "quantity"], fieldValues: { category: "短波收发报机及备用电子管", quantity: "木箱24只" }, sourceCharacterIds: ["chen-jingwen", "zhou-qiming"], sourceRequirements: { "chen-jingwen": { familiarity: 15, privateTrust: 12 }, "zhou-qiming": { familiarity: 10, privateTrust: 7 } }, expiresAt: "1942-05-15T14:00:00.000Z" },
    { id: "vehicle-route", title: "车辆路线", truth: "partial", requiredFields: ["origin", "checkpoint"], fieldValues: { origin: "江北铁路货场", checkpoint: "西关检查站" }, sourceCharacterIds: ["zhao-fusheng"], sourceRequirements: { "zhao-fusheng": { familiarity: 12, privateTrust: 9 } }, expiresAt: "1942-05-15T20:00:00.000Z" },
    { id: "escort-list", title: "押运名单", truth: "partial", requiredFields: ["leader", "unit"], fieldValues: { leader: "韩世杰", unit: "警备处机动队第二组" }, sourceCharacterIds: ["chen-jingwen", "han-shijie"], expiresAt: "1942-05-18T14:00:00.000Z" },
    { id: "radio-window", title: "组织收报窗口", truth: "true", requiredFields: ["date", "start", "duration"], fieldValues: { date: "5月15日", start: "凌晨1时50分", duration: "15分钟" }, sourceCharacterIds: ["old-wu", "zhou-qiming"], expiresAt: "1942-05-15T22:20:00.000Z" },
    { id: "false-warehouse", title: "二号仓库假消息", truth: "false", requiredFields: ["warehouse"], fieldValues: { warehouse: "七码头二号仓" }, sourceCharacterIds: ["han-shijie"], expiresAt: "1942-05-15T18:00:00.000Z" },
    { id: "archive-audit", title: "档案借阅核查", truth: "true", requiredFields: ["scope", "investigator"], fieldValues: { scope: "5月10日至12日的机要档案借阅记录", investigator: "韩世杰" }, sourceCharacterIds: ["chen-jingwen", "han-shijie"], expiresAt: "1942-05-18T14:00:00.000Z" },
    { id: "hotel-meeting", title: "江海饭店会面", truth: "partial", requiredFields: ["room", "attendees"], fieldValues: { room: "三楼307房", attendees: "陈敬文与罗伯安" }, sourceCharacterIds: ["luo-boan", "chen-jingwen"], expiresAt: "1942-05-13T22:00:00.000Z" },
    { id: "inspection-order", title: "临时封锁命令", truth: "true", requiredFields: ["checkpoint", "start"], fieldValues: { checkpoint: "西关与三号码头路口", start: "5月14日晚10时" }, sourceCharacterIds: ["lin-ruolan", "han-shijie"], expiresAt: "1942-05-18T14:00:00.000Z" },
    { id: "enemy-watchlist", title: "敌方重点监视名单", truth: "true", requiredFields: ["targets", "priority"], fieldValues: { targets: "报社、电讯科与沿江货运行", priority: "电讯科技术人员列为第一优先" }, sourceCharacterIds: ["lin-ruolan", "han-shijie"], sourceRequirements: { "lin-ruolan": { familiarity: 14, privateTrust: 10 }, "han-shijie": { familiarity: 12, privateTrust: 6 } }, expiresAt: "1942-05-22T14:00:00.000Z" },
    { id: "safehouse-raid-plan", title: "交通线搜捕计划", truth: "true", requiredFields: ["locations", "time"], fieldValues: { locations: "旧城钟表铺与江海饭店后巷", time: "5月19日凌晨4时同时搜查" }, sourceCharacterIds: ["old-wu", "shen-manqiu"], sourceRequirements: { "old-wu": { familiarity: 12, privateTrust: 10 }, "shen-manqiu": { familiarity: 10, privateTrust: 8 } }, expiresAt: "1942-05-22T14:00:00.000Z" },
    { id: "evacuation-route", title: "人员撤离路线", truth: "true", requiredFields: ["route", "contact"], fieldValues: { route: "三号码头经南岸药材船转出", contact: "商会药材行六码头收货员" }, sourceCharacterIds: ["zhao-fusheng", "luo-boan"], sourceRequirements: { "zhao-fusheng": { familiarity: 14, privateTrust: 10 }, "luo-boan": { familiarity: 12, privateTrust: 9 } }, expiresAt: "1942-05-22T14:00:00.000Z" },
  ],
  objectives: [
    {
      id: "confirm-radio-shipment", title: "第一任务：确认无线电设备运输", sequence: 1, required: true,
      deadline: "1942-05-15T14:00:00.000Z", requiredIntelIds: ["shipment-time", "shipment-place", "shipment-cargo"], minimumConfidence: 0.7,
      acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization",
      completionEffects: { investigationPressure: 25, personalSuspicion: 4, interrogation: { interrogatorCharacterId: "han-shijie", delayMinutes: 30 }, notice: "设备运输遭到破坏后，特务机关认定城内存在完整地下网络，开始扩大临检并倒查近期档案与货运记录。" },
    },
    {
      id: "trace-security-crackdown", title: "第二任务：查明特务机关清查部署", sequence: 2, required: true,
      unlockAfterObjectiveIds: ["confirm-radio-shipment"], deadline: "1942-05-18T14:00:00.000Z", requiredIntelIds: ["archive-audit", "inspection-order", "escort-list"], minimumConfidence: 0.72,
      acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization",
      completionEffects: { investigationPressure: 20, networkExposure: 5, introduceCharacterIds: ["old-wu", "shen-manqiu"], unlockLocationIds: ["wu-clock-shop", "jianghai-hotel"], notice: "组织避开了第一轮清查，但敌方转而搜捕交通线。老吴与沈曼秋分别传来公开可解释的求助，你需要保全人员和备用联络点。" },
    },
    {
      id: "preserve-underground-network", title: "第三任务：保全交通线并组织撤离", sequence: 3, required: true,
      unlockAfterObjectiveIds: ["trace-security-crackdown"], deadline: "1942-05-22T14:00:00.000Z", requiredIntelIds: ["enemy-watchlist", "safehouse-raid-plan", "evacuation-route"], minimumConfidence: 0.75,
      acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization",
      completionEffects: { investigationPressure: 10, notice: "最后一批警戒名单和撤离安排已经送达，组织开始分批转移人员并切断暴露线路。" },
    },
  ],
};

const fieldLabels: Record<string, Record<string, string>> = {
  "shipment-time": { date: "运输日期", hour: "具体时刻" },
  "shipment-place": { dock: "装卸码头", warehouse: "中转仓库" },
  "shipment-cargo": { category: "货物类别", quantity: "货物数量" },
  "vehicle-route": { origin: "车辆起点", checkpoint: "途经检查站" },
  "escort-list": { leader: "押运负责人", unit: "押运单位" },
  "radio-window": { date: "收报日期", start: "窗口开始", duration: "窗口时长" },
  "false-warehouse": { warehouse: "仓库编号" },
  "archive-audit": { scope: "核查范围", investigator: "调查负责人" },
  "hotel-meeting": { room: "会面房间", attendees: "出席人员" },
  "inspection-order": { checkpoint: "封锁检查站", start: "封锁时间" },
  "enemy-watchlist": { targets: "重点监视对象", priority: "搜查优先级" },
  "safehouse-raid-plan": { locations: "计划搜查地点", time: "同时行动时间" },
  "evacuation-route": { route: "撤离路线", contact: "沿途接应人" },
};

const sharedSourceOrigins: Record<string, Record<string, string>> = {
  "hotel-meeting": { "luo-boan": "hotel-guest-register", "chen-jingwen": "hotel-guest-register" },
  "inspection-order": { "lin-ruolan": "security-circular", "han-shijie": "security-circular" },
};

for (const intel of draft.intel) {
  intel.fieldLabels = fieldLabels[intel.id];
  intel.sourceOrigins = sharedSourceOrigins[intel.id];
}

export const LINJIANG_1942 = assertValidCampaign(draft);
