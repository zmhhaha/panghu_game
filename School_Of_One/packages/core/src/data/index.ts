export { FACTIONS } from "./factions";

// 少林寺
export { SHAOLIN_CARDS, LUOHAN_CARDS, WUXING_CARDS } from "./presetCards/shaolin_wuxing";
// 武当派
export { TAIJI_CARDS, BAGUA_CARDS, XINGYI_CARDS } from "./presetCards/wudang";
// 北拳
export { BAJI_CARDS, TONGBEI_CARDS, FANZI_CARDS, CHUO_JIAO_CARDS, TANGLANG_CARDS, MIZONG_CARDS } from "./presetCards/northern";
// 南拳
export { YONGCHUN_CARDS, HONG_CARDS, CHOY_LI_FUT_CARDS } from "./presetCards/southern";

import type { PresetCard } from "../types/index.js";
import { SHAOLIN_CARDS, LUOHAN_CARDS, WUXING_CARDS } from "./presetCards/shaolin_wuxing";
import { TAIJI_CARDS, BAGUA_CARDS, XINGYI_CARDS } from "./presetCards/wudang";
import { BAJI_CARDS, TONGBEI_CARDS, FANZI_CARDS, CHUO_JIAO_CARDS, TANGLANG_CARDS, MIZONG_CARDS } from "./presetCards/northern";
import { YONGCHUN_CARDS, HONG_CARDS, CHOY_LI_FUT_CARDS } from "./presetCards/southern";

export function getAllPresetCards(): PresetCard[] {
  return [
    // 少林寺
    ...SHAOLIN_CARDS, ...LUOHAN_CARDS, ...WUXING_CARDS,
    // 武当派
    ...TAIJI_CARDS, ...BAGUA_CARDS, ...XINGYI_CARDS,
    // 北拳
    ...BAJI_CARDS, ...TONGBEI_CARDS, ...FANZI_CARDS, ...CHUO_JIAO_CARDS, ...TANGLANG_CARDS, ...MIZONG_CARDS,
    // 南拳
    ...YONGCHUN_CARDS, ...HONG_CARDS, ...CHOY_LI_FUT_CARDS,
  ];
}

export function getPresetCardsByFaction(factionId: string): PresetCard[] {
  return getAllPresetCards().filter((c) => c.factionId === factionId);
}
