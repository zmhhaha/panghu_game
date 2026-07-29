"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ListFilter, X } from "lucide-react";
import type { GameEvent } from "@qianfu/core";
import type { GameContext } from "@/lib/api";

type EventFilter = "all" | "dialogue" | "intel" | "movement" | "network" | "threat";
const filters: Array<{ id: EventFilter; label: string }> = [
  { id: "all", label: "全部" }, { id: "dialogue", label: "对话" }, { id: "intel", label: "情报" },
  { id: "movement", label: "行动" }, { id: "network", label: "同志" }, { id: "threat", label: "敌方动静" },
];

export function ActionTimeline({ events, context }: { events: GameEvent[]; context: GameContext }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<EventFilter>("all");
  const visible = useMemo(() => events.filter((event) => filter === "all" || eventCategory(event.type) === filter).slice().reverse(), [events, filter]);
  const recent = visible.slice(0, 5);
  return <section className="mt-8 border-t border-line pt-6">
    <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-medium text-muted"><CalendarClock size={15} />行动日志</p><button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-paper"><ListFilter size={13} />完整时间线</button></div>
    {recent.length === 0 ? <p className="mt-3 text-sm text-muted">尚无新的行动记录。</p> : <ol className="mt-3 space-y-3">{recent.map((event) => <TimelineItem key={event.id} event={event} context={context} />)}</ol>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="timeline-title"><div className="my-6 w-full max-w-3xl border border-line bg-ink shadow-2xl"><div className="flex items-start justify-between border-b border-line bg-panel px-5 py-4"><div><p className="text-xs text-copper">按时间记录</p><h2 id="timeline-title" className="mt-1 font-serif text-xl">完整行动时间线</h2></div><button aria-label="关闭" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-muted hover:text-paper"><X size={17} /></button></div><div className="flex gap-1 overflow-x-auto border-b border-line px-5 py-3">{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 px-3 py-1.5 text-xs ${filter === item.id ? "bg-copper/15 text-paper" : "text-muted hover:text-paper"}`}>{item.label}</button>)}</div><div className="max-h-[70vh] overflow-y-auto px-5"><ol className="divide-y divide-line">{visible.map((event) => <TimelineItem key={event.id} event={event} context={context} detailed />)}</ol>{visible.length === 0 && <p className="py-10 text-center text-sm text-muted">这个分类还没有记录。</p>}</div></div></div>}
  </section>;
}

function TimelineItem({ event, context, detailed = false }: { event: GameEvent; context: GameContext; detailed?: boolean }) {
  const payload = event.payload as Record<string, unknown>;
  const detail = describeEvent(event, payload, context);
  return <li className={`flex gap-3 ${detailed ? "py-4" : "text-sm leading-6"}`}><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-copper" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><time className="text-[10px] text-muted">{formatTime(event.occurredAt)}</time><span className="text-[10px] text-copper">{detail.title}</span>{detailed && <span className="text-[10px] text-muted">#{event.eventSeq}</span>}</div><p className={`mt-1 ${detailed ? "text-sm leading-6 text-paper/80" : event.eventSeq === 1 ? "text-paper" : "text-muted"}`}>{detail.text}</p></div></li>;
}

function eventCategory(type: string): EventFilter {
  if (type.startsWith("dialogue") || type === "character.introduced" || type === "character.identified") return "dialogue";
  if (type.startsWith("narrative") || type === "location.stage_changed" || type === "location.discovered") return "movement";
  if (type.startsWith("intel") || type.startsWith("radio")) return "intel";
  if (type.startsWith("cover")) return type === "cover.supervisor_check" || type === "cover.absence_recorded" ? "threat" : "movement";
  if (type === "player.moved" || type === "player.waited" || type === "player.rested" || type.startsWith("character.schedule")) return "movement";
  if (type.startsWith("comrade") || type.startsWith("character.recruitment")) return "network";
  if (type.startsWith("investigation") || type.startsWith("interrogation")) return "threat";
  if (type.startsWith("director.contact")) return "dialogue";
  if (type.startsWith("counterintelligence")) return "threat";
  return "movement";
}

function describeEvent(event: GameEvent, payload: Record<string, unknown>, context: GameContext) {
  const location = context.locations.find((item) => item.id === payload.to || item.id === payload.locationId)?.name;
  const intel = context.intel.find((item) => item.id === payload.intelId)?.title;
  const character = context.characters.find((item) => item.id === payload.characterId || item.id === payload.memberId)?.name;
  const objective = context.objectives.find((item) => item.id === payload.objectiveId)?.title;
  const reports = typeof payload.report === "string" ? payload.report : "";
  const labels: Record<string, string> = {
    "dialogue.started": "开始对话", "dialogue.turn_completed": "对话推进", "dialogue.ended": "结束对话",
    "character.introduced": "认识人物", "character.identified": "确认身份", "player.moved": "移动",
    "player.waited": "等待", "player.rested": "夜间休息", "intel.recorded": "记录情报", "intel.dialogue_discovered": "对话获得情报",
    "intel.transmitted": "传递情报", "radio.message_sent": "发出电报", "radio.receipt_received": "收到回执",
    "comrade.task_completed": "同志任务完成", "comrade.task_failed": "同志任务失败", "character.recruited": "正式招募",
    "investigation.action_taken": "敌方调查行动", "character.schedule_advanced": "人物行程变化",
    "mission.objective_completed": "任务完成", "mission.objective_failed": "任务未完成", "mission.objective_unlocked": "后续任务",
    "interrogation.scheduled": "收到传唤", "interrogation.started": "盘问开始", "interrogation.resolved": "盘问结束",
    "narrative.event_resolved": "剧情事件", "narrative.thread_updated": "调查线程更新", "location.discovered": "解锁地点", "location.stage_changed": "地点认知变化",
    "cover.work_completed": "完成公开工作", "cover.activity_credited": "形成在岗记录", "cover.leave_approved": "请假登记", "cover.absence_recorded": "异常缺勤", "cover.supervisor_check": "上级核查",
    "director.contact_offered": "人物主动接触", "director.contact_accepted": "接受主动接触", "director.contact_deferred": "推迟主动接触", "director.contact_refused": "拒绝主动接触", "director.contact_expired": "错过接触",
    "counterintelligence.completed": "反侦察行动",
  };
  const title = labels[event.type] ?? "行动记录";
  const text = event.type === "player.moved" ? `你前往了${location ?? "未知地点"}。`
    : event.type === "player.rested" ? `你休息了 ${formatRestDuration(Number(payload.durationMinutes ?? 0))}，恢复了 ${Number(payload.recovery ?? 0)} 点精力。`
    : event.type === "intel.recorded" ? `你记录了${intel ?? "一项情报"}。`
      : event.type === "intel.transmitted" ? `你通过${payload.method === "radio" ? "电台" : "交通员"}传递了${intel ?? "情报"}。`
        : event.type === "dialogue.started" || event.type === "dialogue.ended" ? `${character ?? "目标人物"}${event.type === "dialogue.started" ? "开始与你交谈" : "的对话结束"}。`
          : reports || (typeof payload.summary === "string" ? payload.summary : typeof payload.notice === "string" ? payload.notice : title);
  if (event.type === "mission.objective_completed") return { title, text: `${objective ?? String(payload.title ?? "当前任务")}已经完成。` };
  if (event.type === "mission.objective_failed") return { title, text: `${objective ?? String(payload.title ?? "当前任务")}未能按时完成，但后续任务仍会继续。` };
  if (event.type === "mission.objective_unlocked") return { title, text: `组织下达了${objective ?? String(payload.title ?? "后续任务")}。` };
  if (event.type === "location.discovered") return { title, text: `已解锁地点：${String(payload.locationName ?? location ?? "未知地点")}。${hintText(payload)}` };
  if (event.type === "location.stage_changed") {
    const stage = String(payload.stage ?? "");
    const prefix = stage === "rumored" ? "获得新的地点传闻" : stage === "located" ? `已确认地点位置：${String(payload.locationName ?? location ?? "未知地点")}` : `已解锁地点：${String(payload.locationName ?? location ?? "未知地点")}`;
    return { title, text: `${prefix}。${hintText(payload)}` };
  }
  if (event.type === "character.introduced") {
    const name = String(payload.characterName ?? character ?? "未知人物");
    const identity = typeof payload.publicIdentity === "string" ? `（${payload.publicIdentity}）` : "";
    return { title, text: `已认识人物：${name}${identity}。${hintText(payload)}` };
  }
  if (event.type === "director.contact_offered") return { title, text: `${String(payload.characterName ?? character ?? "有人")}主动找你接触：${String(payload.reason ?? "来意不明")}。` };
  if (event.type === "counterintelligence.completed") return { title, text: String(payload.notice ?? "你完成了一次反侦察行动。") };
  if (event.type === "interrogation.scheduled") return { title, text: "警备处发来传唤，要求核对你的公开身份与近期行踪。" };
  if (event.type === "interrogation.started") return { title, text: "敌方盘问正式开始，其他行动暂时中止。" };
  if (event.type === "interrogation.resolved") {
    const outcome = payload.outcome === "cleared" ? "暂时洗清嫌疑" : payload.outcome === "watched" ? "被列入继续观察名单" : "公开身份出现明显破绽";
    return { title, text: `盘问结束：${outcome}。` };
  }
  return { title, text };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function hintText(payload: Record<string, unknown>) {
  return typeof payload.hint === "string" && payload.hint.trim() ? payload.hint : "相关线索已经记入行动日志。";
}

function formatRestDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} 小时 30 分钟` : `${hours} 小时`;
}
