"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Clock3, Inbox, MapPinned, Play, Radio, Send, TimerReset, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type Campaign = { id: string; title: string; theater: string; mapStyle: string; objective: string; startAt: string; startMinute: number; deadlineMinute: number };
type Message = { id: string; type: "urgent" | "intel" | "normal" | "sent"; source: string; subject: string; body: string; received: string; availableAtMinute?: number; location?: string };
type Unit = { id: string; name: string; side: "friendly" | "enemy"; x: number; y: number; detail: string; status: string; summary: string };

const campaigns: Campaign[] = [
  { id: "taierzhuang", title: "台儿庄战役", theater: "亚洲战场", mapStyle: "china-roca-1938", objective: "坚守台儿庄核心阵地", startAt: "1938年3月31日", startMinute: 1080, deadlineMinute: 1800 },
  { id: "arnhem", title: "阿纳姆战役", theater: "欧洲战场", mapStyle: "europe-west-allied-1944", objective: "夺取并保持阿纳姆公路桥", startAt: "1944年9月17日", startMinute: 900, deadlineMinute: 1800 }
];

const unitsByCampaign: Record<string, Unit[]> = {
  taierzhuang: [
    { id: "cn31", name: "第31师", side: "friendly", x: 56, y: 54, detail: "台儿庄城内 · 17:42", status: "联络正常", summary: "城内东、南两侧仍在交火，预备连已接近东门。" },
    { id: "cn30", name: "第30师", side: "friendly", x: 38, y: 72, detail: "城南运河 · 17:35", status: "正在增援", summary: "先头营沿运河南岸推进，堤桥限制车辆展开。" },
    { id: "cn27", name: "第27师", side: "friendly", x: 24, y: 31, detail: "西北外围 · 17:18", status: "报告延迟", summary: "牵制西北敌军，前沿烟火暂不能确认。" },
    { id: "jpseya", name: "濑谷支队？", side: "enemy", x: 71, y: 36, detail: "城东街区 · 17:22", status: "较高可信", summary: "东侧街区出现步兵和掷弹筒火力，番号尚未确认。" },
    { id: "jparmor", name: "日军战车？", side: "enemy", x: 82, y: 71, detail: "运河北岸 · 16:50", status: "未证实", summary: "道路发现履带痕迹，数量和方向不明。" }
  ],
  arnhem: [
    { id: "uk1para", name: "第1伞兵旅", side: "friendly", x: 34, y: 53, detail: "奥斯特贝克东侧 · 14:38", status: "联络断续", summary: "旅部沿主路向阿纳姆推进，无线电无法稳定回传。" },
    { id: "uk2para", name: "第2伞兵营", side: "friendly", x: 59, y: 43, detail: "公路桥西侧 · 14:47", status: "目标接触", summary: "先头连进入桥西建筑区，桥东有零星射击。" },
    { id: "ukairland", name: "第1机降旅", side: "friendly", x: 22, y: 72, detail: "DZ X · 14:31", status: "正在集结", summary: "第一波完成集结，反坦克武器仍在寻找。" },
    { id: "deinf", name: "德军步兵集结", side: "enemy", x: 72, y: 31, detail: "城西道路 · 13:54", status: "中等可信", summary: "步兵和卡车向桥区移动，规模估计不定。" },
    { id: "de9ss", name: "德军装甲部队？", side: "enemy", x: 82, y: 71, detail: "阿纳姆周边 · 13:25", status: "较高可信", summary: "履带车辆可能恢复战斗，尚未确认型号。" }
  ]
};

const initialMessages: Record<string, Message[]> = {
  taierzhuang: [
    { id: "tz-1", type: "urgent", source: "第31师师部", subject: "东门火力增强，请示是否投入预备连", body: "东门外敌火力在十分钟内明显增强，预备连已经抵达师部附近，是否立即投入东门？", received: "17:42", availableAtMinute: 1086, location: "cn31" },
    { id: "tz-2", type: "intel", source: "第五战区情报处", subject: "台枣支线东北方向有连续炮声", body: "地方情报转报：暂不能判断为日军炮兵还是运输队。航空观察尚未印证。", received: "17:30", availableAtMinute: 1094, location: "jparmor" },
    { id: "tz-3", type: "normal", source: "第30师", subject: "南岸先头营开始渡过堤桥", body: "桥面狭窄，车辆必须分批通过。预计18时15分可向城南发起支援行动。", received: "17:39", availableAtMinute: 1106, location: "cn30" }
  ],
  arnhem: [
    { id: "ar-1", type: "urgent", source: "第2伞兵营", subject: "桥西建筑区遭射击", body: "先头连进入桥西建筑区后遭轻武器射击，桥梁北端仍在视线之外。", received: "14:52", availableAtMinute: 906, location: "uk2para" },
    { id: "ar-2", type: "intel", source: "师部情报官", subject: "阿纳姆附近装甲部队情报未决", body: "战前航空照片显示周边存在履带车辆，但没有可靠消息证明其已恢复战斗。", received: "14:45", availableAtMinute: 914, location: "de9ss" },
    { id: "ar-3", type: "normal", source: "第1机降旅", subject: "DZ X 集结完成约七成", body: "部分反坦克武器和无线电设备尚未找到，可按原计划向奥斯特贝克东侧推进。", received: "14:39", availableAtMinute: 928, location: "ukairland" }
  ]
};

function formatClock(campaign: Campaign, minute: number) {
  const start = new Date(campaign.startAt.replace(/年|月/g, "-").replace("日", "T00:00:00"));
  if (Number.isNaN(start.getTime())) return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const date = new Date(start.getTime() + (minute - campaign.startMinute) * 60_000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
      <span className="map-label absolute bottom-[13%] right-[9%] text-xs text-[#304936]">{isAsia ? "运河" : "下莱茵河"}</span>
      <div className="absolute bottom-2 left-2 rounded-sm border border-[#304936]/60 bg-[#c5b98a]/65 px-2 py-1 text-[9px] text-[#304936]">{campaign.mapStyle} · 认知图层</div>
    </div>
  );
}

function CampaignArchive({ pendingCampaignId, notice, onEnter }: { pendingCampaignId: string | null; notice: string; onEnter: (campaignId: string) => void }) {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line bg-panel px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-copper/70 bg-copper/15 font-serif text-xl text-copper">二</div>
            <div><p className="text-[10px] uppercase tracking-[.22em] text-muted">SHAPAN · 战役指挥所</p><p className="font-serif text-lg tracking-wide">战役档案</p></div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex"><span className="h-2 w-2 rounded-full bg-blueMark" />2 个可用战场</div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 md:px-8 md:pt-16">
        <div className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[.3em] text-copper">OPERATIONS ARCHIVE / 战区选择</p>
            <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-wide text-paper md:text-5xl">选择一场战役，接管一段不完整的战场态势。</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">你将以战役指挥者身份进入真实历史节点。地图只显示已获情报，命令必须通过通信链路抵达下级部队。</p>
          </div>
          <div className="border-l border-copper/50 pl-4 text-xs leading-6 text-muted">
            <p className="font-mono text-copper">1944 / 1938</p>
            <p className="mt-1">亚洲与欧洲两个战场，分别使用对应作战地图与编制。</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {campaigns.map((item) => {
            const pending = pendingCampaignId === item.id;
            return (
              <article key={item.id} className="overflow-hidden border border-line bg-panel transition-colors hover:border-copper/70">
                <CampaignMapPreview campaign={item} />
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[.18em] text-muted">
                    <span className="text-copper">{item.theater}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={12} />{item.startAt}</span>
                  </div>
                  <h2 className="mt-3 font-serif text-2xl tracking-wide">{item.title}</h2>
                  <p className="mt-2 text-sm text-paper/80">{item.objective}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="flex items-center gap-3 text-xs text-muted"><span className="flex items-center gap-1"><MapPinned size={13} className="text-copper" />{item.mapStyle}</span><span className="flex items-center gap-1"><Clock3 size={13} className="text-copper" />限时战局</span></div>
                    <Button variant="copper" size="sm" disabled={pendingCampaignId !== null} onClick={() => onEnter(item.id)}>{pending ? "接入中…" : "进入战局"}<ArrowRight size={14} /></Button>
                  </div>
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
  const [clockMinute, setClockMinute] = useState(campaign.startMinute);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(true);
  const [battleStarted, setBattleStarted] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("cn31");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages.taierzhuang);
  const [channel, setChannel] = useState("radio");
  const [recipient, setRecipient] = useState("cn31");
  const [draft, setDraft] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [notice, setNotice] = useState("本地演示状态 · 尚未建立服务器战局");
  const units = unitsByCampaign[campaign.id];
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || units[0];
  const visibleMessages = messages.filter((message) => message.type === "sent" || message.availableAtMinute === undefined || clockMinute >= message.availableAtMinute);
  const revealedUnitIds = new Set(visibleMessages.map((message) => message.location).filter(Boolean));
  const unread = visibleMessages.filter((message) => message.type !== "sent").length;
  const progress = Math.min(100, Math.max(0, ((clockMinute - campaign.startMinute) / (campaign.deadlineMinute - campaign.startMinute)) * 100));

  useEffect(() => {
    const next = campaigns.find((item) => item.id === campaignId) || campaigns[0];
    setClockMinute(next.startMinute);
    setMessages(initialMessages[next.id]);
    setSelectedUnitId(next.id === "taierzhuang" ? "cn31" : "uk2para");
    setSelectedMessage(null);
    setBattleStarted(false);
    setPaused(true);
  }, [campaignId]);

  useEffect(() => {
    if (screen !== "war-room" || !battleStarted || paused) return;
    const timer = window.setInterval(() => setClockMinute((value) => Math.min(campaign.deadlineMinute, value + speed)), 1000);
    return () => window.clearInterval(timer);
  }, [battleStarted, campaign.deadlineMinute, paused, screen, speed]);

  useEffect(() => {
    if (!gameId) return;
    const source = new EventSource(`/api/v1/games/${gameId}/events`);
    source.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (typeof data.game?.clockMinute === "number") setClockMinute(data.game.clockMinute);
      const running = data.game?.status === "running";
      setBattleStarted(running);
      setPaused(!running);
    });
    source.addEventListener("world_event", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (data.type === "TIME_TICK") setClockMinute(data.clockMinute);
      if (data.type === "GAME_STARTED") {
        setBattleStarted(true);
        setPaused(false);
      }
    });
    source.onerror = () => setNotice("服务器通信暂时中断 · 请检查战役连接");
    return () => source.close();
  }, [gameId]);

  const mapStyle = campaign.id === "taierzhuang" ? "map-china" : "map-europe";
  const currentRecipient = useMemo(() => units.find((unit) => unit.id === recipient), [recipient, units]);

  async function enterCampaign(nextCampaignId: string) {
    const nextCampaign = campaigns.find((item) => item.id === nextCampaignId);
    if (!nextCampaign) return;
    setPendingCampaignId(nextCampaignId);
    setArchiveNotice("");
    try {
      const response = await fetch("/api/v1/games", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaignId: nextCampaign.id }) });
      if (!response.ok) throw new Error("无法建立服务器战局，请稍后重试");
      const data = await response.json();
      setCampaignId(nextCampaign.id);
      setGameId(data.game.id);
      setClockMinute(data.game.clockMinute);
      setMessages(initialMessages[nextCampaign.id]);
      setSelectedUnitId(nextCampaign.id === "taierzhuang" ? "cn31" : "uk2para");
      setSelectedMessage(null);
      setBattleStarted(false);
      setPaused(true);
      setNotice("战前待命 · 点击“开始战役”后接收第一批情报");
      setScreen("war-room");
    } catch (error) { setArchiveNotice(error instanceof Error ? error.message : "无法建立服务器战局"); }
    finally { setPendingCampaignId(null); }
  }

  function returnToArchive() {
    setPaused(true);
    setBattleStarted(false);
    setScreen("archive");
  }

  async function startBattle() {
    if (!gameId || battleStarted) return;
    setNotice("正在向战区下达开战令…");
    try {
      const response = await fetch(`/api/v1/games/${gameId}/start`, { method: "POST" });
      if (!response.ok) throw new Error("开战令未能送达服务器");
      const data = await response.json();
      setClockMinute(data.game.clockMinute);
      setBattleStarted(true);
      setPaused(false);
      setNotice("战役已开始 · 等待各部队回传情报");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "开战令未能送达服务器");
    }
  }

  async function sendOrder() {
    if (!battleStarted || draft.trim().length < 2 || !currentRecipient) return;
    const message: Message = { id: `sent-${Date.now()}`, type: "sent", source: "本级指挥所", subject: `致${currentRecipient.name} · ${channel === "radio" ? "无线电报" : channel === "phone" ? "野战电话" : "通信员"}`, body: draft.trim(), received: formatClock(campaign, clockMinute), location: recipient };
    setMessages((items) => [message, ...items]);
    setDraft("");
    if (gameId) {
      const response = await fetch(`/api/v1/games/${gameId}/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipientId: recipient, channel, text: message.body, clientCommandId: message.id }) });
      setNotice(response.ok ? "命令已进入通信队列" : "命令未能送入服务器");
    } else setNotice("命令已进入本地传输队列 · 建立服务器战局后可持久化");
  }

  if (screen === "archive") return <CampaignArchive pendingCampaignId={pendingCampaignId} notice={archiveNotice} onEnter={enterCampaign} />;

  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line bg-panel px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-copper/70 bg-copper/15 font-serif text-xl text-copper">二</div>
            <div><p className="text-[10px] uppercase tracking-[.22em] text-muted">SHAPAN · 战役指挥所</p><h1 className="font-serif text-xl tracking-wide">{campaign.title}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={returnToArchive}><ArrowLeft size={14} />战役档案</Button>
            <span className="hidden border-l border-line pl-3 text-xs text-muted sm:inline">{campaign.theater}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-px bg-line lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="order-2 flex min-h-[560px] flex-col bg-panel lg:order-1">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-[10px] tracking-[.2em] text-muted">SIGNALS / 通信</p><h2 className="mt-1 font-serif text-lg">收件台</h2></div><span className="rounded-sm bg-alert/15 px-2 py-1 text-xs text-alert">{unread} 未读</span></div>
          <div className="flex gap-1 border-b border-line p-2">{["全部", "紧急", "情报", "已发"].map((filter) => <button key={filter} className="flex-1 rounded px-1 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-paper">{filter}</button>)}</div>
          <div className="divide-y divide-line/70 overflow-auto">
            {visibleMessages.length ? visibleMessages.map((message) => <button key={message.id} onClick={() => { setSelectedMessage(message.id); if (message.location) setSelectedUnitId(message.location); }} className={cn("block w-full px-4 py-3 text-left transition hover:bg-white/5", selectedMessage === message.id && "bg-white/5") }><div className="flex items-center justify-between gap-2"><span className={cn("text-[10px] uppercase tracking-wider", message.type === "urgent" ? "text-alert" : message.type === "intel" ? "text-copper" : message.type === "sent" ? "text-blueMark" : "text-muted")}>{message.type === "urgent" ? "紧急" : message.type === "intel" ? "情报" : message.type === "sent" ? "已发" : "常规"}</span><time className="text-[10px] text-muted">{message.received}</time></div><p className="mt-1 line-clamp-2 text-sm text-paper">{message.subject}</p><p className="mt-1 text-xs text-muted">{message.source}</p></button>) : <div className="px-4 py-8 text-center text-xs leading-6 text-muted">{battleStarted ? "暂无已抵达情报，继续等待各部回报。" : "战役尚未开始，收件台保持静默。"}</div>}
          </div>
          <div className="mt-auto border-t border-line p-4 text-xs text-muted"><Inbox size={14} className="mb-2 text-copper" />{selectedMessage ? visibleMessages.find((message) => message.id === selectedMessage)?.body : "请选择通信记录查看全文。"}</div>
        </aside>

        <section className="order-1 min-h-[560px] bg-[#2a332b] lg:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3"><div><p className="text-[10px] tracking-[.2em] text-muted">{campaign.mapStyle} · 作战用图</p><h2 className="mt-1 font-serif text-lg">{campaign.objective}</h2></div><div className="flex items-center gap-2 text-xs text-muted"><MapPinned size={15} className="text-copper" />认知态势 · 非实时全局</div></div>
          <div className={cn("relative min-h-[470px] overflow-hidden p-4 md:p-8", "map-paper", mapStyle)}>
            <div className="pointer-events-none absolute inset-0 war-grid opacity-60" />
            <div className="terrain-river pointer-events-none absolute inset-x-[-10%] top-[42%] h-28 rotate-[-7deg] opacity-80" />
            <div className="absolute left-[16%] top-[16%] h-28 w-44 border-b-2 border-l-2 border-dashed border-[#4c654d]/70" />
            <div className="absolute bottom-[18%] right-[11%] h-24 w-52 rounded-[50%] border-2 border-[#4c654d]/60" />
            <span className="map-label absolute left-[11%] top-[10%] text-sm text-[#304936]">{campaign.id === "taierzhuang" ? "峄县" : "奥斯特贝克"}</span>
            <span className="map-label absolute left-[53%] top-[47%] text-base font-semibold text-[#263c2b]">{campaign.id === "taierzhuang" ? "台儿庄" : "阿纳姆公路桥"}</span>
            <span className="map-label absolute right-[10%] bottom-[16%] text-sm text-[#304936]">{campaign.id === "taierzhuang" ? "运河" : "下莱茵河"}</span>
            <div className="absolute left-[42%] top-[43%] h-16 w-28 border-2 border-[#554e3d]/60 bg-[#c5b98a]/35" />
            <div className="absolute left-[46%] top-[48%] h-px w-52 rotate-[12deg] bg-[#554e3d]/75" />
            <div className="absolute left-[42%] top-[52%] h-px w-44 rotate-[-23deg] bg-[#554e3d]/60" />
            <div className="absolute left-[44%] top-[39%] h-28 w-1 rotate-[35deg] bg-alert/80" />
            {units.filter((unit) => revealedUnitIds.has(unit.id)).map((unit) => <button key={unit.id} onClick={() => setSelectedUnitId(unit.id)} className="absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${unit.x}%`, top: `${unit.y}%` }}><span className={cn("mil-marker flex h-9 min-w-9 items-center justify-center border-2 bg-paper px-1 text-xs font-bold text-ink", unit.side === "friendly" ? "border-blueMark" : "border-alert", selectedUnitId === unit.id && "ring-2 ring-copper ring-offset-2 ring-offset-[#778971]")}>{unit.side === "friendly" ? "X" : "?"}</span><span className="mt-1 block whitespace-nowrap rounded-sm bg-ink/80 px-1.5 py-0.5 text-[10px] text-paper">{unit.name}</span></button>)}
            {battleStarted && visibleMessages.length > 0 ? <><div className="absolute left-[31%] top-[57%] flex items-center gap-1 text-alert"><ArrowUpRight size={48} strokeWidth={1.4} /><span className="hidden text-[10px] font-bold md:inline">增援计划</span></div><div className="absolute right-[19%] top-[31%] flex items-center gap-1 text-blueMark"><ArrowDownRight size={44} strokeWidth={1.4} /><span className="hidden text-[10px] font-bold md:inline">敌情推测</span></div></> : <div className="absolute inset-0 flex items-center justify-center"><div className="border border-[#304936]/50 bg-[#c5b98a]/45 px-4 py-3 text-center text-xs tracking-widest text-[#304936]">{battleStarted ? "等待第一批战场回报" : "战前待命 · 地图等待情报注入"}</div></div>}
            <div className="absolute bottom-3 left-3 rounded-sm border border-[#304936]/60 bg-[#c5b98a]/65 px-2 py-1 text-[10px] text-[#304936]">网格 · {campaign.mapStyle} · 认知图层</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3 text-xs"><div className="flex items-center gap-4 text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blueMark" />己方</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-alert" />敌情</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-copper" />计划</span></div><span className="text-muted">天气：阴 · 能见度 4km</span></div>
        </section>

        <aside className="order-3 flex min-h-[560px] flex-col bg-panel">
          <div className="border-b border-line px-4 py-3"><p className="text-[10px] tracking-[.2em] text-muted">COMMAND / 命令</p><h2 className="mt-1 font-serif text-lg">指挥台</h2></div>
          <div className="border-b border-line px-4 py-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs text-muted">战役时钟</span><span className="font-mono text-xl text-copper">{formatClock(campaign, clockMinute)}</span></div><div className="mb-3 h-1 overflow-hidden rounded bg-line"><div className="h-full bg-copper transition-all" style={{ width: `${progress}%` }} /></div>{battleStarted ? <div className="flex items-center gap-1">{[1, 2, 4].map((item) => <Button key={item} variant={speed === item ? "copper" : "ghost"} size="sm" onClick={() => setSpeed(item)}>{item}×</Button>)}<span className="ml-auto text-[10px] text-muted">战役进行中 · 截止 {formatClock(campaign, campaign.deadlineMinute)}</span></div> : <div className="flex items-center justify-between gap-3"><span className="text-xs text-copper">战前待命 · 时间尚未推进</span><Button variant="copper" size="sm" disabled={!gameId} onClick={startBattle}><Play size={14} />开始战役</Button></div>}</div>
          <div className="border-b border-line px-4 py-4"><div className="mb-3 flex items-center gap-2"><UserRound size={15} className="text-copper" /><h3 className="text-sm">选中单位</h3></div>{battleStarted && revealedUnitIds.has(selectedUnit.id) ? <><p className="font-serif text-base">{selectedUnit.name}</p><p className="mt-1 text-xs text-muted">{selectedUnit.detail} · {selectedUnit.status}</p><p className="mt-3 text-sm leading-6 text-paper/85">{selectedUnit.summary}</p></> : <p className="text-sm leading-6 text-muted">尚无已确认的单位报告。收到电报或通信员回报后，单位标记和状态将在地图上出现。</p>}</div>
          <div className="flex flex-1 flex-col px-4 py-4"><div className="mb-3 flex items-center gap-2"><Radio size={15} className="text-copper" /><h3 className="text-sm">发送命令</h3></div><select disabled={!battleStarted} value={recipient} onChange={(event) => setRecipient(event.target.value)} className="mb-2 h-9 rounded border border-line bg-ink px-2 text-xs text-paper outline-none focus:border-copper">{units.filter((unit) => unit.side === "friendly").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><div className="mb-2 grid grid-cols-3 gap-1">{["radio", "phone", "courier"].map((item) => <button key={item} disabled={!battleStarted} onClick={() => setChannel(item)} className={cn("rounded border px-2 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-45", channel === item ? "border-copper bg-copper/15 text-copper" : "border-line text-muted hover:text-paper")}>{item === "radio" ? "无线电" : item === "phone" ? "野战电话" : "通信员"}</button>)}</div><textarea disabled={!battleStarted} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={battleStarted ? "写下给下级指挥官的意图与限制……" : "开始战役后才能发布军令"} className="min-h-28 flex-1 resize-none rounded border border-line bg-ink p-3 text-sm leading-6 text-paper outline-none placeholder:text-muted/70 focus:border-copper disabled:cursor-not-allowed disabled:opacity-60" /><div className="mt-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-[10px] text-muted"><TimerReset size={12} />预计延迟 {channel === "radio" ? "12" : channel === "phone" ? "5" : "35"} 分钟</span><Button variant="copper" size="sm" disabled={!battleStarted || draft.trim().length < 2} onClick={sendOrder}><Send size={14} />发令</Button></div></div>
          <div className="signal-rule border-t border-line px-4 py-3 text-[11px] text-muted">{notice}</div>
        </aside>
      </div>
    </main>
  );
}
