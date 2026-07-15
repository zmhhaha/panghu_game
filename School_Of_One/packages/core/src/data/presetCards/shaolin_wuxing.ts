import { PresetCard } from "../../types/index.js";
// ==================== 少林拳（12张） ====================
export const SHAOLIN_CARDS: PresetCard[] = [
  { id:"shaolin-starting", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"童子拜佛", description:"双手合十立于胸前，双脚不丁不八，气沉丹田。看似礼佛，实则攻守兼备。", isStarter:true, keywords:["起手","防御","礼佛"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"shaolin-1", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"罗汉拳", description:"少林入门拳法，招式朴实无华但根基扎实，一拳一式皆有千斤之力。", isStarter:false, keywords:["拳法","基础","刚猛"], source:"preset", displacement:0.3, createdAt: new Date().toISOString() },
  { id:"shaolin-2", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"金刚指", description:"以一指之力贯透金石，专攻对手穴位要害。快准狠，中者立时受制。", isStarter:false, keywords:["指法","点穴","穿透"], source:"preset", displacement:0.2, createdAt: new Date().toISOString() },
  { id:"shaolin-3", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"铁布衫", description:"气运周身，皮如铁骨如钢。寻常拳脚打在身，如同击在铁钟之上。", isStarter:false, keywords:["护体","硬功","防御"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"shaolin-4", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"少林弹腿", description:"腿法凌厉，连环踢出如浪潮般连绵不断。专攻下盘，令对手站立不稳。", isStarter:false, keywords:["腿法","弹腿","下盘"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"shaolin-5", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"少林长拳", description:"大开大合的长拳招式，攻防一体。一拳打出，后续变化无穷。", isStarter:false, keywords:["长拳","大开大合","刚猛"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"shaolin-6", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"虎拳", description:"模仿猛虎扑食之势，气势凶猛。双爪如钩，扑击时带起凌厉风声。", isStarter:false, keywords:["虎形","猛扑","五形拳"], source:"preset", displacement:0.5, createdAt: new Date().toISOString() },
  { id:"shaolin-7", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"擒拿手", description:"以巧劲锁拿对手关节，一旦拿住，对方有力难施。少林擒拿三十六式。", isStarter:false, keywords:["擒拿","锁技","控制"], source:"preset", displacement:0.1, createdAt: new Date().toISOString() },
  { id:"shaolin-8", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"金钟罩", description:"少林最高深的外功之一，功成后如金钟罩体。任你狂风暴雨，我自岿然不动。", isStarter:false, keywords:["金钟罩","护体","顶级"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"shaolin-9", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"心意把", description:"少林秘传内功心法，意到气到，气到力到。一发动全身，劲力连绵不绝。", isStarter:false, keywords:["内功","心意","秘传"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"shaolin-10", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"达摩渡江", description:"一苇渡江之绝技！集少林武学之大成，一击之下有摧枯拉朽之势。达摩祖师所传。", isStarter:false, keywords:["达摩","绝技","终极"], source:"preset", displacement:0.7, createdAt: new Date().toISOString() },
  { id:"shaolin-11", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"扫堂腿", description:"弯腰扫腿，专攻对方下三路。一腿扫出，对手若躲避不及便会重心不稳。", isStarter:false, keywords:["扫堂","腿法","下盘"], source:"preset", displacement:0.3, createdAt: new Date().toISOString() },
  { id:"shaolin-12", factionId:"shaolin-temple", gameId:"martial-hegemony", name:"少林七星拳", description:"少林七星拳，脚踏七星步法。一连七拳连环出击，如北斗七星般各有章法。", isStarter:false, keywords:["七星拳","步法","连环"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
];

// ==================== 罗汉拳（9张） ====================
export const LUOHAN_CARDS: PresetCard[] = [
  { id:"luohan-1", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉出洞", description:"罗汉拳起手之式，沉腰坐马双拳齐出。如罗汉出洞，势沉力猛。", isStarter:false, keywords:["出洞","起手","罗汉"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"luohan-2", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉捧经", description:"双手捧于胸前如捧佛经，看似恭敬实则护住周身要害。以静待动之法。", isStarter:false, keywords:["捧经","防守","恭立"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"luohan-3", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉撞钟", description:"以肩带身撞向对手，如罗汉撞钟。八极有铁山靠，罗汉有撞钟式，同属少林硬功。", isStarter:false, keywords:["撞钟","靠打","近身"], source:"preset", displacement:0.6, createdAt: new Date().toISOString() },
  { id:"luohan-4", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉伏虎", description:"罗汉伏虎势，一腿扫出击打下盘。伏虎降龙，先从脚下着手。", isStarter:false, keywords:["伏虎","扫腿","下盘"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"luohan-5", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉连环掌", description:"左右连环出掌，一掌连一掌如排山倒海。罗汉掌法简洁朴实但功力深厚。", isStarter:false, keywords:["连环掌","掌法","连击"], source:"preset", displacement:0.3, createdAt: new Date().toISOString() },
  { id:"luohan-6", factionId:"luohan-sub", gameId:"martial-hegemony", name:"金身罗汉", description:"运功全身如金身铸就，任凭拳脚相加而不动分毫。罗汉金身，诸邪不侵。", isStarter:false, keywords:["金身","护体","硬功"], source:"preset", displacement:0, createdAt: new Date().toISOString() },
  { id:"luohan-7", factionId:"luohan-sub", gameId:"martial-hegemony", name:"降龙手", description:"罗汉擒龙手法，一旦搭手即锁拿对手关节。降龙伏虎，手到擒来。", isStarter:false, keywords:["降龙","擒拿","锁扣"], source:"preset", displacement:0.2, createdAt: new Date().toISOString() },
  { id:"luohan-8", factionId:"luohan-sub", gameId:"martial-hegemony", name:"罗汉连环拳", description:"罗汉拳法连环出击，左拳右掌上击下踢。一套组合拳如十八罗汉齐出手。", isStarter:false, keywords:["连环拳","组合","密集"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"luohan-9", factionId:"luohan-sub", gameId:"martial-hegemony", name:"十八罗汉阵", description:"十八罗汉齐出手之势，四面八方皆是人影。一击接一击如潮水般永不停歇。", isStarter:false, keywords:["十八罗汉","罗汉阵","终极"], source:"preset", displacement:0.6, createdAt: new Date().toISOString() },
];

// ==================== 五形拳（9张） ====================
export const WUXING_CARDS: PresetCard[] = [
  { id:"wuxing-1", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"金龙探爪", description:"龙形掌法，五指如龙爪探出。目标为对手面部和颈部，出手带风，气势威猛。", isStarter:false, keywords:["龙形","探爪","掌法"], source:"preset", displacement:0.4, createdAt: new Date().toISOString() },
  { id:"wuxing-2", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"白蛇吐信", description:"蛇形手法，以指尖戳击对手眼喉等要害。速度快如蛇信，一触即收，阴柔狠辣。", isStarter:false, keywords:["蛇形","吐信","指法"], source:"preset", displacement:0.2, createdAt: new Date().toISOString() },
  { id:"wuxing-3", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"猛虎扑食", description:"虎形拳法。双爪齐出扑向对手，气势凶猛如饿虎下山。重击时带有震慑力。", isStarter:false, keywords:["虎形","扑食","猛扑"], source:"preset", displacement:0.6, createdAt: new Date().toISOString() },
  { id:"wuxing-4", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"豹子冲撞", description:"豹形拳法。爆发力极强，短距离冲刺速度惊人。数步之内即可冲至对手面前。", isStarter:false, keywords:["豹形","冲撞","爆发"], source:"preset", displacement:0.5, createdAt: new Date().toISOString() },
  { id:"wuxing-5", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"白鹤亮翅", description:"鹤形防御法，展臂如鹤翅。防守时身法灵活，一面防守一面寻找对手破绽。", isStarter:false, keywords:["鹤形","亮翅","防守"], source:"preset", displacement:-0.3, createdAt: new Date().toISOString() },
  { id:"wuxing-6", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"龙腾四海", description:"龙形高阶技法，腾身高跃从上下两路同时进攻。如龙腾四海，翻云覆雨。", isStarter:false, keywords:["龙腾","腾跃","上下"], source:"preset", displacement:0.6, createdAt: new Date().toISOString() },
  { id:"wuxing-7", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"灵蛇盘树", description:"蛇形缠法，双手如蛇般缠绕对手手臂和身体。越缠越紧，令对手动弹不得。", isStarter:false, keywords:["灵蛇","缠法","控制"], source:"preset", displacement:0.1, createdAt: new Date().toISOString() },
  { id:"wuxing-8", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"鹤立鸡群", description:"单腿独立，双臂上扬。身形高挑如鹤立鸡群，居高临下观察对手动向，随时反击。", isStarter:false, keywords:["鹤立","独立","防守"], source:"preset", displacement:-0.3, createdAt: new Date().toISOString() },
  { id:"wuxing-9", factionId:"wuxing-sub", gameId:"martial-hegemony", name:"五形合一", description:"龙虎豹蛇鹤五形齐出。时如龙腾、时如虎扑、时如豹冲、时如蛇缠、时如鹤击。五种形态轮番变换。", isStarter:false, keywords:["五形合一","龙虎豹蛇鹤","变化"], source:"preset", displacement:0.7, createdAt: new Date().toISOString() },
];
