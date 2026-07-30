import type { CampaignDefinition, CharacterDefinition, LocationDefinition } from "@qianfu/core";
import { assertValidCampaign } from "../../validation.js";

const travel = (records: number, trading: number, news: number, station: number, pharmacy: number, teahouse: number, warehouse: number, safehouse: number) => ({
  "harbor-records": records,
  "yongtai-trading": trading,
  "haizhou-morning": news,
  "east-station": station,
  "jisheng-pharmacy": pharmacy,
  "riverside-teahouse": teahouse,
  "customs-warehouse": warehouse,
  "reed-safehouse": safehouse,
});

const locations: LocationDefinition[] = [
  { id: "harbor-records", name: "海州港务档案室", district: "港务区", mapPosition: { x: 25, y: 14 }, travelMinutes: travel(10, 20, 20, 30, 30, 20, 20, 40) },
  { id: "yongtai-trading", name: "永泰商行", district: "商埠区", mapPosition: { x: 72, y: 15 }, travelMinutes: travel(20, 10, 20, 20, 20, 20, 20, 30), radioSite: { baseRisk: 10, requiresRecruitedCharacterId: "he-jinshun" } },
  { id: "haizhou-morning", name: "海州晨报社", district: "旧城区", mapPosition: { x: 22, y: 39 }, travelMinutes: travel(20, 20, 10, 20, 20, 10, 30, 30) },
  { id: "east-station", name: "东平码头车站", district: "东平码头", mapPosition: { x: 76, y: 39 }, travelMinutes: travel(30, 20, 20, 10, 20, 20, 20, 30) },
  { id: "jisheng-pharmacy", name: "济生药房", district: "旧城区", mapPosition: { x: 25, y: 64 }, travelMinutes: travel(30, 20, 20, 20, 10, 10, 30, 20), radioSite: { baseRisk: 8, requiresRecruitedCharacterId: "fang-zhiyuan" } },
  { id: "riverside-teahouse", name: "临河茶楼", district: "河埠区", mapPosition: { x: 73, y: 64 }, travelMinutes: travel(20, 20, 10, 20, 10, 10, 30, 20), radioSite: { baseRisk: 12, requiresRecruitedCharacterId: "duan-mingli" } },
  { id: "customs-warehouse", name: "海关七号仓", district: "海关货栈", mapPosition: { x: 25, y: 88 }, travelMinutes: travel(20, 20, 30, 20, 30, 30, 10, 40) },
  { id: "reed-safehouse", name: "芦荡船屋", district: "南汊芦荡", mapPosition: { x: 72, y: 88 }, travelMinutes: travel(40, 30, 30, 30, 20, 20, 40, 10), radioSite: { baseRisk: 5, initiallyAvailable: true } },
];

const reliability = (loyalty: number, discipline: number, pressureResistance: number, courage: number, competence: number) => ({ loyalty, discipline, pressureResistance, courage, competence });

const characters: CharacterDefinition[] = [
  { id: "xu-tingzhou", name: "徐廷舟", publicIdentity: "港务档案室主任", hiddenAlignment: "variable", initialLocationId: "harbor-records", recruitable: true, reliability: reliability(61, 82, 58, 42, 86), schedule: [{ startMinute: 480, endMinute: 1020, locationId: "harbor-records", activity: "审核船货与通行档案" }] },
  { id: "he-jinshun", name: "何锦顺", publicIdentity: "永泰商行掌柜", hiddenAlignment: "neutral", initialLocationId: "yongtai-trading", recruitable: true, reliability: reliability(46, 55, 51, 57, 84), schedule: [{ startMinute: 420, endMinute: 1140, locationId: "yongtai-trading", activity: "处理货款与客户往来" }] },
  { id: "qiao-yunshu", name: "乔云舒", publicIdentity: "海州晨报编辑", hiddenAlignment: "organization", initialLocationId: "haizhou-morning", recruitable: true, reliability: reliability(91, 79, 64, 73, 78), schedule: [{ startMinute: 480, endMinute: 1260, locationId: "haizhou-morning", activity: "编排晨报与外埠消息" }] },
  { id: "lu-xiaoman", name: "陆小满", publicIdentity: "东平车站售票员", hiddenAlignment: "organization", initialLocationId: "east-station", recruitable: true, reliability: reliability(86, 71, 48, 76, 72), schedule: [{ startMinute: 360, endMinute: 1320, locationId: "east-station", activity: "核对客票与小件托运" }] },
  { id: "fang-zhiyuan", name: "方致远", publicIdentity: "济生药房坐堂医", hiddenAlignment: "neutral", initialLocationId: "jisheng-pharmacy", recruitable: true, reliability: reliability(58, 76, 68, 52, 90), schedule: [{ startMinute: 480, endMinute: 1200, locationId: "jisheng-pharmacy", activity: "问诊并管理药材出入" }] },
  { id: "duan-mingli", name: "段明礼", publicIdentity: "临河茶楼说书人", hiddenAlignment: "variable", initialLocationId: "riverside-teahouse", recruitable: true, reliability: reliability(52, 43, 61, 79, 74), schedule: [{ startMinute: 600, endMinute: 1380, locationId: "riverside-teahouse", activity: "说书并招呼各路客人" }] },
  { id: "cai-shumei", name: "蔡淑梅", publicIdentity: "海关仓库理货员", hiddenAlignment: "variable", initialLocationId: "customs-warehouse", recruitable: true, reliability: reliability(67, 88, 56, 49, 87), schedule: [{ startMinute: 420, endMinute: 1140, locationId: "customs-warehouse", activity: "登记入仓封条与货箱" }] },
  { id: "wei-zonghai", name: "魏宗海", publicIdentity: "海关缉私科督察", hiddenAlignment: "enemy", initialLocationId: "customs-warehouse", recruitable: false, reliability: reliability(9, 92, 87, 81, 91), schedule: [{ startMinute: 480, endMinute: 720, locationId: "harbor-records", activity: "抽查港务通行底档" }, { startMinute: 780, endMinute: 1080, locationId: "customs-warehouse", activity: "盘查仓库与封条" }] },
  { id: "lao-guan", name: "关伯", publicIdentity: "南汊摆渡人", hiddenAlignment: "organization", initialLocationId: "reed-safehouse", recruitable: true, reliability: reliability(95, 91, 72, 66, 77), schedule: [{ startMinute: 1020, endMinute: 1380, locationId: "reed-safehouse", activity: "收船并查看芦荡水路" }] },
];

const personalities: Record<string, NonNullable<CharacterDefinition["personality"]>> = {
  "xu-tingzhou": { traits: ["严谨", "惜身"], speechStyle: "先核对手续，再谈人情", values: ["秩序", "家声"], fears: ["替人背下失职责任"], verbalHabits: ["照底档看", "手续要对"], sensitiveTopics: ["遗失印章"], roleplay: { background: "在港务系统做了十六年，见过太多经办人因一枚印章丢掉前程。", socialMask: "不偏不倚的档案主管，对任何人都只认编号与签章。", currentPressure: "一批旧通行证被人调阅却没有留下完整签字。", conversationalMotives: ["判断对方是否会把责任推给自己", "找到能补齐记录的人", "保住科室和家人"], boundaries: ["不向陌生人展示原始底档", "不承认自己曾私下放行", "遇到含糊日期会反复追问"] } },
  "he-jinshun": { traits: ["圆融", "精明"], speechStyle: "话说得热络，条件算得清楚", values: ["信用", "生意延续"], fears: ["货路被封", "欠账牵连全家"], verbalHabits: ["账要算明白", "生意归生意"], sensitiveTopics: ["无主货箱"], roleplay: { background: "从跑单帮做起，靠替大小商号调货在海州站稳脚跟。", socialMask: "谁都不得罪的掌柜，愿意帮忙，但绝不白担风险。", currentPressure: "永泰商行替人代收的几箱药材被海关扣住，货主却不肯露面。", conversationalMotives: ["确认玩家是否有可交换的资源", "避免商行卷入政治案件", "替自己保留退路"], boundaries: ["不会无条件交出客户账本", "被道德指责时会冷下来", "答应前一定问代价"] } },
  "qiao-yunshu": { traits: ["敏锐", "克制"], speechStyle: "用简短追问拆穿含糊说法", values: ["事实", "人的尊严"], fears: ["同事因稿件被捕"], verbalHabits: ["来源呢", "这句不能凭空写"], sensitiveTopics: ["被撤下的失踪启事"], roleplay: { background: "从校对做到编辑，暗中保存被审查删去的姓名和日期。", socialMask: "只关心文字准确性的职业编辑。", currentPressure: "一则寻人启事在付印前被缉私科强行撤下。", conversationalMotives: ["确认玩家是否尊重信源", "保护报社同事", "让被删去的事实留下副本"], boundaries: ["不公开组织关系", "不接受没有来源的惊人消息", "危险时会把真实问题藏进校样措辞"] } },
  "lu-xiaoman": { traits: ["机灵", "重情"], speechStyle: "语速快，记人比记票号更准", values: ["承诺", "普通人的平安"], fears: ["弟弟被抓去做苦役"], verbalHabits: ["我记得那张票", "别堵在窗口"], sensitiveTopics: ["夜班托运"], roleplay: { background: "每天面对数百张车票，能从口音、行李和买票习惯认出常客。", socialMask: "忙碌而有些不耐烦的售票员。", currentPressure: "一个熟悉的联络人买票后没有上车，托运的小药箱也不见了。", conversationalMotives: ["确认玩家是否真在找人而非钓鱼", "保护车站同事", "弄清失踪旅客的去向"], boundaries: ["不会当众谈乘客姓名", "不愿牵连弟弟", "遇到缉私人员会立刻改谈票务"] } },
  "fang-zhiyuan": { traits: ["沉静", "审慎"], speechStyle: "以病情和药理作比，不轻易下结论", values: ["生命", "专业信誉"], fears: ["药房被封后病人断药"], verbalHabits: ["先看症候", "药不能乱下"], sensitiveTopics: ["军用止血药"], roleplay: { background: "留学归来后守着父亲留下的小药房，既给富户看诊，也常免去穷人的药钱。", socialMask: "不问政治的坐堂医。", currentPressure: "一批急救药被调包，真正的药材可能落入缉私科手里。", conversationalMotives: ["判断玩家是否在乎伤员而非功劳", "追回药材", "保护学徒"], boundaries: ["不透露病人姓名", "不会用假药交换安全", "对威胁病人的话极其反感"] } },
  "duan-mingli": { traits: ["外向", "好胜"], speechStyle: "爱用故事影射现实，真假混在笑话里", values: ["名声", "自由"], fears: ["失去舞台", "被当成告密者"], verbalHabits: ["书里可不是这么写", "诸位听个巧"], sensitiveTopics: ["茶楼包厢来客"], roleplay: { background: "走过几省码头，靠记住客人的脸和故事吃饭。", socialMask: "只图热闹和赏钱的说书人。", currentPressure: "有人花钱让他在特定时辰讲一段暗含地点的旧书。", conversationalMotives: ["判断玩家是否听得懂暗示", "保住茶楼饭碗", "让危险听起来像闲话"], boundaries: ["不会直接承认替谁传话", "不喜欢被命令", "受到尊重时才肯把故事讲完整"] } },
  "cai-shumei": { traits: ["寡言", "坚韧"], speechStyle: "只说亲手核过的数字和封条", values: ["准确", "自立"], fears: ["母亲无人照料"], verbalHabits: ["我只认封条", "数字不会自己变"], sensitiveTopics: ["七号仓夜间开门记录"], roleplay: { background: "丈夫去世后独自进入海关货栈做理货员，靠从不出错赢得位置。", socialMask: "不参与闲话的冷面理货员。", currentPressure: "她发现夜班后有三枚封条被换过，却有人要求她照旧签字。", conversationalMotives: ["确认玩家是否重视证据", "避免自己成为替罪羊", "保存被改动的原始数字"], boundaries: ["不会凭猜测指认人", "不接受轻浮套近乎", "任何承诺都要求明确撤退办法"] } },
  "wei-zonghai": { traits: ["耐心", "控制欲强"], speechStyle: "礼貌地重复问题，逼人自己暴露矛盾", values: ["权力", "可利用的秩序"], fears: ["上级发现他失去控制"], verbalHabits: ["再说一遍", "这就奇怪了"], sensitiveTopics: ["私扣货物", "伪造通行证"], roleplay: { background: "从地方警务转入海关缉私科，擅长把经济案件做成政治案件。", socialMask: "讲程序、给人留面子的督察。", currentPressure: "上级要求他在十天内找出城内的地下运输线。", conversationalMotives: ["记录玩家前后矛盾", "把普通关系解释成网络", "诱使对方主动交代更多人"], boundaries: ["不透露已经掌握的证据", "不被恭维打乱节奏", "发现漏洞时会回到精确时间和地点"] } },
  "lao-guan": { traits: ["沉稳", "少言"], speechStyle: "用潮水、风向和船路表达判断", values: ["信义", "活着完成托付"], fears: ["水路牵连渔户"], verbalHabits: ["水会留痕", "先看风"], sensitiveTopics: ["芦荡暗汊"], roleplay: { background: "在南汊摆渡三十年，熟悉每条会随水位消失的小路。", socialMask: "只认船钱和天气的老艄公。", currentPressure: "原定联络船连续两夜没有出现，巡逻艇却提前进入芦荡。", conversationalMotives: ["判断玩家是否懂得隔离联络", "保护沿岸渔户", "恢复一条不依赖单个人的水路"], boundaries: ["不说出其他船工姓名", "不接受临时改变暗号", "察觉跟踪时宁可沉默离开"] } },
};

for (const character of characters) character.personality = personalities[character.id];

const draft: CampaignDefinition = {
  id: "haizhou-1943",
  version: "0.1.0",
  engineVersion: "0.1.0",
  name: "雾港暗线：失踪的药箱",
  startTime: "1943-09-06T00:00:00.000Z",
  coverProfiles: {
    archive_clerk: { startingLocationId: "harbor-records", workLocationIds: ["harbor-records"], initialContactCharacterIds: ["xu-tingzhou"] },
    travelling_merchant: { startingLocationId: "yongtai-trading", workLocationIds: ["yongtai-trading"], initialContactCharacterIds: ["he-jinshun"] },
    freelance_writer: { startingLocationId: "haizhou-morning", workLocationIds: ["haizhou-morning"], initialContactCharacterIds: ["qiao-yunshu"] },
  },
  locations,
  characters,
  publicLeads: [
    { id: "archive-ticket-audit", trigger: "cover_work", profileId: "archive_clerk", workKind: "file_sorting", locationIds: ["east-station"], characterIds: ["lu-xiaoman"], hint: "归档的一张小件托运票缺少到站签章。东平车站售票员陆小满负责核对公开票根。" },
    { id: "archive-inspection-register", trigger: "cover_work", profileId: "archive_clerk", workKind: "duty_shift", locationIds: [], characterIds: ["wei-zonghai"], hint: "缉私科送来一份抽查登记。督察魏宗海今天会按公开程序调阅港务底档。" },
    { id: "archive-press-circular", trigger: "cover_work", profileId: "archive_clerk", workKind: "submit_report", locationIds: ["haizhou-morning"], characterIds: ["qiao-yunshu"], hint: "例行报告引用了一则被撤下的寻人启事，晨报编辑乔云舒可以公开核对原稿。" },
    { id: "merchant-warehouse-bill", trigger: "cover_work", profileId: "travelling_merchant", workKind: "settle_accounts", locationIds: ["customs-warehouse"], characterIds: ["cai-shumei"], hint: "货款里多出一笔七号仓滞纳金。理货员蔡淑梅能核对封条和入仓时间。" },
    { id: "merchant-medicine-client", trigger: "cover_work", profileId: "travelling_merchant", workKind: "visit_clients", locationIds: ["jisheng-pharmacy"], characterIds: ["fang-zhiyuan"], hint: "固定客户催问一批急救药。济生药房的方致远愿意按公开订单核对药材。" },
    { id: "merchant-license-filing", trigger: "cover_work", profileId: "travelling_merchant", workKind: "stock_check", locationIds: ["harbor-records"], characterIds: ["xu-tingzhou"], hint: "库存里发现一张过期港务凭证，需要向档案室主任徐廷舟补办公开备案。" },
    { id: "writer-teahouse-column", trigger: "cover_work", profileId: "freelance_writer", workKind: "submit_column", locationIds: ["riverside-teahouse"], characterIds: ["duan-mingli"], hint: "编辑要求补写一段河埠见闻。临河茶楼的说书人段明礼是公开采访对象。" },
    { id: "writer-station-notes", trigger: "cover_work", profileId: "freelance_writer", workKind: "street_research", locationIds: ["east-station"], characterIds: ["lu-xiaoman"], hint: "采风笔记里有人提到一位没有上车的旅客。陆小满可以核对公开车次。" },
    { id: "writer-trading-proof", trigger: "cover_work", profileId: "freelance_writer", workKind: "proofread_copy", locationIds: ["yongtai-trading"], characterIds: ["he-jinshun"], hint: "商情校样中的药材价格需要商号确认，永泰掌柜何锦顺可以公开说明。" },
    { id: "xu-customs-referral", trigger: "dialogue_discovery", profileIds: ["archive_clerk"], characterId: "xu-tingzhou", locationIds: ["customs-warehouse"], characterIds: ["cai-shumei"], hint: "徐廷舟指出缺失的签章来自海关七号仓，理货员蔡淑梅保留公开交接底单。" },
    { id: "xu-news-referral", trigger: "dialogue_discovery", profileIds: ["travelling_merchant"], characterId: "xu-tingzhou", locationIds: ["haizhou-morning"], characterIds: ["qiao-yunshu"], hint: "徐廷舟说凭证编号曾出现在晨报撤下的启事里，编辑乔云舒可以核对原稿。" },
    { id: "xu-inspector-referral", trigger: "dialogue_discovery", profileIds: ["freelance_writer"], characterId: "xu-tingzhou", locationIds: [], characterIds: ["wei-zonghai"], hint: "徐廷舟提醒，近期调阅这批凭证的是缉私科督察魏宗海。" },
    { id: "qiao-teahouse-referral", trigger: "dialogue_discovery", profileIds: ["archive_clerk", "travelling_merchant"], characterId: "qiao-yunshu", locationIds: ["riverside-teahouse"], characterIds: ["duan-mingli"], hint: "被撤启事的付费人常在临河茶楼听书，段明礼可能记得他的公开相貌。" },
    { id: "lu-pharmacy-referral", trigger: "dialogue_discovery", profileIds: ["archive_clerk", "freelance_writer"], characterId: "lu-xiaoman", locationIds: ["jisheng-pharmacy"], characterIds: ["fang-zhiyuan"], hint: "陆小满认出失踪小件的药房封签，济生药房的方致远能核对药箱用途。" },
    { id: "fang-station-referral", trigger: "dialogue_discovery", profileIds: ["travelling_merchant"], characterId: "fang-zhiyuan", locationIds: ["east-station"], characterIds: ["lu-xiaoman"], hint: "方致远说药箱原应随东平车站的小件车发送，售票员陆小满见过托运人。" },
    { id: "cai-trading-referral", trigger: "dialogue_discovery", profileIds: ["archive_clerk"], characterId: "cai-shumei", locationIds: ["yongtai-trading"], characterIds: ["he-jinshun"], hint: "蔡淑梅查到入仓货主写的是永泰商行，何锦顺必须说明这笔公开代收。" },
    { id: "cai-inspector-referral", trigger: "dialogue_discovery", profileIds: ["travelling_merchant"], characterId: "cai-shumei", locationIds: [], characterIds: ["wei-zonghai"], hint: "蔡淑梅确认夜间换封条的命令来自缉私科督察魏宗海。" },
    { id: "cai-records-referral", trigger: "dialogue_discovery", profileIds: ["freelance_writer"], characterId: "cai-shumei", locationIds: ["harbor-records"], characterIds: ["xu-tingzhou"], hint: "蔡淑梅建议从港务底档核对封条批次，档案室主任徐廷舟是公开经办人。" },
    { id: "he-warehouse-referral", trigger: "dialogue_discovery", profileIds: ["freelance_writer"], characterId: "he-jinshun", locationIds: ["customs-warehouse"], characterIds: ["cai-shumei"], hint: "何锦顺承认货物被扣在海关七号仓，理货员蔡淑梅掌握公开入仓数字。" },
    { id: "fang-ferryman-referral", trigger: "dialogue_discovery", characterId: "fang-zhiyuan", locationIds: [], characterIds: ["lao-guan"], hint: "方致远提到药房常请南汊摆渡人关伯替病人送药；傍晚可在芦荡船屋按公开理由找他。" },
  ],
  narrativeEvents: [
    { id: "archive-ticket-rumor", title: "没有上车的旅客", visibleSummary: "票根与档案对不上：托运人买了票，却没有留下进站记录。这条公开差错值得继续追查。", trigger: { type: "relationship", characterId: "lu-xiaoman", minFamiliarity: 6, minPrivateTrust: 2, minInteractionCount: 4, notBefore: "1943-09-06T02:00:00.000Z", requiredLeadIds: ["archive-ticket-audit"] }, effects: { thread: { id: "missing-medicine-case", title: "追查失踪药箱", summary: "一只急救药箱与托运人同时失踪，票根、封签和入仓记录彼此矛盾。" } } },
    { id: "archive-xu-contact", title: "徐廷舟要求核对签章", visibleSummary: "徐廷舟在你积累了足够工作往来后，主动要求当面核对那枚缺失签章。", trigger: { type: "relationship", characterId: "xu-tingzhou", minFamiliarity: 8, minPrivateTrust: 4, minInteractionCount: 6, notBefore: "1943-09-06T03:30:00.000Z", requiredEventIds: ["archive-ticket-rumor"], requiredLeadIds: ["archive-ticket-audit"] }, effects: { contact: { characterId: "xu-tingzhou", reason: "缺失签章可能让整个档案室承担责任，他想确认你查到了哪一步。", openingLine: "先别把票根送出去。那枚到站章不是漏盖，是有人事后把整页换过。你先告诉我，谁让你追这张票？", goal: "probe_attitude", tone: "formal", allocatedMinutes: 20, responseWindowMinutes: 60 } } },
    { id: "merchant-seal-rumor", title: "被换过的封条", visibleSummary: "七号仓的夜班数字出现矛盾：三枚封条在无人签收的情况下被替换。", trigger: { type: "relationship", characterId: "cai-shumei", minFamiliarity: 6, minPrivateTrust: 2, minInteractionCount: 4, notBefore: "1943-09-06T02:20:00.000Z", requiredLeadIds: ["merchant-warehouse-bill"] }, effects: { thread: { id: "missing-medicine-case", title: "追查失踪药箱", summary: "一只急救药箱与托运人同时失踪，票根、封签和入仓记录彼此矛盾。" } } },
    { id: "merchant-he-contact", title: "何锦顺追问无主货箱", visibleSummary: "何锦顺确认你没有立刻把七号仓的异常交给缉私科，决定主动问清你的打算。", trigger: { type: "relationship", characterId: "he-jinshun", minFamiliarity: 8, minPrivateTrust: 4, minInteractionCount: 6, notBefore: "1943-09-06T04:00:00.000Z", requiredEventIds: ["merchant-seal-rumor"], requiredLeadIds: ["merchant-warehouse-bill"] }, effects: { contact: { characterId: "he-jinshun", reason: "无主货箱挂在永泰账上，他要判断你是来解决麻烦还是把麻烦带给他。", openingLine: "那笔滞纳金我可以认，可七号仓里那箱东西不是我的。你查账查到这里，是想替谁把它领走？", goal: "build_trust", tone: "neutral", allocatedMinutes: 20, responseWindowMinutes: 60 } } },
    { id: "writer-passenger-rumor", title: "被撤下的名字", visibleSummary: "车站记录与被撤启事指向同一个人：他买了票、托运了药箱，却像从海州消失了一样。", trigger: { type: "relationship", characterId: "lu-xiaoman", minFamiliarity: 6, minPrivateTrust: 2, minInteractionCount: 4, notBefore: "1943-09-06T02:40:00.000Z", requiredLeadIds: ["writer-station-notes"] }, effects: { thread: { id: "missing-medicine-case", title: "追查失踪药箱", summary: "一只急救药箱与托运人同时失踪，票根、封签和入仓记录彼此矛盾。" } } },
    { id: "writer-qiao-contact", title: "乔云舒交回删稿", visibleSummary: "乔云舒在确认你尊重信源边界后，主动拿来被审查删去的那一页校样。", trigger: { type: "relationship", characterId: "qiao-yunshu", minFamiliarity: 8, minPrivateTrust: 4, minInteractionCount: 6, notBefore: "1943-09-06T04:20:00.000Z", requiredEventIds: ["writer-passenger-rumor"], requiredLeadIds: ["writer-station-notes"] }, effects: { contact: { characterId: "qiao-yunshu", reason: "删稿可能证明失踪并非普通逃票，她要判断你是否会保护消息来源。", openingLine: "这页校样你只能在这里看。启事上的名字被划掉了，但付费收据还在。你为什么对这个人这么上心？", goal: "probe_attitude", tone: "formal", allocatedMinutes: 20, responseWindowMinutes: 60 } } },
    { id: "customs-search-expands", title: "缉私科扩大搜查", visibleSummary: "药箱去向被组织利用后，缉私科开始倒查通行证、货栈封条和报社启事。新的任务是找出他们用来诱捕联络人的名单。", trigger: { type: "time", notBefore: "1943-09-09T15:00:00.000Z", requiredCompletedObjectiveIds: ["recover-medicine-route"] }, effects: { thread: { id: "forged-pass-trap", title: "查明伪证诱捕计划", summary: "敌方正用一批伪造通行证和假会面地点筛出地下联络人。" } } },
    { id: "reed-line-goes-silent", title: "南汊水路失去回音", visibleSummary: "诱捕名单送达后，敌方转向封锁南汊。两条联络船失约，组织要求在总搜查前重建撤离水路。", trigger: { type: "time", notBefore: "1943-09-12T15:00:00.000Z", requiredCompletedObjectiveIds: ["expose-forged-pass-trap"] }, effects: { thread: { id: "restore-reed-route", title: "重建芦荡交通线", summary: "需要确认巡逻空档、撤离次序和一条干净的无线电联络路径。" } } },
    { id: "lao-guan-contact", title: "关伯要求换掉旧暗号", visibleSummary: "关伯观察了几次潮路与玩家的行事方式后，主动提出更换已经可能暴露的旧暗号。", trigger: { type: "relationship", characterId: "lao-guan", minFamiliarity: 8, minPrivateTrust: 5, minInteractionCount: 5, notBefore: "1943-09-12T16:00:00.000Z", requiredEventIds: ["reed-line-goes-silent"], requiredCompletedObjectiveIds: ["expose-forged-pass-trap"] }, effects: { contact: { characterId: "lao-guan", reason: "巡逻艇已经试探旧水路，他要确认你是否愿意放弃方便但危险的联络习惯。", openingLine: "今晚水面有两道不该有的灯。旧暗号不能再用了。你若还想走南汊，先说清楚哪些人真的必须上船。", goal: "long_talk", tone: "urgent", allocatedMinutes: 30, responseWindowMinutes: 60 } } },
  ],
  intel: [
    { id: "courier-departure", title: "失踪托运人的行程", truth: "true", requiredFields: ["date", "train"], fieldValues: { date: "9月6日上午", train: "东平站十点二十分南行车" }, sourceCharacterIds: ["xu-tingzhou", "qiao-yunshu", "lu-xiaoman"], expiresAt: "1943-09-09T14:00:00.000Z" },
    { id: "medicine-crate-mark", title: "急救药箱标记", truth: "true", requiredFields: ["seal", "quantity"], fieldValues: { seal: "济生药房双鹤封签", quantity: "木箱两只，共四十八包止血药" }, sourceCharacterIds: ["he-jinshun", "fang-zhiyuan", "cai-shumei"], expiresAt: "1943-09-09T14:00:00.000Z" },
    { id: "seizure-transfer", title: "药箱转移去向", truth: "true", requiredFields: ["vehicle", "destination"], fieldValues: { vehicle: "缉私科灰色二号卡车", destination: "海关七号仓东侧夹库" }, sourceCharacterIds: ["lu-xiaoman", "cai-shumei", "wei-zonghai"], expiresAt: "1943-09-09T14:00:00.000Z" },
    { id: "false-tide-story", title: "北汊夜船传闻", truth: "false", requiredFields: ["route", "time"], fieldValues: { route: "北汊盐船码头", time: "9月7日午夜" }, sourceCharacterIds: ["duan-mingli", "he-jinshun"], expiresAt: "1943-09-10T14:00:00.000Z" },
    { id: "forged-pass-batch", title: "伪造通行证批次", truth: "true", requiredFields: ["prefix", "count"], fieldValues: { prefix: "海临乙字", count: "二十四张，其中六张已故意流入黑市" }, sourceCharacterIds: ["xu-tingzhou", "cai-shumei", "wei-zonghai"], expiresAt: "1943-09-12T14:00:00.000Z" },
    { id: "decoy-meeting", title: "诱捕会面安排", truth: "true", requiredFields: ["place", "time"], fieldValues: { place: "临河茶楼二层东包厢", time: "9月11日晚八点" }, sourceCharacterIds: ["qiao-yunshu", "duan-mingli", "wei-zonghai"], expiresAt: "1943-09-12T14:00:00.000Z" },
    { id: "watched-contact-list", title: "敌方观察对象", truth: "partial", requiredFields: ["targets", "priority"], fieldValues: { targets: "车站售票员、药房学徒与外埠商号经办", priority: "持海临乙字证件者优先跟踪，不立即抓捕" }, sourceCharacterIds: ["lu-xiaoman", "fang-zhiyuan", "wei-zonghai"], expiresAt: "1943-09-12T14:00:00.000Z" },
    { id: "borrowed-seal", title: "港务印章借用记录", truth: "partial", requiredFields: ["holder", "return"], fieldValues: { holder: "一名自称缉私科文书的人", return: "借用当晚归还，但印面有重新上蜡痕迹" }, sourceCharacterIds: ["xu-tingzhou", "cai-shumei"], expiresAt: "1943-09-13T14:00:00.000Z" },
    { id: "patrol-gap", title: "南汊巡逻空档", truth: "true", requiredFields: ["sector", "window"], fieldValues: { sector: "三道芦湾至旧砖窑水口", window: "每日凌晨三点十分至三点四十五" }, sourceCharacterIds: ["lao-guan", "lu-xiaoman", "duan-mingli"], expiresAt: "1943-09-16T14:00:00.000Z" },
    { id: "evacuation-manifest", title: "撤离人员次序", truth: "true", requiredFields: ["groups", "sequence"], fieldValues: { groups: "两名伤员、三名交通员及一名报务员", sequence: "伤员先行，交通员分两船，报务员最后携机转移" }, sourceCharacterIds: ["fang-zhiyuan", "qiao-yunshu", "cai-shumei"], expiresAt: "1943-09-16T14:00:00.000Z" },
    { id: "clean-radio-route", title: "备用无线电联络", truth: "true", requiredFields: ["site", "callSign"], fieldValues: { site: "南汊芦荡第二间废弃船屋", callSign: "潮退三声，间隔七分钟" }, sourceCharacterIds: ["lao-guan", "xu-tingzhou", "he-jinshun"], expiresAt: "1943-09-16T14:00:00.000Z" },
  ],
  objectives: [
    { id: "recover-medicine-route", title: "第一任务：查明失踪药箱去向", sequence: 1, required: true, deadline: "1943-09-09T14:00:00.000Z", requiredIntelIds: ["courier-departure", "medicine-crate-mark", "seizure-transfer"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization", completionEffects: { investigationPressure: 22, personalSuspicion: 3, interrogation: { interrogatorCharacterId: "wei-zonghai", delayMinutes: 60, questionsByCoverProfile: { archive_clerk: ["失踪药箱被扣前后，你为什么反复查阅托运票和封条底档？", "谁授权你核对七号仓的签章？", "现在检查你的值班簿，哪些同事能证明你的公开工作？"], travelling_merchant: ["你为什么同时向药房和七号仓追问同一批货？", "永泰商行为何替一个不露面的货主承担滞纳金？", "现在核对客户、账册和送货人，谁能证明你的路线？"], freelance_writer: ["一则普通寻人启事为什么值得你跑车站和货栈？", "你掌握的药箱消息来自采访还是有人授意？", "现在核对校样、编辑和采访笔记，会得到怎样的时间线？"] } }, notice: "组织确认药箱被秘密扣在七号仓，并及时调整取药方案；缉私科随即扩大了对通行证和相关人员的倒查。" } },
    { id: "expose-forged-pass-trap", title: "第二任务：揭开伪证诱捕计划", sequence: 2, required: true, unlockAfterObjectiveIds: ["recover-medicine-route"], deadline: "1943-09-12T14:00:00.000Z", requiredIntelIds: ["forged-pass-batch", "decoy-meeting", "watched-contact-list"], minimumConfidence: 0.72, acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization", completionEffects: { investigationPressure: 18, networkExposure: 4, notice: "组织避开了伪造通行证和茶楼诱捕点，但敌方开始封锁南汊水路，原有交通线必须立即重建。" } },
    { id: "restore-reed-network", title: "第三任务：重建南汊交通线", sequence: 3, required: true, unlockAfterObjectiveIds: ["expose-forged-pass-trap"], deadline: "1943-09-16T14:00:00.000Z", requiredIntelIds: ["patrol-gap", "evacuation-manifest", "clean-radio-route"], minimumConfidence: 0.75, acceptedDeliveryMethods: ["radio", "courier"], recipientId: "organization", completionEffects: { investigationPressure: 8, notice: "巡逻空档、撤离次序和备用电台方案全部送达，南汊交通线在总搜查前恢复运转。" } },
  ],
};

const fieldLabels: Record<string, Record<string, string>> = {
  "courier-departure": { date: "出发日期", train: "计划车次" },
  "medicine-crate-mark": { seal: "药箱封签", quantity: "药品数量" },
  "seizure-transfer": { vehicle: "转运车辆", destination: "扣押地点" },
  "false-tide-story": { route: "传闻路线", time: "传闻时间" },
  "forged-pass-batch": { prefix: "证件字头", count: "流出数量" },
  "decoy-meeting": { place: "诱捕地点", time: "会面时间" },
  "watched-contact-list": { targets: "观察对象", priority: "跟踪规则" },
  "borrowed-seal": { holder: "借用人", return: "归还情况" },
  "patrol-gap": { sector: "水路区段", window: "巡逻空档" },
  "evacuation-manifest": { groups: "撤离人员", sequence: "撤离次序" },
  "clean-radio-route": { site: "备用台址", callSign: "联络信号" },
};

const sourceRequirements: Record<string, { familiarity: number; privateTrust: number }> = {};
for (const character of characters) sourceRequirements[character.id] = { familiarity: 5, privateTrust: 2 };

for (const intel of draft.intel) {
  intel.fieldLabels = fieldLabels[intel.id];
  const missionSequence = draft.objectives.find((objective) => objective.requiredIntelIds.includes(intel.id))?.sequence ?? 1;
  intel.sourceRequirements = Object.fromEntries(intel.sourceCharacterIds.map((sourceId) => [sourceId, {
    familiarity: missionSequence === 3 ? 13 : missionSequence === 2 ? 9 : sourceRequirements[sourceId].familiarity,
    privateTrust: missionSequence === 3 ? 8 : missionSequence === 2 ? 5 : sourceRequirements[sourceId].privateTrust,
  }]));
}

draft.intel.find((intel) => intel.id === "courier-departure")!.sourceOrigins = { "xu-tingzhou": "missing-ticket-copy", "qiao-yunshu": "withdrawn-notice", "lu-xiaoman": "station-ticket-stub" };
draft.intel.find((intel) => intel.id === "medicine-crate-mark")!.sourceOrigins = { "he-jinshun": "trading-consignment", "fang-zhiyuan": "pharmacy-order", "cai-shumei": "warehouse-intake" };
draft.intel.find((intel) => intel.id === "forged-pass-batch")!.sourceOrigins = { "xu-tingzhou": "port-pass-ledger", "cai-shumei": "warehouse-pass-copy", "wei-zonghai": "customs-operation-file" };

export const HAIZHOU_1943 = assertValidCampaign(draft);
