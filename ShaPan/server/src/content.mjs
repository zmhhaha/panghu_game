const reports = {
  taierzhuang: [
    { id: "tz-1", type: "urgent", source: "第31师师部", subject: "东门火力增强，请示是否投入预备连", body: "东门外敌火力在十分钟内明显增强。预备连已抵达师部附近，请示是否立即投入东门。", received: "17:42", availableAtMinute: 1081, location: "cn31" },
    { id: "tz-2", type: "intel", source: "第五战区情报处", subject: "台枣支线方向有连续炮声", body: "地方情报转报：暂不能判断为日军炮兵还是运输队，航空观察尚未印证。", received: "17:30", availableAtMinute: 1085, location: "jpseya" },
    { id: "tz-3", type: "normal", source: "第30师", subject: "南岸先头营开始通过堤桥", body: "桥面狭窄，车辆必须分批通过。预计18时15分可向城南发起支援行动。", received: "17:39", availableAtMinute: 1090, location: "cn30" },
    { id: "tz-4", type: "normal", source: "第27师", subject: "侦察组在刘家湖发现烟火", body: "西北方向可见两处新烟柱，敌军数量不明，师部正派通信员查明。", received: "17:25", availableAtMinute: 1096, location: "cn27" },
    { id: "tz-5", type: "normal", source: "集团军炮兵", subject: "炮群请求确认城东射界", body: "第一炮群已完成转移，请明确是否优先压制东门外日军集结地域。", received: "17:07", availableAtMinute: 1102, location: "cnart" },
    { id: "tz-6", type: "intel", source: "便衣情报员", subject: "运河北岸发现履带车辆", body: "两辆或更多履带车辆沿土路向西移动，观察距离较远，型号不明。", received: "16:40", availableAtMinute: 1110, location: "jparmor" },
    { id: "tz-7", type: "urgent", source: "集团军预备队", subject: "渡口拥堵，行军纵队暂时失联", body: "最后一名通信员报告渡口受到炮击，纵队可能改走东侧便桥。", received: "16:50", availableAtMinute: 1118, location: "cnreserve" }
  ],
  arnhem: [
    { id: "ar-1", type: "urgent", source: "第2伞兵营", subject: "桥西建筑区遭到射击", body: "先头连进入桥西建筑区后遭轻武器射击，桥梁北端仍在视线之外。", received: "14:52", availableAtMinute: 901, location: "uk2para" },
    { id: "ar-2", type: "intel", source: "师部情报官", subject: "阿纳姆附近装甲部队情报未决", body: "战前航空照片显示周边存在履带车辆，但没有可靠消息证明其已恢复战斗。", received: "14:45", availableAtMinute: 905, location: "de9ss" },
    { id: "ar-3", type: "normal", source: "第1机降旅", subject: "DZ X 集结完成约七成", body: "部分反坦克武器和无线电设备尚未找到，可按原计划向奥斯特贝克东侧推进。", received: "14:39", availableAtMinute: 910, location: "ukairland" },
    { id: "ar-4", type: "normal", source: "第1伞兵旅", subject: "旅部无线电联络时断时续", body: "第一梯队已离开着陆地域，旅部请求师部经中继台重复发送桥区任务。", received: "14:38", availableAtMinute: 916, location: "uk1para" },
    { id: "ar-5", type: "normal", source: "第1空降侦察中队", subject: "乌得勒支公路出现道路阻塞", body: "侦察车队正改走北侧支路，沿途有零星火力，预计抵达时间延后。", received: "14:45", availableAtMinute: 922, location: "ukrecon" },
    { id: "ar-6", type: "intel", source: "荷兰地下组织", subject: "德军卡车向桥区移动", body: "城西观察点报告多辆卡车和摩托车向公路桥方向移动，番号不明。", received: "14:42", availableAtMinute: 928, location: "deinf" },
    { id: "ar-7", type: "normal", source: "师属轻炮兵", subject: "炮兵观察员等待校射目标", body: "现有火炮已经展开，但前进观察员与桥区部队尚未建立稳定联络。", received: "14:12", availableAtMinute: 936, location: "ukart" }
  ]
};

const unitProfiles = {
  taierzhuang: {
    cn31: { id: "cn31", name: "第31师", side: "friendly", role: "坚守台儿庄城内核心阵地" },
    cn30: { id: "cn30", name: "第30师", side: "friendly", role: "由运河南岸增援台儿庄" },
    cn27: { id: "cn27", name: "第27师", side: "friendly", role: "牵制西北方向日军" },
    cnart: { id: "cnart", name: "集团军炮兵", side: "friendly", role: "提供战役级火力支援" },
    cnreserve: { id: "cnreserve", name: "集团军预备队", side: "friendly", role: "作为机动预备力量" },
    jpseya: { id: "jpseya", name: "濑谷支队", side: "enemy", role: "从城东持续进攻" },
    jparmor: { id: "jparmor", name: "日军战车分队", side: "enemy", role: "沿城东道路实施突击" }
  },
  arnhem: {
    uk1para: { id: "uk1para", name: "第1伞兵旅", side: "friendly", role: "向阿纳姆市区推进" },
    uk2para: { id: "uk2para", name: "第2伞兵营", side: "friendly", role: "夺取并坚守公路桥" },
    ukairland: { id: "ukairland", name: "第1机降旅", side: "friendly", role: "巩固着陆地域与补给线" },
    ukrecon: { id: "ukrecon", name: "第1空降侦察中队", side: "friendly", role: "侦察通往桥区的道路" },
    ukart: { id: "ukart", name: "师属轻炮兵", side: "friendly", role: "为前进部队提供火力支援" },
    deinf: { id: "deinf", name: "德军临时战斗群", side: "enemy", role: "封锁通往桥区的道路" },
    de9ss: { id: "de9ss", name: "德军装甲部队", side: "enemy", role: "组织装甲反击" }
  }
};

export const campaigns = {
  taierzhuang: {
    id: "taierzhuang",
    title: "台儿庄战役",
    theater: "亚洲战场",
    mapStyle: "china-roca-1938",
    contentVersion: "taierzhuang-1938.v1",
    startAt: "1938-03-31T18:00:00+08:00",
    startMinute: 1080,
    deadlineMinute: 1800,
    objective: "坚守台儿庄核心阵地",
    units: ["cn31", "cn30", "cn27", "cnart", "cnreserve"],
    enemyUnits: ["jpseya", "jparmor"],
    reports: reports.taierzhuang,
    agentIntervalMinutes: 15
  },
  arnhem: {
    id: "arnhem",
    title: "阿纳姆战役",
    theater: "欧洲战场",
    mapStyle: "europe-west-allied-1944",
    contentVersion: "arnhem-1944.v1",
    startAt: "1944-09-17T15:00:00+01:00",
    startMinute: 900,
    deadlineMinute: 1800,
    objective: "夺取并保持阿纳姆公路桥",
    units: ["uk1para", "uk2para", "ukairland", "ukrecon", "ukart"],
    enemyUnits: ["deinf", "de9ss"],
    reports: reports.arnhem,
    agentIntervalMinutes: 15
  }
};

export function getCampaign(id) {
  return campaigns[id] ?? null;
}

export function getUnitProfile(campaignId, unitId) {
  return unitProfiles[campaignId]?.[unitId] ?? { id: unitId, name: unitId, side: "unknown", role: "执行战场任务" };
}

export function listCampaigns() {
  return Object.values(campaigns).map(({ id, title, theater, mapStyle, contentVersion, startAt, startMinute, deadlineMinute, objective }) => ({
    id,
    title,
    theater,
    mapStyle,
    contentVersion,
    startAt,
    startMinute,
    deadlineMinute,
    objective
  }));
}
