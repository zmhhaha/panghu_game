"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Clock3, Inbox, MapPinned, Pause, Play, Radio, Send, Signal, TimerReset, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type Campaign = { id: string; title: string; theater: string; mapStyle: string; objective: string; startAt: string; startMinute: number; deadlineMinute: number };
type Message = { id: string; type: "urgent" | "intel" | "normal" | "sent"; source: string; subject: string; body: string; received: string; location?: string };
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
    { id: "tz-1", type: "urgent", source: "第31师师部", subject: "东门火力增强，请示是否投入预备连", body: "东门外敌火力在十分钟内明显增强，预备连已经抵达师部附近，是否立即投入东门？", received: "17:42", location: "cn31" },
    { id: "tz-2", type: "intel", source: "第五战区情报处", subject: "台枣支线东北方向有连续炮声", body: "地方情报转报：暂不能判断为日军炮兵还是运输队。航空观察尚未印证。", received: "17:30", location: "jparmor" },
    { id: "tz-3", type: "normal", source: "第30师", subject: "南岸先头营开始渡过堤桥", body: "桥面狭窄，车辆必须分批通过。预计18时15分可向城南发起支援行动。", received: "17:39", location: "cn30" }
  ],
  arnhem: [
    { id: "ar-1", type: "urgent", source: "第2伞兵营", subject: "桥西建筑区遭射击", body: "先头连进入桥西建筑区后遭轻武器射击，桥梁北端仍在视线之外。", received: "14:52", location: "uk2para" },
    { id: "ar-2", type: "intel", source: "师部情报官", subject: "阿纳姆附近装甲部队情报未决", body: "战前航空照片显示周边存在履带车辆，但没有可靠消息证明其已恢复战斗。", received: "14:45", location: "de9ss" },
    { id: "ar-3", type: "normal", source: "第1机降旅", subject: "DZ X 集结完成约七成", body: "部分反坦克武器和无线电设备尚未找到，可按原计划向奥斯特贝克东侧推进。", received: "14:39", location: "ukairland" }
  ]
};

function formatClock(campaign: Campaign, minute: number) {
  const start = new Date(campaign.startAt.replace(/年|月/g, "-").replace("日", "T00:00:00"));
  if (Number.isNaN(start.getTime())) return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const date = new Date(start.getTime() + (minute - campaign.startMinute) * 60_000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function WarRoom() {
  const [campaignId, setCampaignId] = useState("taierzhuang");
  const campaign = campaigns.find((item) => item.id === campaignId) || campaigns[0];
  const [clockMinute, setClockMinute] = useState(campaign.startMinute);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
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
  const unread = messages.filter((message) => message.type !== "sent").length;
  const progress = Math.min(100, Math.max(0, ((clockMinute - campaign.startMinute) / (campaign.deadlineMinute - campaign.startMinute)) * 100));

  useEffect(() => {
    const next = campaigns.find((item) => item.id === campaignId) || campaigns[0];
    setClockMinute(next.startMinute);
    setMessages(initialMessages[next.id]);
    setSelectedUnitId(next.id === "taierzhuang" ? "cn31" : "uk2para");
    setSelectedMessage(null);
    setGameId(null);
    setNotice("本地演示状态 · 尚未建立服务器战局");
  }, [campaignId]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setClockMinute((value) => Math.min(campaign.deadlineMinute, value + speed)), 1000);
    return () => window.clearInterval(timer);
  }, [campaign.deadlineMinute, paused, speed]);

  useEffect(() => {
    if (!gameId) return;
    const source = new EventSource(`/api/v1/games/${gameId}/events`);
    source.addEventListener("world_event", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (data.type === "TIME_TICK") setClockMinute(data.clockMinute);
    });
    source.onerror = () => setNotice("服务器通信暂时中断 · 本地时钟继续");
    return () => source.close();
  }, [gameId]);

  const mapStyle = campaign.id === "taierzhuang" ? "map-china" : "map-europe";
  const currentRecipient = useMemo(() => units.find((unit) => unit.id === recipient), [recipient, units]);

  async function createServerGame() {
    try {
      const response = await fetch("/api/v1/games", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) });
      if (!response.ok) throw new Error("登录或 API 不可用");
      const data = await response.json();
      setGameId(data.game.id);
      setClockMinute(data.game.clockMinute);
      setNotice("服务器战局已建立 · 事件流已连接");
    } catch (error) { setNotice(error instanceof Error ? error.message : "无法建立服务器战局"); }
  }

  async function sendOrder() {
    if (draft.trim().length < 2 || !currentRecipient) return;
    const message: Message = { id: `sent-${Date.now()}`, type: "sent", source: "本级指挥所", subject: `致${currentRecipient.name} · ${channel === "radio" ? "无线电报" : channel === "phone" ? "野战电话" : "通信员"}`, body: draft.trim(), received: formatClock(campaign, clockMinute), location: recipient };
    setMessages((items) => [message, ...items]);
    setDraft("");
    if (gameId) {
      const response = await fetch(`/api/v1/games/${gameId}/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipientId: recipient, channel, text: message.body, clientCommandId: message.id }) });
      setNotice(response.ok ? "命令已进入通信队列" : "命令未能送入服务器");
    } else setNotice("命令已进入本地传输队列 · 建立服务器战局后可持久化");
  }

  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line bg-panel px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-copper/70 bg-copper/15 font-serif text-xl text-copper">二</div>
            <div><p className="text-[10px] uppercase tracking-[.22em] text-muted">SHAPAN · 战役指挥所</p><h1 className="font-serif text-xl tracking-wide">{campaign.title}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="campaign">选择战役</label>
            <select id="campaign" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="h-9 rounded border border-line bg-ink px-2 text-sm text-paper outline-none focus:border-copper">
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.theater} · {item.title}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={createServerGame}><Signal size={14} />连接战局</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-px bg-line lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="order-2 flex min-h-[560px] flex-col bg-panel lg:order-1">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-[10px] tracking-[.2em] text-muted">SIGNALS / 通信</p><h2 className="mt-1 font-serif text-lg">收件台</h2></div><span className="rounded-sm bg-alert/15 px-2 py-1 text-xs text-alert">{unread} 未读</span></div>
          <div className="flex gap-1 border-b border-line p-2">{["全部", "紧急", "情报", "已发"].map((filter) => <button key={filter} className="flex-1 rounded px-1 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-paper">{filter}</button>)}</div>
          <div className="divide-y divide-line/70 overflow-auto">
            {messages.map((message) => <button key={message.id} onClick={() => { setSelectedMessage(message.id); if (message.location) setSelectedUnitId(message.location); }} className={cn("block w-full px-4 py-3 text-left transition hover:bg-white/5", selectedMessage === message.id && "bg-white/5") }><div className="flex items-center justify-between gap-2"><span className={cn("text-[10px] uppercase tracking-wider", message.type === "urgent" ? "text-alert" : message.type === "intel" ? "text-copper" : message.type === "sent" ? "text-blueMark" : "text-muted")}>{message.type === "urgent" ? "紧急" : message.type === "intel" ? "情报" : message.type === "sent" ? "已发" : "常规"}</span><time className="text-[10px] text-muted">{message.received}</time></div><p className="mt-1 line-clamp-2 text-sm text-paper">{message.subject}</p><p className="mt-1 text-xs text-muted">{message.source}</p></button>)}
          </div>
          <div className="mt-auto border-t border-line p-4 text-xs text-muted"><Inbox size={14} className="mb-2 text-copper" />{selectedMessage ? messages.find((message) => message.id === selectedMessage)?.body : "请选择通信记录查看全文。"}</div>
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
            {units.map((unit) => <button key={unit.id} onClick={() => setSelectedUnitId(unit.id)} className="absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${unit.x}%`, top: `${unit.y}%` }}><span className={cn("mil-marker flex h-9 min-w-9 items-center justify-center border-2 bg-paper px-1 text-xs font-bold text-ink", unit.side === "friendly" ? "border-blueMark" : "border-alert", selectedUnitId === unit.id && "ring-2 ring-copper ring-offset-2 ring-offset-[#778971]")}>{unit.side === "friendly" ? "X" : "?"}</span><span className="mt-1 block whitespace-nowrap rounded-sm bg-ink/80 px-1.5 py-0.5 text-[10px] text-paper">{unit.name}</span></button>)}
            <div className="absolute left-[31%] top-[57%] flex items-center gap-1 text-alert"><ArrowUpRight size={48} strokeWidth={1.4} /><span className="hidden text-[10px] font-bold md:inline">增援计划</span></div>
            <div className="absolute right-[19%] top-[31%] flex items-center gap-1 text-blueMark"><ArrowDownRight size={44} strokeWidth={1.4} /><span className="hidden text-[10px] font-bold md:inline">敌情推测</span></div>
            <div className="absolute bottom-3 left-3 rounded-sm border border-[#304936]/60 bg-[#c5b98a]/65 px-2 py-1 text-[10px] text-[#304936]">网格 · {campaign.mapStyle} · 认知图层</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3 text-xs"><div className="flex items-center gap-4 text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blueMark" />己方</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-alert" />敌情</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-copper" />计划</span></div><span className="text-muted">天气：阴 · 能见度 4km</span></div>
        </section>

        <aside className="order-3 flex min-h-[560px] flex-col bg-panel">
          <div className="border-b border-line px-4 py-3"><p className="text-[10px] tracking-[.2em] text-muted">COMMAND / 命令</p><h2 className="mt-1 font-serif text-lg">指挥台</h2></div>
          <div className="border-b border-line px-4 py-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs text-muted">战役时钟</span><span className="font-mono text-xl text-copper">{formatClock(campaign, clockMinute)}</span></div><div className="mb-3 h-1 overflow-hidden rounded bg-line"><div className="h-full bg-copper transition-all" style={{ width: `${progress}%` }} /></div><div className="flex items-center gap-1"><Button variant="outline" size="icon" title={paused ? "继续时间" : "暂停时间"} aria-label={paused ? "继续时间" : "暂停时间"} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</Button>{[1, 2, 4].map((item) => <Button key={item} variant={speed === item ? "copper" : "ghost"} size="sm" onClick={() => setSpeed(item)}>{item}×</Button>)}<span className="ml-auto text-[10px] text-muted">截止 {formatClock(campaign, campaign.deadlineMinute)}</span></div></div>
          <div className="border-b border-line px-4 py-4"><div className="mb-3 flex items-center gap-2"><UserRound size={15} className="text-copper" /><h3 className="text-sm">选中单位</h3></div><p className="font-serif text-base">{selectedUnit.name}</p><p className="mt-1 text-xs text-muted">{selectedUnit.detail} · {selectedUnit.status}</p><p className="mt-3 text-sm leading-6 text-paper/85">{selectedUnit.summary}</p></div>
          <div className="flex flex-1 flex-col px-4 py-4"><div className="mb-3 flex items-center gap-2"><Radio size={15} className="text-copper" /><h3 className="text-sm">发送命令</h3></div><select value={recipient} onChange={(event) => setRecipient(event.target.value)} className="mb-2 h-9 rounded border border-line bg-ink px-2 text-xs text-paper outline-none focus:border-copper">{units.filter((unit) => unit.side === "friendly").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><div className="mb-2 grid grid-cols-3 gap-1">{["radio", "phone", "courier"].map((item) => <button key={item} onClick={() => setChannel(item)} className={cn("rounded border px-2 py-1.5 text-[11px]", channel === item ? "border-copper bg-copper/15 text-copper" : "border-line text-muted hover:text-paper")}>{item === "radio" ? "无线电" : item === "phone" ? "野战电话" : "通信员"}</button>)}</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写下给下级指挥官的意图与限制……" className="min-h-28 flex-1 resize-none rounded border border-line bg-ink p-3 text-sm leading-6 text-paper outline-none placeholder:text-muted/70 focus:border-copper" /><div className="mt-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-[10px] text-muted"><TimerReset size={12} />预计延迟 {channel === "radio" ? "12" : channel === "phone" ? "5" : "35"} 分钟</span><Button variant="copper" size="sm" disabled={draft.trim().length < 2} onClick={sendOrder}><Send size={14} />发令</Button></div></div>
          <div className="signal-rule border-t border-line px-4 py-3 text-[11px] text-muted">{notice}</div>
        </aside>
      </div>
    </main>
  );
}
