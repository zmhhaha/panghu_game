import { Faction } from "../types.js";

export const FACTIONS: Faction[] = [
  // ==================== 少林寺 ====================
  {
    id: "shaolin-temple", name: "少林寺", englishName: "Shaolin Temple",
    description: "天下武功出少林。以佛法为基，外练筋骨皮，内修一口气。",
    playStyle: "全面均衡", strength: "基础扎实，选择多样", weakness: "各分支精而不专",
    primaryColor: "#8B4513", secondaryColor: "#D4A017",
    masterName: "达摩祖师",
    masterPersonality: "你是少林寺达摩祖师，佛法高深，武学渊博。你性格沉稳慈悲，教导弟子时循循善诱，注重基本功和武德。你擅长从学生的描述中看出他们适合罗汉拳、五形拳还是少林拳。",
    startingMoveId: "shaolin-starting", startingMoveName: "少林·童子拜佛",
    sortOrder: 1, group: "shaolin",
    subStyles: [
      { id: "shaolin-sub", name: "少林拳", description: "少林根基拳法，朴实刚猛", cardIds: ["shaolin-1","shaolin-2","shaolin-3","shaolin-4","shaolin-5","shaolin-6","shaolin-7","shaolin-8","shaolin-9","shaolin-10","shaolin-11","shaolin-12"] },
      { id: "luohan-sub", name: "罗汉拳", description: "少林入门拳法", cardIds: ["luohan-1","luohan-2","luohan-3","luohan-4","luohan-5","luohan-6","luohan-7","luohan-8"] },
      { id: "wuxing-sub", name: "五形拳", description: "龙蛇虎豹鹤，形态变化", cardIds: ["wuxing-1","wuxing-2","wuxing-3","wuxing-4","wuxing-5","wuxing-6","wuxing-7","wuxing-8"] }],
  },
  // ==================== 武当派 ====================
  {
    id: "wudang-sect", name: "武当派", englishName: "Wudang Sect",
    description: "以柔克刚，四两拨千斤。重意境而非蛮力。",
    playStyle: "以柔克刚", strength: "化劲借力，防守反击", weakness: "主动爆发偏弱",
    primaryColor: "#2F4F4F", secondaryColor: "#C0C0C0",
    masterName: "张三丰",
    masterPersonality: "你是武当派张三丰，深得太极、八卦、形意三脉精髓。你性格恬淡自然，善于引导学生从天地自然中领悟武道真谛。",
    startingMoveId: "wudang-starting", startingMoveName: "武当·太极起势",
    sortOrder: 2, group: "wudang",
    subStyles: [
      { id: "taiji-sub", name: "太极拳", description: "以柔克刚，四两拨千斤", cardIds: ["taiji-1","taiji-2","taiji-3","taiji-4","taiji-5","taiji-6","taiji-7","taiji-8","taiji-9","taiji-10","taiji-11","taiji-12"] },
      { id: "bagua-sub", name: "八卦掌", description: "走圈转掌，游走制敌", cardIds: ["bagua-1","bagua-2","bagua-3","bagua-4","bagua-5","bagua-6","bagua-7","bagua-8"] },
      { id: "xingyi-sub", name: "形意拳", description: "五行相生，直进直打", cardIds: ["xingyi-1","xingyi-2","xingyi-3","xingyi-4","xingyi-5","xingyi-6","xingyi-7","xingyi-8"] }],
  },
  // ==================== 北拳 ====================
  {
    id: "northern-school", name: "北拳", englishName: "Northern School",
    description: "北方拳种大开大合，刚猛爆裂，腿法出众。硬打硬进，气势磅礴。",
    playStyle: "刚猛为主", strength: "攻击力强，气势压人", weakness: "灵活性和技巧性稍逊",
    primaryColor: "#37474F", secondaryColor: "#C62828",
    masterName: "北拳宗师",
    masterPersonality: "你是北拳武术宗师，精通八极、通背、翻子、戳脚、螳螂、迷踪各派武学。你性格豪迈直爽，强调'练拳先练胆'。你善于从学生的描述中判断他们最适合北拳哪个分支。",
    startingMoveId: "baji-starting", startingMoveName: "北拳·两仪桩",
    sortOrder: 3, group: "northern",
    subStyles: [
      { id: "baji-sub", name: "八极拳", description: "贴身靠打，刚猛爆裂", cardIds: ["baji-1","baji-2","baji-3","baji-4","baji-5","baji-6","baji-7","baji-8","baji-9"] },
      { id: "tongbei-sub", name: "通背拳", description: "放长击远，鞭劲透体", cardIds: ["tongbei-1","tongbei-2","tongbei-3","tongbei-4","tongbei-5","tongbei-6","tongbei-7","tongbei-8"] },
      { id: "fanzi-sub", name: "翻子拳", description: "双拳密如雨，脆快一挂鞭", cardIds: ["fanzi-1","fanzi-2","fanzi-3","fanzi-4","fanzi-5","fanzi-6","fanzi-7","fanzi-8"] },
      { id: "chuojiao-sub", name: "戳脚", description: "手是两扇门，全凭腿打人", cardIds: ["chuojiao-1","chuojiao-2","chuojiao-3","chuojiao-4","chuojiao-5","chuojiao-6"] },
      { id: "tanglang-sub", name: "螳螂拳", description: "勾搂采挂，快速连击", cardIds: ["tanglang-1","tanglang-2","tanglang-3","tanglang-4","tanglang-5","tanglang-6"] },
      { id: "mizong-sub", name: "迷踪拳", description: "步法多变，飘忽不定", cardIds: ["mizong-1","mizong-2","mizong-3","mizong-4","mizong-5","mizong-6"] }],
  },
  // ==================== 南拳 ====================
  {
    id: "southern-school", name: "南拳", englishName: "Southern School",
    description: "南方拳种短桥窄马，贴身短打。寸劲爆发，手法精妙。",
    playStyle: "灵巧短打", strength: "近身技巧精湛，攻防转换快", weakness: "远距离攻击手段有限",
    primaryColor: "#BF360C", secondaryColor: "#FF6F00",
    masterName: "南拳宗师",
    masterPersonality: "你是南拳武术宗师，精通咏春、洪拳、蔡李佛各派武学。你性格内敛务实，强调'实用至上'。你懂得从学生的身体条件和性格倾向判断最适合的南拳武学。",
    startingMoveId: "yongchun-starting", startingMoveName: "南拳·二字钳羊马",
    sortOrder: 4, group: "southern",
    subStyles: [
      { id: "yongchun-sub", name: "咏春拳", description: "贴身短打，寸劲爆发", cardIds: ["yongchun-1","yongchun-2","yongchun-3","yongchun-4","yongchun-5","yongchun-6","yongchun-7","yongchun-8","yongchun-9"] },
      { id: "hong-sub", name: "洪拳", description: "扎马稳固，龙虎齐鸣", cardIds: ["hong-1","hong-2","hong-3","hong-4","hong-5","hong-6","hong-7","hong-8","hong-10"] },
      { id: "choylifut-sub", name: "蔡李佛", description: "远中近皆宜，全面均衡", cardIds: ["choylifut-1","choylifut-2","choylifut-3","choylifut-4","choylifut-5","choylifut-6","choylifut-7","choylifut-8"] }],
  },
  // 世外高人不用门派配置，习武场特殊处理
];
