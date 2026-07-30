import type { CampaignDefinition, CoverProfileDefinition } from "./types.js";

export const COVER_PROFILES: CoverProfileDefinition[] = [
  {
    id: "archive_clerk", title: "机要处档案员", summary: "持有机关出入便利，但必须维持明确的考勤和工作记录。",
    routineLabel: "机关考勤", startingLocationId: "archive-office", workLocationIds: ["archive-office"], workHours: { startMinute: 8 * 60, endMinute: 17 * 60 },
    workKinds: ["file_sorting", "duty_shift", "submit_report"], initialContactCharacterIds: ["chen-jingwen"],
    accountability: {
      mode: "attendance", awaitingLabel: "待岗", activeLabel: "正常工作", excusedLabel: "请假中", lapseLabel: "异常缺勤",
      riskLabel: "上级怀疑", lapseCountLabel: "连续缺勤", recordProgressLabel: "今日可核验在岗记录", observerLabel: "同事与上级观察", allowsLeave: true,
      lapseSummary: "档案科登记了你今天的异常缺勤，同事开始留意你的行踪。",
      reviewSummary: "上级要求你在下次到岗时说明近期缺勤和异常出入。",
      conversationCreditSummary: "你在公开岗位与同事持续处理事务，形成了可被核对的在岗记录。",
      lapseWarning: "异常缺勤会增加个人怀疑，并可能引来上级核查。",
    },
  },
  {
    id: "travelling_merchant", title: "南北货行商", summary: "可自由在商埠活动；每日需完成一笔可被行会与客户认可的生意。",
    routineLabel: "经营周转", startingLocationId: "jianghai-hotel", workLocationIds: ["jianghai-hotel", "third-dock", "wu-clock-shop"], workHours: { startMinute: 7 * 60, endMinute: 19 * 60 },
    workKinds: ["settle_accounts", "visit_clients", "stock_check"], initialContactCharacterIds: ["luo-boan"],
    accountability: {
      mode: "business", awaitingLabel: "待经营", activeLabel: "经营正常", excusedLabel: "行程已说明", lapseLabel: "经营断档",
      riskLabel: "同行怀疑", lapseCountLabel: "连续经营断档", recordProgressLabel: "今日可核验经营记录", observerLabel: "同行与商会观察", allowsLeave: false,
      lapseSummary: "今天没有留下可核验的货账、客户或走货记录，同行开始怀疑你的生意是否真实。",
      reviewSummary: "商会、客户和货栈开始交叉核对你近期的账册、拜访与走货路线。",
      conversationCreditSummary: "你围绕公开生意持续核对货款、客户和交接事项，形成了可被商会与同行验证的经营记录。",
      lapseWarning: "经营记录长期断档会损害商誉，并引来同行、商会和货栈核查。",
    },
  },
  {
    id: "freelance_writer", title: "自由撰稿人", summary: "不受固定坐班约束，却必须持续交稿、采风，并让编辑相信你行踪合理。",
    routineLabel: "稿件与采风", startingLocationId: "linjiang-news", workLocationIds: ["linjiang-news", "jianghai-hotel", "third-dock", "wu-clock-shop"], workHours: { startMinute: 8 * 60, endMinute: 21 * 60 },
    workKinds: ["submit_column", "street_research", "proofread_copy"], initialContactCharacterIds: ["lin-ruolan"],
    accountability: {
      mode: "editorial", awaitingLabel: "待采写", activeLabel: "稿务正常", excusedLabel: "选题已报备", lapseLabel: "稿件断档",
      riskLabel: "编辑怀疑", lapseCountLabel: "连续稿件断档", recordProgressLabel: "今日可核验采写记录", observerLabel: "编辑与同行观察", allowsLeave: false,
      lapseSummary: "今天没有留下来稿、采风笔记或校样记录，编辑开始怀疑你的公开行程。",
      reviewSummary: "编辑部开始核对你近期的选题、采访对象和交稿去向。",
      conversationCreditSummary: "你围绕选题与采访持续交流并留下笔记，形成了可被编辑部核对的采写记录。",
      lapseWarning: "稿件和采写记录长期断档会损害编辑信任，并引来对行踪的追问。",
    },
  },
];

export function getCoverProfile(id: string | undefined) {
  return COVER_PROFILES.find((profile) => profile.id === id) ?? COVER_PROFILES[0];
}

export function getCampaignCoverProfile(campaign: CampaignDefinition, id: string | undefined): CoverProfileDefinition {
  const base = id ? COVER_PROFILES.find((profile) => profile.id === id) : COVER_PROFILES[0];
  if (!base) throw new Error(`Unknown cover profile: ${id}`);
  const configured = campaign.coverProfiles?.[base.id];
  if (!configured) throw new Error(`Campaign ${campaign.id} has no entry configuration for cover profile ${base.id}`);
  return {
    ...base,
    startingLocationId: configured.startingLocationId,
    workLocationIds: [...configured.workLocationIds],
    initialContactCharacterIds: [...configured.initialContactCharacterIds],
  };
}
