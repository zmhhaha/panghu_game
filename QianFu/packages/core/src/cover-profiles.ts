import type { CoverProfileDefinition } from "./types.js";

export const COVER_PROFILES: CoverProfileDefinition[] = [
  {
    id: "archive_clerk", title: "机要处档案员", summary: "持有机关出入便利，但必须维持明确的考勤和工作记录。",
    routineLabel: "机关考勤", startingLocationId: "archive-office", workLocationIds: ["archive-office"], workHours: { startMinute: 8 * 60, endMinute: 17 * 60 },
    workKinds: ["file_sorting", "duty_shift", "submit_report"], initialContactCharacterIds: ["chen-jingwen"],
  },
  {
    id: "travelling_merchant", title: "南北货行商", summary: "可自由在商埠活动；每日需完成一笔可被行会与客户认可的生意。",
    routineLabel: "经营周转", startingLocationId: "jianghai-hotel", workLocationIds: ["jianghai-hotel", "third-dock", "wu-clock-shop"], workHours: { startMinute: 7 * 60, endMinute: 19 * 60 },
    workKinds: ["settle_accounts", "visit_clients", "stock_check"], initialContactCharacterIds: ["luo-boan"],
  },
  {
    id: "freelance_writer", title: "自由撰稿人", summary: "不受固定坐班约束，却必须持续交稿、采风，并让编辑相信你行踪合理。",
    routineLabel: "稿件与采风", startingLocationId: "linjiang-news", workLocationIds: ["linjiang-news", "jianghai-hotel", "third-dock", "wu-clock-shop"], workHours: { startMinute: 8 * 60, endMinute: 21 * 60 },
    workKinds: ["submit_column", "street_research", "proofread_copy"], initialContactCharacterIds: ["lin-ruolan"],
  },
];

export function getCoverProfile(id: string | undefined) {
  return COVER_PROFILES.find((profile) => profile.id === id) ?? COVER_PROFILES[0];
}
