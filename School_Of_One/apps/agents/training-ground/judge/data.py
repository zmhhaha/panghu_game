"""
武术门派与卡牌数据 — 从 School_Of_One TypeScript 项目转换而来

包含 4 大门派、15 个子分支、~136 张预设卡牌
"""

# ==================== 门派定义 ====================

FACTIONS = [
    {
        "id": "shaolin-temple", "name": "少林寺", "englishName": "Shaolin Temple",
        "description": "天下武功出少林。以佛法为基，外练筋骨皮，内修一口气。",
        "playStyle": "全面均衡", "strength": "基础扎实，选择多样", "weakness": "各分支精而不专",
        "masterName": "玄慈大师",
        "masterPersonality": "你是少林寺玄慈大师，佛法高深，武学渊博。你性格沉稳慈悲，教导弟子时循循善诱，注重基本功和武德。你擅长从学生的描述中看出他们适合罗汉拳、五形拳还是少林拳。",
        "startingMoveName": "少林·童子拜佛",
        "group": "shaolin",
        "subStyles": [
            {"id": "shaolin-sub", "name": "少林拳", "description": "少林根基拳法，朴实刚猛"},
            {"id": "luohan-sub", "name": "罗汉拳", "description": "少林入门拳法，根基扎实"},
            {"id": "wuxing-sub", "name": "五形拳", "description": "龙蛇虎豹鹤，形态变化"},
        ],
    },
    {
        "id": "wudang-sect", "name": "武当派", "englishName": "Wudang Sect",
        "description": "以柔克刚，四两拨千斤。重意境而非蛮力。",
        "playStyle": "以柔克刚", "strength": "化劲借力，防守反击", "weakness": "主动爆发偏弱",
        "masterName": "冲虚道长",
        "masterPersonality": "你是武当派冲虚道长，深得太极、八卦、形意三脉精髓。你性格恬淡自然，善于引导学生从天地自然中领悟武道真谛。",
        "startingMoveName": "武当·太极起势",
        "group": "wudang",
        "subStyles": [
            {"id": "taiji-sub", "name": "太极拳", "description": "以柔克刚，四两拨千斤"},
            {"id": "bagua-sub", "name": "八卦掌", "description": "走圈转掌，游走制敌"},
            {"id": "xingyi-sub", "name": "形意拳", "description": "五行相生，直进直打"},
        ],
    },
    {
        "id": "northern-school", "name": "北派", "englishName": "Northern School",
        "description": "北方拳种大开大合，刚猛爆裂，腿法出众。硬打硬进，气势磅礴。",
        "playStyle": "刚猛为主", "strength": "攻击力强，气势压人", "weakness": "灵活性和技巧性稍逊",
        "masterName": "北派宗师",
        "masterPersonality": "你是北派武术宗师，精通八极、通背、翻子、戳脚、螳螂、迷踪各派武学。你性格豪迈直爽，强调'练拳先练胆'。你善于从学生的描述中判断他们最适合北派哪个分支。",
        "startingMoveName": "北派·两仪桩",
        "group": "northern",
        "subStyles": [
            {"id": "baji-sub", "name": "八极拳", "description": "贴身靠打，刚猛爆裂"},
            {"id": "tongbei-sub", "name": "通背拳", "description": "放长击远，鞭劲透体"},
            {"id": "fanzi-sub", "name": "翻子拳", "description": "双拳密如雨，脆快一挂鞭"},
            {"id": "chuojiao-sub", "name": "戳脚", "description": "手是两扇门，全凭腿打人"},
            {"id": "tanglang-sub", "name": "螳螂拳", "description": "勾搂采挂，快速连击"},
            {"id": "mizong-sub", "name": "迷踪拳", "description": "步法多变，飘忽不定"},
        ],
    },
    {
        "id": "southern-school", "name": "南派", "englishName": "Southern School",
        "description": "南方拳种短桥窄马，贴身短打。寸劲爆发，手法精妙。",
        "playStyle": "灵巧短打", "strength": "近身技巧精湛，攻防转换快", "weakness": "远距离攻击手段有限",
        "masterName": "南派宗师",
        "masterPersonality": "你是南派武术宗师，精通咏春、洪拳、蔡李佛各派武学。你性格内敛务实，强调'实用至上'。你懂得从学生的身体条件和性格倾向判断最适合的南派武学。",
        "startingMoveName": "南派·二字钳羊马",
        "group": "southern",
        "subStyles": [
            {"id": "yongchun-sub", "name": "咏春拳", "description": "贴身短打，寸劲爆发"},
            {"id": "hong-sub", "name": "洪拳", "description": "扎马稳固，龙虎齐鸣"},
            {"id": "choylifut-sub", "name": "蔡李佛", "description": "远中近皆宜，全面均衡"},
        ],
    },
]

FACTION_MAP = {f["id"]: f for f in FACTIONS}

# ==================== 卡牌数据 ====================

PRESET_CARDS = [
    # ===== 少林拳 (12张) =====
    {"id": "shaolin-starting", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "童子拜佛", "description": "双手合十立于胸前，双脚不丁不八，气沉丹田。看似礼佛，实则攻守兼备。", "isStarter": True, "keywords": ["起手", "防御", "礼佛"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-1", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "罗汉拳", "description": "少林入门拳法，招式朴实无华但根基扎实，一拳一式皆有千斤之力。", "isStarter": False, "keywords": ["拳法", "基础", "刚猛"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-2", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "金刚指", "description": "以一指之力贯透金石，专攻对手穴位要害。快准狠，中者立时受制。", "isStarter": False, "keywords": ["指法", "点穴", "穿透"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-3", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "铁布衫", "description": "气运周身，皮如铁骨如钢。寻常拳脚打在身，如同击在铁钟之上。", "isStarter": False, "keywords": ["护体", "硬功", "防御"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-4", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "少林弹腿", "description": "腿法凌厉，连环踢出如浪潮般连绵不断。专攻下盘，令对手站立不稳。", "isStarter": False, "keywords": ["腿法", "弹腿", "下盘"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-5", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "少林长拳", "description": "大开大合的长拳招式，攻防一体。一拳打出，后续变化无穷。", "isStarter": False, "keywords": ["长拳", "大开大合", "刚猛"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-6", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "虎拳", "description": "模仿猛虎扑食之势，气势凶猛。双爪如钩，扑击时带起凌厉风声。", "isStarter": False, "keywords": ["虎形", "猛扑", "五形拳"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-7", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "擒拿手", "description": "以巧劲锁拿对手关节，一旦拿住，对方有力难施。少林擒拿三十六式。", "isStarter": False, "keywords": ["擒拿", "锁技", "控制"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-8", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "金钟罩", "description": "少林最高深的外功之一，功成后如金钟罩体。任你狂风暴雨，我自岿然不动。", "isStarter": False, "keywords": ["金钟罩", "护体", "顶级"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-9", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "心意把", "description": "少林秘传内功心法，意到气到，气到力到。一发动全身，劲力连绵不绝。", "isStarter": False, "keywords": ["内功", "心意", "秘传"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-10", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "达摩渡江", "description": "一苇渡江之绝技！集少林武学之大成，一击之下有摧枯拉朽之势。", "isStarter": False, "keywords": ["达摩", "绝技", "终极"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-11", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "扫堂腿", "description": "弯腰扫腿，专攻对方下三路。一腿扫出，对手若躲避不及便会重心不稳。", "isStarter": False, "keywords": ["扫堂", "腿法", "下盘"], "displacement": 0, "source": "preset"},
    {"id": "shaolin-12", "factionId": "shaolin-temple", "gameId": "martial-hegemony", "name": "少林七星拳", "description": "脚踏七星步法，一连七拳连环出击，如北斗七星般各有章法。", "isStarter": False, "keywords": ["七星拳", "步法", "连环"], "displacement": 0, "source": "preset"},

    # ===== 罗汉拳 (9张) =====
    {"id": "luohan-1", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉出洞", "description": "罗汉拳起手之式，沉腰坐马双拳齐出。如罗汉出洞，势沉力猛。", "isStarter": False, "keywords": ["出洞", "起手", "罗汉"], "displacement": 0, "source": "preset"},
    {"id": "luohan-2", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉捧经", "description": "双手捧于胸前如捧佛经，看似恭敬实则护住周身要害。以静待动之法。", "isStarter": False, "keywords": ["捧经", "防守", "恭立"], "displacement": 0, "source": "preset"},
    {"id": "luohan-3", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉撞钟", "description": "以肩带身撞向对手，如罗汉撞钟。属少林硬功，势大力沉。", "isStarter": False, "keywords": ["撞钟", "靠打", "近身"], "displacement": 0, "source": "preset"},
    {"id": "luohan-4", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉伏虎", "description": "罗汉伏虎势，一腿扫出击打下盘。伏虎降龙，先从脚下着手。", "isStarter": False, "keywords": ["伏虎", "扫腿", "下盘"], "displacement": 0, "source": "preset"},
    {"id": "luohan-5", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉连环掌", "description": "左右连环出掌，一掌连一掌如排山倒海。罗汉掌法简洁朴实但功力深厚。", "isStarter": False, "keywords": ["连环掌", "掌法", "连击"], "displacement": 0, "source": "preset"},
    {"id": "luohan-6", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "金身罗汉", "description": "运功全身如金身铸就，任凭拳脚相加而不动分毫。罗汉金身，诸邪不侵。", "isStarter": False, "keywords": ["金身", "护体", "硬功"], "displacement": 0, "source": "preset"},
    {"id": "luohan-7", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "降龙手", "description": "罗汉擒龙手法，一旦搭手即锁拿对手关节。降龙伏虎，手到擒来。", "isStarter": False, "keywords": ["降龙", "擒拿", "锁扣"], "displacement": 0, "source": "preset"},
    {"id": "luohan-8", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "罗汉连环拳", "description": "罗汉拳法连环出击，左拳右掌上击下踢。一套组合拳如十八罗汉齐出手。", "isStarter": False, "keywords": ["连环拳", "组合", "密集"], "displacement": 0, "source": "preset"},
    {"id": "luohan-9", "factionId": "luohan-sub", "gameId": "martial-hegemony", "name": "十八罗汉阵", "description": "十八罗汉齐出手之势，四面八方皆是人影。一击接一击如潮水般永不停歇。", "isStarter": False, "keywords": ["十八罗汉", "罗汉阵", "终极"], "displacement": 0, "source": "preset"},

    # ===== 五形拳 (9张) =====
    {"id": "wuxing-1", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "金龙探爪", "description": "龙形掌法，五指如龙爪探出。目标为对手面部和颈部，出手带风，气势威猛。", "isStarter": False, "keywords": ["龙形", "探爪", "掌法"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-2", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "白蛇吐信", "description": "蛇形手法，以指尖戳击对手眼喉等要害。速度快如蛇信，一触即收，阴柔狠辣。", "isStarter": False, "keywords": ["蛇形", "吐信", "指法"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-3", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "猛虎扑食", "description": "虎形拳法。双爪齐出扑向对手，气势凶猛如饿虎下山。重击时带有震慑力。", "isStarter": False, "keywords": ["虎形", "扑食", "猛扑"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-4", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "豹子冲撞", "description": "豹形拳法。爆发力极强，短距离冲刺速度惊人。数步之内即可冲至对手面前。", "isStarter": False, "keywords": ["豹形", "冲撞", "爆发"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-5", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "白鹤亮翅", "description": "鹤形防御法，展臂如鹤翅。防守时身法灵活，一面防守一面寻找对手破绽。", "isStarter": False, "keywords": ["鹤形", "亮翅", "防守"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-6", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "龙腾四海", "description": "龙形高阶技法，腾身高跃从上下两路同时进攻。如龙腾四海，翻云覆雨。", "isStarter": False, "keywords": ["龙腾", "腾跃", "上下"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-7", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "灵蛇盘树", "description": "蛇形缠法，双手如蛇般缠绕对手手臂和身体。越缠越紧，令对手动弹不得。", "isStarter": False, "keywords": ["灵蛇", "缠法", "控制"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-8", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "鹤立鸡群", "description": "单腿独立，双臂上扬。身形高挑如鹤立鸡群，居高临下观察对手动向，随时反击。", "isStarter": False, "keywords": ["鹤立", "独立", "防守"], "displacement": 0, "source": "preset"},
    {"id": "wuxing-9", "factionId": "wuxing-sub", "gameId": "martial-hegemony", "name": "五形合一", "description": "龙虎豹蛇鹤五形齐出。时如龙腾、时如虎扑、时如豹冲、时如蛇缠、时如鹤击。", "isStarter": False, "keywords": ["五形合一", "龙虎豹蛇鹤", "变化"], "displacement": 0, "source": "preset"},

    # ===== 太极拳 (12张) =====
    {"id": "taiji-starting", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "揽雀尾", "description": "双手画弧如揽雀尾，将对手来劲化为无形。", "displacement": 0, "isStarter": True, "keywords": ["揽雀尾", "化劲", "防守"], "source": "preset"},
    {"id": "taiji-1", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "单鞭", "description": "一手勾手为引一手立掌直推，一鞭之势可撼山岳。", "displacement": 0.2, "isStarter": False, "keywords": ["单鞭", "推掌", "中正"], "source": "preset"},
    {"id": "taiji-2", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "如封似闭", "description": "双手合围如关门封敌来路，闭门之后顺势反击。", "displacement": -0.2, "isStarter": False, "keywords": ["如封似闭", "防守", "关门"], "source": "preset"},
    {"id": "taiji-3", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "野马分鬃", "description": "两臂左右分展如野马扬鬃，一上一下攻势舒展。", "displacement": 0.4, "isStarter": False, "keywords": ["野马分鬃", "分掌", "舒展"], "source": "preset"},
    {"id": "taiji-4", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "云手", "description": "双手交替画圆如行云流水，使对手陷入太极漩涡。", "displacement": 0.1, "isStarter": False, "keywords": ["云手", "画圆", "化劲"], "source": "preset"},
    {"id": "taiji-5", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "左右蹬脚", "description": "一脚蹬出以脚跟发力专攻对手胸腹，势大力沉。", "displacement": 0.3, "isStarter": False, "keywords": ["蹬脚", "腿法", "脚跟"], "source": "preset"},
    {"id": "taiji-6", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "白鹤亮翅", "description": "展臂如白鹤亮翅一腿独立，身形舒展挺拔。", "displacement": -0.3, "isStarter": False, "keywords": ["白鹤亮翅", "身法", "闪避"], "source": "preset"},
    {"id": "taiji-7", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "搂膝拗步", "description": "一手搂开对手来腿一手顺势推掌，防守与进攻一气呵成。", "displacement": 0.5, "isStarter": False, "keywords": ["搂膝", "拗步", "防守反击"], "source": "preset"},
    {"id": "taiji-8", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "搬拦捶", "description": "先搬开防卫再拦阻退路最后一捶直击，三法合一。", "displacement": 0.5, "isStarter": False, "keywords": ["搬拦捶", "捶法", "三连"], "source": "preset"},
    {"id": "taiji-9", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "太极推手", "description": "搭手听劲化劲，感知对手力道方向顺势借力。", "displacement": 0, "isStarter": False, "keywords": ["推手", "听劲", "化劲"], "source": "preset"},
    {"id": "taiji-10", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "太极剑法", "description": "以太极之理运剑，剑身画弧连绵不绝剑意笼罩。", "displacement": 0.5, "isStarter": False, "keywords": ["太极剑", "剑法", "连绵"], "source": "preset"},
    {"id": "taiji-11", "factionId": "taiji-sub", "gameId": "martial-hegemony", "name": "四两拨千斤", "description": "顺人之势借人之力，以柔克刚四两拨千斤。太极拳最高心法。", "displacement": 0.3, "isStarter": False, "keywords": ["四两拨千斤", "借力", "以柔克刚"], "source": "preset"},

    # ===== 八卦掌 (9张) =====
    {"id": "bagua-1", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "八卦转掌", "description": "沿圈行走两掌翻转，步法带动身形，走中求变。", "displacement": -0.5, "isStarter": False, "keywords": ["转掌", "走圈", "步法"], "source": "preset"},
    {"id": "bagua-2", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "青龙探爪", "description": "掌如龙爪直取面门，速度极快一闪即至。", "displacement": 0.3, "isStarter": False, "keywords": ["青龙探爪", "掌法", "快攻"], "source": "preset"},
    {"id": "bagua-3", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "叶底藏花", "description": "一掌明攻上盘暗掌从腰侧击出，如叶下藏花。", "displacement": 0.4, "isStarter": False, "keywords": ["叶底藏花", "暗手", "隐蔽"], "source": "preset"},
    {"id": "bagua-4", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "游身八卦", "description": "身如游龙穿梭，步踏八卦方位在对手四周游走。", "displacement": -0.7, "isStarter": False, "keywords": ["游身", "走转", "步法"], "source": "preset"},
    {"id": "bagua-5", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "指天划地", "description": "一手上击面门一手下攻小腹，上下齐发。", "displacement": 0.4, "isStarter": False, "keywords": ["指天划地", "上下", "连击"], "source": "preset"},
    {"id": "bagua-6", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "双掌推山", "description": "双掌齐出向前推去如推倒山壁之势。", "displacement": 0.3, "isStarter": False, "keywords": ["双掌", "推山", "正面"], "source": "preset"},
    {"id": "bagua-7", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "八卦绕后", "description": "踏八卦方位绕至对手身后，令其完全丢失目标。", "displacement": -0.9, "isStarter": False, "keywords": ["绕后", "步法", "偷袭"], "source": "preset"},
    {"id": "bagua-8", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "八卦连环掌", "description": "走转中连发六掌，每掌方位不同令人无法预测。", "displacement": 0.5, "isStarter": False, "keywords": ["连环掌", "六掌", "变化"], "source": "preset"},
    {"id": "bagua-9", "factionId": "bagua-sub", "gameId": "martial-hegemony", "name": "六十四掌", "description": "踏遍六十四方位每方位出一掌，掌影铺天盖地。", "displacement": 0.6, "isStarter": False, "keywords": ["六十四掌", "终极", "八卦阵"], "source": "preset"},

    # ===== 形意拳 (9张) =====
    {"id": "xingyi-1", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "崩拳", "description": "五行属木，拳从胸口直奔而出如箭离弦一往无前。", "displacement": 0.4, "isStarter": False, "keywords": ["崩拳", "五行", "属木"], "source": "preset"},
    {"id": "xingyi-2", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "劈拳", "description": "五行属金，拳如劈斧由上而下势大力沉。", "displacement": 0.5, "isStarter": False, "keywords": ["劈拳", "五行", "属金"], "source": "preset"},
    {"id": "xingyi-3", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "钻拳", "description": "五行属水，拳如翻浪自下而上钻击对手下颌。", "displacement": 0.2, "isStarter": False, "keywords": ["钻拳", "五行", "属水"], "source": "preset"},
    {"id": "xingyi-4", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "炮拳", "description": "五行属火，拳出如炮弹出膛爆炸力极强。", "displacement": 0.6, "isStarter": False, "keywords": ["炮拳", "五行", "属火"], "source": "preset"},
    {"id": "xingyi-5", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "横拳", "description": "五行属土，拳走横劲如犁翻土破直劲。", "displacement": 0.1, "isStarter": False, "keywords": ["横拳", "五行", "属土"], "source": "preset"},
    {"id": "xingyi-6", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "箭拳", "description": "直线攻击如箭离弦，速度奇快以巧取胜。", "displacement": 0.3, "isStarter": False, "keywords": ["箭拳", "直线", "快速"], "source": "preset"},
    {"id": "xingyi-7", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "虎抱头", "description": "双手护头如虎抱之势，护住要害蓄势待发。", "displacement": -0.2, "isStarter": False, "keywords": ["虎抱头", "防守", "蓄势"], "source": "preset"},
    {"id": "xingyi-8", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "半步崩拳", "description": "上半步出一崩拳压缩距离爆发力倍增。郭云深半步崩拳打天下。", "displacement": 0.4, "isStarter": False, "keywords": ["半步崩拳", "崩拳", "绝技"], "source": "preset"},
    {"id": "xingyi-9", "factionId": "xingyi-sub", "gameId": "martial-hegemony", "name": "五行连环", "description": "劈钻崩炮横五行连环相生劲力叠加，连绵不绝。", "displacement": 0.8, "isStarter": False, "keywords": ["五行", "连环", "相生"], "source": "preset"},

    # ===== 八极拳 (10张) =====
    {"id": "baji-starting", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "撑锤", "description": "八极拳核心招式，拧腰顺肩一拳撑出如离弦之箭。", "displacement": 0.5, "isStarter": True, "keywords": ["撑锤", "六大开", "崩拳"], "source": "preset"},
    {"id": "baji-1", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "顶肘", "description": "八极拳代表性肘法，沉肩坠肘全身之力集于一肘。", "displacement": 0.4, "isStarter": False, "keywords": ["顶肘", "肘法", "近身"], "source": "preset"},
    {"id": "baji-2", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "铁山靠", "description": "以肩背撞击对手，浑身如一堵铁墙压来。", "displacement": 0.8, "isStarter": False, "keywords": ["铁山靠", "靠桩", "撞击"], "source": "preset"},
    {"id": "baji-3", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "崩肘", "description": "肘法下砸势如破竹，贴身时突然发力崩劲短促霸道。", "displacement": 0.2, "isStarter": False, "keywords": ["崩肘", "下砸", "肘法"], "source": "preset"},
    {"id": "baji-4", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "大缠丝", "description": "双手缠绕控制对手手臂关节使其难以发力。", "displacement": 0.2, "isStarter": False, "keywords": ["缠丝", "控制", "锁拿"], "source": "preset"},
    {"id": "baji-5", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "探马掌", "description": "一掌探出直取面门，看似虚招实则暗含发力。", "displacement": 0.3, "isStarter": False, "keywords": ["探马", "掌法", "面门"], "source": "preset"},
    {"id": "baji-6", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "伏虎", "description": "八极八大招之一，上打咽喉下撩阴招招要害。", "displacement": 0.4, "isStarter": False, "keywords": ["伏虎", "八大招", "要害"], "source": "preset"},
    {"id": "baji-7", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "劈挂掌", "description": "以掌代拳劈挂连击如刀削斧砍刚中带柔。", "displacement": 0.3, "isStarter": False, "keywords": ["劈挂", "掌法", "连击"], "source": "preset"},
    {"id": "baji-8", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "贴山靠", "description": "不靠肩背而靠胯，专攻对手腰胯更隐蔽。", "displacement": 0.6, "isStarter": False, "keywords": ["贴山靠", "靠打", "胯击"], "source": "preset"},
    {"id": "baji-9", "factionId": "baji-sub", "gameId": "martial-hegemony", "name": "六开合一", "description": "六大开终极合一，六劲齐发狂风骤雨般攻击。", "displacement": 1.0, "isStarter": False, "keywords": ["六大开", "终极", "绝杀"], "source": "preset"},

    # ===== 通背拳 (8张) =====
    {"id": "tongbei-1", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "劈山掌", "description": "以肩带臂一掌劈下如开山裂石，力从脊发。", "displacement": 0.4, "isStarter": False, "keywords": ["劈山", "掌法", "鞭劲"], "source": "preset"},
    {"id": "tongbei-2", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "猿猴出洞", "description": "如猿猴舒展长臂一击可及一丈开外。", "displacement": 0.6, "isStarter": False, "keywords": ["猿猴", "长臂", "远攻"], "source": "preset"},
    {"id": "tongbei-3", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "冷急带环", "description": "左右手交替连环出击一环扣一环越打越快。", "displacement": 0.3, "isStarter": False, "keywords": ["冷急带环", "连环", "快脆"], "source": "preset"},
    {"id": "tongbei-4", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "引手", "description": "一手虚引诱使对方出手，为后续重击制造机会。", "displacement": -0.3, "isStarter": False, "keywords": ["引手", "诱招", "虚招"], "source": "preset"},
    {"id": "tongbei-5", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "通背连环掌", "description": "两臂如鞭连抽带打，一掌接一掌连绵不绝。", "displacement": 0.5, "isStarter": False, "keywords": ["连环掌", "鞭劲", "连击"], "source": "preset"},
    {"id": "tongbei-6", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "通背穿掌", "description": "指尖贯穿如剑，专攻对手咽喉和眼部精准狠辣。", "displacement": 0.4, "isStarter": False, "keywords": ["穿掌", "指法", "精准"], "source": "preset"},
    {"id": "tongbei-7", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "捋带", "description": "顺对手来劲方向捋带，使其失去重心露出破绽。", "displacement": -0.4, "isStarter": False, "keywords": ["捋带", "借力", "顺劲"], "source": "preset"},
    {"id": "tongbei-8", "factionId": "tongbei-sub", "gameId": "martial-hegemony", "name": "通背绝命掌", "description": "通背拳终极杀招，全身之力集于一掌摧枯拉朽。", "displacement": 0.7, "isStarter": False, "keywords": ["绝命", "掌法", "终极"], "source": "preset"},

    # ===== 翻子拳 (8张) =====
    {"id": "fanzi-1", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "双拳密雨", "description": "双拳交替打出如暴雨倾泻重量不重力在速度。", "displacement": 0.3, "isStarter": False, "keywords": ["密雨", "快拳", "速度"], "source": "preset"},
    {"id": "fanzi-2", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "翻手为云", "description": "手腕翻转之间变招，对手难以预判拳路。", "displacement": 0.2, "isStarter": False, "keywords": ["翻手", "变招", "手腕"], "source": "preset"},
    {"id": "fanzi-3", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "脆快一挂鞭", "description": "连环快击如鞭炮炸响，快脆凌厉声声入耳。", "displacement": 0.4, "isStarter": False, "keywords": ["脆快", "挂鞭", "连环"], "source": "preset"},
    {"id": "fanzi-4", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "翻子劈掌", "description": "翻腕间一掌劈下出其不意，攻其不备。", "displacement": 0.3, "isStarter": False, "keywords": ["劈掌", "翻腕", "出其不意"], "source": "preset"},
    {"id": "fanzi-5", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "车轮拳", "description": "双臂轮转如车轮，左拳右掌交替攻击密不透风。", "displacement": 0.5, "isStarter": False, "keywords": ["车轮", "轮转", "密集"], "source": "preset"},
    {"id": "fanzi-6", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "翻子连珠", "description": "一秒钟连出数拳如连珠炮发，令对手防不胜防。", "displacement": 0.4, "isStarter": False, "keywords": ["连珠", "快拳", "连击"], "source": "preset"},
    {"id": "fanzi-7", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "收放自如", "description": "攻则如狂风暴雨，收则如潮水退去。收发之间转换极快。", "displacement": 0, "isStarter": False, "keywords": ["收放", "转换", "节奏"], "source": "preset"},
    {"id": "fanzi-8", "factionId": "fanzi-sub", "gameId": "martial-hegemony", "name": "翻子绝命拳", "description": "翻子拳终极奥义，快中加猛猛中加狠一击致命。", "displacement": 0.6, "isStarter": False, "keywords": ["绝命", "终极", "致命"], "source": "preset"},

    # ===== 戳脚 (7张) =====
    {"id": "chuojiao-1", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "鸳鸯腿", "description": "左右腿连环踢出如鸳鸯戏水，一腿虚一腿实虚实相生。", "displacement": 0.4, "isStarter": False, "keywords": ["鸳鸯腿", "连环", "虚实"], "source": "preset"},
    {"id": "chuojiao-2", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "罗汉铲腿", "description": "腿法如铲，专铲对手小腿胫骨发力短促霸道。", "displacement": 0.2, "isStarter": False, "keywords": ["铲腿", "下盘", "胫骨"], "source": "preset"},
    {"id": "chuojiao-3", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "玉环步", "description": "步法如环连环套环，走三步踢三腿步步紧逼。", "displacement": 0.5, "isStarter": False, "keywords": ["玉环步", "步法", "步腿合一"], "source": "preset"},
    {"id": "chuojiao-4", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "穿心腿", "description": "一脚直踹对手心窝如穿心之箭，发力刚猛直接。", "displacement": 0.6, "isStarter": False, "keywords": ["穿心腿", "踹", "直线"], "source": "preset"},
    {"id": "chuojiao-5", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "连环踢", "description": "双腿连环腾空踢出最多可连踢六脚。", "displacement": 0.7, "isStarter": False, "keywords": ["连环踢", "腾空", "多段"], "source": "preset"},
    {"id": "chuojiao-6", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "摆莲腿", "description": "一腿横扫如莲花摆荡，攻击面极广可踢可扫。", "displacement": 0.4, "isStarter": False, "keywords": ["摆莲", "横扫", "范围"], "source": "preset"},
    {"id": "chuojiao-7", "factionId": "chuojiao-sub", "gameId": "martial-hegemony", "name": "戳脚绝命踢", "description": "戳脚终极奥义，一腿踢出石破天惊无可阻挡。", "displacement": 0.9, "isStarter": False, "keywords": ["绝命踢", "终极", "必杀"], "source": "preset"},

    # ===== 螳螂拳 (7张) =====
    {"id": "tanglang-1", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂勾手", "description": "手指如螳螂前臂钩镰般钩挂对手攻势，一勾一采皆为手法。", "displacement": 0.2, "isStarter": False, "keywords": ["勾手", "钩镰", "手法"], "source": "preset"},
    {"id": "tanglang-2", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂捕蝉", "description": "以勾手锁拿对手手腕一拉一带令其失去重心。", "displacement": 0.3, "isStarter": False, "keywords": ["捕蝉", "锁拿", "控制"], "source": "preset"},
    {"id": "tanglang-3", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂挂肘", "description": "勾手挂住对手手肘顺势下拉，同时另一掌击其面门。", "displacement": 0.3, "isStarter": False, "keywords": ["挂肘", "勾挂", "上下"], "source": "preset"},
    {"id": "tanglang-4", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂推掌", "description": "勾手开路一推掌直击胸膛，连消带打。", "displacement": 0.4, "isStarter": False, "keywords": ["推掌", "连消带打", "掌法"], "source": "preset"},
    {"id": "tanglang-5", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂扑蝉", "description": "双臂前扑如螳螂捕猎，速度快且擒拿意识极强。", "displacement": 0.5, "isStarter": False, "keywords": ["扑蝉", "前扑", "速度"], "source": "preset"},
    {"id": "tanglang-6", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂翻车", "description": "勾手带对手手臂顺其力道翻身将其摔倒。", "displacement": 0.6, "isStarter": False, "keywords": ["翻车", "摔法", "借力"], "source": "preset"},
    {"id": "tanglang-7", "factionId": "tanglang-sub", "gameId": "martial-hegemony", "name": "螳螂绝杀", "description": "螳螂拳终极奥义，勾搂采挂推弹崩靠八法齐出。", "displacement": 0.7, "isStarter": False, "keywords": ["绝杀", "终极", "八法"], "source": "preset"},

    # ===== 迷踪拳 (7张) =====
    {"id": "mizong-1", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪步", "description": "步法飘忽不定忽左忽右，使对手无法判断方位。", "displacement": -0.6, "isStarter": False, "keywords": ["迷踪", "步法", "飘忽"], "source": "preset"},
    {"id": "mizong-2", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪幻影", "description": "身形晃动如产生残影，一真一假令对手难辨虚实。", "displacement": -0.4, "isStarter": False, "keywords": ["幻影", "残影", "身法"], "source": "preset"},
    {"id": "mizong-3", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪出手", "description": "在飘忽步法中突然出手一击，毫无征兆极难防御。", "displacement": 0.3, "isStarter": False, "keywords": ["出手", "突袭", "无征兆"], "source": "preset"},
    {"id": "mizong-4", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪绕步", "description": "绕步至对手侧方死角发动攻击，利用视线盲区。", "displacement": -0.5, "isStarter": False, "keywords": ["绕步", "死角", "侧击"], "source": "preset"},
    {"id": "mizong-5", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪连击", "description": "步法不停拳法不停，运动中连打出招方位变换。", "displacement": 0.5, "isStarter": False, "keywords": ["连击", "运动中", "变化"], "source": "preset"},
    {"id": "mizong-6", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪腿", "description": "步法带动腿法，出腿方位匪夷所思。", "displacement": 0.4, "isStarter": False, "keywords": ["迷踪腿", "腿法", "出其不意"], "source": "preset"},
    {"id": "mizong-7", "factionId": "mizong-sub", "gameId": "martial-hegemony", "name": "迷踪绝杀", "description": "迷踪拳终极奥义，身形步法拳法融为一体无迹可寻。", "displacement": 0.7, "isStarter": False, "keywords": ["绝杀", "终极", "无迹可寻"], "source": "preset"},

    # ===== 咏春拳 (10张) =====
    {"id": "yongchun-starting", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "二字钳羊马", "description": "咏春起手桩法，双脚内扣如钳羊马。稳固下盘以备短打。", "displacement": 0, "isStarter": True, "keywords": ["二字钳羊马", "桩法", "起手"], "source": "preset"},
    {"id": "yongchun-1", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "日字冲拳", "description": "咏春标志性拳法，拳由心发走最短路径连环快打。", "displacement": 0.3, "isStarter": False, "keywords": ["日字冲拳", "拳法", "快打"], "source": "preset"},
    {"id": "yongchun-2", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "摊手", "description": "手掌摊开向前伸出，以柔劲卸力听劲感知对手动态。", "displacement": 0.1, "isStarter": False, "keywords": ["摊手", "听劲", "卸力"], "source": "preset"},
    {"id": "yongchun-3", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "伏手", "description": "手掌伏压在对手桥手之上，控制其活动范围。", "displacement": 0.1, "isStarter": False, "keywords": ["伏手", "控制", "桥手"], "source": "preset"},
    {"id": "yongchun-4", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "膀手", "description": "以手臂为膀格挡对手攻击，同时保持反击姿态。", "displacement": -0.1, "isStarter": False, "keywords": ["膀手", "格挡", "防守"], "source": "preset"},
    {"id": "yongchun-5", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "标指", "description": "咏春高级手法，指尖标出直取对手咽喉眼睛等要害。", "displacement": 0.3, "isStarter": False, "keywords": ["标指", "指法", "要害"], "source": "preset"},
    {"id": "yongchun-6", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "寸拳", "description": "咏春绝技，极近距离爆发寸劲穿透力极强。", "displacement": 0.1, "isStarter": False, "keywords": ["寸拳", "寸劲", "爆发"], "source": "preset"},
    {"id": "yongchun-7", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "连环冲拳", "description": "日字冲拳连环打出如暴风骤雨，连绵不断。", "displacement": 0.5, "isStarter": False, "keywords": ["连环冲拳", "连打", "密集"], "source": "preset"},
    {"id": "yongchun-8", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "黐手", "description": "双手与对手桥手相接，通过触觉感知对手力道变化。", "displacement": 0, "isStarter": False, "keywords": ["黐手", "黏手", "感知"], "source": "preset"},
    {"id": "yongchun-9", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "木人桩法", "description": "对木人桩练习的实战手法，一百零八式变化无穷。", "displacement": 0.4, "isStarter": False, "keywords": ["木人桩", "实战", "变化"], "source": "preset"},
    {"id": "yongchun-10", "factionId": "yongchun-sub", "gameId": "martial-hegemony", "name": "咏春绝命手", "description": "咏春终极杀招，摊伏膀标寸连环使用无可阻挡。", "displacement": 0.6, "isStarter": False, "keywords": ["绝命手", "终极", "无可阻挡"], "source": "preset"},

    # ===== 洪拳 (10张) =====
    {"id": "hong-1", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "虎鹤双形", "description": "洪拳招牌招式，左手虎爪右手鹤嘴刚柔并济。", "displacement": 0.3, "isStarter": True, "keywords": ["虎鹤双形", "虎爪", "鹤嘴"], "source": "preset"},
    {"id": "hong-2", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "工字伏虎拳", "description": "洪拳基础套路，扎马稳固出拳有力如伏虎之势。", "displacement": 0.2, "isStarter": False, "keywords": ["工字", "伏虎", "扎马"], "source": "preset"},
    {"id": "hong-3", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "铁线拳", "description": "洪拳内功拳法，以刚猛之力行柔韧之法。", "displacement": 0.1, "isStarter": False, "keywords": ["铁线拳", "内功", "刚柔"], "source": "preset"},
    {"id": "hong-4", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳三展手", "description": "三次展手三次发力，层层叠加劲力越来越强。", "displacement": 0.4, "isStarter": False, "keywords": ["三展手", "展手", "叠加"], "source": "preset"},
    {"id": "hong-5", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳单弓手", "description": "一弓步冲拳势如破竹，以身形带动拳势威猛。", "displacement": 0.5, "isStarter": False, "keywords": ["单弓手", "弓步", "冲拳"], "source": "preset"},
    {"id": "hong-6", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳双弓手", "description": "左右开弓双拳齐出，威力倍增一往无前。", "displacement": 0.6, "isStarter": False, "keywords": ["双弓手", "左右", "齐出"], "source": "preset"},
    {"id": "hong-7", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳龙拳", "description": "龙形手法盘旋转折，运劲如龙行九天。", "displacement": 0.3, "isStarter": False, "keywords": ["龙拳", "龙形", "盘旋"], "source": "preset"},
    {"id": "hong-8", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳豹拳", "description": "豹形拳爆发力强，短距离冲刺速度快。", "displacement": 0.4, "isStarter": False, "keywords": ["豹拳", "爆发", "冲刺"], "source": "preset"},
    {"id": "hong-9", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳虎爪", "description": "五指如铁钩抓向对手，一旦抓住便不松手。", "displacement": 0.4, "isStarter": False, "keywords": ["虎爪", "抓法", "刚猛"], "source": "preset"},
    {"id": "hong-10", "factionId": "hong-sub", "gameId": "martial-hegemony", "name": "洪拳绝杀", "description": "洪拳集大成之杀招，虎鹤双形铁线拳合一。", "displacement": 0.7, "isStarter": False, "keywords": ["绝杀", "终极", "集大成"], "source": "preset"},

    # ===== 蔡李佛 (8张) =====
    {"id": "choylifut-1", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "穿心掌", "description": "一掌穿心直取要害，配合蔡李佛灵活步法。", "displacement": 0.3, "isStarter": True, "keywords": ["穿心掌", "掌法", "直击"], "source": "preset"},
    {"id": "choylifut-2", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "拆手", "description": "以手法拆解对手进攻，拆开即反击连消带打。", "displacement": 0.1, "isStarter": False, "keywords": ["拆手", "拆解", "连消带打"], "source": "preset"},
    {"id": "choylifut-3", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "蔡李佛冲拳", "description": "蔡李佛标志性冲拳，身正步稳拳由腰发。", "displacement": 0.3, "isStarter": False, "keywords": ["冲拳", "标志", "腰劲"], "source": "preset"},
    {"id": "choylifut-4", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "挂锤", "description": "由上向下挂砸一拳，势大力沉重在震荡。", "displacement": 0.2, "isStarter": False, "keywords": ["挂锤", "下砸", "震荡"], "source": "preset"},
    {"id": "choylifut-5", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "扫捶", "description": "横向扫拳攻击范围大，可用于压迫对手空间。", "displacement": 0.4, "isStarter": False, "keywords": ["扫捶", "横扫", "范围"], "source": "preset"},
    {"id": "choylifut-6", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "蔡李佛弹腿", "description": "弹腿快而出其不意，与拳法配合使用极具威胁。", "displacement": 0.5, "isStarter": False, "keywords": ["弹腿", "腿法", "配合"], "source": "preset"},
    {"id": "choylifut-7", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "蔡李佛连环", "description": "拳腿组合连环出击，远中近程全范围覆盖。", "displacement": 0.6, "isStarter": False, "keywords": ["连环", "拳腿", "全覆盖"], "source": "preset"},
    {"id": "choylifut-8", "factionId": "choylifut-sub", "gameId": "martial-hegemony", "name": "蔡李佛绝杀", "description": "蔡李佛终极奥义，挂扫冲弹连环四劲合一。", "displacement": 0.8, "isStarter": False, "keywords": ["绝杀", "终极", "四劲合一"], "source": "preset"},
]

CARD_MAP = {c["id"]: c for c in PRESET_CARDS}


# ==================== 工具函数 ====================

def get_factions() -> list[dict]:
    """获取所有门派列表（不含 masterPersonality 简化版）"""
    return [
        {k: v for k, v in f.items() if k != "masterPersonality"}
        for f in FACTIONS
    ]


def get_faction(faction_id: str) -> dict | None:
    """获取单个门派"""
    for f in FACTIONS:
        if f["id"] == faction_id:
            return f
    return None


def get_cards_by_faction(faction_id: str) -> list[dict]:
    """获取某个门派下的所有卡牌"""
    return [c for c in PRESET_CARDS if c["factionId"] == faction_id or
            any(s["id"] == faction_id for s in FACTION_MAP.get(faction_id, {}).get("subStyles", []))]


def get_cards_by_substyle(substyle_id: str) -> list[dict]:
    """获取某个分支下的所有卡牌"""
    return [c for c in PRESET_CARDS if c["factionId"] == substyle_id]


def search_cards_by_keywords(keywords: list[str]) -> list[dict]:
    """按关键词搜索卡牌"""
    results = []
    kws = set(k.lower() for k in keywords)
    for c in PRESET_CARDS:
        card_kws = set(k.lower() for k in c.get("keywords", []))
        if kws & card_kws:
            results.append(c)
    return sorted(results, key=lambda c: -len(kws & set(k.lower() for k in c.get("keywords", []))))
