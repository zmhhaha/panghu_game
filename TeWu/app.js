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
    id: "tokko",
    code: "日本特高警察 · 1911—1945",
    name: "特高科",
    roman: "TOKKO",
    era: "1911—1945 · 日本与占领区",
    setting: "东京下町警察署入口",
    sceneCaption: "东京下町 · 21:30",
    description: "以思想审查、出版监控和邻保网络维持秩序。沉默、检举与一份通信记录都可能改变一个人的命运。",
    briefing: "警察署思想课正在核对一批夜间来客。十名人员会以工人、学生和职员身份进入辖区，其中有人与反战出版和地下联络网络有关。",
    historical: "特高警察于 1911 年设立，长期负责政治思想审查、出版管制、反共调查和殖民地监控，曾参与对异议者的拘押与酷刑；1945 年日本战败后被解散。本作呈现其压迫性制度背景，不把思想警察包装成英雄能力。",
    targetLabel: "反战与地下联络人员",
    terms: ["思想检举", "特高警察", "出版审查", "邻保网络"],
    route: "东海道夜行线",
    office: "警察署思想课档案室",
    authority: "警视厅特高课",
    names: ["佐藤健一", "山田澄江", "高桥修一", "小林千代", "中村诚", "田中芳子", "森川隆", "井上美代", "渡边修", "石井春树"],
  },
  {
    id: "cia",
    code: "美国中央情报局 · 1950—1954",
    name: "中央情报局",
    roman: "CIA",
    era: "1950—1954 · 麦卡锡主义时期的美国",
    setting: "华盛顿联邦办公区入口",
    sceneCaption: "华盛顿 · 22:10",
    description: "麦卡锡主义时期的忠诚审查与反共恐惧。公开表态、关系名单和一封旧信都可能影响一个人的工作与自由。",
    briefing: "华盛顿的安全名单出现缺口。十名来客会在夜间进入联邦办公区，其中有人与美国共产主义组织保持秘密联络，你要在不看标签的情况下找出他。",
    historical: "本机构背景采用 1950—1954 年麦卡锡主义时期的冷战语境，参考忠诚调查、黑名单、国会调查和反共举报；本作采用架空设定，让 CIA 承担一线国内审查职责，现实中的美国国内调查分工并不完全如此。",
    terms: ["忠诚调查", "麦卡锡主义", "黑名单", "安全许可"],
    route: "华盛顿—纽约铁路联络线",
    office: "国内安全审查处",
    authority: "中央情报局国内安全联络组",
    targetLabel: "美国共产主义分子",
    names: ["托马斯·里德", "伊莱恩·哈里斯", "彼得·沃格特", "玛格丽特·科尔", "詹姆斯·贝克", "安娜·克劳斯", "威廉·格林", "苏珊·米勒", "罗伯特·海因斯", "露丝·卡特"],
  },
];

const LOCAL_KNOWLEDGE = {
  gestapo: ["旧检查棚夜班在 22:00 换岗，交接簿会留下车次与临时改线记录。", "外环主路与东线货运支线的口头叫法不同；长期跑线的人通常分得清。", "铁路警察档案室可核对通行证编号、岗位交接和封签登记。"],
  kgb: ["封闭城市的许可分为人员、货运与夜间换乘三类，编号格式不同。", "第七边境铁路在凌晨会有一次固定的登记交接，错过者必须说明原因。", "当地人把西侧岗亭称作旧站房，而官方文件仍使用边检哨位。"],
  tokko: ["东京下町警察署的夜间登记由值班巡查负责，换岗时会在巡查簿上留下时间和印章。", "辖区居民通常把警察署后侧的小路称作纸灯巷，正式地图只标作第三联络道。", "思想课档案室可以核对出版物送检记录、邻保联络和临时通行证，但不会记录普通闲谈。"],
  cia: ["麦卡锡主义时期，忠诚调查、普通通行证和安全许可不是同一套记录，编号格式也不同。", "华盛顿联邦办公区的公开入口、后勤入口和听证会访客入口由不同窗口登记。", "国会调查、雇主黑名单和安全许可可能互相引用，但街头传闻不等于正式证据。"],
};

const INSTITUTIONAL_AXES = {
  gestapo: {
    title: "政治忠诚与组织关系",
    brief: "盘查会关注候选人对纳粹统治、官方组织与占领秩序的公开态度；历史语境用于识别政治迫害机制，不将其立场视为正当。",
    prompts: ["你如何看待元首和当前国家秩序？", "你所属的组织或工会最近由谁负责？", "你对占领区来的人员有什么看法？", "若发现同事散发非法传单，你会怎么处理？"],
  },
  kgb: {
    title: "安全观念与外部接触",
    brief: "盘查会围绕冷战对手、涉外接触、出入许可与国家安全叙事展开，重点是回答能否与行程和关系记录相互印证。",
    prompts: ["你怎么看待西方广播和冷战对手？", "你最近是否接触过外国人或外来信件？", "为什么需要夜间进入封闭城市？", "若有人请你带一件未登记物品过境，你会如何回应？"],
  },
  tokko: {
    title: "思想立场与日常检举",
    brief: "特高科会把反战出版、工人学生组织、邻保检举和涉外通信当作审查重点；政治口号本身不应替代对具体关系、时间和记录的核对。",
    prompts: ["你如何看待国家总动员和天皇制下的义务？", "最近读过或替谁递送过什么报刊？", "邻保组织或警察署有没有找你作过思想情况说明？", "如果同事私下谈论反战或罢工，你会怎么处理？"],
  },
  cia: {
    title: "麦卡锡主义式忠诚审查",
    brief: "本作架空设定下，盘查会关注反共公开表态、忠诚调查、安全许可、黑名单和共产主义组织关联；不把一句政治口号当作定罪证据，而要追查具体关系和记录。",
    prompts: ["你如何证明自己忠于美国而不是共产主义组织？", "你是否参加过工会、读书会或被调查的政治集会？", "谁能为你的安全许可、雇佣履历或忠诚证明作担保？", "你最近是否与被列入黑名单的人有过工作往来？"],
  },
};

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
  { id: "bookbinder", role: "旧书装订工", origin: "中央图书馆后库", target: false, public: "背着皮线和一摞待修的书脊", signature: "会下意识检查纸张纤维和装订线", tell: "修复登记、纸张批次与领取时间可以交叉核对" },
  { id: "conductor", role: "夜班电车售票员", origin: "北城电车库", target: false, public: "腰包里有剪票钳和一卷未用完的车票", signature: "记得每一站的上车人，却说不清自己的休息时间", tell: "末班车票根、车库排班与临时绕行记录能拼出路线" },
  { id: "photographer", role: "报社暗房技师", origin: "西区新闻社", target: false, public: "提着装有底片盒的帆布袋，手指沾着显影液", signature: "谈光线和药水时极其镇定，谈拍摄对象时会变得谨慎", tell: "底片编号、暗房登记与报道截稿时间可以互相印证" },
  { id: "locksmith", role: "市政锁具维修员", origin: "东门市政工坊", target: false, public: "工具卷里放着钥匙胚和一份褪色的维修单", signature: "会先观察门锁磨损，再回答别的问题", tell: "维修单、钥匙胚批次和夜间报修电话能够互相核查" },
  { id: "baker", role: "配给面包房夜班师傅", origin: "北区配给站", target: false, public: "围裙上沾着面粉，提着两只空面包箱", signature: "总会先问交接时间，再回答私人问题", tell: "面粉配给单、烤炉班次与送货箱回收记录可以核对" },
  { id: "tailor", role: "制服裁缝", origin: "南街缝纫合作社", target: false, public: "皮尺绕在颈上，布包里露出半截制服袖章", signature: "能准确说出布料和针脚，却回避顾客姓名", tell: "裁缝登记、布料批次和取衣凭条能区分正常订单与临时改制" },
  { id: "telegraphist", role: "邮电局夜班报务员", origin: "中央邮电局", target: false, public: "携带一只上锁的报文夹和备用碳纸", signature: "习惯把句子说得像电文一样短", tell: "报文编号、值班钟点和碳纸压痕能够核验其夜班经历" },
  { id: "ferryman", role: "渡口摆渡人", origin: "东河临时码头", target: false, public: "雨披仍滴着水，腰间挂着缆绳钩", signature: "记得船次和水位，却不喜欢谈乘客", tell: "渡口船次、缆绳登记和潮位记录能重建夜间航线" },
  { id: "labtech", role: "市立检验所助理", origin: "西郊检验所", target: false, public: "手提装有试管架的木盒，衣袖有淡淡消毒剂气味", signature: "遇到化验问题会变得异常精确", tell: "样本编号、药品领用和送检时间能验证其工作轨迹" },
  { id: "porter", role: "保税仓搬运工", origin: "南站保税仓", target: false, public: "肩上搭着麻绳，手背有新磨出的血泡", signature: "知道货物重量，却常把箱号说得过快", tell: "货物磅单、入库签收和夜班点名册可以还原他的装卸顺序" },
];

// These are shared facts, not hidden answers. They only enter the board after
// the player asks about the relevant subject or runs the institution check.
const NETWORKS = {
  printer: { node: "旧检查棚", relation: "曾有人看见一名校样员在旧检查棚与电台技师短暂停留。", verify: "档案室记录了一段临时改线和两次货车停靠；夜班岗位栏的笔迹并不完整。" },
  nurse: { node: "南郊疗养院", relation: "疗养院值班表和药箱封签可互相核验。", verify: "值班表记有药箱 A-47 的封签，但交接人只留下姓氏缩写。" },
  mechanic: { node: "北线车辆段", relation: "车辆段的检修记录可对应到其扳手盒上的编号。", verify: "检修簿登记过轴承异响和一只缺失的专用套筒，签字栏尚未补全。" },
  courier: { node: "旧检查棚", relation: "电台技师与一名携带文件夹的人都在旧检查棚附近出现过。", verify: "岗亭交接簿记下有人询问过无线电呼号，但没有写明提问者姓名或来意。" },
  teacher: { node: "城南学校", relation: "城南学校的作业册上留有当天的批改日期。", verify: "校舍值班表记录了傍晚仍有人批改作业，旧印章的领用页缺少归还时间。" },
  merchant: { node: "东线货站", relation: "货站税票与商行账本可按箱号串联。", verify: "箱号、税票和货运顺序大体相连，但一笔金额被涂改后重新誊写。" },
  actor: { node: "南门剧院区", relation: "剧团后台名单里少了一名替补演员的签名。", verify: "剧团演出单有一处替补栏被划线，后台签名在同一时段出现过两种写法。" },
  surveyor: { node: "河堤巡测线", relation: "河堤潮位记录可对应测绘簿的湿痕与时间。", verify: "水务记录和测绘簿的潮位读数相近，河堤封闭段是否绕行仍需比对天气时刻。" },
  archivist: { node: "旧检查棚", relation: "一只无编号文件夹曾和校样纸、修理工具出现在同一条换乘线。", verify: "档案库入库册没有对应文件夹编号，但旧分类号在一份待整理目录中出现过。" },
  botanist: { node: "西坡林场", relation: "林场采集许可会记录当天的天气和绕行路线。", verify: "采集许可记有雨后绕行的备注，封闭带附近的土样没有列入常规采集清单。" },
  bookbinder: { node: "中央图书馆后库", relation: "装订线、旧分类卡和新闻社的纸张批次在同一份采购清单中出现。", verify: "修复登记写有一批受潮书脊，领取人只签了姓氏首字母。" },
  conductor: { node: "北城电车库", relation: "末班车的临时绕行与市政工坊一通夜间报修电话时间接近。", verify: "车票根少了两张，车库排班表在换班处留有更正笔迹。" },
  photographer: { node: "西区新闻社", relation: "暗房的纸张批次与图书馆后库领出的修复纸相同。", verify: "底片盒编号连续，但一张联系样片没有写明拍摄地点。" },
  locksmith: { node: "东门市政工坊", relation: "市政工坊的夜间报修与末班电车的绕行记录可能指向同一处门锁。", verify: "维修单列有锁芯型号和报修时间，报修人的姓名难以辨认。" },
  baker: { node: "北区配给站", relation: "面包箱的回收时间与保税仓一批夜间卸货时间相邻。", verify: "配给单少了一枚交接章，烤炉班次表记录有一次临时延长。" },
  tailor: { node: "南街缝纫合作社", relation: "一件改制制服的布料批次与邮电局夜班的封签线相同。", verify: "取衣凭条写有尺寸与日期，顾客姓名只留下首字母。" },
  telegraphist: { node: "中央邮电局", relation: "夜间报文夹使用的封签线与制服裁缝的一批材料相同。", verify: "报文编号连续，但一张碳纸压痕显示曾重抄过一段地址。" },
  ferryman: { node: "东河临时码头", relation: "渡口夜航的水位与检验所样本运输的时间可以交叉比对。", verify: "船次簿记有一趟临时加开，乘客栏只写了货物类别。" },
  labtech: { node: "西郊检验所", relation: "样本送检时间与东河临时码头的一次加开夜航接近。", verify: "药品领用单与样本编号相符，但送检人签名过于模糊。" },
  porter: { node: "南站保税仓", relation: "夜间货物磅单与北区配给站的空箱回收时间相邻。", verify: "入库签收和点名册能对上大部分顺序，最后一只箱号被雨水洇开。" },
};

// Hidden character dossiers drive the LLM role-play. They are deliberately
// broader than the public cover and the target flag, so no NPC is reducible
// to a single "truthful" or "lying" response pattern.
const CHARACTER_MODELS = {
  printer: { temperament: "克制、好胜，习惯用专业术语保护自己", immediateGoal: "在天亮前把校样交到接头链的下一环", privateBurden: "曾因一次排版失误害同事受罚，因此害怕留下书面痕迹", socialStance: "对权力机构表面尊重，内心极度防备", memoryAnchors: ["旧检查棚", "校样纸页码", "交接时间"], stressResponse: "越被追问越会给出看似精确、但刻意避开关键人的细节", disclosureArc: "前两轮建立可信职业感，中段用技术细节转移，后段才会在时间线出现裂缝" },
  nurse: { temperament: "耐心、疲惫、有职业责任感", immediateGoal: "把需冷藏的药品及时送回疗养院", privateBurden: "私下替一名无证病人留过药，担心因此被追责", socialStance: "愿意合作，但厌恶无意义的盘查", memoryAnchors: ["药箱封签", "病房班次", "消毒水气味"], stressResponse: "被质疑时先解释病人风险，随后才意识到自己说多了", disclosureArc: "起初简短务实，中段会因药品细节变得激动，最后愿意接受正式核验" },
  mechanic: { temperament: "寡言、固执、对机器比对人更有耐心", immediateGoal: "赶回车辆段完成夜间检修", privateBurden: "为补贴家用私下接过一次不在登记内的维修活", socialStance: "不信任文书人员，但尊重真正懂技术的人", memoryAnchors: ["轴承异响", "扳手盒编号", "检修坑位置"], stressResponse: "面对空泛威吓会沉默，遇到专业追问反而说得过多", disclosureArc: "前段显得可疑地冷淡，技术核验后逐渐建立可信度" },
  courier: { temperament: "机敏、礼貌、善于观察他人反应", immediateGoal: "确认联络点是否安全并把设备送入城内", privateBurden: "掩护身份曾真实做过维修工作，所以掌握大量可信细节", socialStance: "把任何人都当成潜在风险，但会伪装出合作姿态", memoryAnchors: ["无线电呼号", "岗亭换岗", "旧检查棚"], stressResponse: "会用具体技术事实回应，却绕开人与人的关系", disclosureArc: "开场合作而具体，中段开始把重点转去设备，末段在同伴与时间问题上出现选择性遗忘" },
  teacher: { temperament: "温和、敏锐、有一点不合时宜的倔强", immediateGoal: "带着作业回校并避开政治麻烦", privateBurden: "曾替一名学生隐瞒家庭背景", socialStance: "礼貌但不愿让权力介入学生生活", memoryAnchors: ["学生姓名", "校舍后门", "批改日期"], stressResponse: "谈学生时自然，谈机构和政治时明显收紧", disclosureArc: "能给出许多可核验日常细节，也会留下一个令人误判的保留" },
  merchant: { temperament: "精明、焦虑、习惯先算风险", immediateGoal: "让一批药品账目在交割前对上", privateBurden: "账本中有一笔为避税做过的模糊处理", socialStance: "愿配合程序，只要程序能给出明确边界", memoryAnchors: ["箱号", "税票顺序", "货站窗口"], stressResponse: "会主动给材料，但会在无关账目上变得异常紧张", disclosureArc: "证据很多却不够干净，容易成为误捕对象" },
  actor: { temperament: "外向、即兴能力强、害怕沉默", immediateGoal: "借演出身份完成一次短暂的情报转交", privateBurden: "真正的替补演员临时失踪，他借此占用了身份", socialStance: "习惯讨好陌生人并根据对方语气调整说辞", memoryAnchors: ["后台走廊", "台词本", "演出单"], stressResponse: "越紧张越说得多，细节之间会互相打架", disclosureArc: "开场讨喜可信，中段因过度表演暴露后台生活细节不足" },
  surveyor: { temperament: "冷静、观察细致、略显疏离", immediateGoal: "把潮位记录送回水务部门", privateBurden: "和一位被怀疑的旧同学保持过书信往来，但与任务无关", socialStance: "不喜欢解释私生活，愿意解释数据", memoryAnchors: ["潮位刻度", "河堤泥土", "巡测时间"], stressResponse: "面对私人问题会显得回避，面对现场数据则非常准确", disclosureArc: "有真实可疑点但并非目标，需要玩家区分私人秘密与任务关联" },
  archivist: { temperament: "谨慎、怀旧、对分类秩序有近乎偏执的执念", immediateGoal: "将空白文件夹送入指定地点并确认无人跟踪", privateBurden: "曾在旧档案中发现不该看到的名单，因此熟悉多个机关旧称", socialStance: "对档案人员有亲近感，对现场检查人员不耐烦", memoryAnchors: ["入库章", "旧分类号", "东郊档案库"], stressResponse: "会给出丰富的制度知识，却难以解释当天最普通的行程", disclosureArc: "前段专业可信，中段关系与物品来源逐步暴露破绽" },
  botanist: { temperament: "好奇、散漫、容易被感兴趣的事带走", immediateGoal: "带回一批湿润标本并赶上下一班车", privateBurden: "采集时越过过一次封闭地带，只是不想被没收样本", socialStance: "认为检查站不理解野外工作的麻烦", memoryAnchors: ["叶片编号", "雨后土壤", "林场岔路"], stressResponse: "遇到植物问题异常流畅，遇到路线问题会先讲环境再回答", disclosureArc: "行为有违规感但证据链最终能自洽" },
  bookbinder: { temperament: "安静、挑剔、对旧物有耐心", immediateGoal: "把受潮的旧书送回后库并领回修复回执", privateBurden: "曾替一位无证读者偷偷修补过借阅证，担心因此失去工作", socialStance: "不爱谈政治，只相信纸张、日期和签名", memoryAnchors: ["书脊裂口", "纸张水印", "后库领取簿"], stressResponse: "被追问时会纠正细节，却容易忘记先回答问题", disclosureArc: "起初显得过度回避，随后能给出丰富而可信的物件细节" },
  conductor: { temperament: "健谈、疲惫、习惯留意乘客", immediateGoal: "交回末班票款并赶上下一轮排班", privateBurden: "曾放过一名没有车票的孕妇，担心被追究短款", socialStance: "觉得制度离不开人情，但不愿为陌生人担保", memoryAnchors: ["末班车票根", "雨夜站牌", "换班铃"], stressResponse: "会先讲乘客故事来缓和气氛，涉及票款时突然变得防备", disclosureArc: "路线知识非常具体，却因私人短款制造误判空间" },
  photographer: { temperament: "敏感、克制、观察欲强", immediateGoal: "在截稿前把底片送到新闻社并避免损坏", privateBurden: "拍到过一张不该保留的集会照片，至今没有交给编辑", socialStance: "相信画面比口号诚实，对强迫表态有本能戒备", memoryAnchors: ["底片编号", "显影时间", "暗房红灯"], stressResponse: "面对技术问题坦率，问到拍摄对象就把话题拉回职业伦理", disclosureArc: "专业细节足以自证，但一张未标地点的样片让其长期处于灰区" },
  locksmith: { temperament: "务实、谨慎、不喜欢空谈", immediateGoal: "完成夜间报修并把备用钥匙胚交回工坊", privateBurden: "曾替邻居配过未登记的备用钥匙，只为让老人能回家", socialStance: "认为锁具服务于生活，不愿看它被当作政治证据", memoryAnchors: ["锁芯型号", "钥匙胚批次", "门框划痕"], stressResponse: "会先要求查看实物，面对虚构指控时变得冷硬", disclosureArc: "看似掌握危险技能，但维修记录最终能解释大部分疑点" },
  baker: { temperament: "直率、能吃苦、对时间极敏感", immediateGoal: "在清晨配给前交回空箱并确认面粉没有受潮", privateBurden: "曾私下多留过一小袋面粉给邻居孩子，担心被当成盗用", socialStance: "相信让人吃饱比漂亮话更重要", memoryAnchors: ["烤炉温度", "配给单", "空箱编号"], stressResponse: "被质疑时会反复强调班次和面团，却回避那袋多出的面粉", disclosureArc: "生活细节非常真实，但私人善意会制造可疑缺口" },
  tailor: { temperament: "细致、克制、擅长倾听", immediateGoal: "按时交回改制制服并结清布料账", privateBurden: "曾替失业亲属改过一件无凭条制服，不愿牵连对方", socialStance: "不相信衣服能决定一个人的立场", memoryAnchors: ["袖章针脚", "布料批次", "取衣凭条"], stressResponse: "面对材料问题非常自信，问到顾客关系会把话说得很轻", disclosureArc: "表面最稳妥，但一张无姓名凭条会引出复杂的人情解释" },
  telegraphist: { temperament: "冷静、节制、对措辞有职业洁癖", immediateGoal: "完成夜班交接并把报文夹送回局内", privateBurden: "曾替同事延迟过一封私人电报，担心留下违规痕迹", socialStance: "认为信息应该准确传递，不该被任意曲解", memoryAnchors: ["报码节奏", "值班钟", "碳纸压痕"], stressResponse: "会像宣读电文一样回答，遇到地址问题会停顿得过久", disclosureArc: "时间与编号经得住核对，真正的压力来自一段被重抄的地址" },
  ferryman: { temperament: "寡言、耐心、熟悉水路风险", immediateGoal: "等雨势稍缓后回码头收缆绳", privateBurden: "曾在登记外摆渡过一名抱病旅客，不愿让其家属受罚", socialStance: "不轻易评判乘客，只相信船次和水位", memoryAnchors: ["潮位刻度", "缆绳结", "船篷漏水声"], stressResponse: "会详述河流和船况，对乘客身份则坚持记不清", disclosureArc: "航线细节可信，但临时加开的夜航让其始终难以完全摆脱怀疑" },
  labtech: { temperament: "理性、紧张、习惯反复确认", immediateGoal: "把易变质样本送入检验所冷柜", privateBurden: "曾替一名熟人提前看过检验结果，违反了流程", socialStance: "相信数据应当由专业人员解释，不愿接受政治化盘问", memoryAnchors: ["样本编号", "冷柜温度", "领用标签"], stressResponse: "技术问题越问越详细，关系问题会突然变得简短", disclosureArc: "物品和时间看似完美，但送检人签名留下可供追问的缝隙" },
  porter: { temperament: "粗犷、谨慎、有很强的记忆力", immediateGoal: "完成最后一批卸货并拿到夜班工钱", privateBurden: "替受伤同伴顶过一次班，导致点名册与实际装卸人不一致", socialStance: "讨厌被当成不懂事的人，也不愿解释工友关系", memoryAnchors: ["磅单重量", "麻绳磨痕", "仓门编号"], stressResponse: "会报出大量重量和箱号，越说越快时反而容易露出顺序问题", disclosureArc: "具备扎实劳动细节，但替班行为足以成为误捕陷阱" },
};

const SOCIAL_ENVIRONMENTS = {
  gestapo: { pressure: "战时征用、配给制度与政治迫害让公开表态和私人关系都带有风险", expectation: "人们会谨慎区分能公开说的忠诚表态与不能留下纸面的私人看法" },
  kgb: { pressure: "封闭城市、国家分配与涉外限制使出入许可和外来接触格外敏感", expectation: "人们熟悉官方安全语言，却会对外国广播、短波设备和非登记往来保持戒备" },
  cia: { pressure: "麦卡锡主义时期的忠诚调查、黑名单和安全许可会影响就业、社交关系与迁徙，政治活动容易被重新解释", expectation: "人们会公开使用反共和忠诚语言，却担心工会、读书会或旧友关系被扩大解读，因而既辩解又保留" },
};

const OCCUPATION_LENSES = {
  printer: "印刷与文字工作让他接触到文件版本、审查痕迹和传播渠道；他会特别在意哪些话被记录下来。",
  nurse: "照护工作让她优先考虑病人、药品和交接；她可能反感政治盘问侵入专业职责。",
  mechanic: "交通设备和维修记录使他熟悉制度漏洞与实际运行差异；他更信任机器痕迹而非口头表态。",
  courier: "无线电与修理工作让他既能解释技术细节，也必须小心外来接触会被怎样理解。",
  teacher: "教育工作使他与家庭、儿童和地方舆论相连；他会把政治表态与保护学生的责任拉扯在一起。",
  merchant: "账本、税票和物资流通让他承受制度与生计的双重压力；他会区分合法手续、灰色操作与真正的政治风险。",
  actor: "剧团生活让他熟悉临场应对和人情网络，但也让他的履历、同伴和公开形象容易被核查。",
  surveyor: "野外巡测让他更依赖实地数据、天气和路线；私人交往未必等同于政治立场。",
  archivist: "档案分类让他明白制度如何定义人；他会对旧称、缺页和未盖章文件异常敏感。",
  botanist: "采集工作与林场、土地和季节相连；他会将越界行为理解为工作必要，未必意识到它的政治含义。",
  bookbinder: "装订和修复工作让他从纸张、水印和书脊判断来历；他会把物件损坏当作比口头态度更可靠的证据。",
  conductor: "夜班电车让他见过不同阶层和各种临时理由；他熟悉路线与乘客习惯，却不愿为任何人承担责任。",
  photographer: "暗房工作使他重视编号、曝光和画面边缘的细节；他知道记录既能证明，也会给人带来风险。",
  locksmith: "锁具维修让他接触门禁、钥匙和报修关系；他能解释机械痕迹，却会回避无登记的私人请求。",
  baker: "配给面包房的班次、温度和空箱回收决定他的时间感；他会把生计和照顾邻里放在政治口号之前。",
  tailor: "制服裁缝能从布料、尺寸和针脚看出订单来源；其理解人们会用衣物掩饰困境，却不会轻易替人解释。",
  telegraphist: "报务工作要求精确的时间、编号和措辞；他会对一段被改写的信息格外敏感。",
  ferryman: "渡口工作让他熟悉水位、船次和天气，但乘客身份常常只留下模糊剪影。",
  labtech: "检验所的样本、标签和冷藏时限塑造了他的回答方式；他会本能地区分专业事实和私人关系。",
  porter: "仓库搬运让他以重量、箱号和工序记忆夜晚；工友互相顶班的惯例会让正式记录留下空白。",
};

function socialContextFor(campaign, blueprint) {
  const environment = SOCIAL_ENVIRONMENTS[campaign.id] || {};
  return `${environment.pressure || "当地制度和社会关系会影响每一次盘查。"} ${environment.expectation || "公开表态需要与实际记录对照。"} ${OCCUPATION_LENSES[blueprint.id] || "职业经历会影响他的语言和风险判断。"}`;
}

const CASE_LINKS = {
  printer: [{ to: "courier", type: "旧检查棚短暂交叉", description: "校样纸和电台设备在同一换乘点出现过。" }],
  courier: [{ to: "printer", type: "旧检查棚短暂交叉", description: "电台技师与校样员可能共享一次换乘窗口。" }, { to: "archivist", type: "文件夹路线交叉", description: "维修工具和无编号文件夹出现在同一条进城线附近。" }],
  archivist: [{ to: "courier", type: "文件夹路线交叉", description: "无编号文件夹的出现地点与电台技师的路线相邻。" }, { to: "teacher", type: "公开职业交叉", description: "档案修复员曾核对过学校印章的旧分类。" }],
  nurse: [{ to: "merchant", type: "药品交接", description: "药箱封签和药品账本可以通过箱号交叉核对。" }],
  merchant: [{ to: "nurse", type: "药品交接", description: "药品商行的箱号应当能对应疗养院的封签。" }],
  mechanic: [{ to: "surveyor", type: "运输线交叉", description: "车辆段维修车次与河堤巡测车次共享一段夜间线路。" }],
  surveyor: [{ to: "mechanic", type: "运输线交叉", description: "巡测员记得的车次可以和车辆段检修记录对照。" }],
  botanist: [{ to: "surveyor", type: "野外路线交叉", description: "林场岔路与河堤巡测线在雨后共用一段道路。" }],
  actor: [{ to: "teacher", type: "临时身份交叉", description: "剧团和学校都曾使用同一处旧会馆作为临时场地。" }],
  teacher: [{ to: "archivist", type: "公开职业交叉", description: "学校印章和旧档案分类存在可核对的历史联系。" }, { to: "actor", type: "临时身份交叉", description: "学校和剧团都熟悉旧会馆的后门称呼。" }],
  bookbinder: [{ to: "photographer", type: "纸张批次交叉", description: "图书馆后库和新闻社暗房领用了同批修复纸。" }],
  photographer: [{ to: "bookbinder", type: "纸张批次交叉", description: "暗房联系样片与后库修复纸来自同一批采购。" }],
  conductor: [{ to: "locksmith", type: "夜间报修交叉", description: "末班电车绕行时段与一通市政报修电话相邻。" }],
  locksmith: [{ to: "conductor", type: "夜间报修交叉", description: "工坊报修单的时间可和末班电车绕行记录对照。" }],
  baker: [{ to: "porter", type: "夜间货箱交叉", description: "面包箱回收与保税仓最后一批卸货的时间相邻。" }],
  porter: [{ to: "baker", type: "夜间货箱交叉", description: "保税仓磅单的空箱记录可和北区配给站的回收单对照。" }],
  tailor: [{ to: "telegraphist", type: "封签线交叉", description: "制服改制使用的封签线与一只夜间报文夹来自同一批材料。" }],
  telegraphist: [{ to: "tailor", type: "封签线交叉", description: "报文夹封签线的采购批次可追到南街缝纫合作社。" }],
  ferryman: [{ to: "labtech", type: "夜航样本交叉", description: "东河加开夜航与一批检验所样本的送检时间重叠。" }],
  labtech: [{ to: "ferryman", type: "夜航样本交叉", description: "样本送检单可与东河临时码头的夜航登记相互核对。" }],
};

const CASE_SEEDS = {
  printer: { routeTrue: "在旧检查棚等候东线支线的货车", routeCover: "只记得沿主路直接换车", timeTrue: "21:40 到达旧检查棚，22:20 离开", timeCover: "22:00 后才到达检查棚", objectTrue: "校样纸夹着一张不该出现的页码清单", objectCover: "公文包只有普通校样", relationTrue: "和电台技师有一次短暂交接", relationCover: "没有和任何人同行", stanceTrue: "表面服从，避免留下政治观点", stanceCover: "公开重复官方口号", evidence: ["铁路交接簿", "校样纸页码", "旧检查棚目击记录"] },
  nurse: { routeTrue: "从南郊疗养院走药品专线", routeCover: "从南郊主路直接进城", timeTrue: "药箱在 21:15 完成封签", timeCover: "只记得晚班交接后出发", objectTrue: "药箱封签编号 A-47", objectCover: "药箱里的药品按普通清单登记", relationTrue: "药品账本中有商行会计的交接号", relationCover: "只认识疗养院内部人员", stanceTrue: "不愿让政治盘问影响病人照护", stanceCover: "愿意按程序配合", evidence: ["值班表", "药箱封签", "药品交接单"] },
  mechanic: { routeTrue: "从北线车辆段经维修支线进城", routeCover: "搭普通货车走主线", timeTrue: "20:50 在检修坑完成轴承更换", timeCover: "只记得夜班开始前检查过车辆", objectTrue: "扳手盒少了一把专用套筒", objectCover: "工具盒按维修清单齐全", relationTrue: "与一名巡测员共享过维修车次信息", relationCover: "只和车辆段同事打交道", stanceTrue: "相信机器记录胜过机关口头命令", stanceCover: "不愿讨论政治", evidence: ["检修记录", "扳手盒编号", "维修车次表"] },
  courier: { routeTrue: "从西部公路检查点绕到旧检查棚", routeCover: "从公路直接进入货运线", timeTrue: "21:55 观察换岗，22:10 进入维修窗口", timeCover: "22:20 才到达检查棚", objectTrue: "普通修理工具中藏有微型线圈", objectCover: "工具箱没有夹层", relationTrue: "与校样员和档案修复员共享一段换乘线", relationCover: "独自行动，没有同行者", stanceTrue: "把外部接触解释为技术工作", stanceCover: "声称不关心任何政治组织", evidence: ["岗亭换岗簿", "无线电呼号记录", "维修工具清单"] },
  teacher: { routeTrue: "从城南学校经邮政巷到检查站", routeCover: "从城南主路直接进城", timeTrue: "18:30 在学校完成最后一节课批改", timeCover: "下午就已离开学校", objectTrue: "旧印章来自学校后门的临时登记册", objectCover: "印章只是教学用品", relationTrue: "曾替学生家庭隐瞒一项背景信息", relationCover: "只和学校同事保持公开关系", stanceTrue: "不愿让机构介入学生生活", stanceCover: "愿意服从学校规定", evidence: ["作业批改日期", "学校值班表", "旧印章登记"] },
  merchant: { routeTrue: "从东线货站按药品箱号路线进城", routeCover: "从东线主路直接进城", timeTrue: "20:10 在货站窗口核对税票", timeCover: "晚饭后才到货站", objectTrue: "账本有一笔为避税而模糊处理", objectCover: "账本和税票完全无误", relationTrue: "药箱封签与疗养院交接号相连", relationCover: "只认识商行掌柜", stanceTrue: "把生计和政治风险严格分开", stanceCover: "愿意公开支持秩序", evidence: ["税票顺序", "货运箱号", "商行账本"] },
  actor: { routeTrue: "从南门剧院区经旧会馆后门进城", routeCover: "跟随剧团车辆走正门", timeTrue: "19:40 后台有人替他签名", timeCover: "演出前一直在化妆间", objectTrue: "台词本夹着一张临时交接便签", objectCover: "演出服和台词本属于剧团", relationTrue: "借用失踪替补演员的身份", relationCover: "只是临时顶班，没有额外联系人", stanceTrue: "善于根据审问者立场调整说辞", stanceCover: "只想完成演出", evidence: ["剧团演出单", "后台签名册", "旧会馆后门记录"] },
  surveyor: { routeTrue: "沿河堤巡测线到达检查站", routeCover: "从水务办公室直接进城", timeTrue: "18:20 记录潮位，19:00 绕过河堤封闭段", timeCover: "只记得雨后沿主路行走", objectTrue: "测绘簿边缘的湿痕对应封闭段", objectCover: "记录簿只是正常工作材料", relationTrue: "与被调查的旧同学有书信往来", relationCover: "没有任何私人联系", stanceTrue: "认为私人交往不等于政治立场", stanceCover: "愿意说明所有公开工作", evidence: ["潮位记录", "水务巡测表", "天气记录"] },
  archivist: { routeTrue: "从东郊档案库经旧检查棚转入城内", routeCover: "从档案库直接走登记主路", timeTrue: "20:30 取出无编号文件夹，21:50 经过旧检查棚", timeCover: "只记得晚间离开档案库", objectTrue: "文件夹没有入库章，夹有旧分类号", objectCover: "文件夹是普通空白材料", relationTrue: "知道电台技师使用的旧检查棚称呼", relationCover: "不认识任何外部联络者", stanceTrue: "相信档案分类比现场口供更可靠", stanceCover: "只服从档案室流程", evidence: ["档案入库册", "旧分类号", "文件夹纸张来源"] },
  botanist: { routeTrue: "从西坡林场绕过封闭带到河堤巡测线", routeCover: "从林场主路搭车进城", timeTrue: "16:40 越过封闭带采集标本，18:10 遇到雨", timeCover: "下午一直在许可范围内采集", objectTrue: "标本箱带着封闭带土壤", objectCover: "标本都有正常采集许可", relationTrue: "和巡测员共享过一段雨后道路", relationCover: "独自采集，没有同行者", stanceTrue: "认为工作需要可以解释一次越界", stanceCover: "尊重所有封闭区域规则", evidence: ["采集许可", "叶片编号", "当日天气记录"] },
  bookbinder: { routeTrue: "从中央图书馆后库沿邮政巷到检查站", routeCover: "从图书馆正门直接进城", timeTrue: "19:10 领取受潮书脊，20:00 在后库补过一次登记", timeCover: "傍晚离开后库就一直在路上", objectTrue: "皮线卷里夹着一张旧借阅证", objectCover: "背包里只有待修书脊和装订线", relationTrue: "与暗房技师核对过同批修复纸", relationCover: "只认识图书馆里的装订同事", stanceTrue: "不愿把读者借阅习惯变成政治审查材料", stanceCover: "愿意完全按图书馆程序配合", evidence: ["后库领取簿", "纸张水印", "修复登记"] },
  conductor: { routeTrue: "从北城电车库随末班车绕行到检查站", routeCover: "从电车库按常规线路直达", timeTrue: "21:25 因夜间报修绕过两站，22:05 交回部分票根", timeCover: "只记得末班车照常运行", objectTrue: "腰包少了两张被雨水浸坏的票根", objectCover: "票款和车票都按班次交接", relationTrue: "听到市政工坊为一处门锁报修", relationCover: "只和车库调度说过话", stanceTrue: "觉得夜间乘客有自己的难处，不愿替人定性", stanceCover: "一切按车库规定处理", evidence: ["末班车票根", "车库排班", "临时绕行记录"] },
  photographer: { routeTrue: "从西区新闻社经旧电车站进入联络区", routeCover: "从新闻社走公开入口直接过来", timeTrue: "20:40 在暗房冲洗底片，21:30 取走联系样片", timeCover: "傍晚前就结束了暗房工作", objectTrue: "底片盒里有一张未标地点的集会照片", objectCover: "帆布袋只装当晚新闻底片", relationTrue: "和装订工确认过修复纸的批次", relationCover: "只与报社编辑有工作往来", stanceTrue: "不愿把拍摄对象的政治立场替他们解释", stanceCover: "只关心报道是否按时发表", evidence: ["暗房登记", "底片编号", "截稿时间"] },
  locksmith: { routeTrue: "从东门市政工坊经临时报修点到检查站", routeCover: "从市政工坊沿主路直接过来", timeTrue: "21:15 接到夜间报修，21:45 更换过一枚锁芯", timeCover: "下班后直接离开工坊", objectTrue: "工具卷里有一把未登记的备用钥匙胚", objectCover: "工具和钥匙胚都在维修清单内", relationTrue: "报修时间与末班电车绕行相近", relationCover: "没有和任何夜班人员联系", stanceTrue: "认为锁具维修不该被当作揣测他人身份的理由", stanceCover: "愿意遵守所有市政登记规定", evidence: ["维修单", "钥匙胚批次", "夜间报修电话"] },
  baker: { routeTrue: "从北区配给站经夜间送货巷到检查站", routeCover: "从配给站沿主路直接过来", timeTrue: "20:30 清点空箱，21:20 延长过一轮烤炉班次", timeCover: "夜班按平常时间结束", objectTrue: "空箱底部夹着一张多领面粉的便条", objectCover: "两只空箱只是正常回收", relationTrue: "空箱回收与保税仓夜间卸货相邻", relationCover: "只和面包房同事打交道", stanceTrue: "认为配给应优先照顾真正挨饿的人", stanceCover: "完全按配给站规定办事", evidence: ["配给单", "烤炉班次表", "空箱回收记录"] },
  tailor: { routeTrue: "从南街缝纫合作社经旧会馆外侧到检查站", routeCover: "从合作社按主路直接过来", timeTrue: "19:50 完成制服改制，21:00 等待一名取衣人", timeCover: "傍晚交件后就离开合作社", objectTrue: "布包里有一枚无凭条的旧袖章", objectCover: "只有待交还的制服袖章", relationTrue: "封签线与邮电局报文夹来自同批材料", relationCover: "只认识合作社的裁缝", stanceTrue: "不愿让顾客的衣物成为政治追问的入口", stanceCover: "只按合作社的订单程序工作", evidence: ["裁缝登记", "布料批次", "取衣凭条"] },
  telegraphist: { routeTrue: "从中央邮电局经北门正路到检查站", routeCover: "从邮电局直接走公开入口", timeTrue: "20:15 接手夜班，21:35 重抄过一段报文地址", timeCover: "整晚只做常规值班", objectTrue: "报文夹里夹着一张作废的碳纸", objectCover: "报文夹只含已登记的夜班材料", relationTrue: "报文夹封签线可追到裁缝合作社", relationCover: "不认识邮电局外的人", stanceTrue: "认为准确传递消息比迎合任何立场更重要", stanceCover: "只服从通信流程", evidence: ["报文编号", "值班钟点", "碳纸压痕"] },
  ferryman: { routeTrue: "从东河临时码头随加开夜航到检查站", routeCover: "从码头按常规渡口路线过来", timeTrue: "20:55 因水位变化加开一趟短航，21:40 收过一次缆绳", timeCover: "夜里没有异常船次", objectTrue: "雨披内侧留有一张未登记货物的湿纸条", objectCover: "腰间只有摆渡工具", relationTrue: "加开夜航与检验所样本送检时间重叠", relationCover: "不记得任何乘客或货物", stanceTrue: "不愿把渡口乘客的困境变成指控", stanceCover: "一切按渡口规程行船", evidence: ["渡口船次簿", "缆绳登记", "潮位记录"] },
  labtech: { routeTrue: "从西郊检验所经东河码头到检查站", routeCover: "从检验所沿公路直接进城", timeTrue: "20:50 领取样本，21:25 登上一趟临时夜航", timeCover: "按日间流程送检，没有额外行程", objectTrue: "木盒里有一支未登记的复检试管", objectCover: "木盒中只有常规待检样本", relationTrue: "送检时间与东河临时码头夜航相近", relationCover: "只和检验所同事交接", stanceTrue: "认为样本结果不该先被政治结论解释", stanceCover: "愿意遵守所有送检程序", evidence: ["样本编号", "药品领用", "送检时间"] },
  porter: { routeTrue: "从南站保税仓经货运后门到检查站", routeCover: "从保税仓沿主路直接离开", timeTrue: "20:40 顶班装卸，21:50 完成最后一只箱子的磅重", timeCover: "正常参加了整段夜班", objectTrue: "麻绳下压着一张替班工友的点名条", objectCover: "肩上只有正常搬运工具", relationTrue: "空箱记录与北区配给站的回收时间相邻", relationCover: "不认识仓外的任何人", stanceTrue: "认为工友互相帮忙不该被当成秘密关系", stanceCover: "所有装卸都按仓库规章执行", evidence: ["货物磅单", "入库签收", "夜班点名册"] },
};

const NETWORK_FACT_IDS = {
  printer: "network.old_checkpoint",
  courier: "network.old_checkpoint",
  archivist: "network.old_checkpoint",
  nurse: "network.medicine_transfer",
  merchant: "network.medicine_transfer",
  mechanic: "network.night_transport",
  surveyor: "network.night_transport",
  botanist: "network.night_transport",
  actor: "network.old_hall",
  teacher: "network.old_hall",
  bookbinder: "network.paper_batch",
  photographer: "network.paper_batch",
  conductor: "network.night_repair",
  locksmith: "network.night_repair",
  baker: "network.night_crates",
  porter: "network.night_crates",
  tailor: "network.seal_thread",
  telegraphist: "network.seal_thread",
  ferryman: "network.night_crossing",
  labtech: "network.night_crossing",
};

const PUBLIC_STANCE_LINES = {
  gestapo: "公开服从国家秩序和官方组织，不在检查站否定元首或占领体制",
  kgb: "公开效忠国家安全体系，反对未经许可的外部联络和反国家组织",
  tokko: "公开服从国家体制和思想秩序，不在警察署否定动员、反共或出版审查",
  cia: "公开效忠美国，反对共产主义组织，并愿意配合忠诚调查和安全许可核验",
};

function makeCaseFacts(campaign, blueprint) {
  const seed = CASE_SEEDS[blueprint.id] || {};
  const stanceCover = campaign.id === "cia" ? `${seed.stanceCover}；公开使用效忠美国、反共和配合忠诚调查的表述` : seed.stanceCover;
  const make = (suffix, category, truth, coverClaim, evidence, allowedResponses = ["明确回答", "模糊回答", "要求查档"]) => ({ factId: `${blueprint.id}.${suffix}`, category, truth, coverClaim, evidence, publicKnowledge: true, npcKnowledge: "direct", allowedResponses });
  return [
    make("route", "路线", `${seed.routeTrue || `从${blueprint.origin}进入${campaign.setting}`}`, seed.routeCover, [campaign.route, ...(seed.evidence || [])]),
    make("timeline", "时间线", seed.timeTrue, seed.timeCover, seed.evidence || []),
    make("object", "物品", seed.objectTrue, seed.objectCover, seed.evidence || []),
    { ...make("relationship", "关系", seed.relationTrue, seed.relationCover, (CASE_LINKS[blueprint.id] || []).map((link) => link.description)), factId: NETWORK_FACT_IDS[blueprint.id] || `${blueprint.id}.relationship` },
    make("stance", "政治与组织", seed.stanceTrue, stanceCover, [campaign.authority, campaign.office], ["公开表态", "谈论个人经历", "拒绝评价", "把立场转回职业"]),
  ].map((fact) => ({ ...fact, expected: blueprint.target ? fact.coverClaim : fact.category === "政治与组织" ? (PUBLIC_STANCE_LINES[campaign.id] || fact.truth) : fact.truth }));
}

const INSTITUTION_TOOLS = {
  gestapo: { label: "档案比对", description: "调取铁路警察档案室的岗位、证件和交接记录。" },
  kgb: { label: "许可核验", description: "比对封闭城市登记处的出入许可和换乘记录。" },
  tokko: { label: "思想档案核查", description: "核对出版物送检、邻保联络、临时通行证和思想课登记。" },
  cia: { label: "忠诚背景核查", description: "检索安全许可、雇佣履历、黑名单引用和公开联络记录。" },
};

const FOLLOWUP_DETAILS = {
  identity: ["我的工作证能证明岗位，但不能替我解释整段经历。", "若要核对，请查单位登记，不要只凭我说话的快慢判断。"],
  route: ["真正容易对上的不是大路，而是换车和等候的那一小段。", "有一段路我只能说出方向，具体时间应该交给站务记录。"],
  document: ["编号和封签是两回事，登记时请把它们分别记下。", "物品的用途可以解释，来源还要看交接册才不会混淆。"],
  contact: ["公开关系不等于熟人愿意替我担保，这两件事请分开核对。", "我能说明联系发生的场合，但不愿替别人猜测动机。"],
  local: ["我记得的是工作真正经过的地方，不是为了应付盘问背下来的地名。", "如果旧称和文件称呼不同，我宁可注明不确定，也不乱补细节。"],
  purpose: ["事情办完后是否留下回执，比一句‘只是工作’更容易核对。", "我的目的和携带物有关，但不代表每个认识的人都参与其中。"],
  pressure: ["我可以承受核验，但不能把不确定的记忆说成确定事实。", "你要的是能落到记录上的回答，不是我在压力下喊一句口号。"],
  institution: ["我能说明自己的经历和选择，但不会替别人作政治担保。", "立场不是一张通行证，还是请把它和实际记录分开核对。"],
};

const TOPICS = [
  { id: "institution", label: "机构与立场", keys: ["元首", "忠诚", "秩序", "政治", "组织", "工会", "共产主义", "冷战", "西方广播", "外国人", "外来信件", "占领", "日伪", "纪律", "介绍信", "安全许可", "集会", "读书会"] },
  { id: "identity", label: "身份与职责", keys: ["身份", "职业", "做什么", "姓名", "工作"] },
  { id: "chronology", label: "时间与见证", keys: ["昨天", "昨晚", "交班", "时间点", "见过哪些", "见过谁"] },
  { id: "route", label: "路线与时间", keys: ["路线", "从哪里", "几点", "车", "站", "路"] },
  { id: "document", label: "证件与物品", keys: ["证件", "文件", "印章", "箱子", "行李", "票"] },
  { id: "contact", label: "接头与关系", keys: ["谁", "接头", "认识", "联络", "朋友", "见面"] },
  { id: "local", label: "本地细节", keys: ["本地", "地名", "方言", "街", "天气", "习惯"] },
  { id: "purpose", label: "来访目的", keys: ["为什么", "目的", "要去", "来做", "留下"] },
  { id: "pressure", label: "压力测试", keys: ["如果", "扣留", "害怕", "紧张", "隐瞒", "最后"] },
];

const ordinaryLines = [
  (d, c) => `我叫${d.name}，是${d.role}。这次进城的事不复杂，${d.public}，东西都在这里。`,
  (d, c) => `我从${d.origin}过来，先走${c.route}，在旧检查棚换了一次车。大约是傍晚六点以后；夜里路况乱，我不敢保证每分钟都记得。`,
  (d, c) => `证件在这儿。你可以记下编号，至于那只箱子，里面是工作用品，封条没有动过。`,
  (d, c) => `我昨天还在原来的地方值班，交接的人是同一班的老同事。名字我得看记录才敢确认，你们若要核对，找${c.office}就能查到。`,
  (d, c) => `我要见的是${d.id === "nurse" ? "疗养院的值班医生" : d.id === "merchant" ? "商行掌柜" : "我所在单位的负责人"}，不是秘密接头。时间晚了，只是怕耽误工作。`,
  (d, c) => `来这里是为了把事情办完。${d.role}的工作没有什么戏剧性，按清单来，按手续回去。`,
  (d, c) => `这座城的地名我能说清，但我不靠背口号过日子。要是你问${c.setting}附近的路，我只知道我真正走过的那一段。`,
  (d, c) => `我不认识${c.authority}里的人，最多见过窗口工作人员。我的关系都在公开的工作记录里。`,
  (d, c) => `我理解你要谨慎。你可以再问一遍，我前面说的时间、地点和物品不会变。`,
  (d, c) => `如果手续已经齐了，我想尽快过去。需要补充什么就写下来，我愿意留下可以复核的细节。`,
];

const targetLines = [
  (d, c) => `我叫${d.name}，做${d.role}。${d.public}，证件和携带物可以登记，只是有些业务编号得等单位白天回电才能确认。`,
  (d, c) => `我从${d.origin}过来，先走${c.route}，在旧检查棚附近换乘。那一段临时改过道，我记得是先过岗亭再找车。`,
  (d, c) => `证件没有问题，箱子也只是工具。编号我可以报给你，封签是出发前由值班人贴的，具体是谁得查交接册。`,
  (d, c) => `昨天的安排确实临时调整过。我记得先在原处等车，后来才接到改线通知；交接人的姓我记得，名字需要看记录。`,
  (d, c) => `我进城后要找一位熟人处理工作上的交接。他在公开单位里做事，但夜里不方便把别人姓名挂在记录上。`,
  (d, c) => `我的目的就是把手上的东西交到该交的人手里，再取一份回执。要查的话，回执、路线和时间总有一项能对上。`,
  (d, c) => `我来过这附近几次，主路和岗亭的位置记得。小巷的旧称我不一定说得准，毕竟我不是住在这里。`,
  (d, c) => `我和${c.authority}没有私人关系，只按窗口程序办过事。若登记册上有我的名字，应该是在正常业务那一栏。`,
  (d, c) => `扣留会耽误交接，但我愿意等核验。你们最好把问题写具体，我才能把时间、物品和联系人分别说明白。`,
  (d, c) => `我能补充的是：换乘时我看见有人也在等车，但没有同行。那人拿的是什么我没看清，不想把猜测写成事实。`,
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

function factsForTopic(dossier, topic) {
  const categoryByTopic = { institution: "政治与组织", identity: "身份", route: "路线", document: "物品", contact: "关系", local: "路线", purpose: "时间线", pressure: "政治与组织", general: "时间线" };
  const category = categoryByTopic[topic] || "时间线";
  return (dossier.facts || []).filter((fact) => fact.category === category);
}

function institutionalReply(dossier, repeatCount) {
  const position = factsForTopic(dossier, "institution")[0]?.expected || "我只愿意就自己的经历说明。";
  const frames = {
    gestapo: ["这种问题在这里不能随便回答。", "我知道公开表态会被写进记录。"],
    kgb: ["安全问题不该只靠一句态度判断。", "外部接触要看时间、许可和实际来往。"],
    cia: ["我效忠美国，也愿意接受忠诚审查；具体组织往来仍要看履历和记录。", "反对共产主义组织是公开立场，但安全许可不能只靠一句口号发放。"],
  };
  const choices = frames[dossier.campaignId] || ["我只能就自己知道的事回答。"];
  const frame = choices[repeatCount % choices.length];
  return `${frame}${position}。我的工作和来访记录可以核对，但我不会把别人的立场替他们说出来。`;
}

async function requestNpcReply(controller, question, answer) {
  const response = await fetch("/api/npc/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaign: { name: controller.campaign.name, era: controller.campaign.era, setting: controller.campaign.setting, localKnowledge: LOCAL_KNOWLEDGE[controller.campaign.id] || [], institutionalAxes: INSTITUTIONAL_AXES[controller.campaign.id] || {} },
      dossier: { name: controller.dossier.name, role: controller.dossier.role, origin: controller.dossier.origin, public: controller.dossier.public, signature: controller.dossier.signature, tell: controller.dossier.tell, network: controller.dossier.network, personality: controller.dossier.personality, facts: controller.dossier.facts, relationships: controller.dossier.relationships, isTarget: controller.dossier.isTarget },
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

async function requestJudgeReply(controller, answer, result) {
  const response = await fetch("/api/judge/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaign: { name: controller.campaign.name, setting: controller.campaign.setting },
      profile: controller.profile,
      round: result.round,
      answer,
      topic: result.topic,
      question: result.question,
      plannedNextTopic: result.plannedNextTopic,
      history: controller.logs.slice(0, -1),
      fallback: result.reaction,
      fallbackEvaluation: result.localEvaluation,
    }),
  });
  if (!response.ok) throw new Error(`Judge API ${response.status}`);
  const payload = await response.json();
  if (!payload.speech) throw new Error("Judge API 返回为空");
  return payload;
}

function makeDossier(campaign, blueprint, index) {
  const persona = { ...blueprint, name: campaign.names[index] };
  const network = NETWORKS[blueprint.id] || {};
  const basePersonality = CHARACTER_MODELS[blueprint.id] || {};
  const personality = {
    ...basePersonality,
    socialContext: socialContextFor(campaign, blueprint),
    hiddenGoal: blueprint.target
      ? `借助${blueprint.role}这一真实掩护身份完成联络或交接，并避免关系链和时间线被串联。`
      : `完成${blueprint.role}的实际事务，同时不让无关的私人负担被误作任务关联。`,
  };
  const facts = makeCaseFacts(campaign, blueprint);
  const relationships = CASE_LINKS[blueprint.id] || [];
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
    identity: { topic: "identity", label: "回答已存档", level: "neutral" },
    route: { topic: "route", label: "回答已存档", level: "neutral" },
    document: { topic: "document", label: "回答已存档", level: "neutral" },
    contact: { topic: "contact", label: "回答已存档", level: "neutral" },
    local: { topic: "local", label: "回答已存档", level: "neutral" },
    purpose: { topic: "purpose", label: "回答已存档", level: "neutral" },
    pressure: { topic: "pressure", label: "回答已存档", level: "neutral" },
    institution: { topic: "institution", label: "回答已存档", level: "neutral" },
  } : {
    identity: { topic: "identity", label: "回答已存档", level: "neutral" },
    route: { topic: "route", label: "回答已存档", level: "neutral" },
    document: { topic: "document", label: "回答已存档", level: "neutral" },
    contact: { topic: "contact", label: "回答已存档", level: "neutral" },
    local: { topic: "local", label: "回答已存档", level: "neutral" },
    purpose: { topic: "purpose", label: "回答已存档", level: "neutral" },
    pressure: { topic: "pressure", label: "回答已存档", level: "neutral" },
    institution: { topic: "institution", label: "回答已存档", level: "neutral" },
  };
  return {
    id: `${campaign.id}-${blueprint.id}-${index + 1}`,
    campaignId: campaign.id,
    name: campaign.names[index],
    role: blueprint.role,
    origin: blueprint.origin,
    public: blueprint.public,
    signature: blueprint.signature,
    tell: blueprint.tell,
    network,
    personality,
    facts,
    relationships,
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
    const previousTopicCount = this.memory.filter((item) => item.topic === topic).length;
    const topicBank = this.dossier.topicReplies[topic] || this.dossier.topicReplies.general;
    let text = topic === "institution" ? institutionalReply(this.dossier, previousTopicCount) : (topicBank[previousTopicCount % topicBank.length] || this.dossier.lines[index]);
    if (previousTopicCount > 0 && topic !== "general") {
      const details = FOLLOWUP_DETAILS[topic] || [];
      const detail = details[(previousTopicCount - 1) % details.length] || "我只能补充已经能够核对的部分。";
      text = `你刚才已经问过${topicLabel(topic)}。${text} ${detail}`;
    }
    if (this.round >= 7 && topic === "pressure") {
      text = `${text} 现在轮到你把记录写清楚了。`;
    }
    const observation = this.dossier.topicObservations[topic] || { ...this.dossier.observations[index], topic: this.dossier.observations[index].topic };
    const claims = factsForTopic(this.dossier, topic).slice(0, 1).map((fact) => ({ factId: fact.factId, category: fact.category, value: fact.expected, stance: "确认" }));
    this.round += 1;
    this.memory.push({ question, answer: text, topic, round: this.round, claims });
    return { text, round: this.round, observation, claims };
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

function createOfficerRoster() {
  const roster = NPC_BLUEPRINTS.map((blueprint) => ({ ...blueprint }));
  for (let index = roster.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [roster[index], roster[swapIndex]] = [roster[swapIndex], roster[index]];
  }
  roster.length = 10;
  const targetOrder = [...roster.keys()];
  for (let index = targetOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [targetOrder[index], targetOrder[swapIndex]] = [targetOrder[swapIndex], targetOrder[index]];
  }
  const targetIndexes = new Set(targetOrder.slice(0, 4));
  return roster.map((blueprint, index) => ({ ...blueprint, target: targetIndexes.has(index) }));
}

class WorldController {
  constructor(campaignId = CAMPAIGNS[0].id, roster = null) {
    this.mode = "officer";
    this.campaign = cloneCampaign(campaignId);
    this.roster = Array.isArray(roster) && roster.length === 10 ? roster.map((blueprint) => ({ ...blueprint })) : createOfficerRoster();
    this.agents = this.roster.map((blueprint, index) => new NpcAgent(makeDossier(this.campaign, blueprint, index)));
    this.status = "briefing";
    this.currentIndex = 0;
    this.logs = [];
    this.observations = [];
    this.caseClues = [];
    this.caseClaims = [];
    this.decisions = [];
    this.selectedTargets = [];
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
    let provider = "fallback";
    try {
      const remote = await requestNpcReply(this, cleanQuestion, answer);
      answer.text = remote.speech;
      answer.claims = Array.isArray(remote.claims) ? remote.claims : answer.claims;
      provider = remote.provider || "model";
      this.agent.memory[this.agent.memory.length - 1].answer = answer.text;
      this.agent.memory[this.agent.memory.length - 1].claims = answer.claims;
    } catch (error) {
      console.warn("[TeWu Agent] 使用本地降级回答", error);
    }
    this.logs.push({ speaker: "npc", text: answer.text, round: answer.round, provider });
    this.observations.push(answer.observation);
    this.recordClaims(answer.claims, answer.round);
    this.recordNetworkClue(answer.observation.topic);
    this.pending = false;
    this.save();
    return true;
  }

  recordClaims(claims, round) {
    for (const claim of Array.isArray(claims) ? claims : []) {
      const item = { ...claim, sourceIndex: this.currentIndex, source: this.dossier.name, round, status: "待核对" };
      const related = this.caseClaims.filter((existing) => existing.factId === item.factId && existing.sourceIndex !== item.sourceIndex);
      if (related.length) {
        const conflict = related.some((existing) => (existing.stance === "确认" && item.stance === "否认") || (existing.stance === "否认" && item.stance === "确认"));
        item.status = conflict ? "陈述有差异" : "存在独立陈述";
        related.forEach((existing) => { existing.status = conflict ? "陈述有差异" : "存在独立陈述"; });
      }
      this.caseClaims.push(item);
    }
  }

  recordNetworkClue(topic) {
    const network = this.dossier.network;
    if (!network?.relation || !["route", "contact", "document", "local"].includes(topic)) return;
    const key = `${this.dossier.id}:network`;
    if (!this.caseClues.some((item) => item.key === key)) this.caseClues.push({ key, label: network.node, text: network.relation, source: this.dossier.name });
  }

  verifyCurrent() {
    if (this.status !== "active" || this.pending || this.awaitingNext) return false;
    const network = this.dossier.network;
    const key = `${this.dossier.id}:verify`;
    if (!network?.verify || this.caseClues.some((item) => item.key === key)) return false;
    this.caseClues.push({ key, label: this.campaignTool.label, text: network.verify, source: this.dossier.name });
    this.observations.push({ topic: "document", label: `${this.campaignTool.label}已归档`, level: "neutral" });
    this.save();
    return true;
  }

  get campaignTool() {
    return INSTITUTION_TOOLS[this.campaign.id] || { label: "档案核验", description: "核验公开记录。" };
  }

  next() {
    if (this.status !== "active" || this.pending || this.agent.round < 2) return false;
    if (this.currentIndex >= this.agents.length - 1) {
      this.status = "selection";
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

  toggleSelection(index) {
    if (this.status !== "selection") return false;
    const selected = new Set(this.selectedTargets);
    if (selected.has(index)) selected.delete(index); else selected.add(index);
    this.selectedTargets = [...selected].sort((a, b) => a - b);
    this.save();
    return true;
  }

  submitSelections() {
    if (this.status !== "selection") return false;
    const selected = new Set(this.selectedTargets);
    this.decisions = this.agents.map((agent, index) => {
      const action = selected.has(index) ? "detain" : "release";
      return { action, correct: (action === "detain" && agent.dossier.isTarget) || (action === "release" && !agent.dossier.isTarget), name: agent.dossier.name, isTarget: agent.dossier.isTarget, tell: agent.dossier.tell, index };
    });
    this.status = "complete";
    this.lastDecision = null;
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
      caseClues: this.caseClues,
      caseClaims: this.caseClaims,
      decisions: this.decisions,
      selectedTargets: this.selectedTargets,
      roster: this.roster,
      lastDecision: this.lastDecision,
      awaitingNext: this.awaitingNext,
      agentStates: this.agents.map((agent) => agent.snapshot()),
    };
    persistSession(snapshot);
  }

  static restore(snapshot) {
    const controller = new WorldController(snapshot.campaignId, snapshot.roster || NPC_BLUEPRINTS.slice(0, 10));
    controller.status = snapshot.status === "interrogation" ? "complete" : (snapshot.status || "briefing");
    controller.currentIndex = snapshot.currentIndex || 0;
    controller.logs = (snapshot.logs || []).map((line) => ({
      ...line,
      text: String(line.text || "").replaceAll("undefined", controller.dossier.name),
    }));
    controller.observations = snapshot.observations || [];
    controller.caseClues = snapshot.caseClues || [];
    controller.caseClaims = snapshot.caseClaims || [];
    controller.decisions = snapshot.decisions || [];
    controller.selectedTargets = snapshot.selectedTargets || [];
    controller.lastDecision = snapshot.lastDecision || null;
    controller.awaitingNext = Boolean(snapshot.awaitingNext);
    controller.agents.forEach((agent, index) => agent.restore(snapshot.agentStates?.[index]));
    return controller;
  }
}

const JUDGE_TOPIC_ORDER = ["identity", "route", "document", "chronology", "contact", "purpose", "local", "pressure"];
const JUDGE_TOPIC_QUESTIONS = {
  identity: (campaign, profile) => "先说清楚：你的姓名、职业，以及你声称所属的单位。",
  route: (campaign, profile) => "按顺序说明你的出发时间、路线、最后一次换乘和到达登记时间。",
  document: (campaign, profile) => "把证件和随身物品放到桌面上。分别说明编号、签发或登记来源以及用途。",
  chronology: (campaign, profile) => "从交班到抵达检查点，你在什么时刻见过哪些人？按时间顺序回答。",
  contact: (campaign, profile) => "你进城后要找谁？如果对方没有出现，通过哪个公开渠道留下记录？",
  purpose: (campaign, profile) => "你来这里要完成什么具体工作？办完后会留下哪一份可核验结果？",
  local: (campaign, profile) => `公开档案不算亲眼观察。说出一个你愿意固定下来的${campaign.setting}现场细节。`,
  pressure: (campaign, profile) => "如果现在暂时扣留你，哪项有明确时限的安排会被耽误？记录可以怎样复核？",
};
const JUDGE_FINAL_QUESTION = "最后一次机会。还有什么必须主动补充，或者需要修正前面哪一项陈述？";
const JUDGE_FOLLOWUPS = {
  identity: "姓名、职业和所属单位三项里还有一项没有说清，逐项重新回答。",
  route: "路线仍有缺口。只补充最后一次换乘、发生时间以及哪一段没有记录。",
  document: "编号、登记来源或用途还有一项无法核对，把缺少的部分补全。",
  chronology: "时间线仍不完整。说清交班时刻、交班对象和此后是否见过其他人。",
  contact: "如果公开联系人没有出现，你具体通过哪个值班窗口或登记渠道处理？",
  purpose: "不要只说‘工作’。说出完成标志以及会留下的回执或登记。",
  local: "给出一个具体的声音、光线、设施或值班习惯，并把它固定为此后的说法。",
  pressure: "说清被耽误事项的截止时间，以及哪一份记录能够证明它。",
};

const COVER_SCHEDULES = [
  { handover: "18:05", departure: "18:20", transferAt: "18:50", arrival: "19:10", returnAt: "21:30" },
  { handover: "18:45", departure: "19:05", transferAt: "19:40", arrival: "20:00", returnAt: "22:15" },
  { handover: "19:20", departure: "19:40", transferAt: "20:15", arrival: "20:35", returnAt: "22:40" },
  { handover: "19:50", departure: "20:10", transferAt: "20:45", arrival: "21:05", returnAt: "23:10" },
  { handover: "20:15", departure: "20:35", transferAt: "21:10", arrival: "21:30", returnAt: "23:40" },
];

function dossierFact(dossier, category) {
  return (dossier.facts || []).find((fact) => fact.category === category) || {};
}

function makeInfiltratorProfile(campaign, preferredBlueprintId = null, preferredNameIndex = null) {
  const selectedBlueprint = NPC_BLUEPRINTS.find((item) => item.id === preferredBlueprintId) || NPC_BLUEPRINTS[Math.floor(Math.random() * NPC_BLUEPRINTS.length)] || NPC_BLUEPRINTS[0];
  const blueprint = { ...selectedBlueprint, target: true };
  const nameIndex = Number.isInteger(preferredNameIndex) && preferredNameIndex >= 0 ? preferredNameIndex % campaign.names.length : Math.floor(Math.random() * campaign.names.length);
  const dossier = makeDossier(campaign, blueprint, nameIndex);
  const schedule = COVER_SCHEDULES[(nameIndex + NPC_BLUEPRINTS.indexOf(selectedBlueprint)) % COVER_SCHEDULES.length];
  const credentialNumber = `${campaign.id.toUpperCase()}-${blueprint.id.toUpperCase().slice(0, 4)}-${String(nameIndex + 1).padStart(3, "0")}`;
  const packageNumber = `${blueprint.id.toUpperCase().slice(0, 3)}-${String((nameIndex + 1) * 17).padStart(3, "0")}`;
  const contactName = campaign.names[(nameIndex + 3) % campaign.names.length];
  const colleagueName = campaign.names[(nameIndex + 6) % campaign.names.length];
  const routeFact = dossierFact(dossier, "路线");
  const timelineFact = dossierFact(dossier, "时间线");
  const objectFact = dossierFact(dossier, "物品");
  const relationshipFact = dossierFact(dossier, "关系");
  const contactRole = `${blueprint.origin}工作联络员`;
  const colleagueRole = `${blueprint.origin}同班职员`;
  const receipt = `${campaign.office}工作交接回执`;
  const transferPoint = `${campaign.setting}外侧值班换乘点`;
  const cover = {
    identity: `${dossier.name}，${dossier.role}，日常工作登记在${dossier.origin}。`,
    contactName,
    contactRole,
    colleagueName,
    colleagueRole,
    credential: `类型：${dossier.role}临时工作证｜编号：${credentialNumber}｜签发：${dossier.origin}人事登记处｜核验：${campaign.office}`,
    route: `出发：${schedule.departure}，${dossier.origin}｜主路线：${routeFact.expected || `前往${campaign.setting}`}｜末次换乘：${schedule.transferAt} 在${transferPoint}下车改为步行｜到达：${schedule.arrival}，公开入口登记`,
    timeline: `交班：${schedule.handover}，${colleagueName}（${colleagueRole}）｜离开：${schedule.departure}｜抵达：${schedule.arrival}｜返回期限：${schedule.returnAt}｜途中：未与其他人同行`,
    belongings: `外观：${dossier.public}｜申报：${objectFact.expected || "与职业有关的工作用品"}｜登记号：${packageNumber}`,
    contact: `关系口径：${relationshipFact.expected || "只保持公开工作往来"}｜联系人：${contactName}（${contactRole}）｜备用渠道：${campaign.office}值班台登记并转接`,
    purpose: `任务：完成${dossier.role}工作交接｜完成标志：取得“${receipt}”｜边界：不接受没有登记的临时任务`,
    localKnowledge: [...(LOCAL_KNOWLEDGE[campaign.id] || [])],
  };
  const freeSlots = [
    { slotId: "free.route_gap", topic: "route", label: "无记录路段", prompt: "首次被追问时，自行确定换乘点到公开入口之间一段不超过十分钟的步行细节。", value: "" },
    { slotId: "free.local_observation", topic: "local", label: "现场观察", prompt: "首次被问到时，自行确定一个不改变路线和制度的声音、光线、设施或值班习惯。", value: "" },
  ];
  const coverFacts = [
    { factId: "cover.identity", topic: "identity", label: "身份与单位", statement: cover.identity, anchors: [dossier.name, dossier.role, dossier.origin] },
    { factId: "cover.route", topic: "route", label: "路线与换乘", statement: cover.route, anchors: [dossier.origin, schedule.departure, schedule.transferAt, schedule.arrival, transferPoint] },
    { factId: "cover.document", topic: "document", label: "证件与物品", statement: `${cover.credential} ${cover.belongings}`, anchors: [credentialNumber, packageNumber, dossier.role] },
    { factId: "cover.chronology", topic: "chronology", label: "时间线", statement: cover.timeline, anchors: [schedule.handover, schedule.departure, schedule.arrival, schedule.returnAt, colleagueName] },
    { factId: "cover.contact", topic: "contact", label: "公开联系人", statement: cover.contact, anchors: [contactName, contactRole, campaign.office] },
    { factId: "cover.purpose", topic: "purpose", label: "来访目的", statement: cover.purpose, anchors: [dossier.role, receipt, "工作交接"] },
    { factId: "cover.local", topic: "local", label: "本地知识", statement: cover.localKnowledge.join("；"), anchors: [campaign.setting, campaign.terms[0], "值班台"] },
    { factId: "cover.pressure", topic: "pressure", label: "受阻后果", statement: `若被扣留，工作交接和 ${schedule.returnAt} 前取得${receipt}的安排会被耽误；要求审查官按记录复核。`, anchors: [schedule.returnAt, receipt, "复核"] },
  ];
  return {
    version: 3,
    blueprintId: blueprint.id,
    name: dossier.name,
    role: dossier.role,
    origin: dossier.origin,
    public: dossier.public,
    cover,
    coverFacts,
    freeSlots,
  };
}

function normalizeInfiltratorProfile(campaign, profile) {
  if (profile?.version >= 3 && profile?.cover && Array.isArray(profile.coverFacts) && Array.isArray(profile.freeSlots)) return profile;
  const blueprint = NPC_BLUEPRINTS.find((item) => item.role === profile?.role && item.origin === profile?.origin);
  const nameIndex = Math.max(0, campaign.names.indexOf(profile?.name));
  const upgraded = makeInfiltratorProfile(campaign, blueprint?.id, nameIndex);
  for (const slot of upgraded.freeSlots) {
    const previous = (profile?.freeSlots || []).find((item) => item.slotId === slot.slotId);
    if (previous?.value) slot.value = previous.value;
  }
  return upgraded;
}

function normalizeJudgeEvaluation(evaluation) {
  const rating = (value, fallback = 1) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(2, Math.round(number))) : fallback;
  };
  return {
    relevance: rating(evaluation?.relevance),
    specificity: rating(evaluation?.specificity),
    dossierMatch: rating(evaluation?.dossierMatch),
    consistency: rating(evaluation?.consistency),
    evasiveness: rating(evaluation?.evasiveness),
    evidenceFactIds: Array.isArray(evaluation?.evidenceFactIds) ? evaluation.evidenceFactIds.slice(0, 4) : [],
    contradictions: Array.isArray(evaluation?.contradictions) ? evaluation.contradictions.slice(0, 3) : [],
    unsupportedDetails: Array.isArray(evaluation?.unsupportedDetails) ? evaluation.unsupportedDetails.slice(0, 3) : [],
    freeSlotClaims: Array.isArray(evaluation?.freeSlotClaims) ? evaluation.freeSlotClaims.slice(0, 2).map((claim) => ({ slotId: String(claim?.slotId || ""), value: String(claim?.value || "").slice(0, 180) })) : [],
    summary: String(evaluation?.summary || "本轮回答需要与掩护档案和此前陈述继续核对。").slice(0, 220),
  };
}

function makeJudgeQuestion(topic, campaign, profile) {
  return (JUDGE_TOPIC_QUESTIONS[topic] || (() => "把你刚才的说法落到一条可以核对的记录上。"))(campaign, profile);
}

function qualifiesFreeSlotClaim(slot, value) {
  const text = String(value || "").trim();
  if (text.length < 6) return false;
  if (slot?.slotId === "free.route_gap") return /步行|走了|沿着|绕过|穿过/.test(text) && /[一二三四五六七八九十\d]+分钟|沿着|绕过|穿过|围栏|路口|巷|桥|灯/.test(text);
  if (slot?.slotId === "free.local_observation") return /声音|灯|光|门|窗|栏|岗|台|钟|广播|脚步|气味|排队|值班|设施|标牌/.test(text);
  return false;
}

class JudgeAgent {
  constructor(campaign, profile) {
    this.campaign = campaign;
    this.profile = profile;
    this.round = 0;
    this.suspicion = 38;
    this.responses = [];
    this.topicIndex = 0;
    this.followupUsed = false;
    this.currentPrompt = { topic: JUDGE_TOPIC_ORDER[0], question: makeJudgeQuestion(JUDGE_TOPIC_ORDER[0], campaign, profile), source: "base" };
  }

  currentQuestion() {
    return this.currentPrompt?.question || "审查已经结束。";
  }

  currentTopic() {
    return this.currentPrompt?.topic || "pressure";
  }

  weakestTopic() {
    let weakest = "route";
    let weakestScore = Number.POSITIVE_INFINITY;
    for (const topic of JUDGE_TOPIC_ORDER) {
      const attempts = this.responses.filter((item) => item.topic === topic && item.evaluation);
      if (!attempts.length) return topic;
      const score = attempts.reduce((sum, item) => sum + item.evaluation.relevance + item.evaluation.specificity + item.evaluation.dossierMatch + item.evaluation.consistency - item.evaluation.evasiveness, 0) / attempts.length;
      if (score < weakestScore) { weakest = topic; weakestScore = score; }
    }
    return weakest;
  }

  plannedNextTopic() {
    if (this.round >= 9 || this.currentPrompt?.source === "final") return "final";
    const nextIndex = Math.min(this.topicIndex + 1, JUDGE_TOPIC_ORDER.length);
    return nextIndex < JUDGE_TOPIC_ORDER.length ? JUDGE_TOPIC_ORDER[nextIndex] : this.weakestTopic();
  }

  beginEvaluation(answer) {
    if (this.round >= 10) throw new Error("审查已经完成十轮");
    const prompt = this.currentPrompt;
    const text = String(answer || "").trim();
    const normalized = text.toLowerCase();
    const topicFacts = (this.profile.coverFacts || []).filter((fact) => fact.topic === prompt.topic);
    const lockedSlotAnchors = (this.profile.freeSlots || []).filter((slot) => slot.topic === prompt.topic && slot.value).map((slot) => slot.value);
    const anchors = [...topicFacts.flatMap((fact) => fact.anchors || []), ...lockedSlotAnchors];
    const matches = anchors.filter((anchor) => normalized.includes(String(anchor).toLowerCase())).length;
    const evasive = /不知道|不清楚|忘了|没必要|不能说|不方便|随便|无可奉告/.test(text);
    const tooShort = text.length < 8;
    const hasConcreteDetail = /\d|编号|时间|点|分|入口|登记|回执|值班|路线|单位|联系人/.test(text);
    const localEvaluation = {
      relevance: tooShort ? 0 : matches ? 2 : 1,
      specificity: matches >= 2 || (matches && hasConcreteDetail) ? 2 : matches || hasConcreteDetail ? 1 : 0,
      dossierMatch: matches ? 2 : 1,
      consistency: 1,
      evasiveness: evasive ? 2 : tooShort ? 1 : 0,
      evidenceFactIds: matches ? topicFacts.map((fact) => fact.factId) : [],
      contradictions: [],
      unsupportedDetails: [],
      summary: evasive ? "回答含有明确回避措辞，需要继续核对。" : tooShort ? "回答过短，暂时无法建立事实链。" : matches ? "回答引用了当前掩护档案中的可核验细节。" : "本地规则未发现明确冲突，交由审查官结合语义和前文评价。",
    };
    const reaction = this.suspicion >= 65 ? "审查官低头重新看了一遍记录，房间里的停顿变长了。" : this.suspicion <= 28 ? "审查官在纸上做了一个简短标记，语气暂时放缓。" : "审查官没有表态，只把你的回答写进了记录。";
    return { round: this.round + 1, topic: prompt.topic, question: prompt.question, promptSource: prompt.source, plannedNextTopic: this.plannedNextTopic(), answer: text, reaction, localEvaluation, localFlags: { matches, evasive, tooShort } };
  }

  lockFreeSlots(topic, answer, evaluation) {
    const locked = [];
    const canUseFallback = evaluation.relevance >= 1
      && evaluation.specificity >= 1
      && evaluation.dossierMatch >= 1
      && evaluation.consistency >= 1
      && evaluation.evasiveness < 2
      && !evaluation.contradictions.length
      && answer.length >= 8;
    if (!canUseFallback) return locked;
    for (const claim of evaluation.freeSlotClaims) {
      const slot = (this.profile.freeSlots || []).find((item) => item.slotId === claim.slotId && item.topic === topic && !item.value);
      if (!slot || !qualifiesFreeSlotClaim(slot, answer) || !qualifiesFreeSlotClaim(slot, claim.value)) continue;
      slot.value = claim.value;
      locked.push(slot);
    }
    const fallbackSlot = (this.profile.freeSlots || []).find((slot) => slot.topic === topic && !slot.value);
    if (!locked.length && fallbackSlot && qualifiesFreeSlotClaim(fallbackSlot, answer)) {
      fallbackSlot.value = answer.slice(0, 180);
      locked.push(fallbackSlot);
    }
    return locked;
  }

  advancePrompt(result, remote) {
    if (this.round >= 10) { this.currentPrompt = null; return; }
    if (this.round === 9) {
      this.currentPrompt = { topic: "pressure", question: JUDGE_FINAL_QUESTION, source: "final" };
      return;
    }
    const evaluation = result.evaluation;
    const needsFollowup = evaluation.relevance < 2 || evaluation.specificity === 0 || evaluation.dossierMatch === 0 || evaluation.consistency === 0 || evaluation.evasiveness >= 2;
    if (needsFollowup && !this.followupUsed && result.promptSource !== "followup") {
      this.followupUsed = true;
      this.currentPrompt = { topic: result.topic, question: remote?.followupQuestion || JUDGE_FOLLOWUPS[result.topic], source: "followup" };
      return;
    }
    if (this.topicIndex < JUDGE_TOPIC_ORDER.length && JUDGE_TOPIC_ORDER[this.topicIndex] === result.topic) this.topicIndex += 1;
    const nextTopic = this.topicIndex < JUDGE_TOPIC_ORDER.length ? JUDGE_TOPIC_ORDER[this.topicIndex] : this.weakestTopic();
    const suggested = nextTopic === result.plannedNextTopic ? remote?.nextQuestion : "";
    this.currentPrompt = { topic: nextTopic, question: suggested || makeJudgeQuestion(nextTopic, this.campaign, this.profile), source: this.topicIndex < JUDGE_TOPIC_ORDER.length ? "base" : "verification" };
  }

  completeEvaluation(result, remoteResult) {
    const evaluation = normalizeJudgeEvaluation(remoteResult?.evaluation || remoteResult || result.localEvaluation);
    const lockedSlots = this.lockFreeSlots(result.topic, result.answer, evaluation);
    const quality = evaluation.relevance + evaluation.specificity + (evaluation.dossierMatch * 2) + (evaluation.consistency * 2) + (2 - evaluation.evasiveness);
    const agentChange = evaluation.dossierMatch === 0 || evaluation.consistency === 0 ? 6
      : evaluation.relevance === 0 ? 5
        : evaluation.evasiveness >= 2 ? 4
          : quality >= 12 ? -2 : quality >= 10 ? -1 : quality >= 8 ? 0 : quality >= 6 ? 3 : 5;
    const certainChange = (result.localFlags.tooShort ? 4 : 0)
      + (result.localFlags.evasive ? 3 : 0)
      + Math.min(4, evaluation.contradictions.length * 2)
      + Math.min(3, evaluation.unsupportedDetails.length)
      - (result.localFlags.matches >= 2 ? 1 : 0);
    let change = Math.max(-3, Math.min(10, agentChange + certainChange));
    if (evaluation.relevance < 2 || evaluation.specificity === 0) change = Math.max(0, change);
    if (evaluation.dossierMatch === 0 || evaluation.consistency === 0) change = Math.max(5, change);
    this.suspicion = Math.max(0, Math.min(100, this.suspicion + change));
    const additions = evaluation.unsupportedDetails.length ? ` 待证实：${evaluation.unsupportedDetails.join("；")}` : "";
    const locks = lockedSlots.length ? ` 已锁定自由口径：${lockedSlots.map((slot) => `${slot.label}=${slot.value}`).join("；")}` : "";
    const note = evaluation.contradictions.length ? `${evaluation.summary} 矛盾：${evaluation.contradictions.join("；")}${additions}${locks}` : `${evaluation.summary}${additions}${locks}`;
    const completed = { ...result, change, note, evaluation, lockedSlots: lockedSlots.map((slot) => slot.slotId) };
    delete completed.localEvaluation;
    delete completed.localFlags;
    this.responses.push(completed);
    this.round += 1;
    this.advancePrompt(completed, remoteResult);
    return completed;
  }

  verdict() {
    const release = this.suspicion < 56;
    return { action: release ? "release" : "detain", suspicion: this.suspicion, release, reason: release ? "十轮回答形成了基本连贯的身份、路线和关系链。" : "十轮回答里仍有关键字段无法相互印证，审查官选择暂时扣留。" };
  }

  snapshot() {
    return { round: this.round, suspicion: this.suspicion, responses: this.responses, topicIndex: this.topicIndex, followupUsed: this.followupUsed, currentPrompt: this.currentPrompt };
  }

  restore(snapshot) {
    this.round = snapshot?.round || 0;
    this.suspicion = snapshot?.suspicion ?? 38;
    this.responses = snapshot?.responses || [];
    this.topicIndex = snapshot?.topicIndex ?? Math.min(this.round, JUDGE_TOPIC_ORDER.length - 1);
    this.followupUsed = Boolean(snapshot?.followupUsed);
    const legacyTopic = this.round >= 9 ? "pressure" : JUDGE_TOPIC_ORDER[Math.min(this.topicIndex, JUDGE_TOPIC_ORDER.length - 1)];
    this.currentPrompt = snapshot?.currentPrompt || (this.round >= 10 ? null : { topic: legacyTopic, question: this.round >= 9 ? JUDGE_FINAL_QUESTION : makeJudgeQuestion(legacyTopic, this.campaign, this.profile), source: this.round >= 9 ? "final" : "base" });
  }
}

class InfiltratorController {
  constructor(campaignId = CAMPAIGNS[0].id, profile = null) {
    this.mode = "infiltrator";
    this.campaign = cloneCampaign(campaignId);
    this.profile = normalizeInfiltratorProfile(this.campaign, profile || makeInfiltratorProfile(this.campaign));
    this.judge = new JudgeAgent(this.campaign, this.profile);
    this.status = "briefing";
    this.logs = [];
    this.lastDecision = null;
    this.awaitingNext = false;
    this.pending = false;
  }

  start() {
    this.status = "active";
    this.logs = [{ speaker: "judge", text: `坐下。我们从你的公开身份开始。${this.currentQuestion()}`, round: 0 }];
    this.save();
  }

  currentQuestion() {
    return this.judge.currentQuestion();
  }

  async ask(answer) {
    const cleanAnswer = String(answer || "").trim();
    if (this.status !== "active" || this.awaitingNext || this.pending || !cleanAnswer || this.judge.round >= 10) return false;
    this.pending = true;
    const draft = this.judge.beginEvaluation(cleanAnswer);
    this.logs.push({ speaker: "player", text: cleanAnswer, round: draft.round });
    let provider = "fallback";
    let remoteResult = { evaluation: draft.localEvaluation };
    try {
      const remote = await requestJudgeReply(this, cleanAnswer, draft);
      draft.reaction = remote.speech;
      remoteResult = remote;
      provider = remote.provider || "model";
    } catch (error) {
      console.warn("[TeWu Judge] 使用本地降级回答", error);
    }
    const result = this.judge.completeEvaluation(draft, remoteResult);
    this.logs.push({ speaker: "judge", text: result.reaction, round: result.round, provider });
    if (this.judge.round >= 10) {
      this.lastDecision = { ...this.judge.verdict(), name: this.profile.name };
      this.awaitingNext = true;
    }
    this.pending = false;
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
    persistSession({
      mode: this.mode,
      campaignId: this.campaign.id,
      status: this.status,
      logs: this.logs,
      lastDecision: this.lastDecision,
      awaitingNext: this.awaitingNext,
      profile: this.profile,
      judge: this.judge.snapshot(),
    });
  }

  static restore(snapshot) {
    const controller = new InfiltratorController(snapshot.campaignId, snapshot.profile);
    controller.status = snapshot.status === "interrogation" ? "complete" : (snapshot.status || "briefing");
    controller.logs = snapshot.logs || [];
    controller.lastDecision = snapshot.lastDecision || null;
    controller.awaitingNext = Boolean(snapshot.awaitingNext);
    controller.judge.restore(snapshot.judge);
    return controller;
  }
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const app = document.querySelector("#app");
let selectedCampaignId = CAMPAIGNS[0].id;
let selectedMode = "officer";
let pendingInfiltratorProfile = null;
let controller = restoreController();

function getPendingInfiltratorProfile(campaignId) {
  if (!pendingInfiltratorProfile || pendingInfiltratorProfile.campaignId !== campaignId) {
    pendingInfiltratorProfile = { campaignId, profile: makeInfiltratorProfile(cloneCampaign(campaignId)) };
  }
  return pendingInfiltratorProfile.profile;
}

function restoreController() {
  try {
    const raw = localStorage.getItem("tewu-session");
    if (raw) {
      const snapshot = JSON.parse(raw);
      if (isResumableSession(snapshot)) return snapshot.mode === "infiltrator" ? InfiltratorController.restore(snapshot) : WorldController.restore(snapshot);
      localStorage.removeItem("tewu-session");
    }
  } catch (error) {
    localStorage.removeItem("tewu-session");
  }
  return new WorldController();
}

function isResumableSession(snapshot) {
  return ["active", "selection"].includes(snapshot?.status) && !snapshot?.awaitingNext;
}

function persistSession(snapshot) {
  if (!isResumableSession(snapshot)) {
    clearPersistedSession();
    return;
  }
  localStorage.setItem("tewu-session", JSON.stringify(snapshot));
  fetch("/api/session", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: snapshot }) }).catch(() => {});
}

function clearPersistedSession() {
  localStorage.removeItem("tewu-session");
  fetch("/api/session", { method: "DELETE" }).catch(() => {});
}

async function hydrateUserSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return;
    const { state } = await response.json();
    if (!state) return;
    if (!isResumableSession(state)) {
      clearPersistedSession();
      return;
    }
    localStorage.setItem("tewu-session", JSON.stringify(state));
    controller = state.mode === "infiltrator" ? InfiltratorController.restore(state) : WorldController.restore(state);
    selectedCampaignId = controller.campaign.id;
    selectedMode = controller.mode;
    render();
  } catch {}
}

function render() {
  if (controller.status === "briefing") app.innerHTML = renderBriefing();
  else if (controller.status === "selection") app.innerHTML = renderOfficerSelection();
  else if (controller.mode === "infiltrator") app.innerHTML = controller.status === "complete" ? renderInfiltratorSettlement() : renderInfiltratorGame();
  else if (controller.status === "complete") app.innerHTML = renderOfficerComplete();
  else app.innerHTML = renderGame();
  bindEvents();
  document.querySelectorAll(".dialogue-log").forEach((log) => { log.scrollTop = log.scrollHeight; });
}

function renderHeader(showStats = false) {
  const headerCampaign = controller.status === "briefing" ? cloneCampaign(selectedCampaignId) : controller.campaign;
  const officerMetric = controller.status === "complete" ? `<span>准确率 <strong>${Math.round(controller.accuracy())}%</strong></span>` : controller.status === "selection" ? `<span>已选 <strong>${controller.selectedTargets.length}</strong> 人</span>` : `<span>已盘问 <strong>${controller.currentIndex} / 10</strong></span>`;
  const metric = controller.mode === "infiltrator" ? `<span>可疑度 <strong>${controller.suspicion()}%</strong></span>` : officerMetric;
  const exit = controller.status === "active" ? `<button class="header-exit" data-action="exit">退出当前局</button>` : "";
  return `<header class="topbar"><div class="brand"><span class="brand-mark">特</span><div><p class="brand-title">特务</p><p class="brand-subtitle">机构档案 · ${escapeHtml(headerCampaign.name)}</p></div></div><div class="top-meta"><span><i class="lock-dot"></i>通讯加密</span><span>机构 <strong>${escapeHtml(headerCampaign.name)}</strong></span>${showStats ? metric : ""}${exit}</div></header>`;
}

function renderInfiltratorBriefFacts(profile) {
  const cover = profile.cover;
  const facts = [
    ["本人姓名", profile.name, "identity"],
    ["职业与单位", `${profile.role} · ${profile.origin}`, "identity"],
    ["公开联系人", `${cover.contactName} · ${cover.contactRole}`, "identity"],
    ["交班同事", `${cover.colleagueName} · ${cover.colleagueRole}`, "identity"],
    ["证件", cover.credential, "wide"],
    ["固定路线", cover.route, "wide"],
    ["时间口径", cover.timeline, "wide"],
    ["携带物", cover.belongings, "wide"],
    ["联系口径", cover.contact, "wide"],
    ["进城目的", cover.purpose, "wide"],
  ];
  const fixed = facts.map(([label, value, size]) => `<div class="cover-brief-fact ${size === "wide" ? "wide" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const flexible = (profile.freeSlots || []).map((slot) => `<div class="cover-brief-fact wide flexible"><span>自由口径 · ${escapeHtml(slot.label)}</span><strong>${escapeHtml(slot.value || slot.prompt)}</strong></div>`).join("");
  return `${fixed}${flexible}`;
}

function renderBriefing() {
  const campaign = cloneCampaign(selectedCampaignId);
  const infiltratorProfile = selectedMode === "infiltrator" ? getPendingInfiltratorProfile(selectedCampaignId) : null;
  const modeBriefing = infiltratorProfile ? `你将以${infiltratorProfile.role}的掩护身份进入${campaign.setting}。审查官会从机构的安全视角核对你的身份、路线、物品、关系和时间线；你需要让陈述能够经受十轮连续追问。` : campaign.briefing;
  const body = `<main class="page"><section class="briefing-grid"><div><p class="eyebrow">主控档案 · 机构选择</p><h1>十个人里，谁不该出现在这里？</h1><p class="briefing-copy">选择一个真实历史机构，进入它的目标群体、审查方式和历史参考。四个机构可以在混合时空设定中共存，十名候选人由相互隔离的角色程序连续扮演。完成十人的盘问后，你将统一提交一份扣留名单。</p></div><div class="brief-note"><strong>混合时空设定</strong>主控允许不同机构的历史参考同场出现，但会明确标记哪些内容是史实参考、哪些内容是本作的玩法设定。刷新页面会保留当前机构。</div></section><div class="section-label"><h2>选择机构</h2><span>四个机构 · 目标各不相同</span></div><section class="campaign-grid">${CAMPAIGNS.map((item) => `<button class="campaign-card ${item.id === selectedCampaignId ? "selected" : ""}" data-campaign="${item.id}"><span class="campaign-code">${item.code}</span><h3>${item.name}</h3><span class="campaign-era">${item.era}</span><p>${item.description}</p><span class="campaign-tagline">${item.setting}</span></button>`).join("")}</section><div class="section-label"><h2>选择玩法</h2><span>两种角色视角</span></div><section class="mode-grid"><button class="mode-card ${selectedMode === "officer" ? "selected" : ""}" data-mode="officer"><strong>执行官模式</strong><span>盘问十名候选人，再从十人中选出需要扣留的对象。</span></button><button class="mode-card ${selectedMode === "infiltrator" ? "selected" : ""}" data-mode="infiltrator"><strong>潜伏者模式</strong><span>你接受十轮审查，由审查官程序判定是否放行。</span></button></section><section class="historical-preview"><div class="history-box"><h3>${escapeHtml(campaign.name)} · ${infiltratorProfile ? "潜伏者简报" : "主控简报"}</h3><p>${escapeHtml(modeBriefing)}</p></div><div class="history-box"><h3>历史边界</h3><p>${escapeHtml(campaign.historical)}</p></div></section><div class="brief-footer"><p>${infiltratorProfile ? "上方掩护档案会原样带入审查。请在十轮回答中保持身份、路线和物品细节一致。" : "每名候选人至少盘问两轮、最多十轮。十人全部盘问后统一提交扣留名单，名单可以为空或包含多人。"}</p><button class="primary-button" data-action="start">进入 ${escapeHtml(campaign.name)}</button></div><div class="section-label" style="margin-top:17px"><h2>当时会听见的词</h2><span>${escapeHtml(campaign.setting)}</span></div><div class="term-row">${campaign.terms.map((term) => `<span class="term-chip">${escapeHtml(term)}</span>`).join("")}</div></main>`;
  const briefingBody = body;
  const infiltratorBrief = infiltratorProfile ? `<section class="infiltrator-brief"><div class="infiltrator-brief-head"><p class="eyebrow">进入前资料 · 潜伏者</p><h2>你要守住的掩护档案</h2><p>固定字段必须保持一致；两项自由口径由你在首次被问到时确定，之后会写入档案继续核对。</p></div><div class="infiltrator-brief-facts">${renderInfiltratorBriefFacts(infiltratorProfile)}</div><div class="infiltrator-local-knowledge"><strong>本地知识</strong>${infiltratorProfile.cover.localKnowledge.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div><p class="infiltrator-brief-note">本人、联系人和交班同事是不同的人。审查官会比较档案、此前口供和当前回答；未正面回答或缺少具体细节的回合不会降低警戒。</p></section>` : "";
  const finalBriefingBody = briefingBody.replace('<section class="historical-preview">', `${infiltratorBrief}<section class="historical-preview">`);
  return `<div class="app-shell">${renderHeader()}${finalBriefingBody}</div>`;
}

function renderGameTop() {
  const done = controller.currentIndex;
  const currentRound = controller.agent.round;
  return `<div class="game-top"><div class="game-top-left"><strong>${String(controller.currentIndex + 1).padStart(2, "0")} / 10</strong><span>${escapeHtml(controller.campaign.setting)} · ${escapeHtml(controller.campaign.name)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${done * 10}%"></div></div><div class="game-stat"><span>回合 <strong>${currentRound} / 10</strong></span><span>已盘问 <strong>${done} / 10</strong></span></div></div>`;
}

function renderQueue() {
  return `<div class="panel"><div class="panel-title">候选人队列 / 10</div><div class="queue">${controller.agents.map((agent, index) => `<div class="queue-row ${index === controller.currentIndex ? "current" : ""} ${index < controller.currentIndex ? "done" : ""}"><span class="queue-index">${String(index + 1).padStart(2, "0")}</span><span class="queue-name">${index <= controller.currentIndex ? escapeHtml(agent.dossier.name) : "待接触"}</span><i class="queue-dot"></i></div>`).join("")}</div></div>`;
}

function renderLeftRail() {
  const c = controller.campaign;
  const knowledge = LOCAL_KNOWLEDGE[c.id] || [];
  const axis = INSTITUTIONAL_AXES[c.id] || {};
  return `<aside><div class="panel"><div class="panel-title">任务简报</div><ul class="brief-list"><li><b>01</b><span>完成十名来客的身份初筛。</span></li><li><b>02</b><span>每名候选人至少完成两轮问答。</span></li><li><b>03</b><span>跨人物核对路线、关系、物品和政治表态。</span></li><li><b>04</b><span>十人结束后统一提交扣留名单。</span></li></ul></div><div class="panel"><div class="panel-title">机构审查侧重</div><div class="facts"><div class="fact"><div class="fact-head"><span>${escapeHtml(axis.title || "身份核验")}</span></div><p>${escapeHtml(axis.brief || "将口头陈述与可核验记录交叉比对。")}</p></div></div></div><div class="panel"><div class="panel-title">本地知识</div><div class="facts">${knowledge.map((item, index) => `<div class="fact"><div class="fact-head"><span>记录 ${String(index + 1).padStart(2, "0")}</span></div><p>${escapeHtml(item)}</p></div>`).join("")}</div></div>${renderQueue()}</aside>`;
}

function renderFacts() {
  const observations = controller.observations;
  const topics = ["route", "document", "contact", "local", "institution"];
  return `<div class="facts">${topics.map((topic) => { const found = [...observations].reverse().find((item) => item.topic === topic); return `<div class="fact"><div class="fact-head"><span>${topicLabel(topic)}</span><strong>${found ? "已记入" : "未记录"}</strong></div><p>${found ? "该主题已有回答。请用本地知识、其他候选人的陈述和机构记录交叉判断。" : "尚未就该主题取得候选人的陈述。"}</p></div>`; }).join("")}</div>`;
}

function renderRightRail() {
  const round = controller.agent.round;
  const alert = Math.min(100, 22 + round * 7 + controller.decisions.filter((item) => !item.correct).length * 5);
  const tool = controller.campaignTool;
  const claims = controller.caseClaims.slice(-6);
  const verified = controller.caseClues.some((item) => item.key === `${controller.dossier.id}:verify`);
  return `<aside><div class="panel"><div class="panel-title">案件状态</div><div class="meter-wrap"><div class="meter-row"><span>本轮警戒</span><strong>${alert}%</strong></div><div class="meter"><div class="alert" style="width:${alert}%"></div></div><div class="meter-row" style="margin-top:13px"><span>已盘问候选人</span><strong>${controller.currentIndex} / 10</strong></div><div class="meter"><div class="teal" style="width:${controller.currentIndex * 10}%"></div></div><div class="meter-row" style="margin-top:13px"><span>已记录主张</span><strong>${controller.caseClaims.length}</strong></div></div></div><div class="panel"><div class="panel-title">机构核验</div><div class="facts"><div class="fact"><div class="fact-head"><span>${escapeHtml(tool.label)}</span><strong>当前对象</strong></div><p>${escapeHtml(tool.description)}</p><button class="prompt-chip" data-action="verify-current" ${verified ? "disabled" : ""}>${verified ? "核验已归档" : "执行核验"}</button></div></div></div><div class="panel"><div class="panel-title">案件线索板</div><div class="facts">${claims.length ? claims.map((claim) => `<div class="fact"><div class="fact-head"><span>${escapeHtml(claim.category)}</span><strong>${escapeHtml(claim.status)}</strong></div><p>${escapeHtml(claim.source)}：${escapeHtml(claim.value)}</p></div>`).join("") : `<div class="fact"><p>从路线、关系、物品和本地细节中取得陈述。跨候选人的相同事实会在这里并列，但不会替你判断真伪。</p></div>`}</div></div><div class="panel"><div class="panel-title">已记录陈述</div>${renderFacts()}</div><div class="panel"><div class="panel-title">历史资料</div><div class="facts"><div class="fact"><div class="fact-head"><span>当前地点</span><strong>${escapeHtml(controller.campaign.setting)}</strong></div><p>${escapeHtml(controller.campaign.historical)}</p></div><div class="fact"><div class="fact-head"><span>关键词</span></div><p>${controller.campaign.terms.map((term) => `#${escapeHtml(term)}`).join(" ")}</p></div></div></div></aside>`;
}

function renderDialogueLog() {
  const initial = `<div class="dialogue-line"><span class="line-label">候选人 · 初始陈述</span>${escapeHtml(controller.dossier.public)}。${escapeHtml(controller.dossier.role)}，${escapeHtml(controller.dossier.origin)}。</div>`;
  const lines = controller.logs.map((line) => `<div class="dialogue-line ${line.speaker === "player" ? "player" : ""}"><span class="line-label">${line.speaker === "player" ? `你 · 第 ${line.round} 轮` : `候选人 · 第 ${line.round} 轮${agentSourceLabel(line.provider)}`}</span>${escapeHtml(line.text)}</div>`).join("");
  const waiting = controller.pending ? `<div class="dialogue-line waiting"><span class="line-label">候选人 Agent · 正在回应</span><i></i><i></i><i></i></div>` : "";
  return `${initial}${lines}${waiting}`;
}

function agentSourceLabel(provider) {
  if (!provider) return "";
  if (provider === "fallback") return " · 本地降级";
  return ` · 模型：${provider === "deepseek" ? "DeepSeek" : provider}`;
}

function renderObservationRow() {
  if (!controller.observations.length) return "";
  const recent = controller.observations.slice(-4);
  return `<div class="observation-row">${recent.map((item) => `<span class="observation neutral">${escapeHtml(topicLabel(item.topic))} · 已记入记录</span>`).join("")}</div>`;
}

function renderQuestionArea() {
  const round = controller.agent.round;
  if (controller.awaitingNext) return "";
  if (controller.pending) return `<div class="question-area waiting-area"><div class="question-head"><strong>候选人正在回应</strong><span>模型正在整理本轮回答</span></div><div class="response-status"><i></i><i></i><i></i><span>请稍候，对话记录已保存。</span></div></div>`;
  const advance = round >= 2 ? `<div class="decision-area"><p class="decision-unlock">${round >= 10 ? "十轮盘问已完成。" : `已完成 ${round} 轮问答，可以继续追问，也可以先结束本次盘问。`}扣留名单将在十名候选人全部盘问后统一提交。</p><button class="next-button candidate-advance" data-action="next">${controller.currentIndex === 9 ? "结束盘问，整理十人名单 →" : "结束盘问，接触下一名候选人 →"}</button></div>` : "";
  if (round >= 10) return advance;
  const hints = [...(INSTITUTIONAL_AXES[controller.campaign.id]?.prompts || []), "证件和编号怎么核对？", "你从哪里来，几点出发？"].slice(0, 5);
  return `<div class="question-area"><div class="question-head"><strong>与候选人对话</strong><span>已完成 ${round} / 10 轮</span></div><form class="question-form" data-question-form><input class="question-input" name="question" autocomplete="off" placeholder="直接输入你要问的问题……" maxlength="180" /><button class="send-button" type="submit">发送问题</button></form><div class="prompt-chips">${hints.map((hint) => `<button type="button" class="prompt-chip" data-prompt="${escapeHtml(hint)}">${escapeHtml(hint)}</button>`).join("")}</div></div>${advance}`;
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
  const badge = controller.awaitingNext ? "result" : controller.pending ? "pending" : controller.agent.round >= 10 ? "ready" : "";
  const badgeText = controller.awaitingNext ? "已记录" : controller.pending ? "回应中" : controller.agent.round >= 10 ? "盘问完成" : "对话中";
  return `<section class="interview"><div class="scene"><img src="assets/city-gate.svg" alt="夜间城市入口检查站"/><div class="scene-overlay"></div><span class="scene-caption">${escapeHtml(controller.campaign.sceneCaption)}</span></div><div class="candidate-header"><div><p class="eyebrow">当前候选人 / ${String(controller.currentIndex + 1).padStart(2, "0")}</p><h2>${escapeHtml(d.name)}</h2><p class="candidate-meta">${escapeHtml(d.role)} · 自称来自 ${escapeHtml(d.origin)}</p></div><span class="candidate-badge ${badge}">${badgeText}</span></div><div class="dialogue-log">${renderDialogueLog()}</div>${renderObservationRow()}${controller.awaitingNext ? renderResult() : renderQuestionArea()}</section>`;
}

function renderInfiltratorTop() {
  const round = controller.judge.round;
  const suspicion = controller.suspicion();
  return `<div class="game-top"><div class="game-top-left"><strong>潜伏者</strong><span>${escapeHtml(controller.campaign.setting)} · ${escapeHtml(controller.campaign.name)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${round * 10}%"></div></div><div class="game-stat"><span>已回答 <strong>${round} / 10</strong></span><span>可疑度 <strong>${suspicion}%</strong></span></div></div>`;
}

function renderInfiltratorLeft() {
  const profile = controller.profile;
  const cover = profile.cover;
  const fixedRows = [["证件", "身份备案", cover.credential], ["路线", "公开入口", cover.route], ["时间", "行程口径", cover.timeline], ["物品", "登记清单", cover.belongings], ["关系", "公开往来", cover.contact], ["目的", "工作交接", cover.purpose]];
  const flexibleRows = (profile.freeSlots || []).map((slot) => [slot.label, slot.value ? "口径已锁定" : "首次自定", slot.value || slot.prompt]);
  const dossierRows = [...fixedRows, ...flexibleRows].map(([label, status, text]) => `<div class="fact"><div class="fact-head"><span>${label}</span><strong>${status}</strong></div><p>${escapeHtml(text)}</p></div>`).join("");
  const localRows = cover.localKnowledge.map((item, index) => `<div class="fact"><div class="fact-head"><span>本地档案 ${String(index + 1).padStart(2, "0")}</span><strong>公开知识</strong></div><p>${escapeHtml(item)}</p></div>`).join("");
  return `<aside><div class="panel"><div class="panel-title">掩护身份</div><ul class="brief-list cover-identity"><li><b>本人</b><span>${escapeHtml(profile.name)}</span></li><li><b>职业</b><span>${escapeHtml(profile.role)}</span></li><li><b>单位</b><span>${escapeHtml(profile.origin)}</span></li><li><b>联系人</b><span>${escapeHtml(cover.contactName)}<small>${escapeHtml(cover.contactRole)}</small></span></li><li><b>同事</b><span>${escapeHtml(cover.colleagueName)}<small>${escapeHtml(cover.colleagueRole)}</small></span></li></ul></div><div class="panel cover-panel"><div class="panel-title">证件与行程</div><div class="facts cover-facts">${dossierRows}</div></div><div class="panel cover-panel"><div class="panel-title">本地知识</div><div class="facts cover-facts">${localRows}</div></div></aside>`;
}

function renderInfiltratorRight() {
  const suspicion = controller.suspicion();
  const latest = controller.judge.responses.at(-1);
  const lastReview = latest ? `<div class="fact"><div class="fact-head"><span>上一轮变化</span><strong>${latest.change > 0 ? `+${latest.change}` : latest.change} 警戒</strong></div><p>${escapeHtml(latest.note)}</p></div>` : "";
  return `<aside><div class="panel"><div class="panel-title">审查状态</div><div class="meter-wrap"><div class="meter-row"><span>审查官可疑度</span><strong>${suspicion}%</strong></div><div class="meter"><div class="${suspicion >= 56 ? "alert" : suspicion >= 40 ? "amber" : "teal"}" style="width:${suspicion}%"></div></div><div class="meter-row" style="margin-top:13px"><span>剩余回答</span><strong>${10 - controller.judge.round}</strong></div><div class="meter"><div class="teal" style="width:${controller.judge.round * 10}%"></div></div></div></div><div class="panel"><div class="panel-title">审查记录</div><div class="facts"><div class="fact"><div class="fact-head"><span>当前主题</span><strong>${controller.judge.round < 10 ? topicLabel(controller.judge.currentTopic()) : "已结束"}</strong></div><p>${controller.judge.round < 10 ? "当前问题可能承接上一轮追问；合理同义表达不会因缺词受罚。" : "审查官正在形成最终判定。"}</p></div>${lastReview}<div class="fact"><div class="fact-head"><span>审查方式</span><strong>档案 + Agent</strong></div><p>未正面回答或没有具体细节时，本轮警戒不会下降。</p></div></div></div></aside>`;
}

function renderInfiltratorLog() {
  const lines = controller.logs.map((line) => `<div class="dialogue-line ${line.speaker === "player" ? "player" : ""}"><span class="line-label">${line.speaker === "player" ? `你 · 第 ${line.round} 轮` : `审查官 · ${line.round ? `第 ${line.round} 轮` : "开始"}${agentSourceLabel(line.provider)}`}</span>${escapeHtml(line.text)}</div>`).join("");
  const waiting = controller.pending ? `<div class="dialogue-line waiting"><span class="line-label">审查官 Agent · 正在审阅</span><i></i><i></i><i></i></div>` : "";
  return `${lines}${waiting}`;
}

function renderInfiltratorQuestionArea() {
  const round = controller.judge.round;
  if (controller.awaitingNext) return "";
  if (controller.pending) return `<div class="question-area waiting-area"><div class="question-head"><strong>审查官正在审阅</strong><span>模型正在核对并形成实际下一问</span></div><div class="response-status"><i></i><i></i><i></i><span>请稍候，回答已写入审查记录。</span></div></div>`;
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
  const badge = controller.awaitingNext ? "result" : controller.pending ? "pending" : "";
  const badgeText = controller.awaitingNext ? "已判定" : controller.pending ? "审阅中" : "接受审查";
  return `<section class="interview"><div class="scene"><img src="assets/city-gate.svg" alt="夜间城市入口检查站"/><div class="scene-overlay"></div><span class="scene-caption">${escapeHtml(controller.campaign.sceneCaption)}</span></div><div class="candidate-header"><div><p class="eyebrow">潜伏者模式 / 掩护身份</p><h2>${escapeHtml(profile.name)}</h2><p class="candidate-meta">${escapeHtml(profile.role)} · 自称来自 ${escapeHtml(profile.origin)}</p></div><span class="candidate-badge ${badge}">${badgeText}</span></div><div class="dialogue-log">${renderInfiltratorLog()}</div>${controller.awaitingNext ? renderInfiltratorResult() : renderInfiltratorQuestionArea()}</section>`;
}

function renderInfiltratorGame() {
  return `<div class="app-shell">${renderHeader(true)}<main class="page">${renderInfiltratorTop()}<div class="game-grid">${renderInfiltratorLeft()}${renderInfiltratorInterview()}${renderInfiltratorRight()}</div></main></div>`;
}

function renderInfiltratorSettlement() {
  const result = controller.lastDecision;
  const released = result?.action === "release";
  const rows = controller.judge.responses.map((item) => {
    const evaluation = item.evaluation;
    const metrics = evaluation ? `问题 ${evaluation.relevance}/2 · 细节 ${evaluation.specificity}/2 · 档案 ${evaluation.dossierMatch}/2 · 一致 ${evaluation.consistency}/2 · 回避 ${evaluation.evasiveness}/2` : "旧版记录未保存结构化评价";
    const changeLabel = item.change > 0 ? `警戒 +${item.change}` : item.change < 0 ? `警戒 ${item.change}` : "警戒不变";
    return `<div class="review-entry"><div class="review-row"><b>${String(item.round).padStart(2, "0")}</b><span>${topicLabel(item.topic)} · ${escapeHtml(item.note)}</span><strong class="review-result ${item.change <= 0 ? "correct" : "wrong"}">${changeLabel}</strong></div><p class="review-basis">${escapeHtml(metrics)}</p></div>`;
  }).join("");
  return `<div class="app-shell">${renderHeader(true)}<main class="page"><section class="settlement"><div class="settlement-head"><p class="eyebrow">审查报告 · 已结案</p><h1>${released ? "掩护通过" : "身份暴露"}</h1><p>审查官最终判定：${released ? "放行" : "扣留"}。${escapeHtml(result?.reason || "")}</p></div><div class="score-panel"><div class="grade">${released ? "过" : "疑"}</div><div><div class="score-line"><strong>${controller.suspicion()}%</strong><span>最终可疑度</span></div><div class="score-track"><div style="width:${controller.suspicion()}%"></div></div><p class="score-note">完成十轮回答 · 审查官自动作出判定</p></div></div><div class="stat-grid"><div class="stat-card"><span>审查轮数</span><strong>10</strong></div><div class="stat-card"><span>最终可疑度</span><strong>${controller.suspicion()}%</strong></div><div class="stat-card"><span>审查结果</span><strong>${released ? "放行" : "扣留"}</strong></div><div class="stat-card"><span>回答记录</span><strong>${controller.judge.responses.length}</strong></div></div><div class="review"><h2>逐轮审查记录</h2>${rows}</div><div class="settlement-actions"><button class="secondary-button" data-action="back">返回机构选择</button><button class="primary-button" data-action="restart">重新接受审查</button></div></section></main></div>`;
}

function renderGame() {
  return `<div class="app-shell">${renderHeader(true)}<main class="page">${renderGameTop()}<div class="game-grid">${renderLeftRail()}${renderInterview()}${renderRightRail()}</div></main></div>`;
}

function renderOfficerSelection() {
  const selected = new Set(controller.selectedTargets);
  const cards = controller.agents.map((agent, index) => {
    const dossier = agent.dossier;
    const candidateClaims = controller.caseClaims.filter((item) => item.sourceIndex === index).slice(-2);
    const picked = selected.has(index);
    const claimSummary = candidateClaims.length ? candidateClaims.map((claim) => `${claim.category}：${claim.value}`).join("；") : "尚未形成结构化主张，请结合对话记录判断。";
    const transcript = [`<div class="transcript-line"><b>初始陈述</b><span>${escapeHtml(dossier.public)}。${escapeHtml(dossier.role)}，${escapeHtml(dossier.origin)}。</span></div>`, ...agent.memory.map((item) => `<div class="transcript-line"><b>第 ${item.round} 轮 · 你</b><span>${escapeHtml(item.question)}</span><b>第 ${item.round} 轮 · 候选人</b><span>${escapeHtml(item.answer)}</span></div>`)].join("");
    return `<div class="selection-candidate ${picked ? "selected" : ""}"><button class="selection-toggle" data-select-candidate="${index}" aria-pressed="${picked}"><span class="selection-index">${String(index + 1).padStart(2, "0")}</span><span class="selection-copy"><b>${escapeHtml(dossier.name)}</b><em>${escapeHtml(dossier.role)} · ${escapeHtml(dossier.origin)}</em><small>${escapeHtml(claimSummary)}</small></span><strong>${picked ? "已列入扣留名单" : "未选择"}</strong></button><div class="selection-transcript" aria-label="${escapeHtml(dossier.name)} 的盘问记录"><div class="transcript-title">盘问记录 · ${agent.memory.length} 轮</div>${transcript}</div></div>`;
  }).join("");
  return `<div class="app-shell">${renderHeader(false)}<main class="page"><section class="selection-screen"><div class="settlement-head"><p class="eyebrow">十人盘问 · 统一处置</p><h1>提交扣留名单</h1><p>根据十人的陈述、本地知识、机构核验和关系线索选择若干对象。名单可以为空，也可以包含多人；未选择者将被放行。</p></div><div class="selection-summary"><span>已选择 <strong>${selected.size}</strong> 人</span><span>已盘问 <strong>10</strong> 人</span></div><div class="selection-grid">${cards}</div><div class="settlement-actions"><button class="secondary-button" data-action="exit">退出当前局</button><button class="primary-button" data-action="submit-selection">提交名单并结算</button></div></section></main></div>`;
}

function renderSettlement() {
  const accuracy = Math.round(controller.accuracy());
  const correct = controller.decisions.filter((decision) => decision.correct).length;
  const wrong = controller.decisions.length - correct;
  const detained = controller.decisions.filter((decision) => decision.action === "detain").length;
  const leaked = controller.decisions.filter((decision) => !decision.correct && decision.action === "release").length;
  const grade = accuracy === 100 ? "S" : accuracy >= 90 ? "A" : accuracy >= 80 ? "B" : accuracy >= 70 ? "C" : accuracy >= 60 ? "D" : "E";
  const summary = grade === "S" ? "十名候选人的处置全部正确，主控将本次行动记为无误判断。" : grade === "A" ? "大部分判断稳健，但仍有少数证据没有及时连成闭环。" : grade === "B" ? "你抓住了部分异常，不过行动记录显示还有明显的复核空档。" : "这次行动留下了较大判断风险，建议回到简报重新检查问题路径。";
  const rows = controller.decisions.map((decision, index) => `<div class="review-entry"><div class="review-row"><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(decision.name)} · ${decision.action === "detain" ? "扣留" : "放行"}</span><strong class="review-result ${decision.correct ? "correct" : "wrong"}">${decision.correct ? "正确" : decision.action === "detain" ? "误捕" : "漏网"}</strong></div><p class="review-basis">结案复盘：${escapeHtml(decision.tell)}</p></div>`).join("");
  const totalRounds = controller.agents.reduce((sum, agent) => sum + agent.round, 0);
  const clues = controller.caseClues.slice(-6);
  const archiveClaims = controller.caseClaims.slice(-8);
  const archive = `<div class="review case-archive"><h2>案件档案</h2><p>本次行动中，${escapeHtml(controller.campaign.name)}记录了 ${clues.length} 条机构线索和 ${controller.caseClaims.length} 条候选人主张。结算依据来自十人的统一名单，不设置额外审问阶段。</p>${clues.map((clue) => `<div class="review-row"><b>线</b><span>${escapeHtml(clue.text)}</span><strong>${escapeHtml(clue.source)}</strong></div>`).join("")}${archiveClaims.map((claim) => `<div class="review-row"><b>证</b><span>${escapeHtml(claim.category)} · ${escapeHtml(claim.value)}</span><strong>${escapeHtml(claim.status)}</strong></div>`).join("")}${!clues.length && !archiveClaims.length ? "<p>没有形成足够的跨人物线索链。</p>" : ""}</div>`;
  return `<div class="app-shell">${renderHeader(true)}<main class="page"><section class="settlement"><div class="settlement-head"><p class="eyebrow">行动报告 · 已结案</p><h1>行动结算</h1><p>${summary} 当前机构：${escapeHtml(controller.campaign.name)} · ${escapeHtml(controller.campaign.era)}。</p></div><div class="score-panel"><div class="grade">${grade}</div><div><div class="score-line"><strong>${accuracy}%</strong><span>十次处置的综合准确率</span></div><div class="score-track"><div style="width:${accuracy}%"></div></div><p class="score-note">正确 ${correct} · 错误 ${wrong} · 扣留 ${detained} · 漏网 ${leaked}</p></div></div><div class="stat-grid"><div class="stat-card"><span>正确判断</span><strong>${correct}</strong></div><div class="stat-card"><span>误捕</span><strong>${controller.decisions.filter((item) => !item.correct && item.action === "detain").length}</strong></div><div class="stat-card"><span>漏网</span><strong>${leaked}</strong></div><div class="stat-card"><span>完成对话</span><strong>${totalRounds}</strong></div></div><div class="review"><h2>逐人复盘</h2>${rows}</div>${archive}<div class="settlement-actions"><button class="secondary-button" data-action="back">返回机构选择</button><button class="primary-button" data-action="restart">重新执行本局</button></div></section></main></div>`;
}

function renderOfficerComplete() {
  return renderSettlement();
}

function bindEvents() {
  document.querySelectorAll("[data-campaign]").forEach((button) => button.addEventListener("click", () => { selectedCampaignId = button.dataset.campaign; pendingInfiltratorProfile = null; render(); }));
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { selectedMode = button.dataset.mode; render(); }));
  document.querySelector("[data-action=\"start\"]")?.addEventListener("click", () => {
    const profile = selectedMode === "infiltrator" ? getPendingInfiltratorProfile(selectedCampaignId) : null;
    controller = selectedMode === "infiltrator" ? new InfiltratorController(selectedCampaignId, profile) : new WorldController(selectedCampaignId);
    pendingInfiltratorProfile = null;
    controller.start();
    render();
  });
  document.querySelector("[data-question-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.question;
    const request = controller.ask(input.value);
    render();
    if (await request) render();
  });
  document.querySelector("[data-infiltrator-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.answer;
    const request = controller.ask(input.value);
    render();
    if (await request) render();
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
    const input = document.querySelector(".question-input");
    if (input) { input.value = button.dataset.prompt; input.focus(); }
  }));
  document.querySelectorAll("[data-select-candidate]").forEach((button) => button.addEventListener("click", () => { if (controller.toggleSelection(Number(button.dataset.selectCandidate))) render(); }));
  document.querySelector('[data-action="submit-selection"]')?.addEventListener("click", () => { if (controller.submitSelections()) render(); });
  document.querySelector('[data-action="verify-current"]')?.addEventListener("click", () => { if (controller.verifyCurrent()) render(); });
  document.querySelector("[data-action=\"next\"]")?.addEventListener("click", () => { controller.next(); render(); });
  document.querySelector("[data-action=\"restart\"]")?.addEventListener("click", () => { controller = controller.mode === "infiltrator" ? new InfiltratorController(controller.campaign.id) : new WorldController(controller.campaign.id); selectedMode = controller.mode; controller.start(); render(); });
  document.querySelector("[data-action=\"exit\"]")?.addEventListener("click", () => { clearPersistedSession(); pendingInfiltratorProfile = null; controller = new WorldController(); selectedMode = "officer"; selectedCampaignId = CAMPAIGNS[0].id; render(); });
  document.querySelector("[data-action=\"back\"]")?.addEventListener("click", () => { clearPersistedSession(); pendingInfiltratorProfile = null; controller = new WorldController(); selectedMode = "officer"; selectedCampaignId = CAMPAIGNS[0].id; render(); });
}

render();
hydrateUserSession();
