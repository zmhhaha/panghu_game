import type {
  CampaignDefinition, CampaignReport, CampaignReportBundle, CampaignReportTimelineEntry,
  GameEvent, WorldState,
} from "@qianfu/core";
import { toPublicGameEvents } from "@qianfu/core";

const difficultyLabels: Record<WorldState["difficulty"]["id"], string> = {
  story: "引导模式",
  undercover: "潜伏模式",
  iron_curtain: "铁幕模式",
};

const deliveryLabels: Record<string, string> = { radio: "电台", courier: "交通员" };

export function buildCampaignReportBundle(
  campaign: CampaignDefinition,
  state: WorldState,
  events: GameEvent[],
  reportId: string,
  generatedAt: string,
  reportVersion = 1,
): CampaignReportBundle {
  if (state.status !== "finished" || !state.ending || !state.closedAt) {
    throw new Error("Campaign must be finished before generating a report");
  }

  const publicEvents = toPublicGameEvents(events);
  const base = {
    schemaVersion: "1.0.0" as const,
    reportId,
    reportVersion,
    gameInstanceId: state.gameInstanceId,
    campaign: { id: campaign.id, version: campaign.version, name: campaign.name },
    difficulty: { id: state.difficulty.id, label: difficultyLabels[state.difficulty.id] },
    generatedAt,
    startedAt: campaign.startTime,
    closedAt: state.closedAt,
    ending: structuredClone(state.ending),
    summary: reportSummary(state),
    statistics: {
      elapsedMinutes: Math.max(0, Math.round((Date.parse(state.closedAt) - Date.parse(campaign.startTime)) / 60_000)),
      actionCount: new Set(events.map((event) => event.idempotencyKey)).size,
      dialogueTurns: events.filter((event) => event.type === "dialogue.turn_completed" || event.type === "dialogue.completed").length,
      deliveredIntel: Object.values(state.intel).filter((intel) => intel.deliveredAt).length,
      recruitedComrades: state.network.activeMemberIds.length,
      discoveredLocations: state.discoveredLocationIds.length,
    },
    finalRisk: {
      personalSuspicion: state.personalSuspicion,
      networkExposure: state.network.exposure,
      investigationPressure: state.investigation.pressure,
    },
    timeline: buildTimeline(campaign, publicEvents),
  };

  const visibleIntel = campaign.intel.filter((definition) => {
    const intel = state.intel[definition.id];
    return Boolean(intel && (intel.knownFields.length > 0 || intel.deliveredAt));
  });
  const visibleCharacters = campaign.characters.filter((definition) =>
    state.knownCharacterIds.includes(definition.id) || state.characters[definition.id]?.recruited,
  );

  const ownerReport: CampaignReport = {
    ...base,
    visibility: "owner",
    intel: visibleIntel.map((definition) => ({
      id: definition.id,
      title: definition.title,
      knownFields: [...state.intel[definition.id].knownFields],
      deliveredFields: [...state.intel[definition.id].deliveredFields],
      confidence: state.intel[definition.id].confidence,
      deliveredAt: state.intel[definition.id].deliveredAt,
      deliveryMethod: state.intel[definition.id].deliveryMethod,
      actualTruth: definition.truth,
    })),
    comrades: visibleCharacters.map((definition) => ({
      id: definition.id,
      name: definition.name,
      publicIdentity: definition.publicIdentity,
      recruited: state.characters[definition.id].recruited,
      exposed: state.characters[definition.id].exposed,
      outcome: state.network.compromisedMemberIds.includes(definition.id) ? "compromised" : "active",
      actualAlignment: definition.hiddenAlignment,
    })),
  };

  const publicPreview: CampaignReport = {
    ...structuredClone(ownerReport),
    visibility: "public",
    intel: ownerReport.intel.map(({ actualTruth: _actualTruth, ...intel }) => intel),
    comrades: ownerReport.comrades.map(({ actualAlignment: _actualAlignment, ...character }) => character),
  };

  return { ownerReport, publicPreview };
}

function reportSummary(state: WorldState): string {
  const title = state.ending?.title ?? "战役结束";
  const grade = state.ending?.score.grade ?? "E";
  const delivered = Object.values(state.intel).filter((intel) => intel.deliveredAt).length;
  const recruited = state.network.activeMemberIds.length;
  if (state.ending?.type === "complete_success") return `任务完整达成。你在保持潜线运转的同时送出了核心情报，最终评价为 ${grade}。`;
  if (state.ending?.type === "costly_success") return `核心任务已经完成，但组织为此承担了明显代价。共送出 ${delivered} 项情报、联络 ${recruited} 名同志，最终评价为 ${grade}。`;
  return `${title}。本次行动共送出 ${delivered} 项情报、联络 ${recruited} 名同志，最终评价为 ${grade}。失败与损失已被冻结在这份档案中。`;
}

function buildTimeline(campaign: CampaignDefinition, events: GameEvent[]): CampaignReportTimelineEntry[] {
  const important = events.filter((event) => [
    "character.introduced", "character.identified", "intel.dialogue_discovered", "intel.transmitted",
    "character.recruitment_progress", "comrade.task_completed", "comrade.task_failed",
    "radio.message_sent", "radio.receipt_received", "investigation.surveillance_started", "player.moved",
  ].includes(event.type));
  return important.slice(-40).map((event) => describeEvent(campaign, event));
}

function describeEvent(campaign: CampaignDefinition, event: GameEvent): CampaignReportTimelineEntry {
  const payload = event.payload as Record<string, unknown>;
  const characterId = String(payload.characterId ?? payload.memberId ?? "");
  const character = campaign.characters.find((item) => item.id === characterId);
  const intelId = String(payload.intelId ?? "");
  const intel = campaign.intel.find((item) => item.id === intelId);
  const locationId = String(payload.to ?? payload.locationId ?? "");
  const location = campaign.locations.find((item) => item.id === locationId);
  const details: Record<string, [string, string]> = {
    "character.introduced": ["建立接触", `初次认识${character?.name ?? "一名人物"}`],
    "character.identified": ["确认身份", `确认了${character?.name ?? "目标人物"}的公开身份`],
    "intel.dialogue_discovered": ["获得线索", `从${character?.name ?? "谈话对象"}处获得一项可核对线索`],
    "intel.transmitted": ["传递情报", `${intel?.title ?? "一项情报"}通过${deliveryLabels[String(payload.method)] ?? "约定渠道"}送出`],
    "radio.message_sent": ["发出电文", `从${location?.name ?? "一处地点"}发出包含 ${Number(payload.fieldCount ?? 0)} 个字段的电文`],
    "radio.receipt_received": ["组织回执", String(payload.summary ?? "组织返回了电文接收结果")],
    "character.recruitment_progress": ["组织联络", Boolean(payload.recruited) ? `${character?.name ?? "候选人"}接受了联络安排` : `继续考察${character?.name ?? "候选人"}`],
    "comrade.task_completed": ["同志回报", String(payload.report ?? "一项委派任务已经完成")],
    "comrade.task_failed": ["委派受挫", String(payload.report ?? "一项委派任务未能完成")],
    "investigation.surveillance_started": ["敌情变化", `${location?.name ?? "一处地点"}附近出现疑似监视`],
    "player.moved": ["转移地点", `抵达${location?.name ?? "新的地点"}`],
  };
  const [title, detail] = details[event.type] ?? ["行动记录", "时间线产生了新的变化"];
  return { eventSeq: event.eventSeq, occurredAt: event.occurredAt, type: event.type, title, detail };
}

export function renderReportHtml(report: CampaignReport): string {
  const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
  const rows = report.timeline.map((item) => `<li><time>${escape(new Date(item.occurredAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }))}</time><strong>${escape(item.title)}</strong><span>${escape(item.detail)}</span></li>`).join("");
  const intel = report.intel.map((item) => `<tr><td>${escape(item.title)}</td><td>${escape(item.knownFields.join("、") || "未完整确认")}</td><td>${escape(item.deliveredFields?.join("、") || "未确认送达")}</td><td>${Math.round(item.confidence * 100)}%</td><td>${escape(item.deliveryMethod ? deliveryLabels[item.deliveryMethod] ?? item.deliveryMethod : "未送出")}</td></tr>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width"><title>${escape(report.campaign.name)} - 战役档案</title><style>body{margin:0;background:#151817;color:#e5e8e4;font:15px/1.7 Arial,sans-serif}main{max-width:900px;margin:auto;padding:48px 24px}h1,h2{font-family:serif;font-weight:500}small,time{color:#929b96}header{border-bottom:1px solid #343b38;padding-bottom:24px}.grade{font-size:52px;color:#76a7a1}section{margin-top:36px}dl{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}dl div,table{border:1px solid #343b38;padding:14px}dt{color:#929b96;font-size:12px}dd{margin:4px 0 0;font-size:20px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #343b38;text-align:left}li{display:grid;grid-template-columns:150px 110px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid #343b38}@media(max-width:650px){dl{grid-template-columns:1fr}li{grid-template-columns:1fr;gap:2px}}</style></head><body><main><header><small>潜线 · 战役结算档案</small><h1>${escape(report.campaign.name)}</h1><p>${escape(report.summary)}</p><div class="grade">${escape(report.ending.score.grade)}</div><small>${escape(report.ending.title)} · ${escape(report.difficulty.label)}</small></header><section><h2>行动概览</h2><dl><div><dt>总评分</dt><dd>${report.ending.score.total}</dd></div><div><dt>传递情报</dt><dd>${report.statistics.deliveredIntel}</dd></div><div><dt>联络同志</dt><dd>${report.statistics.recruitedComrades}</dd></div></dl></section><section><h2>情报结算</h2><table><thead><tr><th>情报</th><th>已知内容</th><th>确认送达</th><th>可信度</th><th>方式</th></tr></thead><tbody>${intel}</tbody></table></section><section><h2>关键时间线</h2><ol>${rows || "<li><span>没有可公开的关键行动记录</span></li>"}</ol></section></main></body></html>`;
}
