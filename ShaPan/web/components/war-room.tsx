"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  CloudSun,
  Inbox,
  Layers3,
  MapPinned,
  Pause,
  Play,
  Radio,
  Send,
  Sunset,
  TimerReset,
  Wifi
} from "lucide-react";
import { TacticalMap, type MapLayers, type TacticalUnit } from "./tactical-map";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type Campaign = {
  id: string;
  title: string;
  theater: string;
  mapStyle: string;
  objective: string;
  startAt: string;
  startMinute: number;
  deadlineMinute: number;
  command: string;
  identity: string;
  mapTitle: string;
  mapSubtitle: string;
  weather: string;
  visibility: string;
  sunset: string;
  communications: string;
};

type Message = {
  id: string;
  type: "urgent" | "intel" | "normal" | "sent";
  source: string;
  subject: string;
  body: string;
  received: string;
  availableAtMinute?: number;
  location?: string;
  orderId?: string;
  orderStatus?: "queued" | "delivered" | "intercepted" | "failed";
};

type GameSummary = {
  id: string;
  campaignId: string;
  status: "running" | "paused" | "won" | "lost" | "finished";
  clockMinute: number;
  timeScale: number;
  startedAt?: string | null;
  updatedAt?: string;
};

type MessageFilter = "all" | Message["type"];

const campaigns: Campaign[] = [
  {
    id: "taierzhuang",
    title: "台儿庄战役",
    theater: "亚洲 · 台儿庄",
    mapStyle: "china-roca-1938",
    objective: "坚守台儿庄核心阵地",
    startAt: "1938年3月31日",
    startMinute: 1080,
    deadlineMinute: 1800,
    command: "第五战区 · 第二集团军前方指挥所",
    identity: "二",
    mapTitle: "台儿庄地区作战图",
    mapSubtitle: "第五战区作战用图 / 民国二十七年",
    weather: "阴",
    visibility: "4km",
    sunset: "18:22",
    communications: "城内线路多处中断"
  },
  {
    id: "arnhem",
    title: "阿纳姆战役",
    theater: "欧洲 · 阿纳姆",
    mapStyle: "europe-west-allied-1944",
    objective: "夺取并保持阿纳姆公路桥",
    startAt: "1944年9月17日",
    startMinute: 900,
    deadlineMinute: 1800,
    command: "英国第1空降师 · 师部指挥所",
    identity: "1",
    mapTitle: "阿纳姆地区作战图",
    mapSubtitle: "G.S.G.S. / NORTH-WEST EUROPE · 1944",
    weather: "晴间多云",
    visibility: "8km",
    sunset: "19:55",
    communications: "无线电联络断续"
  }
];

const unitsByCampaign: Record<string, TacticalUnit[]> = {
  taierzhuang: [
    { id: "cn31", name: "第31师", side: "friendly", x: 46, y: 55, detail: "台儿庄城内 · 17:42", status: "联络正常", summary: "城内东、南两侧仍在交火，守军已将预备连投入东门附近。", symbol: "infantry", strength: "63%", morale: "坚守", comms: "断续电话" },
    { id: "cn30", name: "第30师", side: "friendly", x: 29, y: 78, detail: "城南运河 · 17:35", status: "正在增援", summary: "先头营沿运河南岸推进，堤桥限制车辆与重武器展开。", symbol: "infantry", strength: "78%", morale: "良好", comms: "电话排队" },
    { id: "cn27", name: "第27师", side: "friendly", x: 18, y: 35, detail: "西北外围 · 17:18", status: "报告延迟", summary: "正在牵制西北方向敌军，前沿烟火暂时无法确认。", symbol: "infantry", strength: "71%", morale: "稳定", comms: "通信员" },
    { id: "cnart", name: "集团军炮兵", side: "friendly", x: 77, y: 25, detail: "台枣支线 · 17:26", status: "联络正常", summary: "炮群完成阵地转移，正在校核城东射击诸元。", symbol: "artillery", strength: "82%", morale: "良好", comms: "有线电话" },
    { id: "cnreserve", name: "集团军预备队", side: "friendly", x: 78, y: 69, detail: "运河南岸 · 16:50", status: "暂时失联", summary: "最后报告正在向运河渡口机动，后续位置尚未确认。", symbol: "hq", strength: "88%", morale: "良好", comms: "等待回执" },
    { id: "jpseya", name: "濑谷支队？", side: "enemy", x: 73, y: 44, detail: "城东街区 · 17:20", status: "较高可信", summary: "东侧街区出现步兵和掷弹筒火力，番号仍未完全确认。", symbol: "infantry", strength: "不明", morale: "不明", comms: "情报推定" },
    { id: "jparmor", name: "日军战车？", side: "enemy", x: 78, y: 61, detail: "城东道路 · 16:40", status: "未证实", summary: "道路发现履带痕迹，数量、型号和前进方向不明。", symbol: "armor", strength: "不明", morale: "不明", comms: "观察报告" }
  ],
  arnhem: [
    { id: "uk1para", name: "第1伞兵旅", side: "friendly", x: 29, y: 59, detail: "奥斯特贝克东侧 · 14:38", status: "联络断续", summary: "旅部沿主路向阿纳姆推进，无线电无法稳定回传。", symbol: "infantry", strength: "84%", morale: "良好", comms: "断续无线电" },
    { id: "uk2para", name: "第2伞兵营", side: "friendly", x: 60, y: 48, detail: "公路桥西侧 · 14:47", status: "目标接触", summary: "先头连进入桥西建筑区，桥东出现零星射击。", symbol: "infantry", strength: "79%", morale: "高昂", comms: "联络正常" },
    { id: "ukairland", name: "第1机降旅", side: "friendly", x: 20, y: 72, detail: "DZ X · 14:31", status: "正在集结", summary: "第一波完成集结，部分反坦克武器仍未找到。", symbol: "infantry", strength: "76%", morale: "良好", comms: "联络正常" },
    { id: "ukrecon", name: "第1空降侦察中队", side: "friendly", x: 49, y: 55, detail: "乌得勒支公路 · 14:45", status: "联络正常", summary: "侦察车队在道路阻塞前改向，正寻找通往桥区的支路。", symbol: "recon", strength: "68%", morale: "良好", comms: "无线电" },
    { id: "ukart", name: "师属轻炮兵", side: "friendly", x: 17, y: 39, detail: "着陆地域 · 14:12", status: "待命", summary: "已收拢部分火炮，观察员尚未与前进部队建立稳定联络。", symbol: "artillery", strength: "55%", morale: "稳定", comms: "等待校射" },
    { id: "deinf", name: "德军步兵？", side: "enemy", x: 70, y: 50, detail: "桥西建筑区 · 14:42", status: "很可能", summary: "步兵和卡车正向桥区移动，实际规模无法判定。", symbol: "infantry", strength: "不明", morale: "不明", comms: "前沿观察" },
    { id: "de9ss", name: "德军装甲部队？", side: "enemy", x: 79, y: 66, detail: "阿纳姆周边 · 13:50", status: "较高可信", summary: "履带车辆可能已经恢复战斗，型号和数量尚未确认。", symbol: "armor", strength: "不明", morale: "不明", comms: "航空照片" }
  ]
};

const messageFilters: Array<{ id: MessageFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "urgent", label: "紧急" },
  { id: "intel", label: "情报" },
  { id: "sent", label: "已发" }
];

const layerLabels: Array<{ id: keyof MapLayers; label: string }> = [
  { id: "units", label: "部队" },
  { id: "intel", label: "情报" },
  { id: "orders", label: "军令" },
  { id: "grid", label: "网格" }
];

function formatClock(minute: number) {
  const normalized = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function formatRemaining(minutes: number) {
  const safe = Math.max(0, minutes);
  return `${Math.floor(safe / 60)}小时${String(safe % 60).padStart(2, "0")}分`;
}

function serverMessage(raw: Partial<Message> & { deliveredAtMinute?: number; message_type?: string }): Message {
  return {
    id: String(raw.id),
    type: (raw.type || raw.message_type || "normal") as Message["type"],
    source: raw.source || "战区回报",
    subject: raw.subject || "未命名通信",
    body: raw.body || "通信正文缺失。",
    received: raw.received || (typeof raw.deliveredAtMinute === "number" ? formatClock(raw.deliveredAtMinute) : "--:--"),
    availableAtMinute: raw.availableAtMinute,
    location: raw.location,
    orderId: raw.orderId,
    orderStatus: raw.orderStatus
  };
}

function orderMessage(order: { id: string; recipientId: string; channel: string; priority?: string; text: string; sentAtMinute: number; status: Message["orderStatus"] }, recipientName: string): Message {
  const channelName = order.channel === "radio" ? "无线电报" : order.channel === "phone" ? "野战电话" : order.channel === "courier" ? "通信员" : "地下交通线";
  return {
    id: `order-${order.id}`,
    type: "sent",
    source: "本级指挥所",
    subject: `致${recipientName} · ${channelName}`,
    body: order.text,
    received: formatClock(order.sentAtMinute),
    location: order.recipientId,
    orderId: order.id,
    orderStatus: order.status
  };
}

function unitGlyph(unit: TacticalUnit) {
  if (unit.symbol === "artillery") return "●";
  if (unit.symbol === "armor") return "▱";
  if (unit.symbol === "recon") return "◇";
  if (unit.symbol === "hq") return "R";
  return "X";
}

function messageKind(message: Message) {
  if (message.type === "urgent") return "紧急";
  if (message.type === "intel") return "情报";
  if (message.type === "sent") return "已发";
  return "常规";
}

function CampaignMapPreview({ campaign }: { campaign: Campaign }) {
  const isAsia = campaign.id === "taierzhuang";
  return (
    <div className={cn("map-paper relative h-48 overflow-hidden border-b border-line/80", isAsia ? "map-china" : "map-europe")}>
      <div className="pointer-events-none absolute inset-0 war-grid opacity-50" />
      <div className="terrain-river pointer-events-none absolute inset-x-[-10%] top-[38%] h-24 rotate-[-7deg] opacity-75" />
      <div className="absolute left-[42%] top-[43%] h-12 w-24 border-2 border-[#554e3d]/60 bg-[#c5b98a]/35" />
      <div className="absolute left-[43%] top-[48%] h-px w-40 rotate-[12deg] bg-[#554e3d]/70" />
      <div className="absolute left-[36%] top-[58%] flex items-center gap-1 text-alert"><ArrowUpRight size={34} strokeWidth={1.5} /><span className="text-[9px] font-bold">推进</span></div>
      <div className="absolute right-[18%] top-[27%] flex items-center gap-1 text-blueMark"><ArrowDownRight size={30} strokeWidth={1.5} /><span className="text-[9px] font-bold">情报</span></div>
      <span className="map-label absolute left-[10%] top-[12%] text-xs text-[#304936]">{isAsia ? "峄县" : "奥斯特贝克"}</span>
      <span className="map-label absolute left-[51%] top-[45%] text-sm font-semibold text-[#263c2b]">{isAsia ? "台儿庄" : "阿纳姆桥"}</span>
      <span className="map-label absolute bottom-[13%] right-[9%] text-xs text-[#304936]">{isAsia ? "大运河" : "下莱茵河"}</span>
      <div className="absolute bottom-2 left-2 border border-[#304936]/60 bg-[#c5b98a]/65 px-2 py-1 text-[9px] text-[#304936]">{campaign.mapStyle} · 认知图层</div>
    </div>
  );
}

function CampaignArchive({ pendingCampaignId, notice, games, onEnter, onResume }: { pendingCampaignId: string | null; notice: string; games: GameSummary[]; onEnter: (campaignId: string) => void; onResume: (game: GameSummary) => void }) {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line bg-panel px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-copper/70 bg-copper/15 font-serif text-xl text-copper">二</div>
            <div><p className="text-[10px] uppercase text-muted">SHAPAN · 战役指挥所</p><p className="font-serif text-lg">战役档案</p></div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex"><span className="h-2 w-2 rounded-full bg-blueMark" />2 个可用战场</div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 md:px-8 md:pt-16">
        <div className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div>
            <p className="text-[10px] uppercase text-copper">OPERATIONS ARCHIVE / 战区选择</p>
            <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-paper md:text-5xl">选择一场战役，接管一段不完整的战场态势。</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">你将以战役指挥者身份进入真实历史节点。地图只显示已获情报，命令必须通过通信链路抵达下级部队。</p>
          </div>
          <div className="border-l border-copper/50 pl-4 text-xs leading-6 text-muted"><p className="font-mono text-copper">1944 / 1938</p><p className="mt-1">亚洲与欧洲两个战场，分别使用对应作战地图与编制。</p></div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {campaigns.map((item) => {
            const pending = pendingCampaignId === item.id;
            const existing = games.find((game) => game.campaignId === item.id && ["running", "paused"].includes(game.status));
            return (
              <article key={item.id} className="overflow-hidden border border-line bg-panel transition-colors hover:border-copper/70">
                <CampaignMapPreview campaign={item} />
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase text-muted"><span className="text-copper">{item.theater}</span><span className="flex items-center gap-1"><CalendarDays size={12} />{item.startAt}</span></div>
                  <h2 className="mt-3 font-serif text-2xl">{item.title}</h2>
                  <p className="mt-2 text-sm text-paper/80">{item.objective}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="flex items-center gap-3 text-xs text-muted"><span className="flex items-center gap-1"><MapPinned size={13} className="text-copper" />{item.mapStyle}</span><span className="flex items-center gap-1"><Clock3 size={13} className="text-copper" />限时战局</span></div>
                     <div className="flex flex-wrap items-center justify-end gap-2">
                       {existing ? <Button variant="outline" size="sm" disabled={pendingCampaignId !== null} onClick={() => onResume(existing)}>{existing.status === "running" ? "回到战局" : existing.startedAt ? "继续已有战局" : "进入待命战局"}<Play size={14} /></Button> : null}
                       <Button variant="copper" size="sm" disabled={pendingCampaignId !== null} onClick={() => onEnter(item.id)}>{pending ? "接入中…" : existing ? "新建战局" : "进入战局"}<ArrowRight size={14} /></Button>
                     </div>
                   </div>
                   {existing ? <div className="mt-3 flex items-center gap-2 border border-field/40 bg-field/10 px-3 py-2 text-[10px] text-muted"><span className={cn("h-1.5 w-1.5 rounded-full", existing.status === "running" ? "bg-blueMark" : "bg-copper")} />已有战局 · {existing.status === "running" ? "进行中" : "已暂停"} · {formatClock(existing.clockMinute)}</div> : null}
                 </div>
              </article>
            );
          })}
        </div>
        {notice ? <div className="mt-5 border border-alert/40 bg-alert/10 px-4 py-3 text-xs text-alert">{notice}</div> : null}
        <div className="mt-8 flex items-center gap-2 text-[11px] text-muted"><span className="h-2 w-2 rounded-full bg-copper" />战役实例将在进入后建立，地图状态与通信记录按用户隔离。</div>
      </section>
    </main>
  );
}

export function WarRoom() {
  const [screen, setScreen] = useState<"archive" | "war-room">("archive");
  const [campaignId, setCampaignId] = useState("taierzhuang");
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState("");
  const campaign = campaigns.find((item) => item.id === campaignId) || campaigns[0];
  const baseUnits = unitsByCampaign[campaign.id];
  const [clockMinute, setClockMinute] = useState(campaign.startMinute);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(true);
  const [battleStarted, setBattleStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameSummary["status"]>("paused");
  const [objectiveProgress, setObjectiveProgress] = useState(30);
  const [serverUnitStates, setServerUnitStates] = useState<Record<string, Partial<TacticalUnit>>>({});
  const [selectedUnitId, setSelectedUnitId] = useState("cn31");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [mapLayers, setMapLayers] = useState<MapLayers>({ units: true, intel: true, orders: true, grid: true });
  const [channel, setChannel] = useState("radio");
  const [recipient, setRecipient] = useState("cn31");
  const [priority, setPriority] = useState("normal");
  const [draft, setDraft] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [controlPending, setControlPending] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [notice, setNotice] = useState("尚未建立服务器战局");

  const units = useMemo(() => baseUnits.map((unit) => ({ ...unit, ...(serverUnitStates[unit.id] || {}) })), [baseUnits, serverUnitStates]);
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || units[0];
  const visibleMessages = messages.filter((message) => message.type === "sent" || message.availableAtMinute === undefined || clockMinute >= message.availableAtMinute);
  const filteredMessages = visibleMessages.filter((message) => messageFilter === "all" || message.type === messageFilter);
  const revealedUnitIds = new Set<string>(visibleMessages.flatMap((message) => message.type !== "sent" && message.location ? [message.location] : []));
  const arrived = visibleMessages.filter((message) => message.type !== "sent").length;
  const sentMessages = visibleMessages.filter((message) => message.type === "sent");
  const progress = Math.min(100, Math.max(0, ((clockMinute - campaign.startMinute) / (campaign.deadlineMinute - campaign.startMinute)) * 100));
  const friendlyUnits = units.filter((unit) => unit.side === "friendly");
  const currentRecipient = useMemo(() => units.find((unit) => unit.id === recipient), [recipient, units]);
  const selectedMessageBody = visibleMessages.find((message) => message.id === selectedMessage);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/games")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("无法读取已有战局")))
      .then((data) => { if (active) setGames(data.games || []); })
      .catch((error) => { if (active) setArchiveNotice(error instanceof Error ? error.message : "无法读取已有战局"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (screen !== "war-room" || !battleStarted || paused || gameId) return;
    const timer = window.setInterval(() => setClockMinute((value) => Math.min(campaign.deadlineMinute, value + speed)), 1000);
    return () => window.clearInterval(timer);
  }, [battleStarted, campaign.deadlineMinute, gameId, paused, screen, speed]);

  useEffect(() => {
    if (!gameId) return;
    const source = new EventSource(`/api/v1/games/${gameId}/events`);
    source.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (typeof data.game?.clockMinute === "number") setClockMinute(data.game.clockMinute);
      if (typeof data.game?.timeScale === "number") setSpeed(data.game.timeScale);
      const status = data.game?.status;
      setGameStatus(status || "paused");
      setBattleStarted(Boolean(data.game?.startedAt) || status === "running");
      setPaused(status !== "running");
      hydrateState(data);
    });
    source.addEventListener("world_event", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (data.type === "TIME_TICK") {
        setClockMinute(data.clockMinute);
        if (typeof data.payload?.timeScale === "number") setSpeed(data.payload.timeScale);
      }
      if (data.type === "GAME_STARTED") {
        setBattleStarted(true);
        setPaused(false);
      }
      if (data.type === "GAME_PAUSED") setPaused(true);
      if (data.type === "GAME_RESUMED") setPaused(false);
      if (data.type === "GAME_SPEED_CHANGED" && typeof data.payload?.timeScale === "number") setSpeed(data.payload.timeScale);
      if (data.type === "REPORT_RECEIVED" || data.type === "AGENT_REPORT" || data.type === "ENEMY_ACTION") {
        const message = data.payload?.message;
        if (message) setMessages((items) => [serverMessage(message), ...items.filter((item) => item.id !== message.id)]);
        if (data.payload?.unitState && message?.location) setServerUnitStates((items) => ({ ...items, [message.location]: data.payload.unitState }));
      }
      if (data.type === "ORDER_DELIVERED") updateOrderMessage(data.payload?.order);
      if (data.type === "OBJECTIVE_UPDATED") setObjectiveProgress(Number(data.payload?.progress || 0));
      if (data.type === "GAME_WON" || data.type === "GAME_LOST") { setGameStatus(data.type === "GAME_WON" ? "won" : "lost"); setPaused(true); setBattleStarted(true); }
    });
    source.onerror = () => setNotice("服务器通信暂时中断 · 正在等待重新连接");
    return () => source.close();
  }, [gameId]);

  function hydrateState(data: { game?: GameSummary; state?: { messages?: Message[]; orders?: Array<{ id: string; recipientId: string; channel: string; priority?: string; text: string; sentAtMinute: number; status: Message["orderStatus"] }>; unitStates?: Record<string, Partial<TacticalUnit>>; objectiveProgress?: number } }, sourceCampaignId = campaignId) {
    const state = data.state;
    if (!state) return;
    const restoredReports = (state.messages || []).map(serverMessage);
    const restoredOrders = (state.orders || []).map((order) => orderMessage(order, unitsByCampaign[sourceCampaignId].find((unit) => unit.id === order.recipientId)?.name || order.recipientId));
    setMessages([...restoredOrders, ...restoredReports.filter((message) => !restoredOrders.some((order) => order.id === message.id))]);
    setServerUnitStates(state.unitStates || {});
    if (typeof state.objectiveProgress === "number") setObjectiveProgress(state.objectiveProgress);
  }

  function updateOrderMessage(order?: { id?: string; status?: Message["orderStatus"]; deliveredAtMinute?: number }) {
    if (!order?.id) return;
    setMessages((items) => items.map((item) => item.orderId === order.id ? { ...item, orderStatus: order.status, ...(typeof order.deliveredAtMinute === "number" ? { received: formatClock(order.deliveredAtMinute) } : {}) } : item));
  }

  function resetBattleView(nextCampaignId: string) {
    const next = campaigns.find((item) => item.id === nextCampaignId) || campaigns[0];
    const defaultUnit = next.id === "taierzhuang" ? "cn31" : "uk2para";
    setCampaignId(next.id);
    setClockMinute(next.startMinute);
    setSpeed(1);
    setMessages([]);
    setServerUnitStates({});
    setObjectiveProgress(30);
    setSelectedUnitId(defaultUnit);
    setRecipient(defaultUnit);
    setSelectedMessage(null);
    setMessageFilter("all");
    setBattleStarted(false);
    setPaused(true);
    setGameStatus("paused");
  }

  async function enterCampaign(nextCampaignId: string) {
    const nextCampaign = campaigns.find((item) => item.id === nextCampaignId);
    if (!nextCampaign) return;
    setPendingCampaignId(nextCampaignId);
    setArchiveNotice("");
    try {
      const response = await fetch("/api/v1/games", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaignId: nextCampaign.id }) });
      if (!response.ok) throw new Error("无法建立服务器战局，请稍后重试");
      const data = await response.json();
      resetBattleView(nextCampaign.id);
      setGameId(data.game.id);
      setClockMinute(data.game.clockMinute);
      setSpeed(data.game.timeScale ?? 1);
      setNotice("战前待命 · 作战时钟尚未启动");
      setScreen("war-room");
    } catch (error) {
      setArchiveNotice(error instanceof Error ? error.message : "无法建立服务器战局");
    } finally {
      setPendingCampaignId(null);
    }
  }

  async function resumeGame(existing: GameSummary) {
    const nextCampaign = campaigns.find((item) => item.id === existing.campaignId);
    if (!nextCampaign) return;
    setPendingCampaignId(existing.campaignId);
    setArchiveNotice("");
    try {
      const response = await fetch(`/api/v1/games/${existing.id}/state`);
      if (!response.ok) throw new Error("无法恢复已有战局");
      const data = await response.json();
      resetBattleView(nextCampaign.id);
      setGameId(existing.id);
      setClockMinute(data.game.clockMinute);
      setSpeed(data.game.timeScale ?? 1);
      setGameStatus(data.game.status);
      setBattleStarted(Boolean(data.game.startedAt) || data.game.status === "running");
      setPaused(data.game.status !== "running");
      hydrateState(data, nextCampaign.id);
      setNotice(data.game.status === "running" ? "已恢复进行中的战局" : data.game.startedAt ? "已恢复暂停战局 · 可继续阅读情报并下达军令" : "已恢复战前待命战局");
      setScreen("war-room");
    } catch (error) {
      setArchiveNotice(error instanceof Error ? error.message : "无法恢复已有战局");
    } finally {
      setPendingCampaignId(null);
    }
  }

  function returnToArchive() {
    setPaused(true);
    setBattleStarted(false);
    setGameId(null);
    setScreen("archive");
    fetch("/api/v1/games").then((response) => response.ok ? response.json() : null).then((data) => { if (data) setGames(data.games || []); }).catch(() => {});
  }

  async function startBattle() {
    if (!gameId || battleStarted || gameStatus !== "paused") return;
    setNotice("正在向战区下达开战令…");
    try {
      const response = await fetch(`/api/v1/games/${gameId}/start`, { method: "POST" });
      if (!response.ok) throw new Error("开战令未能送达服务器");
      const data = await response.json();
      setClockMinute(data.game.clockMinute);
      setSpeed(data.game.timeScale ?? 1);
      setGameStatus(data.game.status);
      setBattleStarted(true);
      setPaused(false);
      setNotice("战役已经开始 · 等待各部队回传情报");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "开战令未能送达服务器");
    }
  }

  async function controlBattle(action: "pause" | "resume" | "set_speed", nextSpeed?: number) {
    if (!gameId || !battleStarted || controlPending || ["won", "lost", "finished"].includes(gameStatus)) return;
    setControlPending(true);
    try {
      const response = await fetch(`/api/v1/games/${gameId}/control`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...(nextSpeed ? { speed: nextSpeed } : {}) })
      });
      if (!response.ok) throw new Error(action === "set_speed" ? "倍速设置未能送达服务器" : "战役时钟控制失败");
      const data = await response.json();
      setGameStatus(data.game.status);
      setPaused(data.game.status !== "running");
      setSpeed(data.game.timeScale ?? speed);
      setNotice(action === "pause" ? "战役已暂停 · 可继续阅读情报并下达军令" : action === "resume" ? "战役继续推进" : `战役速度已调整为 ${data.game.timeScale}×`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "战役时钟控制失败");
    } finally {
      setControlPending(false);
    }
  }

  function selectUnit(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = units.find((item) => item.id === unitId);
    if (unit?.side === "friendly") setRecipient(unitId);
  }

  async function sendOrder() {
    if (!battleStarted || sendingOrder || draft.trim().length < 2 || !currentRecipient) return;
    setSendingOrder(true);
    try {
      let orderPayload: { order?: { id: string; recipientId: string; channel: string; priority?: string; text: string; sentAtMinute: number; status: Message["orderStatus"] } } | null = null;
      if (gameId) {
        const response = await fetch(`/api/v1/games/${gameId}/orders`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recipientId: recipient, channel, priority, text: draft.trim(), clientCommandId: `cmd-${Date.now()}` })
        });
        if (!response.ok) throw new Error("命令未能送入服务器");
        orderPayload = await response.json();
      }
      const message = orderPayload?.order ? orderMessage(orderPayload.order, currentRecipient.name) : serverMessage({ id: `sent-${Date.now()}`, type: "sent", source: "本级指挥所", subject: `致${currentRecipient.name}`, body: draft.trim(), received: formatClock(clockMinute), location: recipient, orderStatus: "queued" });
      setMessages((items) => [message, ...items.filter((item) => item.orderId !== message.orderId)]);
      setDraft("");
      setNotice(orderPayload?.order?.status === "delivered" ? "命令已送达 · 等待部队回报" : "命令已进入通信队列");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "命令未能送入服务器");
    } finally {
      setSendingOrder(false);
    }
  }

  if (screen === "archive") return <CampaignArchive pendingCampaignId={pendingCampaignId} notice={archiveNotice} games={games} onEnter={enterCampaign} onResume={resumeGame} />;

  return (
    <main className="war-console min-h-screen bg-ink text-paper lg:h-screen lg:overflow-hidden">
      <header className="war-console-header grid min-h-[74px] border-b border-line bg-panel lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <div className="flex min-w-0 items-center gap-3 border-b border-line px-4 py-2 lg:border-b-0 lg:border-r">
          <button type="button" onClick={returnToArchive} className="campaign-shield flex h-11 w-11 shrink-0 items-center justify-center border border-field/70 bg-field/25 font-serif text-xl font-bold text-paper" title="返回战役档案">{campaign.identity}</button>
          <div className="min-w-0 flex-1"><p className="truncate text-[9px] text-muted">{campaign.command}</p><h1 className="truncate font-serif text-xl font-bold">{campaign.title}</h1></div>
          <button type="button" onClick={returnToArchive} className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-muted hover:border-copper hover:text-paper" title="返回战役档案"><ArrowLeft size={15} /></button>
        </div>

        <div className="flex min-w-0 items-center gap-5 border-b border-line px-5 py-2 lg:border-b-0 lg:border-r">
          <div className="min-w-0 flex-1"><p className="text-[9px] text-muted">主要目标 · {gameStatus === "won" ? "已达成" : gameStatus === "lost" ? "已失守" : `进度 ${objectiveProgress}%`}</p><p className="truncate text-sm font-bold text-paper">{campaign.objective}</p></div>
          <div className="hidden w-48 shrink-0 xl:block"><p className="mb-2 text-right text-[10px] text-copper">剩余 {formatRemaining(campaign.deadlineMinute - clockMinute)}</p><div className="h-[3px] bg-line"><div className="h-full bg-copper" style={{ width: `${Math.max(4, 100 - progress)}%` }} /></div></div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="text-right"><p className="text-[9px] text-muted">{campaign.startAt}</p><p className="font-mono text-3xl font-bold leading-none">{formatClock(clockMinute)}</p></div>
          <div className="flex h-8 border border-line">
            <button type="button" disabled={!battleStarted || controlPending || ["won", "lost", "finished"].includes(gameStatus)} onClick={() => controlBattle(paused ? "resume" : "pause")} className="flex w-8 items-center justify-center border-r border-line text-muted hover:text-paper disabled:opacity-40" title={!battleStarted ? "战前暂停" : paused ? "继续战役" : "暂停战役"}>{paused && battleStarted ? <Play size={14} /> : <Pause size={14} />}</button>
            {[1, 2, 4].map((item) => <button key={item} type="button" disabled={!battleStarted || controlPending || ["won", "lost", "finished"].includes(gameStatus)} onClick={() => controlBattle("set_speed", item)} className={cn("w-9 border-r border-line text-xs last:border-r-0 disabled:opacity-40", speed === item ? "bg-field/35 text-paper" : "text-muted hover:text-paper")}>{item}×</button>)}
          </div>
        </div>
      </header>

      <div className="war-console-body grid bg-line lg:h-[calc(100vh-74px)] lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:gap-px">
        <aside className="order-2 flex min-h-[620px] min-w-0 flex-col bg-panel lg:order-1 lg:min-h-0">
          <div className="flex h-[66px] shrink-0 items-center justify-between border-b border-line px-4"><div><p className="text-[9px] text-muted">SIGNALS / 通信</p><h2 className="mt-1 font-serif text-lg font-bold">收件台</h2></div><span className="border border-copper/45 bg-copper/10 px-2 py-1 text-[10px] text-paper">{arrived} 已达</span></div>
          <div className="grid h-10 shrink-0 grid-cols-4 border-b border-line p-1.5">
            {messageFilters.map((filter) => <button key={filter.id} type="button" onClick={() => setMessageFilter(filter.id)} className={cn("border-r border-line text-[11px] last:border-r-0", messageFilter === filter.id ? "bg-field/30 text-paper" : "text-muted hover:text-paper")}>{filter.label}</button>)}
          </div>
          <div className="command-scroll min-h-[220px] flex-1 divide-y divide-line/70 overflow-y-auto">
            {filteredMessages.length ? filteredMessages.map((message) => (
              <button key={message.id} type="button" onClick={() => { setSelectedMessage(message.id); if (message.location) selectUnit(message.location); }} className={cn("block w-full border-l-[3px] px-3 py-3 text-left transition hover:bg-white/[.035]", message.type === "urgent" ? "border-alert" : message.type === "intel" ? "border-copper" : message.type === "sent" ? "border-blueMark" : "border-transparent", selectedMessage === message.id && "bg-white/[.045]")}>
                <div className="flex items-center justify-between gap-2"><span className={cn("text-[9px]", message.type === "urgent" ? "text-alert" : message.type === "intel" ? "text-copper" : message.type === "sent" ? "text-blueMark" : "text-muted")}>{message.source} · {messageKind(message)}</span><time className="font-mono text-[9px] text-muted">{message.received}</time></div>
                <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-paper">{message.subject}</p>
              </button>
            )) : <div className="flex h-full min-h-44 items-center justify-center px-6 text-center text-xs leading-6 text-muted">{battleStarted ? "当前筛选下没有已抵达的通信。" : "战役尚未开始，收件台保持静默。"}</div>}
          </div>
          <div className="h-[174px] shrink-0 border-t border-line p-4">
            {selectedMessageBody ? <><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-copper">通信原文</span><time className="font-mono text-[10px] text-muted">{selectedMessageBody.received}</time></div><p className="mt-2 text-xs font-bold">{selectedMessageBody.subject}</p><p className="mt-2 line-clamp-4 text-xs leading-5 text-muted">{selectedMessageBody.body}</p></> : <div className="flex h-full flex-col items-center justify-center text-muted"><Inbox size={17} /><p className="mt-3 text-xs">请选择一份通信记录</p></div>}
          </div>
        </aside>

        <section className="order-1 flex min-h-[650px] min-w-0 flex-col bg-[#2a332b] lg:order-2 lg:min-h-0">
          <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-4">
            <div className="min-w-0"><p className="truncate text-[9px] text-muted">{campaign.mapSubtitle}</p><h2 className="truncate font-serif text-lg font-bold">{campaign.mapTitle}</h2></div>
            <div className="flex shrink-0 items-center border border-line bg-ink/35">
              <span className="hidden h-7 items-center border-r border-line px-2 text-muted sm:flex"><Layers3 size={13} /></span>
              {layerLabels.map((layer) => <button key={layer.id} type="button" onClick={() => setMapLayers((value) => ({ ...value, [layer.id]: !value[layer.id] }))} className={cn("h-7 border-r border-line px-2.5 text-[10px] last:border-r-0", mapLayers[layer.id] ? "bg-field/35 text-paper" : "text-muted hover:text-paper")}>{layer.label}</button>)}
            </div>
          </div>
          <TacticalMap
            campaignId={campaign.id}
            battleStarted={battleStarted}
            paused={paused}
            canStart={Boolean(gameId)}
            layers={mapLayers}
            units={units}
            revealedUnitIds={revealedUnitIds}
            selectedUnit={selectedUnit}
            visibleReportCount={arrived}
            onSelectUnit={selectUnit}
            onSetRecipient={selectUnit}
            onStartBattle={startBattle}
          />
          {["won", "lost"].includes(gameStatus) ? <div className="border-t border-copper/60 bg-panel px-4 py-3 text-center"><p className="text-[10px] text-copper">OPERATIONS RESULT / 战役结算</p><p className="mt-1 font-serif text-lg font-bold">{gameStatus === "won" ? "战役目标已达成" : "战役目标未能达成"}</p><p className="mt-1 text-xs text-muted">服务器已停止时钟推进，可以返回档案查看战局。</p></div> : null}
          <div className="grid min-h-[40px] shrink-0 grid-cols-2 gap-y-1 border-t border-line bg-panel px-4 py-2 text-[10px] text-muted sm:flex sm:items-center sm:justify-between">
            <span className="flex items-center gap-1"><CloudSun size={12} />天气 <b className="text-paper">{campaign.weather} · 能见度 {campaign.visibility}</b></span>
            <span className="flex items-center gap-1"><Sunset size={12} />日落 <b className="text-paper">{campaign.sunset}</b></span>
            <span className="col-span-2 flex items-center gap-1 sm:col-span-1"><Wifi size={12} />通信态势 <b className="text-copper">{campaign.communications}</b></span>
            <span className="hidden items-center gap-2 font-bold text-paper xl:flex"><i className="block h-2 w-14 border-x border-b border-paper/70" />2 KM</span>
          </div>
        </section>

        <aside className="command-scroll order-3 flex min-h-[760px] min-w-0 flex-col bg-panel lg:min-h-0 lg:overflow-y-auto">
          <div className="shrink-0 border-b border-line">
            <div className="flex h-[54px] items-center justify-between px-4"><div><p className="text-[9px] text-muted">COMMAND / 指挥</p><h2 className="mt-0.5 font-serif text-lg font-bold">部队态势</h2></div><span className="border border-field/70 bg-field/15 px-2 py-1 text-[10px] text-paper">{friendlyUnits.filter((unit) => revealedUnitIds.has(unit.id)).length} / {friendlyUnits.length} 已获报告</span></div>
            <div className="divide-y divide-line/60 border-t border-line/70 px-3">
              {friendlyUnits.map((unit) => {
                const known = revealedUnitIds.has(unit.id);
                return <button key={unit.id} type="button" onClick={() => selectUnit(unit.id)} className={cn("flex h-[38px] w-full items-center gap-2 text-left", selectedUnitId === unit.id && "bg-white/[.035]")}><span className={cn("flex h-5 w-7 shrink-0 items-center justify-center border text-[9px] font-bold", campaign.id === "taierzhuang" ? "border-alert text-alert" : "border-blueMark text-blueMark")}>{unitGlyph(unit)}</span><span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{unit.name}<small className="ml-1 font-normal text-muted">{known ? unit.detail.split("·")[0] : "等待报告"}</small></span><i className={cn("h-1.5 w-1.5 rounded-full", known ? unit.status.includes("断") || unit.status.includes("失联") ? "bg-copper" : "bg-[#74a879]" : "bg-line")} /><span className="w-[48px] text-right text-[9px] text-muted">{known ? unit.status : "未联络"}</span></button>;
              })}
            </div>
          </div>

          <div className="flex min-h-[405px] shrink-0 flex-col border-b border-line px-4 py-3">
            <div className="mb-2 flex items-center justify-between"><div><p className="text-[9px] text-muted">OUTGOING / 发报</p><h3 className="mt-0.5 font-serif text-base font-bold">新军令</h3></div><Radio size={16} className="text-copper" /></div>
            <label className="mb-1 text-[10px] text-muted" htmlFor="recipient">收报单位</label>
            <select id="recipient" disabled={!battleStarted} value={recipient} onChange={(event) => selectUnit(event.target.value)} className="mb-2 h-9 border border-line bg-ink px-2 text-xs text-paper outline-none focus:border-copper disabled:opacity-45">{friendlyUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
            <p className="mb-1 text-[10px] text-muted">通信方式</p>
            <div className="mb-2 grid grid-cols-3 border border-line">
              {[
                { id: "radio", label: "无线电报", delay: "约 8 分钟" },
                { id: "phone", label: "野战电话", delay: "约 5 分钟" },
                { id: "courier", label: "通信员", delay: "约 25 分钟" }
              ].map((item) => <button key={item.id} type="button" disabled={!battleStarted} onClick={() => setChannel(item.id)} className={cn("h-11 border-r border-line text-[10px] last:border-r-0 disabled:opacity-40", channel === item.id ? "bg-field/30 text-paper" : "text-muted hover:text-paper")}><b className="block text-[11px]">{item.label}</b><span>{item.delay}</span></button>)}
            </div>
            <label className="mb-1 text-[10px] text-muted" htmlFor="order-text">命令正文</label>
            <textarea id="order-text" maxLength={420} disabled={!battleStarted} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={battleStarted ? `致${currentRecipient?.name ?? "下级部队"}：写明任务、意图、时限与限制……` : "开始战役后才能发布军令"} className="min-h-[116px] flex-1 resize-none border border-line bg-ink p-3 text-xs leading-5 text-paper outline-none placeholder:text-muted/55 focus:border-copper disabled:opacity-50" />
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted"><span>{draft.length} / 420</span><span>预计 {formatClock(clockMinute + (channel === "radio" ? 8 : channel === "phone" ? 5 : 25))} 送达</span></div>
            <div className="mt-2 flex items-center gap-2"><label className="text-[10px] text-muted" htmlFor="priority">优先级</label><select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="h-8 border border-line bg-ink px-2 text-[10px] text-paper"><option value="normal">常规</option><option value="urgent">紧急</option></select><span className="ml-auto flex items-center gap-1 text-[9px] text-copper"><i className="h-1.5 w-1.5 rounded-full bg-copper" />截获风险：{channel === "radio" ? "中高" : channel === "phone" ? "低" : "中等"}</span></div>
            <Button className="mt-2 w-full rounded-none" variant="copper" disabled={!battleStarted || sendingOrder || ["won", "lost", "finished"].includes(gameStatus) || draft.trim().length < 2} onClick={sendOrder}><Send size={14} />{sendingOrder ? "正在编码…" : "编码并发送"}</Button>
          </div>

          <div className="h-[132px] shrink-0 overflow-hidden">
            <div className="flex h-9 items-center justify-between border-b border-line px-4"><span className="text-[10px] font-bold">传输队列</span><span className="text-[9px] text-muted">{sentMessages.length} 项</span></div>
            {sentMessages.length ? <div className="command-scroll max-h-[93px] divide-y divide-line/60 overflow-y-auto">{sentMessages.slice(0, 4).map((message) => <div key={message.id} className="flex items-center gap-2 px-4 py-2"><TimerReset size={12} className="shrink-0 text-copper" /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{message.subject}</p><p className="mt-0.5 text-[9px] text-muted">{message.received} · {message.orderStatus === "delivered" ? "已送达 · 等待回报" : message.orderStatus === "failed" ? "传输失败" : message.subject.includes("通信员") ? "通信员在途" : "等待送达"}</p></div><span className="text-[9px] text-copper">{message.orderStatus === "delivered" ? "已达" : "发送"}</span></div>)}</div> : <div className="flex h-[92px] items-center justify-center text-[10px] text-muted">尚无正在传输的命令</div>}
          </div>
          <div className="signal-rule shrink-0 border-t border-line px-4 py-2 text-[9px] text-muted">{notice}</div>
        </aside>
      </div>
    </main>
  );
}
