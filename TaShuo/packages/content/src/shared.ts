import type { CaseStage } from "@tashuo/core";

export const STANDARD_STAGES: CaseStage[] = [
  { id: "breaking", name: "引爆", startsAtMinute: 0 },
  { id: "spreading", name: "扩散", startsAtMinute: 360 },
  { id: "polarizing", name: "对立", startsAtMinute: 1_440 },
  { id: "follow_up", name: "后续", startsAtMinute: 4_320 },
  { id: "cooling", name: "冷却", startsAtMinute: 7_920 },
];
