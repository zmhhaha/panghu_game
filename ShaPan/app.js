const scenarioCatalog = {
  taierzhuang: {
    id: "taierzhuang",
    title: "台儿庄战役",
    theater: "亚洲战场",
    crest: "二",
    commandLabel: "第五战区 · 第二集团军前方指挥所",
    objective: "坚守台儿庄核心阵地",
    mapKicker: "第五战区作战用图 / 民国二十七年",
    mapHeading: "台儿庄地区作战图",
    dateLabel: "1938年3月31日",
    startDate: "1938-03-31",
    startMinute: 1080,
    deadlineMinute: 1800,
    friendlyLabel: "中国军队",
    enemyLabel: "日军敌情",
    friendlyColor: "#9c3b32",
    enemyColor: "#315779",
    weather: "阴 · 能见度 4km",
    sunset: "18:22",
    signal: "城内线路多处中断",
    scale: "2 KM",
    placeholder: "致第31师：固守台儿庄城内核心阵地……",
    defaultUnit: "cn31",
    risk: { radio: "中高", phone: "中", courier: "低" },
    channels: { radio: 12, phone: 5, courier: 35 },
    units: {
      cn31: { id: "cn31", symbol: "X", name: "第31师", short: "第31师", detail: "台儿庄城内 · 17:42", state: "联络正常", stateClass: "", side: "friendly", age: "18 分钟前报告", summary: "城内东、南两侧仍在交火。守军已将预备连投入东门，西门附近弹药开始紧张。", stats: [["兵力", "63%"], ["士气", "坚守"], ["通信", "断续电话"]] },
      cn30: { id: "cn30", symbol: "X", name: "第30师", short: "第30师", detail: "城南运河 · 17:35", state: "正在增援", stateClass: "delayed", side: "friendly", age: "25 分钟前报告", summary: "先头营沿运河南岸向东推进。河堤道路狭窄，重机枪和弹药车辆尚未全部通过。", stats: [["兵力", "78%"], ["士气", "稳定"], ["通信", "通信员"]] },
      cn27: { id: "cn27", symbol: "X", name: "第27师", short: "第27师", detail: "西北外围 · 17:18", state: "报告延迟", stateClass: "delayed", side: "friendly", age: "42 分钟前报告", summary: "正在牵制台儿庄西北的日军部队。前沿村庄有烟火，无法确认是炮击还是部队转移。", stats: [["兵力", "71%"], ["士气", "疲惫"], ["通信", "无线电弱"]] },
      cnart: { id: "cnart", symbol: "●", name: "直属炮兵群", short: "直属炮兵", detail: "南洛西侧 · 17:26", state: "联络正常", stateClass: "", side: "friendly", age: "34 分钟前报告", summary: "两个炮兵连完成展开，可覆盖城东和运河渡口。观察所尚未确认日军炮兵准确位置。", stats: [["弹药", "54%"], ["战备", "待命"], ["通信", "电话畅通"]] },
      cnreserve: { id: "cnreserve", symbol: "R", name: "集团军预备队", short: "预备队", detail: "峄县方向 · 16:50", state: "暂时失联", stateClass: "lost", side: "friendly", age: "1 小时10分前报告", summary: "最后消息称正在向台儿庄南侧机动。道路拥堵，师部暂未收到新的位置报告。", stats: [["兵力", "未知"], ["状态", "机动"], ["通信", "失联"]] }
    },
    contacts: {
      jpseya: { name: "濑谷支队？", side: "enemy", age: "20 分钟前确认", summary: "城东街区出现日军步兵和掷弹筒火力。来源判断可能属于濑谷支队先头部队，但番号尚未确认。", stats: [["可信度", "较高"], ["误差", "800 m"], ["来源", "第31师"]] },
      jpguns: { name: "日军炮兵阵地", side: "enemy", age: "1 小时20分前报告", summary: "地方人员听见台枣支线东北方向连续炮声，无法区分野炮和迫击炮。航空观察尚未印证。", stats: [["可信度", "中"], ["误差", "2 km"], ["来源", "地方情报"]] },
      jparmor: { name: "日军战车？", side: "enemy", age: "35 分钟前确认", summary: "运河北岸道路发现履带车辆痕迹，数量和行进方向不明。当前只确认曾经通过，并非实时位置。", stats: [["可信度", "中"], ["误差", "1.5 km"], ["来源", "第27师"]] }
    },
    messages: [
      { id: 101, type: "urgent", unread: true, source: "第31师师部", subject: "东门火力增强，请示是否投入预备连", sent: "17:38", received: "17:42", body: "致第二集团军前指：\n\n东门外敌火力在十分钟内明显增强，城墙缺口附近发现新的掷弹筒阵地。预备连已经抵达师部附近，是否立即投入东门？\n\n西门守军尚未恢复电话联络。", location: "cn31" },
      { id: 102, type: "intel", unread: true, source: "第五战区情报处", subject: "台枣支线东北方向有连续炮声", sent: "16:25", received: "17:30", body: "地方情报转报：台枣支线东北方向在16时25分后出现连续炮声，另有车辆灯光短暂停留。暂不能判断为日军炮兵还是运输队。", location: "jpguns" },
      { id: 103, type: "normal", unread: false, source: "第30师", subject: "南岸先头营开始渡过堤桥", sent: "17:35", received: "17:39", body: "第30师先头营已到达运河南岸堤桥。桥面狭窄，车辆必须分批通过。预计18时15分可向城南发起支援行动。", location: "cn30" },
      { id: 104, type: "normal", unread: true, source: "第27师侦察组", subject: "西北村庄出现烟火，敌情不明", sent: "17:18", received: "17:25", body: "西北外围两个村庄上空出现烟火，观察组未能确认是炮击、焚烧还是炊烟。道路上有少量步兵向东移动。", location: "cn27" },
      { id: 105, type: "intel", unread: false, source: "集团军炮兵处", subject: "请求确认城东射击界限", sent: "16:58", received: "17:07", body: "炮兵观察员需要城东街区的友军界限，避免射击落入第31师阵地。当前可覆盖东门外约一公里区域。", location: "cnart" }
    ],
    scheduledMessages: [
      { at: 1088, message: { id: 106, type: "urgent", unread: true, source: "第31师师部", subject: "城内西门失去联络", sent: "17:44", received: "17:48", body: "西门电话线和通信员均未返回。城墙缺口处发现日军白刃队活动，规模不明。师部将暂以预备连封锁街口。", location: "cn31" } },
      { at: 1103, message: { id: 107, type: "normal", unread: true, source: "第30师", subject: "增援纵队被堤桥堵住", sent: "17:58", received: "18:03", body: "南岸堤桥有民夫车辆和伤员混行，增援纵队暂时无法展开。请求优先清理桥面，否则城南支援将继续延迟。", location: "cn30" } },
      { at: 1120, message: { id: 108, type: "intel", unread: true, source: "第五战区情报处", subject: "外线部队向峄县东南集结", sent: "18:14", received: "18:20", body: "收到外线部队转报，敌后道路上有大股日军车辆向台儿庄方向移动。具体规模和抵达时间未能确认。", location: "jparmor" } }
    ],
    queue: [
      { id: "tz-q1", recipient: "第31师", sentAt: 1068, arriveAt: 1080, status: "电话排队" },
      { id: "tz-q2", recipient: "第30师", sentAt: 1061, arriveAt: 1096, status: "通信员在途" }
    ]
  },
  arnhem: {
    id: "arnhem",
    title: "阿纳姆战役",
    theater: "欧洲战场",
    crest: "1",
    commandLabel: "英国第1空降师 · 师部指挥所",
    objective: "夺取并保持阿纳姆公路桥",
    mapKicker: "G.S.G.S. / NORTH-WEST EUROPE · 1944",
    mapHeading: "阿纳姆地区作战图",
    dateLabel: "1944年9月17日",
    startDate: "1944-09-17",
    startMinute: 900,
    deadlineMinute: 1800,
    friendlyLabel: "英军空降部队",
    enemyLabel: "德军敌情",
    friendlyColor: "#255d9a",
    enemyColor: "#a03c35",
    weather: "晴间多云 · 能见度 8km",
    sunset: "19:55",
    signal: "无线电联络断续",
    scale: "2 KM",
    placeholder: "致第1伞兵旅：向阿纳姆公路桥推进，保持与师部的最低通信……",
    defaultUnit: "uk1para",
    risk: { radio: "高", phone: "低", courier: "中" },
    channels: { radio: 8, phone: 4, courier: 25 },
    units: {
      uk1para: { id: "uk1para", symbol: "X", name: "第1伞兵旅", short: "第1伞兵旅", detail: "奥斯特贝克东侧 · 14:38", state: "联络断续", stateClass: "delayed", side: "friendly", age: "22 分钟前报告", summary: "旅部正沿主路向阿纳姆推进。前锋营已与居民取得联系，但无线电无法稳定回传。", stats: [["兵力", "84%"], ["士气", "良好"], ["通信", "断续无线电"]] },
      uk2para: { id: "uk2para", symbol: "X", name: "第2伞兵营", short: "第2伞兵营", detail: "阿纳姆公路桥西侧 · 14:47", state: "目标接触", stateClass: "", side: "friendly", age: "13 分钟前报告", summary: "先头连已进入桥西建筑区，桥梁北端仍未确认。敌军在桥东侧有零星射击。", stats: [["兵力", "72%"], ["士气", "坚决"], ["通信", "电台弱"]] },
      ukairland: { id: "ukairland", symbol: "X", name: "第1机降旅", short: "第1机降旅", detail: "DZ X 着陆地域 · 14:31", state: "正在集结", stateClass: "", side: "friendly", age: "29 分钟前报告", summary: "主力已完成第一波集结，部分无线电和反坦克武器仍在寻找。西侧林地道路可通行。", stats: [["兵力", "89%"], ["士气", "稳定"], ["通信", "电话未铺"]] },
      ukrecon: { id: "ukrecon", symbol: "◇", name: "第1空降侦察中队", short: "空降侦察中队", detail: "阿纳姆西郊 · 14:45", state: "联络正常", stateClass: "", side: "friendly", age: "15 分钟前报告", summary: "侦察组试图沿北部道路快速接近桥梁，尚未确认德军装甲车辆位置。", stats: [["兵力", "68%"], ["士气", "稳定"], ["通信", "电台畅通"]] },
      ukart: { id: "ukart", symbol: "●", name: "师属轻炮兵", short: "师属轻炮兵", detail: "着陆地域南侧 · 14:12", state: "待命", stateClass: "delayed", side: "friendly", age: "48 分钟前报告", summary: "火炮正在从空降地域向西侧隐蔽阵地转移。缺少前沿观察员，暂不能提供精确支援。", stats: [["弹药", "61%"], ["战备", "转移"], ["通信", "无线电弱"]] }
    },
    contacts: {
      de9ss: { name: "德军装甲部队？", side: "enemy", age: "1 小时35分前确认", summary: "战前航空照片和居民报告均提到阿纳姆附近有履带车辆，但无法确认属于第9还是第10党卫军装甲师。", stats: [["可信度", "较高"], ["误差", "2 km"], ["来源", "战前情报"]] },
      deinf: { name: "德军步兵集结", side: "enemy", age: "58 分钟前确认", summary: "第1伞兵旅报告城西道路有步兵和卡车向桥区移动。数量估计从一个连到一个营不等。", stats: [["可信度", "中"], ["误差", "900 m"], ["来源", "第1伞兵旅"]] },
      deflak: { name: "疑似高射炮阵地", side: "enemy", age: "2 小时10分前报告", summary: "空降地域南侧听到间歇高射炮声，尚未确认是否具备对地射击能力。", stats: [["可信度", "低"], ["误差", "1.5 km"], ["来源", "空中观察"]] }
    },
    messages: [
      { id: 201, type: "urgent", unread: true, source: "第2伞兵营", subject: "桥西建筑区遭射击", sent: "14:47", received: "14:52", body: "致师部：\n\n先头连进入桥西建筑区后遭轻武器射击，火力零散但来自桥东和北侧房屋。桥梁北端仍在视线之外。\n\n请求确认第1伞兵旅是否已经占领北部道路。", location: "uk2para" },
      { id: 202, type: "intel", unread: true, source: "师部情报官", subject: "阿纳姆附近装甲部队情报未决", sent: "13:25", received: "14:45", body: "战前航空照片显示阿纳姆周边存在履带车辆，但没有可靠消息证明其已经恢复战斗。\n\n请各旅报告遇到的车辆型号和数量，不要将居民描述直接视为装甲部队确认。", location: "de9ss" },
      { id: 203, type: "normal", unread: false, source: "第1机降旅", subject: "DZ X 集结完成约七成", sent: "14:31", received: "14:39", body: "第一波部队已在DZ X西侧集结。部分反坦克武器和无线电设备尚未找到，补给容器散落在林地边缘。\n\n可按原计划向奥斯特贝克东侧推进，但需要确认道路没有德军阻拦。", location: "ukairland" },
      { id: 204, type: "normal", unread: true, source: "第1伞兵旅", subject: "旅部无线电呼叫未获回应", sent: "14:38", received: "14:42", body: "旅部连续三次呼叫师部未获回应，现通过通信员转报。前锋仍沿主路向东，尚未确认德军装甲位置。", location: "uk1para" },
      { id: 205, type: "intel", unread: false, source: "空中支援联络组", subject: "南侧疑似高射炮火点", sent: "13:50", received: "14:10", body: "飞行员在下莱茵河南岸听到高射炮声，位置只能估计在Driel西北。天气允许时将尝试再次观察。", location: "deflak" }
    ],
    scheduledMessages: [
      { at: 918, message: { id: 206, type: "urgent", unread: true, source: "通信排", subject: "师部至第1伞兵旅联络中断", sent: "15:12", received: "15:18", body: "师部无线电台仍无法稳定呼叫第1伞兵旅。已经派出两名通信员沿主路寻找旅部，预计至少需要二十分钟。", location: "uk1para" } },
      { at: 939, message: { id: 207, type: "intel", unread: true, source: "第2伞兵营", subject: "桥东出现履带车辆声", sent: "15:30", received: "15:39", body: "桥西观察员听到桥东有重型履带车辆发动机声，但树林和建筑遮挡视线。没有看到车辆轮廓，暂列为未证实装甲情报。", location: "de9ss" } },
      { at: 960, message: { id: 208, type: "normal", unread: true, source: "第1机降旅", subject: "道路被难民车辆占用", sent: "15:48", received: "16:00", body: "通往奥斯特贝克的道路被平民车辆堵塞。旅部正在清理路口，预计向东推进至少延迟十五分钟。", location: "ukairland" } }
    ],
    queue: [
      { id: "ar-q1", recipient: "第2伞兵营", sentAt: 888, arriveAt: 908, status: "无线电重发" },
      { id: "ar-q2", recipient: "第1伞兵旅", sentAt: 884, arriveAt: 920, status: "通信员在途" }
    ]
  }
};

let activeScenario = null;
let units = {};
let contacts = {};
let messages = [];
let scheduledMessages = [];
let queue = [];

const state = {
  scenario: "taierzhuang",
  minute: 1080,
  speed: 1,
  paused: false,
  filter: "all",
  selectedMessage: null,
  selectedUnit: "cn31",
  channel: "radio",
  channelDelay: 12
};

const els = {
  appShell: document.querySelector("#appShell"),
  scenarioSelect: document.querySelector("#scenarioSelect"),
  crest: document.querySelector("#unitCrest span"),
  commandLabel: document.querySelector("#commandLabel"),
  battleName: document.querySelector("#battleName"),
  objective: document.querySelector("#objectiveText"),
  clockDate: document.querySelector("#clockDate"),
  clock: document.querySelector("#battleClock"),
  pause: document.querySelector("#pauseButton"),
  deadlineText: document.querySelector("#deadlineText"),
  deadlineProgress: document.querySelector("#deadlineProgress"),
  unread: document.querySelector("#unreadCount"),
  mobileUnread: document.querySelector("#mobileUnread"),
  messageList: document.querySelector("#messageList"),
  messageReader: document.querySelector("#messageReader"),
  mapCanvas: document.querySelector("#mapCanvas"),
  inspector: document.querySelector("#mapInspector"),
  mapKicker: document.querySelector("#mapKicker"),
  mapHeading: document.querySelector("#mapHeading"),
  friendlyLegend: document.querySelector("#friendlyLegend"),
  enemyLegend: document.querySelector("#enemyLegend"),
  weather: document.querySelector("#weatherText"),
  sunset: document.querySelector("#sunsetText"),
  signal: document.querySelector("#signalText"),
  scale: document.querySelector("#scaleText"),
  contactSummary: document.querySelector("#contactSummary"),
  roster: document.querySelector("#unitRoster"),
  recipient: document.querySelector("#recipient"),
  orderText: document.querySelector("#orderText"),
  charCount: document.querySelector("#charCount"),
  arrival: document.querySelector("#arrivalEstimate"),
  send: document.querySelector("#sendOrder"),
  clear: document.querySelector("#clearOrder"),
  priority: document.querySelector("#priority"),
  riskText: document.querySelector("#riskText"),
  queueList: document.querySelector("#queueList"),
  queueCount: document.querySelector("#queueCount"),
  toast: document.querySelector("#toast")
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDate(startDate, minute) {
  const base = new Date(`${startDate}T00:00:00Z`);
  const dayOffset = Math.floor(minute / 1440);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return `${base.getUTCFullYear()}年${base.getUTCMonth() + 1}月${base.getUTCDate()}日`;
}

function typeLabel(type) {
  if (type === "urgent") return "紧急";
  if (type === "intel") return "情报";
  if (type === "sent") return "已发";
  return "战报";
}

function mapRoot() {
  return els.mapCanvas.querySelector(".battle-map");
}

function filteredMessages() {
  if (state.filter === "all") return messages;
  return messages.filter((message) => message.type === state.filter);
}

function renderMessages() {
  els.messageList.innerHTML = filteredMessages().map((message) => `
    <button class="message-item ${message.unread ? "unread" : ""} ${state.selectedMessage === message.id ? "selected" : ""}" type="button" data-message-id="${message.id}">
      <span class="message-priority ${message.type}"></span>
      <span><span class="message-source">${message.source}</span><span class="message-subject">${message.subject}</span></span>
      <time class="message-time">${message.received}</time>
    </button>
  `).join("");

  const unread = messages.filter((message) => message.unread).length;
  els.unread.textContent = `${unread} 未读`;
  els.mobileUnread.textContent = unread;
  els.mobileUnread.hidden = unread === 0;
  document.querySelectorAll("[data-message-id]").forEach((button) => button.addEventListener("click", () => openMessage(Number(button.dataset.messageId))));
}

function openMessage(id) {
  const message = messages.find((item) => item.id === id);
  if (!message) return;
  message.unread = false;
  state.selectedMessage = id;
  els.messageReader.innerHTML = `
    <header class="reader-header"><span class="side-chip ${message.type === "urgent" ? "enemy" : ""}">${typeLabel(message.type)}</span><h3>${message.subject}</h3>
      <div class="reader-meta"><span>来源：${message.source}</span><span>发出 ${message.sent}</span><span>收到 ${message.received}</span></div>
    </header>
    <p class="reader-body">${message.body}</p>
    <button class="reader-location" type="button" data-locate="${message.location}">在沙盘上定位</button>`;
  renderMessages();
  els.messageReader.querySelector("[data-locate]").addEventListener("click", () => locateOnMap(message.location));
}

function renderRoster() {
  els.roster.innerHTML = Object.values(units).map((unit) => `
    <button class="roster-item ${state.selectedUnit === unit.id ? "active" : ""}" type="button" data-roster-unit="${unit.id}">
      <span class="roster-symbol">${unit.symbol}</span>
      <span><span class="roster-name">${unit.name}</span><span class="roster-detail">${unit.detail}</span></span>
      <span class="roster-state ${unit.stateClass}">${unit.state}</span>
    </button>`).join("");
  document.querySelectorAll("[data-roster-unit]").forEach((button) => button.addEventListener("click", () => selectUnit(button.dataset.rosterUnit)));
}

function inspectorMarkup(item, isUnit) {
  const stats = item.stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  const label = item.side === "friendly" ? activeScenario.friendlyLabel : activeScenario.enemyLabel;
  return `<div class="inspector-topline"><span class="side-chip ${item.side}">${label}</span><span class="report-age">${item.age}</span></div>
    <h3>${item.name}</h3><p>${item.summary}</p><dl>${stats}</dl>
    ${isUnit ? `<button class="inspector-order-button" type="button" data-order-unit="${item.id}">向该部下令</button>` : ""}`;
}

function selectUnit(id) {
  const unit = units[id];
  if (!unit) return;
  state.selectedUnit = id;
  els.inspector.innerHTML = inspectorMarkup(unit, true);
  els.inspector.style.borderLeftColor = activeScenario.friendlyColor;
  mapRoot()?.querySelectorAll(".unit-marker").forEach((marker) => marker.classList.toggle("selected", marker.dataset.unit === id));
  renderRoster();
  els.inspector.querySelector("[data-order-unit]")?.addEventListener("click", () => prepareOrder(id));
}

function selectContact(id) {
  const contact = contacts[id];
  if (!contact) return;
  els.inspector.innerHTML = inspectorMarkup(contact, false);
  els.inspector.style.borderLeftColor = activeScenario.enemyColor;
  mapRoot()?.querySelectorAll(".unit-marker").forEach((marker) => marker.classList.remove("selected"));
}

function locateOnMap(id) {
  switchMobileView("map");
  if (units[id]) selectUnit(id);
  if (contacts[id]) selectContact(id);
  showToast("沙盘已定位至该报告关联位置");
}

function prepareOrder(id) {
  els.recipient.value = id;
  els.orderText.focus();
  switchMobileView("orders");
  updateArrivalEstimate();
}

function renderQueue() {
  els.queueCount.textContent = `${queue.length} 项`;
  els.queueList.innerHTML = queue.map((item) => {
    const duration = Math.max(1, item.arriveAt - item.sentAt);
    const progress = Math.min(100, Math.max(8, ((state.minute - item.sentAt) / duration) * 100));
    const remaining = Math.max(0, item.arriveAt - state.minute);
    return `<article class="queue-item"><strong>致 ${item.recipient} · ${item.status}</strong><time>${remaining > 0 ? `约 ${remaining} 分` : "送达"}</time><div class="queue-progress"><span style="width:${progress}%"></span></div></article>`;
  }).join("") || `<div class="reader-empty"><p>当前无待发报文</p></div>`;
}

function updateClock() {
  const remaining = Math.max(0, activeScenario.deadlineMinute - state.minute);
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  els.clock.textContent = formatTime(state.minute);
  els.clock.dateTime = `${activeScenario.startDate}T${formatTime(state.minute)}`;
  els.clockDate.textContent = formatDate(activeScenario.startDate, state.minute);
  els.deadlineText.textContent = remaining > 0 ? `剩余 ${hours}小时${String(minutes).padStart(2, "0")}分` : "目标时限已过";
  els.deadlineProgress.style.width = `${Math.max(0, Math.min(100, (remaining / activeScenario.initialRemaining) * 100))}%`;
  updateArrivalEstimate();
}

function updateArrivalEstimate() {
  els.arrival.textContent = `预计 ${formatTime(state.minute + state.channelDelay)} 送达`;
}

function updateChannelControls() {
  document.querySelectorAll("[data-channel]").forEach((button) => {
    const channel = button.dataset.channel;
    const delay = activeScenario.channels[channel];
    button.dataset.delay = delay;
    const label = button.querySelector(`[data-channel-delay="${channel}"]`);
    if (label) label.textContent = `约 ${delay} 分钟`;
  });
  state.channelDelay = activeScenario.channels[state.channel];
  els.riskText.textContent = `截获风险：${activeScenario.risk[state.channel]}`;
  updateArrivalEstimate();
}

function deliverScheduledMessages() {
  scheduledMessages.forEach((entry) => {
    if (!entry.delivered && state.minute >= entry.at) {
      entry.delivered = true;
      messages.unshift(entry.message);
      renderMessages();
      showToast(`新电报：${entry.message.source} · ${entry.message.subject}`);
    }
  });
}

function advanceTime() {
  if (state.paused) return;
  state.minute += state.speed;
  queue = queue.filter((item) => item.arriveAt > state.minute - 2);
  deliverScheduledMessages();
  updateClock();
  renderQueue();
}

function renderRecipients() {
  els.recipient.innerHTML = Object.values(units).map((unit) => `<option value="${unit.id}">${unit.name}</option>`).join("");
  els.recipient.value = state.selectedUnit;
}

function bindMapInteractions() {
  mapRoot()?.querySelectorAll("[data-unit]").forEach((marker) => {
    marker.addEventListener("click", () => selectUnit(marker.dataset.unit));
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") selectUnit(marker.dataset.unit);
    });
  });
  mapRoot()?.querySelectorAll("[data-contact]").forEach((marker) => {
    marker.addEventListener("click", () => selectContact(marker.dataset.contact));
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") selectContact(marker.dataset.contact);
    });
  });
}

function resetLayerButtons() {
  document.querySelectorAll("[data-layer]").forEach((button) => {
    button.classList.add("active");
    mapRoot()?.querySelector(`[data-layer-group="${button.dataset.layer}"]`)?.classList.remove("hidden");
  });
}

function loadScenario(id, announce = true) {
  const config = scenarioCatalog[id];
  if (!config || !window.BATTLE_MAPS?.[id]) return;
  activeScenario = clone(config);
  activeScenario.initialRemaining = activeScenario.deadlineMinute - activeScenario.startMinute;
  units = activeScenario.units;
  contacts = activeScenario.contacts;
  messages = activeScenario.messages;
  scheduledMessages = activeScenario.scheduledMessages;
  queue = activeScenario.queue;
  state.scenario = id;
  state.minute = activeScenario.startMinute;
  state.paused = false;
  state.filter = "all";
  state.selectedMessage = null;
  state.selectedUnit = activeScenario.defaultUnit;
  state.channel = "radio";
  state.channelDelay = activeScenario.channels.radio;

  els.appShell.dataset.scenario = id;
  els.scenarioSelect.value = id;
  els.crest.textContent = activeScenario.crest;
  els.commandLabel.textContent = activeScenario.commandLabel;
  els.battleName.textContent = activeScenario.title;
  els.objective.textContent = activeScenario.objective;
  els.mapKicker.textContent = activeScenario.mapKicker;
  els.mapHeading.textContent = activeScenario.mapHeading;
  els.friendlyLegend.textContent = activeScenario.friendlyLabel;
  els.enemyLegend.textContent = activeScenario.enemyLabel;
  els.weather.textContent = activeScenario.weather;
  els.sunset.textContent = activeScenario.sunset;
  els.signal.textContent = activeScenario.signal;
  els.scale.textContent = activeScenario.scale;
  els.orderText.placeholder = activeScenario.placeholder;
  els.contactSummary.textContent = `${Object.values(units).filter((unit) => unit.stateClass !== "lost").length} / ${Object.keys(units).length} 联络中`;
  document.title = `最后确认位置 · ${activeScenario.title}`;
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
  els.pause.classList.remove("playing");
  els.pause.title = "暂停时间";
  els.pause.setAttribute("aria-label", "暂停时间");
  els.mapCanvas.innerHTML = window.BATTLE_MAPS[id];
  resetLayerButtons();
  bindMapInteractions();
  renderRecipients();
  updateChannelControls();
  renderMessages();
  renderRoster();
  renderQueue();
  selectUnit(state.selectedUnit);
  els.messageReader.innerHTML = `<div class="reader-empty"><span class="empty-mark" aria-hidden="true">···</span><p>请选择一份通信记录</p></div>`;
  updateClock();
  if (announce) showToast(`已切换至${activeScenario.theater} · ${activeScenario.title}`);
}

function sendOrder() {
  const body = els.orderText.value.trim();
  if (!body) {
    showToast("命令正文为空，无法发送");
    els.orderText.focus();
    return;
  }
  const unit = units[els.recipient.value];
  if (!unit) return;
  const sentAt = state.minute;
  const arrival = sentAt + state.channelDelay;
  const channelNames = { radio: "无线电报", phone: "野战电话", courier: "通信员" };
  const id = Date.now();
  queue.unshift({ id: `q${id}`, recipient: unit.name, sentAt, arriveAt: arrival, status: `${channelNames[state.channel]}传输中` });
  messages.unshift({ id, type: "sent", unread: false, source: `致 ${unit.name}`, subject: body.length > 28 ? `${body.slice(0, 28)}…` : body, sent: formatTime(sentAt), received: formatTime(sentAt), body, location: unit.id });
  els.orderText.value = "";
  els.charCount.textContent = "0 / 420";
  renderMessages();
  renderQueue();
  showToast(`军令已编码，预计 ${formatTime(arrival)} 送达 ${unit.short}`);
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("visible"), 2600);
}

function switchMobileView(view) {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
}

document.querySelectorAll("[data-speed]").forEach((button) => button.addEventListener("click", () => {
  state.speed = Number(button.dataset.speed);
  state.paused = false;
  els.pause.classList.remove("playing");
  els.pause.title = "暂停时间";
  els.pause.setAttribute("aria-label", "暂停时间");
  document.querySelectorAll("[data-speed]").forEach((item) => item.classList.toggle("active", item === button));
}));

els.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  els.pause.classList.toggle("playing", state.paused);
  els.pause.title = state.paused ? "继续时间" : "暂停时间";
  els.pause.setAttribute("aria-label", state.paused ? "继续时间" : "暂停时间");
  showToast(state.paused ? "战役时间已暂停" : "战役时间继续流逝");
});

document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderMessages();
}));

document.querySelectorAll("[data-layer]").forEach((button) => button.addEventListener("click", () => {
  button.classList.toggle("active");
  mapRoot()?.querySelector(`[data-layer-group="${button.dataset.layer}"]`)?.classList.toggle("hidden", !button.classList.contains("active"));
}));

document.querySelectorAll("[data-channel]").forEach((button) => button.addEventListener("click", () => {
  state.channel = button.dataset.channel;
  state.channelDelay = activeScenario.channels[state.channel];
  document.querySelectorAll("[data-channel]").forEach((item) => item.classList.toggle("active", item === button));
  els.riskText.textContent = `截获风险：${activeScenario.risk[state.channel]}`;
  updateArrivalEstimate();
}));

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => switchMobileView(button.dataset.view)));
els.scenarioSelect.addEventListener("change", () => loadScenario(els.scenarioSelect.value));
els.orderText.addEventListener("input", () => { els.charCount.textContent = `${els.orderText.value.length} / 420`; });
els.clear.addEventListener("click", () => { els.orderText.value = ""; els.charCount.textContent = "0 / 420"; els.orderText.focus(); });
els.send.addEventListener("click", sendOrder);
els.recipient.addEventListener("change", () => selectUnit(els.recipient.value));

loadScenario("taierzhuang", false);
window.setInterval(advanceTime, 1000);
