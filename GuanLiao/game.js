(() => {
  "use strict";

  const STORAGE_KEY = "guanliao-save-v1";
  const STAT_LABELS = {
    livelihood: "民生",
    treasury: "库银",
    reputation: "官声",
    favor: "圣眷"
  };

  const ERAS = {
    ming: {
      mark: "大明",
      reign: "万历二十年",
      months: ["三月", "四月", "五月", "六月", "七月", "八月"],
      senderSuffix: "谨具本上陈"
    },
    qing: {
      mark: "大清",
      reign: "康熙二十三年",
      months: ["二月", "三月", "四月", "五月", "六月", "七月"],
      senderSuffix: "谨具折上陈"
    }
  };

  const ROUTES = {
    local: {
      name: "州县亲民官",
      baseStats: { livelihood: 62, treasury: 52, reputation: 50, favor: 43 },
      ranks: [
        { grade: "正七品", title: "知县", threshold: 0 },
        { grade: "从六品", title: "州同", threshold: 70 },
        { grade: "正六品", title: "通判", threshold: 155 },
        { grade: "从五品", title: "知州", threshold: 255 },
        { grade: "正五品", title: "同知", threshold: 370 }
      ]
    },
    central: {
      name: "六部司官",
      baseStats: { livelihood: 47, treasury: 58, reputation: 55, favor: 52 },
      ranks: [
        { grade: "正六品", title: "主事", threshold: 0 },
        { grade: "从五品", title: "员外郎", threshold: 80 },
        { grade: "正五品", title: "郎中", threshold: 175 },
        { grade: "正四品", title: "侍郎衔", threshold: 285 },
        { grade: "正三品", title: "侍郎", threshold: 410 }
      ]
    },
    regional: {
      name: "封疆方面官",
      baseStats: { livelihood: 55, treasury: 60, reputation: 46, favor: 50 },
      ranks: [
        { grade: "正四品", title: "知府", threshold: 0 },
        { grade: "从三品", title: "按察使", threshold: 90 },
        { grade: "正三品", title: "布政使", threshold: 195 },
        { grade: "从二品", title: "巡抚", threshold: 320 },
        { grade: "正二品", title: "总督", threshold: 465 }
      ]
    }
  };

  const DOCUMENTS = [
    {
      id: "riverbank",
      category: "河工",
      urgency: "加急",
      sender: { ming: "工部都水司郎中 沈廷策", qing: "河道总督衙门同知 沈廷策" },
      title: "西堤三处漫溢，请先支库银抢修",
      body: "连日暴雨，上游水势陡涨。西堤柳湾、石门、长浦三处皆见管涌，沿岸一千七百余户已连夜培土。工役估银三千二百两，若候层层勘验，恐误水期。",
      note: "河丞私报：旧堤岁修银去年已支，却只修成账册上的三成。",
      options: [
        {
          label: "先拨银抢修",
          description: "救急为先，事后再核旧账",
          delay: 3,
          chance: 0.78,
          immediate: { treasury: -10, livelihood: 3 },
          success: { title: "西堤合龙，沿岸暂安", text: "银粮及时运抵，军民昼夜并工，三处险口均已合龙。百姓称颂衙门应变迅速。", effects: { livelihood: 9, reputation: 6 } },
          failure: { title: "银到堤未成，工头遁逃", text: "承揽工头以湿土冒充夯土，雨夜再溃一处。拨银大半无着，沿岸怨声四起。", effects: { livelihood: -9, treasury: -5, reputation: -7 } }
        },
        {
          label: "核账再兴工",
          description: "先拿旧案经手，谨防重蹈覆辙",
          delay: 4,
          chance: 0.62,
          immediate: { reputation: 2 },
          success: { title: "旧弊查清，河工减费", text: "追出侵吞岁修银一千一百两，乡绅惧罪献木石助工，险段终得加固。", effects: { treasury: 8, reputation: 8, livelihood: 3 } },
          failure: { title: "勘验未毕，洪水先至", text: "文移往返间水势破堤，虽查得旧弊，灾民却只问为何迟迟不开工。", effects: { livelihood: -12, reputation: -8, favor: -2 } }
        },
        {
          label: "责令乡里自修",
          description: "官给名义，由地方摊派人料",
          delay: 3,
          chance: 0.48,
          immediate: { treasury: 3, reputation: -2 },
          success: { title: "乡约集工，险情稍解", text: "几家大户出木，沿岸丁壮出力，堤段勉强守住，公帑未多耗费。", effects: { treasury: 4, livelihood: 3 } },
          failure: { title: "摊派失序，村民械斗", text: "里甲层层加码，贫户出力而大户免役。两村为取土争执，河工未成先伤七人。", effects: { livelihood: -8, reputation: -9 } }
        }
      ]
    },
    {
      id: "grainprice",
      category: "钱粮",
      urgency: "加急",
      sender: { ming: "户部湖广清吏司主事 许观澜", qing: "户部山东清吏司主事 许观澜" },
      title: "春粮骤贵，米行联名请缓开常平仓",
      body: "青黄不接，市价十日内已涨四成。米行称漕船迟滞，仓中陈粮若骤然出粜，恐坏商本；城南饥户则日聚仓门，已有抢米传闻。",
      note: "仓大使报称存粮八千石；另有匿名揭帖说实存不足五千。",
      options: [
        {
          label: "平价开仓",
          description: "限户售粮，立即压低米价",
          delay: 2,
          chance: 0.76,
          immediate: { treasury: -6, livelihood: 5 },
          success: { title: "仓粮入市，米价回落", text: "官粜连开五日，奸商不敢囤积。米价回落两成，城中秩序渐稳。", effects: { livelihood: 8, reputation: 5, treasury: -2 } },
          failure: { title: "仓册不实，开仓见底", text: "第三日仓中便无粮可出，百姓认定官仓多年亏空，冲撞仓门。", effects: { livelihood: -8, reputation: -10, favor: -3 } }
        },
        {
          label: "借商粮赈粜",
          description: "许以秋后补息，先借大户存粮",
          delay: 3,
          chance: 0.68,
          immediate: { favor: -1 },
          success: { title: "商粮接济，公私两便", text: "三家米商交粮四千石，官府定价发售。未动仓本，市面已稳。", effects: { livelihood: 6, treasury: 4, reputation: 3 } },
          failure: { title: "米商串价，借赈牟利", text: "米商暗中掺糠短秤，又以官府名义逼价。民怨最终算在衙门头上。", effects: { livelihood: -6, reputation: -8, treasury: 2 } }
        },
        {
          label: "静候漕粮",
          description: "严禁抢购，维持仓储不动",
          delay: 4,
          chance: 0.45,
          immediate: { treasury: 4, reputation: -3 },
          success: { title: "漕船早至，粮价自平", text: "南来漕船比预计早到两日，市场粮源骤增，未动官仓也渡过缺口。", effects: { treasury: 6, livelihood: 3 } },
          failure: { title: "漕船仍滞，饥户哄抢", text: "禁令压不住饥饿，城南米铺被抢。巡检弹压时伤人，事情传入御史耳中。", effects: { livelihood: -11, reputation: -8, favor: -6 } }
        }
      ]
    },
    {
      id: "academy",
      category: "教化",
      urgency: "寻常",
      sender: { ming: "府学教授 周履谦", qing: "府学教授 周履谦" },
      title: "府学屋漏书残，请修学舍并增膏火",
      body: "府学明伦堂漏雨，经籍霉坏，生员月课多有缺席。教授请拨银六百两修缮，又请每岁增膏火银，以振士风。盐商愿捐一半，但求在堂前勒名。",
      note: "本年秋闱将近，士林议论最易上达；盐商同时有一桩旧税案待结。",
      options: [
        {
          label: "官帑修学",
          description: "不受商捐，保全公器清名",
          delay: 5,
          chance: 0.82,
          immediate: { treasury: -7, reputation: 2 },
          success: { title: "明伦堂新，士风稍振", text: "学舍如期修成，秋课恢复。士子联名作记，称颂官府尊师重道。", effects: { reputation: 8, favor: 3 } },
          failure: { title: "修缮浮费，士子生疑", text: "木料经手层层加价，修后仍有渗漏。清议讥为花公帑买虚名。", effects: { treasury: -4, reputation: -6 } }
        },
        {
          label: "准商捐勒名",
          description: "省下官银，也给商人一份体面",
          delay: 4,
          chance: 0.7,
          immediate: { treasury: 4, reputation: -1 },
          success: { title: "商捐足额，学舍焕然", text: "盐商按期交银，工程无缺。士子虽有微词，府学总算重开。", effects: { treasury: 5, reputation: 3 } },
          failure: { title: "碑成案销，清议哗然", text: "勒名碑刚立，盐商便四处声称旧税案已获默许。御史据此质疑官商交通。", effects: { reputation: -10, favor: -7, treasury: 3 } }
        },
        {
          label: "只修屋舍",
          description: "量入为出，暂不增膏火",
          delay: 3,
          chance: 0.73,
          immediate: { treasury: -3 },
          success: { title: "小修见效，课业复常", text: "虽未扩充膏火，师生已可正常讲学，议论也渐渐平息。", effects: { reputation: 4, favor: 1 } },
          failure: { title: "补漏草率，雨后复坏", text: "小修只撑过一场雨。生员以官府轻慢文教为由，联名投书上司。", effects: { reputation: -7, favor: -4 } }
        }
      ]
    },
    {
      id: "salt",
      category: "盐政",
      urgency: "密呈",
      sender: { ming: "巡盐御史衙门经历 罗应台", qing: "盐运使司经历 罗应台" },
      title: "沿河私盐成帮，疑有营兵暗中护送",
      body: "近月官盐引课短缺，缉获私盐却不及往年一成。线人称夜间有军船护送盐包过卡，背后牵涉两名参将亲随。若大张旗鼓搜捕，恐先惊动内应。",
      note: "盐课是本年考成要项；涉案参将与总兵府来往甚密。",
      options: [
        {
          label: "密捕盐枭",
          description: "绕开营兵，先取账簿实证",
          delay: 5,
          chance: 0.66,
          immediate: { treasury: -2 },
          success: { title: "夜袭得手，盐案牵出军中", text: "捕得盐枭三人并全套账簿，证据直指参将亲随。上司准予会审。", effects: { treasury: 9, reputation: 8, favor: 5 } },
          failure: { title: "风声走漏，盐枭焚账", text: "差役未至，私盐船已自沉焚账。营中反诬官府越权骚扰。", effects: { reputation: -5, favor: -6, treasury: -3 } }
        },
        {
          label: "请总兵会剿",
          description: "依制行文，让军府自行清理门户",
          delay: 4,
          chance: 0.51,
          immediate: { favor: 2 },
          success: { title: "军府交人，盐路暂清", text: "总兵为保全大局交出两名亲随，并遣兵巡河，私盐一时收敛。", effects: { treasury: 7, favor: 4 } },
          failure: { title: "会剿成空，证人失踪", text: "军府回文称查无实据。次日线人失踪，私盐换了水路继续通行。", effects: { treasury: -7, reputation: -4 } }
        },
        {
          label: "加卡严查",
          description: "不碰军府，只把盐路层层卡紧",
          delay: 3,
          chance: 0.6,
          immediate: { livelihood: -2, treasury: 2 },
          success: { title: "关卡收紧，私盐受阻", text: "连设三卡后，私盐成本陡增，官盐销量有所恢复。", effects: { treasury: 6, favor: 2 } },
          failure: { title: "卡役借机勒索", text: "差役对商旅逐船索钱，私盐反走营兵水路。民船受害最深。", effects: { livelihood: -7, reputation: -8, treasury: 2 } }
        }
      ]
    },
    {
      id: "bandits",
      category: "治安",
      urgency: "加急",
      sender: { ming: "分守道佥事 韩伯修", qing: "按察使司佥事 韩伯修" },
      title: "山道劫案频发，乡勇请给械编团",
      body: "北山驿路一月内三次失事，商旅裹足。沿山七村请自募乡勇百二十人，官给弓械与旗号。巡检担忧宗族借此私斗，主张调营兵进山清剿。",
      note: "营兵调动需粮饷；七村中赵、孙两族积怨已久。",
      options: [
        {
          label: "编练乡勇",
          description: "省饷且熟地形，但须防私斗",
          delay: 4,
          chance: 0.59,
          immediate: { treasury: -2, livelihood: 1 },
          success: { title: "乡勇守隘，商道重开", text: "乡勇分段巡守，擒获山贼六人。商队重新上路，村中也未生大乱。", effects: { livelihood: 6, treasury: 4, reputation: 5 } },
          failure: { title: "械发乡勇，宗族先斗", text: "赵、孙两族借巡山之名械斗，官给弓械成了私器，伤亡十余。", effects: { livelihood: -10, reputation: -9, favor: -3 } }
        },
        {
          label: "调兵进剿",
          description: "速战立威，耗费粮饷",
          delay: 3,
          chance: 0.72,
          immediate: { treasury: -8, favor: 1 },
          success: { title: "营兵破寨，驿路肃清", text: "官兵破山寨两处，追回部分货物。上司认为处置果断。", effects: { livelihood: 5, reputation: 4, favor: 6 } },
          failure: { title: "贼遁兵扰，沿村受累", text: "山贼闻讯先散，营兵无功却沿途索粮，百姓苦不堪言。", effects: { livelihood: -9, treasury: -5, reputation: -7 } }
        },
        {
          label: "悬赏招抚",
          description: "分化山寨，以首级和自首换安稳",
          delay: 6,
          chance: 0.55,
          immediate: { treasury: -3, reputation: -1 },
          success: { title: "贼众内讧，寨主就擒", text: "二当家携名册投诚，官府不费大兵便解散山寨。", effects: { treasury: 3, livelihood: 5, reputation: 7 } },
          failure: { title: "假降领赏，劫案复起", text: "数名喽啰换名投首领赏，转身又在邻境聚众，官榜成了笑谈。", effects: { treasury: -5, reputation: -8 } }
        }
      ]
    },
    {
      id: "arrears",
      category: "赋役",
      urgency: "寻常",
      sender: { ming: "户房司吏 方景行", qing: "户房经承 方景行" },
      title: "三乡拖欠秋粮，里长请加派差役催征",
      body: "去年水歉，东、南、西三乡合欠正赋一千九百石。户房称上解期限将至，若再不催征，缺口只能由本地库银垫补。三乡里长却称贫户已无余粮。",
      note: "欠粮册中二十七家大户所欠，竟比四百余贫户还少。",
      options: [
        {
          label: "按册严催",
          description: "守住解额，不问贫富一体追征",
          delay: 3,
          chance: 0.67,
          immediate: { livelihood: -5, treasury: 8 },
          success: { title: "粮额补足，如期上解", text: "差役逐户催征，正赋勉强凑足。户部考成无亏，但乡间典卖骤增。", effects: { treasury: 7, favor: 7, livelihood: -4, reputation: -3 } },
          failure: { title: "催征激变，乡民拒差", text: "贫户被逼卖牛，数百人围住粮仓。上司勒令先行弹压再查。", effects: { livelihood: -12, reputation: -9, favor: -4 } }
        },
        {
          label: "先查大户",
          description: "重排欠册，让有力之家先完粮",
          delay: 5,
          chance: 0.64,
          immediate: { reputation: 3, favor: -2 },
          success: { title: "豪户补粮，贫民得缓", text: "查出诡寄田亩三千余亩，大户被迫补缴，八成缺口由此填上。", effects: { treasury: 8, livelihood: 7, reputation: 8 } },
          failure: { title: "豪户联名，反控扰民", text: "大户早有准备，账证不全。几封弹劾官府擅改赋则的书信已送往省城。", effects: { favor: -9, reputation: -5, treasury: -3 } }
        },
        {
          label: "具文请蠲",
          description: "上请减免，先给百姓喘息",
          delay: 7,
          chance: 0.52,
          immediate: { livelihood: 6, treasury: -6 },
          success: { title: "蠲免获准，三乡复业", text: "勘灾文册获批，欠粮减免六成。春耕未误，民间颂声甚盛。", effects: { livelihood: 9, reputation: 7, favor: 2 } },
          failure: { title: "部驳蠲免，解期已误", text: "上司认为灾情不够成例，原文驳回。此时上解期限已过，考成记下一笔。", effects: { treasury: -8, favor: -10, reputation: -3 } }
        }
      ]
    },
    {
      id: "bribery",
      category: "吏治",
      urgency: "密呈",
      sender: { ming: "巡按察院书办 匿名封呈", qing: "都察院巡城御史 匿名封呈" },
      title: "粮道书吏被控索贿，账后夹有银票",
      body: "商人控称粮道书吏借验粮之机，每船索银五两。来文证词尚未画押，封套夹层却另有银票二百两，只写“润笔”，不署姓名。",
      note: "涉事书吏熟知近三年粮账；若立即拿问，或可牵出更多人。",
      options: [
        {
          label: "封银立案",
          description: "银票入库为证，即刻拿人",
          delay: 4,
          chance: 0.75,
          immediate: { reputation: 4, favor: -1 },
          success: { title: "顺藤摸瓜，粮弊大白", text: "书吏供出验粮积弊，追回赃银并革退六名经手。", effects: { treasury: 7, reputation: 10, favor: 4 } },
          failure: { title: "证人翻供，案成罗织", text: "商人忽然翻供，银票又查不出来源。上司质疑你借案排挤粮道。", effects: { reputation: -7, favor: -8 } }
        },
        {
          label: "暗查粮账",
          description: "暂不惊动，以账证锁定赃款",
          delay: 6,
          chance: 0.68,
          immediate: { treasury: -2 },
          success: { title: "账银相合，窝案坐实", text: "暗查发现三十二笔短耗与银票往来吻合，一案牵出数年积弊。", effects: { treasury: 10, reputation: 8, favor: 6 } },
          failure: { title: "书吏警觉，旧账尽毁", text: "查账消息被内线泄露，库房当夜失火。证人也已离境。", effects: { treasury: -5, reputation: -5 } }
        },
        {
          label: "退银申饬",
          description: "证据不足，先敲打经手诸人",
          delay: 3,
          chance: 0.58,
          immediate: { reputation: -1, favor: 1 },
          success: { title: "申饬见效，索贿暂止", text: "粮道更换验收班次，商人称近来规费已减，衙门未起大狱。", effects: { reputation: 3, favor: 3 } },
          failure: { title: "纵吏之名，不胫而走", text: "控告者将封套抄件送往都察院，称官府见银不查。", effects: { reputation: -11, favor: -8 } }
        }
      ]
    },
    {
      id: "epidemic",
      category: "恤政",
      urgency: "加急",
      sender: { ming: "惠民药局医官 叶怀素", qing: "官药局医官 叶怀素" },
      title: "城东时疫蔓延，请设隔离棚并禁集市",
      body: "城东七坊已有四十余人高热咳血，医官疑为时疫。若封坊停市，日佣贫民将立失生计；若照常往来，又恐疫气入城。",
      note: "药局存药只够三日；本月十五原定有全城最大的春市。",
      options: [
        {
          label: "封坊施药",
          description: "停市七日，官给粥药",
          delay: 4,
          chance: 0.79,
          immediate: { treasury: -9, livelihood: -2 },
          success: { title: "疫势受控，七日解封", text: "病患集中安置后新增骤减，药粥也稳住民心。春市改期举行。", effects: { livelihood: 10, reputation: 7 } },
          failure: { title: "药力不继，封坊生乱", text: "官药第二日告罄，坊门却仍紧闭。饥民冲卡，疫病随之扩散。", effects: { livelihood: -12, treasury: -5, reputation: -7 } }
        },
        {
          label: "只禁春市",
          description: "缩小管制，维持日常生计",
          delay: 5,
          chance: 0.61,
          immediate: { livelihood: 1, reputation: -1 },
          success: { title: "停集减流，疫病渐退", text: "取消春市减少了大规模流动，病势未出城东便自行减弱。", effects: { livelihood: 6, treasury: 2, reputation: 3 } },
          failure: { title: "坊间往来，疫入西城", text: "日常往来未断，五日后西城也发现病患，富户纷纷出城。", effects: { livelihood: -10, reputation: -8, favor: -4 } }
        },
        {
          label: "张榜劝避",
          description: "不行封禁，由百姓自行避疫",
          delay: 3,
          chance: 0.43,
          immediate: { treasury: 3, livelihood: -1 },
          success: { title: "民众自守，病势未扩", text: "各坊自发闭门净巷，时疫只在小范围内延续。", effects: { livelihood: 4, treasury: 4 } },
          failure: { title: "告示成空，春市传疫", text: "商贩不愿误市，数万人照常聚集。旬日间病患翻了数倍。", effects: { livelihood: -15, reputation: -10, favor: -5 } }
        }
      ]
    },
    {
      id: "resettlement",
      category: "灾赈",
      urgency: "加急",
      sender: { ming: "赈济同知 蒋含章", qing: "赈务同知 蒋含章" },
      title: "江北灾民涌入，请暂借官地搭棚安置",
      body: "江北决口后，已有灾民三千余人渡江而来。城门外每日仍增。官地靠近义仓，便于给粮，但城中绅户联名担忧疫病与盗窃。",
      note: "城外荒寺可容千人，却离水井甚远；商会愿捐粥三日。",
      options: [
        {
          label: "官地设棚",
          description: "集中登记，按口给粮",
          delay: 3,
          chance: 0.74,
          immediate: { treasury: -7, livelihood: 5 },
          success: { title: "灾民有序，粥棚无乱", text: "按里甲登记后给粮，青壮另编以工代赈，城门外秩序渐稳。", effects: { livelihood: 8, reputation: 7 } },
          failure: { title: "棚密疫起，城民恐慌", text: "安置棚过密且缺净水，痢疾蔓延。城中开始驱逐外来人口。", effects: { livelihood: -10, reputation: -6, treasury: -4 } }
        },
        {
          label: "分散寄养",
          description: "按乡分派，由里甲各自安置",
          delay: 5,
          chance: 0.56,
          immediate: { treasury: -3, reputation: -1 },
          success: { title: "分乡安插，各得生计", text: "灾民分散后压力减轻，不少人受雇春耕，渐有落脚之处。", effects: { livelihood: 7, treasury: 3, reputation: 4 } },
          failure: { title: "里甲逐客，灾民返聚", text: "各乡相互推诿，灾民徒步往返后仍聚城门，怨气更盛。", effects: { livelihood: -8, reputation: -8 } }
        },
        {
          label: "闭门赈粮",
          description: "不许入境，在江北就地发粮",
          delay: 4,
          chance: 0.5,
          immediate: { treasury: -4, livelihood: -3, favor: 2 },
          success: { title: "隔江放赈，灾民回流", text: "粮船定点停靠，灾民不必入城，部分人口返回原籍修堤。", effects: { livelihood: 5, favor: 4 } },
          failure: { title: "粮船遭抢，江面失控", text: "放赈无登记，强壮者抢走大半。饥弱者仍冒险渡江，溺亡多人。", effects: { livelihood: -11, reputation: -9, treasury: -4 } }
        }
      ]
    },
    {
      id: "payroll",
      category: "军务",
      urgency: "密呈",
      sender: { ming: "兵备道副使 陆鸣谦", qing: "督粮道参议 陆鸣谦" },
      title: "卫所欠饷五月，营门已有鼓噪",
      body: "驻军两营欠饷五月，昨日夜间有人聚众敲鼓索银。军门称兵册共四千八百名，请先拨全额；粮道私下说实到兵丁恐不足三千。",
      note: "边报称邻境盗匪正有合流迹象，此时不可轻动军心。",
      options: [
        {
          label: "按册发饷",
          description: "先稳军心，虚额日后再查",
          delay: 3,
          chance: 0.81,
          immediate: { treasury: -12, favor: 3 },
          success: { title: "营门安定，军心暂稳", text: "饷银到营后鼓噪立止，两营恢复操练并出兵巡道。", effects: { favor: 7, reputation: 2, treasury: -3 } },
          failure: { title: "冒饷坐大，实兵未得", text: "将官按虚册截留，底层兵丁只领到半月。鼓噪转为哗变。", effects: { treasury: -8, favor: -8, reputation: -5 } }
        },
        {
          label: "点兵后发",
          description: "现场唱名，核实一人发一人",
          delay: 5,
          chance: 0.67,
          immediate: { favor: -2, reputation: 2 },
          success: { title: "清出虚额，兵饷两全", text: "实点仅三千一百余人，省下大笔冒饷，真兵也领足三月。", effects: { treasury: 10, reputation: 8, favor: 4 } },
          failure: { title: "点验激怒，将领抗命", text: "军官煽动兵丁拒绝唱名，称文官有意辱军。营门险些冲突。", effects: { favor: -9, reputation: -4, livelihood: -3 } }
        },
        {
          label: "借商银济饷",
          description: "许以盐引补偿，先借银渡关",
          delay: 4,
          chance: 0.62,
          immediate: { treasury: 4, reputation: -2 },
          success: { title: "商银入营，军民俱安", text: "商会及时解银，驻军恢复巡防。偿付虽留后患，眼下危机已解。", effects: { favor: 5, livelihood: 3, treasury: -3 } },
          failure: { title: "商人附加，盐课受损", text: "商会借机索要额外盐引，未来数年盐课收入都将受挤压。", effects: { treasury: -10, reputation: -6, favor: 2 } }
        }
      ]
    },
    {
      id: "land",
      category: "田土",
      urgency: "寻常",
      sender: { ming: "清丈局委员 郑元礼", qing: "清赋局委员 郑元礼" },
      title: "王庄田界侵入民田，百户联名投诉",
      body: "王庄重立界碑后，比旧册多出田地一千二百亩。周边百余户称祖田被夺，携旧契跪诉。王庄管事则出示上年新绘鱼鳞册，并称田产有宫中名号。",
      note: "旧契年代杂乱但有里老作证；新册经手官员现已升任京职。",
      options: [
        {
          label: "重丈田界",
          description: "新旧契册并勘，以实地为准",
          delay: 7,
          chance: 0.65,
          immediate: { treasury: -3, favor: -3 },
          success: { title: "侵田坐实，百户复业", text: "重丈证实新界碑外移，八百余亩退还原户，地方称快。", effects: { livelihood: 10, reputation: 9, favor: -2 } },
          failure: { title: "册牍相攻，勘丈无果", text: "京中来文认定新册有效，勘丈人员反被指越权。百姓依旧失田。", effects: { favor: -8, reputation: -6, livelihood: -5 } }
        },
        {
          label: "照新册断",
          description: "维护官册权威，不碰宫中名号",
          delay: 3,
          chance: 0.76,
          immediate: { favor: 5, livelihood: -5 },
          success: { title: "上司认可，田案结卷", text: "省司回复新册手续齐全，命百户不得再诉。仕途上暂免风波。", effects: { favor: 7, treasury: 3, reputation: -5 } },
          failure: { title: "失田民变，旧契流京", text: "百户聚众拔碑，旧契抄本也被言官所得，事情反而闹大。", effects: { livelihood: -11, reputation: -10, favor: -6 } }
        },
        {
          label: "劝庄退租",
          description: "不改官册，以减租换取息讼",
          delay: 5,
          chance: 0.58,
          immediate: { reputation: -1 },
          success: { title: "减租三年，乡里息讼", text: "王庄同意争议田三年减租七成，百姓得以复耕，双方暂不再诉。", effects: { livelihood: 6, reputation: 3, favor: 2 } },
          failure: { title: "口惠未实，庄役变本加厉", text: "管事表面应承，转身加收杂费。百姓认为官府只会和稀泥。", effects: { livelihood: -7, reputation: -9 } }
        }
      ]
    },
    {
      id: "mine",
      category: "矿税",
      urgency: "寻常",
      sender: { ming: "商人会首 魏廷璧代呈", qing: "矿务委员 魏廷璧代呈" },
      title: "商人请开铜矿，许岁输官银万两",
      body: "西岭发现铜脉，商人愿自备工本开采，岁纳官银一万两。山下六村担心矿砂坏水、矿徒滋事，联名请求禁采。上司却催问新增财源。",
      note: "所报矿脉尚未官勘；会首愿另赠衙门修葺银五百两。",
      options: [
        {
          label: "官商合办",
          description: "设官监督，抽成归库",
          delay: 7,
          chance: 0.63,
          immediate: { treasury: 8, livelihood: -2, favor: 2 },
          success: { title: "矿脉见铜，税银大增", text: "首批矿砂成色尚可，官设巡检约束矿徒，库入颇丰。", effects: { treasury: 14, favor: 7, livelihood: -2 } },
          failure: { title: "矿脉夸大，山溪尽浊", text: "铜脉远不如所报，洗矿却已污染溪水。商人卷款离境，六村失去水源。", effects: { treasury: -10, livelihood: -12, reputation: -9 } }
        },
        {
          label: "先勘后议",
          description: "拒收修葺银，派员验矿验水",
          delay: 5,
          chance: 0.78,
          immediate: { treasury: -2, reputation: 2 },
          success: { title: "官勘得实，划界试采", text: "矿脉确有其事，但临近水源。官府另划采区，税利略减而民害可控。", effects: { treasury: 7, livelihood: 3, reputation: 6 } },
          failure: { title: "勘员受买，报告失真", text: "勘验官收受商人银两，虚报矿脉。丑闻败露后，两边都怪你用人不明。", effects: { reputation: -8, favor: -4, treasury: -3 } }
        },
        {
          label: "封山禁采",
          description: "护住村田水源，不取眼前税利",
          delay: 4,
          chance: 0.7,
          immediate: { livelihood: 5, treasury: -4, favor: -3 },
          success: { title: "封山息争，村田无损", text: "巡役封堵私挖坑口，山下六村照常春耕，民间甚为感念。", effects: { livelihood: 7, reputation: 6, favor: -2 } },
          failure: { title: "明禁暗采，税利两失", text: "商人转而勾结山民夜采，官府既未得税，械斗与水患仍然发生。", effects: { livelihood: -7, treasury: -6, reputation: -6 } }
        }
      ]
    }
  ];

  const DAY_NAMES = [
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
  ];

  const AGENT_PERSONAS = {
    literal: { label: "照文办理", publicFace: "熟悉章程，凡事先找成例，少肯越雷池一步。" },
    cautious: { label: "循例自保", publicFace: "落笔周密，遇到含混批语便倾向请示、留痕、缓办。" },
    careerist: { label: "唯上是从", publicFace: "善察颜色，最在意能否迅速做出一份好看的回文。" },
    broker: { label: "通关取利", publicFace: "门路极广，公事总能办成，但经手处常伴随人情和银钱。" },
    guardian: { label: "体恤地方", publicFace: "熟知民间疾苦，必要时会暗中软化过于严厉的上命。" },
    factional: { label: "护持门生", publicFace: "重同乡与故旧，遇事先分辨会伤到哪一边的人。" }
  };

  const AGENT_SLOTS = {
    local: [
      { role: "县丞", names: ["程慎修", "沈履安", "周景和"] },
      { role: "户房经承", names: ["钱守中", "何见山", "陆从简"] },
      { role: "里甲总催", names: ["赵登文", "孙茂才", "陈有功"] },
      { role: "承差役头", names: ["刘三省", "邵百川", "吴进忠"] }
    ],
    central: [
      { role: "司务厅经承", names: ["冯可久", "黄承恩", "严守墨"] },
      { role: "布政司参议", names: ["顾文渊", "梁秉直", "韩维岳"] },
      { role: "知府", names: ["章允恭", "谢时中", "邵一鹤"] },
      { role: "知县", names: ["杜行简", "林观复", "程怀瑾"] }
    ],
    regional: [
      { role: "幕府书办", names: ["许闻达", "叶师曾", "罗近川"] },
      { role: "分守道", names: ["陆鸣谦", "沈廷策", "郑元礼"] },
      { role: "知府", names: ["蒋含章", "周履谦", "韩伯修"] },
      { role: "知县", names: ["方景行", "叶怀素", "罗应台"] }
    ]
  };

  const INTENT_LABELS = {
    relief: "先解民困、稳定地方",
    fiscal: "控制支出、保全钱粮",
    audit: "查明责任、清理积弊",
    force: "从严处置、迅速压服",
    speed: "尽快办出可以复命的结果",
    restraint: "约束经手、防止层层加码",
    discretion: "留下便宜行事的余地"
  };

  const KEYWORD_GROUPS = {
    relief: ["民", "赈", "救", "安置", "抚恤", "开仓", "缓征", "减租", "施药", "复业"],
    fiscal: ["银", "粮", "库", "节省", "不得动用", "追缴", "税", "饷", "核销", "商捐"],
    audit: ["查", "核", "勘", "账", "追责", "审", "拿问", "证据", "清丈", "点验"],
    force: ["严", "禁", "捕", "剿", "封", "弹压", "惩", "驱", "限令", "拿人"],
    speed: ["即刻", "立即", "速", "先行", "不得延误", "三日", "五日", "限期", "连夜"],
    restraint: ["不得摊派", "不得扰民", "从实", "按户", "留档", "事后查", "严禁侵吞", "逐项"],
    discretion: ["酌情", "妥善", "从权", "便宜行事", "相机", "看情形", "适当", "尽量"]
  };

  const DIFFICULTIES = {
    guided: { label: "引导模式", mark: "明察" },
    reports: { label: "官场模式", mark: "听报" },
    opaque: { label: "上意模式", mark: "隔层" }
  };

  let state = null;
  let selectedEra = "ming";
  let selectedRoute = "local";
  let selectedDifficulty = "guided";
  let toastTimer = null;
  let agentBusy = false;
  let remoteStateReady = false;
  let remoteSaveTimer = null;
  let stateEpoch = 0;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function createAgentNetwork(route, seed) {
    const slots = AGENT_SLOTS[route];
    const personaKeys = Object.keys(AGENT_PERSONAS);
    const offset = seed % personaKeys.length;
    return slots.map((slot, index) => {
      const style = personaKeys[(index + offset) % personaKeys.length];
      const signature = hashText(`${seed}-${route}-${slot.role}-${index}`);
      const styleBias = {
        literal: { competence: 12, loyalty: 8, ambition: -5, greed: -12, caution: 8 },
        cautious: { competence: 4, loyalty: 1, ambition: -4, greed: -8, caution: 24 },
        careerist: { competence: 7, loyalty: 18, ambition: 24, greed: 0, caution: -4 },
        broker: { competence: 10, loyalty: -8, ambition: 8, greed: 27, caution: 2 },
        guardian: { competence: 8, loyalty: 2, ambition: -9, greed: -18, caution: 6 },
        factional: { competence: 5, loyalty: -5, ambition: 11, greed: 9, caution: 7 }
      }[style];
      const trait = (base, bias, shift) => clamp(base + bias + ((signature >> shift) % 13) - 6, 18, 92);
      return {
        id: `${route}-${index}`,
        role: slot.role,
        name: slot.names[signature % slot.names.length],
        style,
        competence: trait(57, styleBias.competence, 1),
        loyalty: trait(55, styleBias.loyalty, 5),
        ambition: trait(46, styleBias.ambition, 9),
        greed: trait(38, styleBias.greed, 13),
        caution: trait(48, styleBias.caution, 17),
        handled: 0,
        lastMove: "尚未经手政令"
      };
    });
  }

  function analyzeOrder(text) {
    const normalized = String(text).replace(/\s+/g, "").trim();
    const vector = {};
    Object.entries(KEYWORD_GROUPS).forEach(([intent, words]) => {
      vector[intent] = words.reduce((score, word) => score + (normalized.includes(word) ? 1 : 0), 0);
    });

    let clarity = 42;
    if (normalized.length >= 18) clarity += 8;
    if (normalized.length >= 35) clarity += 7;
    if (normalized.length > 120) clarity -= 4;
    if (/[一二三四五六七八九十\d]+日|即刻|立即|旬内|限期/.test(normalized)) clarity += 13;
    if (/着|令|责成|由.+会同|不得|务必|逐项/.test(normalized)) clarity += 12;
    if (/查|拨|发|禁|修|捕|赈|丈|封|调|核|安置|追缴|开仓/.test(normalized)) clarity += 10;
    if (/但|同时|事后|以免|如有|违者/.test(normalized)) clarity += 7;
    clarity -= vector.discretion * 7;
    clarity = clamp(clarity, 20, 96);

    const dominant = Object.entries(vector)
      .filter(([key]) => key !== "discretion")
      .sort((a, b) => b[1] - a[1])[0];
    return {
      clarity,
      clarityLabel: clarity >= 75 ? "严密" : clarity >= 55 ? "尚明" : "含混",
      dominant: dominant?.[1] ? dominant[0] : "discretion",
      vector
    };
  }

  function matchCustomOrder(text, documentItem) {
    const target = analyzeOrder(text).vector;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    documentItem.options.forEach((option, index) => {
      const candidate = analyzeOrder(`${option.label}${option.description}`).vector;
      const distance = Object.keys(KEYWORD_GROUPS).reduce((total, key) => {
        const weight = key === "discretion" ? 0.7 : 1;
        return total + Math.abs((target[key] || 0) - (candidate[key] || 0)) * weight;
      }, 0);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function mergeEffects(...effectSets) {
    const merged = {};
    effectSets.forEach((effects) => {
      Object.entries(effects || {}).forEach(([key, value]) => {
        merged[key] = (merged[key] || 0) + value;
      });
    });
    Object.keys(merged).forEach((key) => { merged[key] = clamp(Math.round(merged[key]), -18, 18); });
    return merged;
  }

  function createState(era, route, name, difficulty = "guided") {
    const seed = Math.floor(Date.now() % 2147483647) || 1709;
    return {
      version: 4,
      era,
      route,
      difficulty,
      name: name.trim() || "顾惟诚",
      day: 1,
      seed,
      stats: { ...ROUTES[route].baseStats },
      merit: 0,
      rankIndex: 0,
      docket: [],
      decisions: {},
      pending: [],
      reports: [],
      unreadReports: 0,
      deck: [],
      agents: createAgentNetwork(route, seed)
    };
  }

  function nextRandom() {
    state.seed = (state.seed * 48271) % 2147483647;
    return state.seed / 2147483647;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(nextRandom() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function drawDocket() {
    const pendingIds = new Set(state.pending.map((item) => item.caseId));
    state.deck = state.deck.filter((id) => !pendingIds.has(id));
    if (state.deck.length < 3) {
      const existing = new Set(state.deck);
      const eligible = DOCUMENTS.map((item) => item.id)
        .filter((id) => !pendingIds.has(id) && !existing.has(id));
      state.deck.push(...shuffle(eligible));
    }
    state.docket = state.deck.splice(0, 3);
    state.decisions = {};
  }

  function migrateState(saved) {
    state = saved;
    state.difficulty = DIFFICULTIES[state.difficulty] ? state.difficulty : "guided";
    state.agents = Array.isArray(state.agents) && state.agents.length
      ? state.agents
      : createAgentNetwork(state.route, state.seed || 1709);

    Object.entries(state.decisions || {}).forEach(([caseId, decision]) => {
      if (!Number.isInteger(decision)) return;
      const documentItem = findDocument(caseId);
      const option = documentItem?.options[decision];
      if (!option) return;
      state.decisions[caseId] = {
        optionIndex: decision,
        custom: false,
        orderText: `${option.label}。${option.description}，着即施行。`,
        analysis: analyzeOrder(`${option.label}${option.description}`)
      };
    });

    if (state.version === 1) {
      state.pending = (state.pending || []).map((legacy) => {
        const documentItem = findDocument(legacy.caseId);
        if (!documentItem) return null;
        const directive = createDirective(documentItem, legacy.optionIndex, "", legacy.issuedDay);
        directive.id = legacy.id || directive.id;
        return directive;
      }).filter(Boolean);
      state.reports = (state.reports || []).map((report) => ({
        ...report,
        orderText: report.order || "旧档朱批",
        chain: [],
        cause: "此为旧制回报，未留逐级转行底稿。"
      }));
    }
    (state.pending || []).forEach((directive) => {
      (directive.chain || []).forEach((step) => {
        step.officialReport ||= `奉批。${step.action || "已按转行口径办理，续候结报。"}`;
      });
    });
    state.reports = (state.reports || []).map((report) => {
      (report.chain || []).forEach((step) => {
        step.officialReport ||= `奉批。${step.action || "已按转行口径办理，续候结报。"}`;
      });
      const completionChain = Array.isArray(report.completionChain) && report.completionChain.length
        ? report.completionChain
        : legacyCompletionChain(report);
      const directCompletion = completionChain.at(-1)?.reportText;
      return {
        ...report,
        completionChain,
        finalOfficialReport: directCompletion || report.finalOfficialReport || report.text,
        directOfficialReport: directCompletion || report.directOfficialReport || report.text
      };
    });
    state.version = 4;
    return state;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && [1, 2, 3, 4].includes(saved.version) && ERAS[saved.era] && ROUTES[saved.route]) {
        migrateState(saved);
        persistLocalState();
        return true;
      }
    } catch (error) {
      console.warn("存档读取失败", error);
    }
    state = createState(selectedEra, selectedRoute, "顾惟诚", selectedDifficulty);
    drawDocket();
    return false;
  }

  function persistLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveState() {
    state.savedAt = new Date().toISOString();
    persistLocalState();
    scheduleRemoteSave();
  }

  function scheduleRemoteSave() {
    if (!remoteStateReady || !window.GuanLiaoState?.save) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(state));
      window.GuanLiaoState.save(snapshot);
    }, 600);
  }

  function isSupportedState(value) {
    return value && [1, 2, 3, 4].includes(value.version) && ERAS[value.era] && ROUTES[value.route];
  }

  async function hydrateRemoteState() {
    const client = window.GuanLiaoState;
    if (!client?.load) return;
    const hydrationEpoch = stateEpoch;
    const remote = await client.load();
    if (!remote.available) return;

    remoteStateReady = true;
    if (hydrationEpoch !== stateEpoch) {
      if (localStorage.getItem(STORAGE_KEY)) scheduleRemoteSave();
      return;
    }

    const localExists = Boolean(localStorage.getItem(STORAGE_KEY));
    const localTimestamp = Date.parse(state.savedAt || "") || 0;
    const remoteTimestamp = Date.parse(remote.updatedAt || remote.state?.savedAt || "") || 0;

    if (isSupportedState(remote.state) && (!localExists || remoteTimestamp >= localTimestamp)) {
      migrateState(remote.state);
      persistLocalState();
      renderAll();
      $("#onboarding").hidden = true;
      return;
    }
    if (localExists) scheduleRemoteSave();
  }

  function clearSavedState() {
    stateEpoch += 1;
    clearTimeout(remoteSaveTimer);
    localStorage.removeItem(STORAGE_KEY);
    window.GuanLiaoState?.clear?.();
  }

  function findDocument(id) {
    return DOCUMENTS.find((item) => item.id === id);
  }

  function currentRank() {
    return ROUTES[state.route].ranks[state.rankIndex];
  }

  function updateRank() {
    const ranks = ROUTES[state.route].ranks;
    const oldIndex = state.rankIndex;
    let index = 0;
    ranks.forEach((rank, rankIndex) => {
      if (state.merit >= rank.threshold) index = rankIndex;
    });
    state.rankIndex = index;
    if (index > oldIndex) return `考成累进，擢升${ranks[index].grade}${ranks[index].title}`;
    if (index < oldIndex) return `考成失利，降调${ranks[index].grade}${ranks[index].title}`;
    return "";
  }

  function formatDate(day) {
    const offset = day + 5;
    const monthIndex = Math.floor(offset / 30);
    const dateIndex = offset % 30;
    const era = ERAS[state.era];
    return `${era.months[monthIndex % era.months.length]}${DAY_NAMES[dateIndex]}`;
  }

  function applyEffects(effects, animate = false) {
    Object.entries(effects || {}).forEach(([key, change]) => {
      if (!(key in state.stats)) return;
      state.stats[key] = clamp(state.stats[key] + change);
      if (animate) {
        const element = document.querySelector(`[data-stat="${key}"]`);
        element?.classList.remove("changed");
        requestAnimationFrame(() => element?.classList.add("changed"));
      }
    });
  }

  function renderStats() {
    Object.entries(state.stats).forEach(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      $(`#stat${label}`).textContent = value;
      document.querySelector(`[data-stat="${key}"] .meter i`).style.width = `${value}%`;
    });
  }

  function renderHeader() {
    const era = ERAS[state.era];
    const rank = currentRank();
    $("#eraMark").textContent = era.mark;
    $("#difficultyMark").textContent = DIFFICULTIES[state.difficulty].label;
    $("#reignYear").textContent = era.reign;
    $("#lunarDate").textContent = formatDate(state.day);
    $("#dayCount").textContent = `在任第 ${state.day} 日`;
    $("#roleTitle").textContent = `${rank.grade} · ${rank.title}`;
    $("#playerName").textContent = state.name;
  }

  function documentHtml(documentItem) {
    const decision = state.decisions[documentItem.id];
    const resolved = decision !== undefined;
    const chosen = resolved ? documentItem.options[decision.optionIndex] : null;
    const sender = documentItem.sender[state.era] || documentItem.sender.ming;
    const buttons = documentItem.options.map((option, optionIndex) => `
      <button class="decision-button" type="button" data-case="${documentItem.id}" data-option="${optionIndex}">
        <strong>${option.label}</strong>
        <small>${option.description} · ${option.delay}日见报</small>
      </button>
    `).join("");

    const customOrder = `
      <div class="custom-order-box">
        <div class="custom-order-head">
          <strong>自拟朱批</strong>
          <span><b data-count-for="${documentItem.id}">0</b> / 180</span>
        </div>
        <textarea data-custom-input="${documentItem.id}" maxlength="180" placeholder="例：先拨银救堤，责成县丞三日内合龙；岁修旧账另封存追查，不得借机摊派。"></textarea>
        <div class="custom-order-actions">
          <span>原文将逐级转行，不自动替你补足含混处。</span>
          <button class="custom-dispatch" type="button" data-custom-case="${documentItem.id}" disabled>下发原文 →</button>
        </div>
      </div>
    `;

    return `
      <article class="document${resolved ? " resolved" : ""}" data-document="${documentItem.id}">
        <div class="document-meta">
          <span class="category">${documentItem.category}</span>
          <span class="urgency">${documentItem.urgency}</span>
          <span>第 ${String(state.day).padStart(3, "0")} 日收</span>
        </div>
        <h2>${documentItem.title}</h2>
        <p class="sender">具文：${sender} · ${ERAS[state.era].senderSuffix}</p>
        <p class="body-copy">${documentItem.body}</p>
        <div class="copied-note"><span>夹报</span><div>${documentItem.note}</div></div>
        ${resolved
          ? `<div class="resolved-order"><strong>${decision.custom ? "亲拟" : "朱批"}</strong>${escapeHtml(decision.orderText)}</div>`
          : `<div class="decision-label">采用拟稿</div><div class="decision-grid">${buttons}</div>${customOrder}`}
      </article>
    `;
  }

  function renderDesk() {
    const handled = Object.keys(state.decisions).length;
    const total = state.docket.length;
    $("#docketProgress").textContent = `已批 ${handled} / ${total}`;
    $("#docketProgressBar").style.width = `${total ? (handled / total) * 100 : 0}%`;
    $("#deskBadge").textContent = String(total - handled);
    $("#deskBadge").dataset.count = String(total - handled);
    $("#documentStack").innerHTML = state.docket.map((id) => documentHtml(findDocument(id))).join("");
    $("#documentStack").hidden = handled === total;
    $("#emptyDesk").hidden = handled !== total;
    $("#endDayButton").disabled = agentBusy || handled !== total;
    if (agentBusy) {
      $$("#documentStack .decision-button, #documentStack .custom-dispatch").forEach((button) => { button.disabled = true; });
    }
  }

  function agentById(id) {
    return state.agents.find((agent) => agent.id === id);
  }

  function chainStepsHtml(chain) {
    if (!chain?.length) return "";
    return `<div class="chain-steps">${chain.map((step, index) => `
      <article class="chain-step">
        <div>
          <strong>${index + 1}. ${escapeHtml(step.role)} · ${escapeHtml(step.agentName)}</strong>
          <b>原意保留 ${step.fidelity}%</b>
        </div>
        <p><span>所见</span> ${escapeHtml(step.interpretation)}</p>
        <p><span>盘算</span> ${escapeHtml(step.calculation)}</p>
        <p><span>转行</span> ${escapeHtml(step.action)}</p>
        <p class="forwarded-copy"><span>下行文书</span> ${escapeHtml(step.forwardedText)}</p>
      </article>
    `).join("")}</div>`;
  }

  function officialReportsHtml(chain, limit = chain.length) {
    const visible = chain.slice(0, limit);
    if (!visible.length) return "";
    return `<div class="official-report-list">${visible.map((step, index) => `
      <article class="official-report receipt-report">
        <div><strong>${index + 1}. ${escapeHtml(step.role)} · ${escapeHtml(step.agentName)}</strong><span>第${step.day}日接令</span></div>
        <p>${escapeHtml(step.officialReport || "奉批，正在查办，续候结报。")}</p>
      </article>
    `).join("")}</div>`;
  }

  function legacyCompletionChain(report) {
    const upward = (report.chain || []).slice().reverse();
    return upward.map((step, index) => {
      const isExecutor = index === 0;
      const isDirect = index === upward.length - 1;
      let reportText = `奉结。据下属回呈，${report.title || "前令已有结果"}。${report.text || "详情见旧档。"}`;
      if (isExecutor && report.finalOfficialReport) reportText = report.finalOfficialReport;
      if (isDirect && report.directOfficialReport) reportText = report.directOfficialReport;
      return {
        agentId: step.agentId,
        agentName: step.agentName,
        role: step.role,
        style: step.style,
        day: report.day,
        receivedReport: isExecutor ? `旧档执行结果：${report.title || "已办"}` : "旧档未留完整的上行转呈文本。",
        reportingCalculation: "旧档只留成文，未记回报时的真实盘算。",
        reportText
      };
    });
  }

  function completionReportsHtml(completionChain, guided = false) {
    if (!completionChain?.length) return "";
    return `<div class="official-report-list completion-report-list">${completionChain.map((step, index) => `
      <article class="official-report completion-report">
        <div><strong>${index + 1}. ${escapeHtml(step.role)} · ${escapeHtml(step.agentName)}</strong><span>第${step.day}日办结</span></div>
        ${guided ? `<p class="report-source"><span>所收下报</span>${escapeHtml(step.receivedReport)}</p>
          <p class="report-calculation"><span>回报盘算</span>${escapeHtml(step.reportingCalculation)}</p>` : ""}
        <p>${escapeHtml(step.reportText || "奉结。前令已经办毕，详情续具清册。")}</p>
      </article>
    `).join("")}</div>`;
  }

  function directCompletionOf(report) {
    return report.completionChain?.at(-1);
  }

  function twoStageReportsHtml(report, guided = false) {
    const receipts = officialReportsHtml(report.chain || []);
    const completions = completionReportsHtml(report.completionChain || [], guided);
    return `<div class="report-phases">
      <section class="report-phase"><h3>接令回文 · 政令下行</h3>${receipts || "<p>旧档未留接令回文。</p>"}</section>
      <section class="report-phase completion-phase"><h3>办结回文 · 结果上行</h3>${completions || "<p>旧档未留办结回文。</p>"}</section>
    </div>`;
  }

  function visibleFlowHtml(chain) {
    if (state.difficulty === "guided") return chainStepsHtml(chain);
    return officialReportsHtml(chain, state.difficulty === "opaque" ? 1 : chain.length);
  }

  function renderPending() {
    $("#pendingCount").textContent = state.pending.length;
    if (!state.pending.length) {
      const emptyCopy = state.difficulty === "guided"
        ? "朱批下发后将逐级显出经手人的理解。"
        : state.difficulty === "reports" ? "朱批下发后，先收接令回文；事成后再收逐级办结回文。" : "朱批下发后，只在此等候直属官员的接令与办结回报。";
      $("#pendingList").innerHTML = `<div class="pending-empty">暂无在途政令。<br>${emptyCopy}</div>`;
      return;
    }
    $("#pendingList").innerHTML = state.pending
      .slice()
      .sort((a, b) => (a.agentIds.length - a.nextAgentIndex) - (b.agentIds.length - b.nextAgentIndex))
      .map((item) => {
        const documentItem = findDocument(item.caseId);
        const nextAgent = agentById(item.agentIds[item.nextAgentIndex]);
        const latest = item.chain[item.chain.length - 1];
        const direct = item.chain[0];
        const stageLabel = state.difficulty === "guided"
          ? item.holdDays > 0 ? `留中 ${item.holdDays}日` : nextAgent ? `至${nextAgent.role}` : "待结报"
          : state.difficulty === "reports" ? "候逐级办结回文" : "候直属办结回文";
        const visibleAgentIds = state.difficulty === "opaque" ? item.agentIds.slice(0, 1) : item.agentIds;
        const progress = visibleAgentIds.map((id, index) => {
          const className = index < item.nextAgentIndex ? "done" : index === item.nextAgentIndex ? "current" : "";
          return `<i class="${className}" title="${escapeHtml(agentById(id)?.role || "经手")}"></i>`;
        }).join("");
        const summary = state.difficulty === "guided"
          ? `已过 ${item.chain.length} 手 · 原意偏移 ${item.drift}%`
          : state.difficulty === "reports" ? `接令回文 ${item.chain.length} 封` : `直属接令回文 · ${direct?.role || "候报"}`;
        const disclosureBody = state.difficulty === "guided"
          ? `${latest ? `<div class="pending-latest"><strong>${escapeHtml(latest.role)} ${escapeHtml(latest.agentName)}</strong><span>${escapeHtml(latest.calculation)}</span></div>` : ""}${chainStepsHtml(item.chain)}`
          : visibleFlowHtml(item.chain);
        return `
          <article class="pending-item">
            <div><strong>${documentItem.title}</strong><b>${stageLabel}</b></div>
            <p class="pending-order">“${escapeHtml(item.orderText)}”</p>
            <div class="agent-progress${state.difficulty === "opaque" ? " single" : ""}">${progress}</div>
            <details class="pending-disclosure">
              <summary>${summary}</summary>
              ${disclosureBody}
            </details>
          </article>
        `;
      }).join("");
  }

  function effectsHtml(effects) {
    return Object.entries(effects || {}).map(([key, change]) => `
      <span class="effect${change < 0 ? " down" : ""}">${STAT_LABELS[key]} ${change > 0 ? "+" : ""}${change}</span>
    `).join("");
  }

  function renderReports() {
    $("#reportBadge").textContent = String(state.unreadReports);
    $("#reportBadge").dataset.count = String(state.unreadReports);
    if (!state.reports.length) {
      $("#reportTimeline").innerHTML = `<div class="empty-state"><div class="empty-seal">候</div><h2>尚无回报</h2><p>政令已下，静候地方行事与驿路回音。</p></div>`;
      return;
    }
    $("#reportTimeline").innerHTML = state.reports.map((report) => {
      const orderText = report.orderText || report.order || "旧档朱批";
      const direct = report.chain?.[0];
      const directCompletion = directCompletionOf(report);
      const isOpaque = state.difficulty === "opaque" && report.chain?.length;
      const isReports = state.difficulty === "reports" && report.chain?.length;
      const officialTitle = `${directCompletion?.role || direct?.role || "承办官"}${directCompletion?.agentName || direct?.agentName || ""}办结回报`;
      const visibleTitle = isOpaque || isReports ? officialTitle : report.title;
      const visibleText = isOpaque || isReports
        ? directCompletion?.reportText || report.directOfficialReport || report.finalOfficialReport || report.text
        : report.text;
      const visibleCause = state.difficulty === "guided" ? report.cause : "";
      const detail = state.difficulty === "guided"
        ? `<details class="chain-record"><summary>查看两程流转 · ${report.chain?.length || 0} 名经手</summary>
            <div class="report-phases">
              <section class="report-phase"><h3>政令下行 · 真实底稿</h3><div class="pending-latest"><strong>原批</strong><span>${escapeHtml(orderText)}</span></div>${chainStepsHtml(report.chain)}</section>
              <section class="report-phase completion-phase"><h3>办结回文 · 结果上行</h3>${completionReportsHtml(report.completionChain, true)}</section>
            </div>
          </details>`
        : isReports ? `<details class="chain-record"><summary>阅两程回文 · 接令 ${report.chain.length} / 办结 ${report.completionChain?.length || 0}</summary>${twoStageReportsHtml(report)}</details>` : "";
      const guidedCompletion = state.difficulty === "guided" && directCompletion
        ? `<div class="completion-summary"><div><span>直属办结回文</span><strong>${escapeHtml(directCompletion.role)} · ${escapeHtml(directCompletion.agentName)}</strong></div><p>${escapeHtml(directCompletion.reportText)}</p></div>`
        : "";
      return `
        <article class="report-entry${state.difficulty === "guided" && !report.success ? " negative" : ""}${report.read ? "" : " unread"}">
          <div class="report-meta"><span>第 ${report.day} 日</span><span>${report.category}</span><span>${isOpaque ? "直属办结回文" : isReports ? "两程回文" : report.custom ? "亲拟原批" : "采用拟稿"}</span></div>
          <h2>${escapeHtml(visibleTitle)}</h2>
          <p>${escapeHtml(visibleText)}</p>
          ${visibleCause ? `<p class="report-cause">${escapeHtml(visibleCause)}</p>` : ""}
          ${state.difficulty === "guided" ? `<div class="effects">${effectsHtml(report.effects)}</div>` : ""}
          ${guidedCompletion}
          ${report.chain?.length ? detail : ""}
        </article>
      `;
    }).join("");
  }

  function renderCareer() {
    const route = ROUTES[state.route];
    const ranks = route.ranks;
    const rank = currentRank();
    const nextRank = ranks[state.rankIndex + 1];
    const currentFloor = rank.threshold;
    const span = nextRank ? nextRank.threshold - currentFloor : 1;
    const progress = nextRank ? clamp(((state.merit - currentFloor) / span) * 100) : 100;
    const numeral = rank.grade.match(/[一二三四五六七八九]/)?.[0] || "官";
    $("#careerSeal").textContent = numeral;
    $("#careerTitle").textContent = `${rank.grade} · ${rank.title}`;
    $("#careerRoute").textContent = route.name;
    $("#meritScore").textContent = nextRank ? `${state.merit - currentFloor} / ${span}` : "考成已满";
    $("#meritBar").style.width = `${progress}%`;

    const average = Object.values(state.stats).reduce((sum, value) => sum + value, 0) / 4;
    let advice = "政令平稳，宜在民生与朝廷考成间继续周旋。";
    if (average < 35) advice = "诸项考成已危，任何一纸失当都可能招致参劾。";
    else if (state.stats.livelihood < 40) advice = "民生凋敝，宜少行摊派、多查实情。";
    else if (state.stats.favor < 40) advice = "上意渐疏，须留心解额与部院程限。";
    else if (state.stats.reputation > 72) advice = "清议渐隆，但声名越盛，科道盯得越紧。";
    $("#careerAdvice").textContent = advice;

    $("#rankLadder").innerHTML = ranks.map((item, index) => `
      <article class="rank-step${index === state.rankIndex ? " current" : ""}${index > state.rankIndex ? " locked" : ""}">
        <span>${item.grade}</span>
        <strong>${item.title}</strong>
        <small>${index < state.rankIndex ? "历任" : index === state.rankIndex ? "现任" : `考成 ${item.threshold}`}</small>
      </article>
    `).join("");
  }

  function renderAgents() {
    const visibleAgents = state.difficulty === "opaque" ? state.agents.slice(0, 1) : state.agents;
    $("#agentRoster").innerHTML = visibleAgents.map((agent) => {
      const persona = AGENT_PERSONAS[agent.style];
      if (state.difficulty !== "guided") {
        return `
          <article class="agent-card restricted">
            <div>
              <div><span>${escapeHtml(agent.role)}</span><strong>${escapeHtml(agent.name)}</strong></div>
              <b>${state.difficulty === "opaque" ? "直属" : "身份已知"}</b>
            </div>
            <p>${escapeHtml(agent.lastOfficialReport || "尚未递回正式公文。")}</p>
            <small>经手 ${agent.handled} 道政令 · 最近正式回文</small>
          </article>
        `;
      }
      return `
        <article class="agent-card">
          <div>
            <div><span>${escapeHtml(agent.role)}</span><strong>${escapeHtml(agent.name)}</strong></div>
            <b>${persona.label}</b>
          </div>
          <p>${persona.publicFace}</p>
          <small>经手 ${agent.handled} 次 · ${escapeHtml(agent.lastMove)}</small>
        </article>
      `;
    }).join("");
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderDesk();
    renderPending();
    renderReports();
    renderCareer();
    renderAgents();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setAgentBusy(busy, message = "") {
    agentBusy = busy;
    document.documentElement.classList.toggle("agent-busy", busy);
    renderDesk();
    if (message) showToast(message);
  }

  function agentDescriptor(agent) {
    const persona = AGENT_PERSONAS[agent.style];
    return {
      id: agent.id,
      role: agent.role,
      name: agent.name,
      style: agent.style,
      personaLabel: persona.label,
      publicFace: persona.publicFace,
      traits: {
        competence: agent.competence,
        loyalty: agent.loyalty,
        ambition: agent.ambition,
        greed: agent.greed,
        caution: agent.caution
      }
    };
  }

  function processAgent(item, agent) {
    const analysis = item.analysis;
    const intent = INTENT_LABELS[analysis.dominant] || INTENT_LABELS.discretion;
    const unclear = analysis.clarity < 55;
    let calculation = "";
    let action = "";
    let addendum = "照原批办理";
    let drift = 4;
    let holdDays = 0;
    let effects = {};

    switch (agent.style) {
      case "literal":
        calculation = unclear
          ? "原批没有把期限、钱粮和责任人说全，他决定援引本衙旧例补足空白，以免将来独自担责。"
          : "字面已经足够明确，他宁可机械照办，也不愿替上官多猜一步。";
        action = unclear ? "按旧例补入先勘、后办、逐级具报三道手续。" : "逐句誊录原批，只把承办人和回文格式补齐。";
        addendum = unclear ? "循旧例先勘后办，逐级具报" : "照原批逐项奉行";
        drift = unclear ? 11 : 3;
        effects = unclear ? { reputation: -1 } : { reputation: 1 };
        break;
      case "cautious":
        calculation = "他首先想到的不是成事，而是事败后卷宗里会留下谁的名字；批语越含混，他越愿意多留一层请示。";
        action = "先造清册、封存文移，真正动手前再候一次回音。";
        addendum = "先具勘验清册，重大处另行请示";
        drift = unclear ? 20 : 12;
        holdDays = unclear || agent.caution > 70 ? 1 : 0;
        effects = { livelihood: -2, reputation: -1 };
        break;
      case "careerist":
        calculation = "他把“上意”理解为尽快交出一份可供呈报的成绩，至于是否完整解决并非首要。";
        action = "把最容易见效的部分列为限期要项，其余事项压到后续清册。";
        addendum = "拣要先办，限期报成，以彰上意";
        drift = 15 + (analysis.vector.speed ? 4 : 0);
        effects = { favor: 2, reputation: -1, livelihood: -1 };
        break;
      case "broker":
        calculation = analysis.vector.fiscal
          ? "他看见了银粮、采买和核销的经手空间，盘算着把差事交给相熟商户。"
          : "他判断这道命令可以变成一桩人情，先找能从中获利又愿意替他担名的人。";
        action = "将承办转给熟识经手，并在原令之外添入含混的杂费与通融口径。";
        addendum = "准就近委商承办，杂费据实开销";
        drift = 27;
        effects = { treasury: -5, livelihood: -2, reputation: -2 };
        break;
      case "guardian":
        calculation = analysis.vector.force || analysis.vector.fiscal
          ? "他担心照字面办会逼出民变，宁肯冒一点违逆上意的风险，也要替地方留喘息。"
          : "他认为原批大意可行，但执行时应先护住贫弱户，不可让里甲把负担向下转嫁。";
        action = "删去最严厉的催逼字样，补入先安抚、禁摊派与照顾贫弱户的口径。";
        addendum = "先安抚贫弱，严禁借令摊派";
        drift = analysis.vector.force ? 18 : 11;
        effects = { livelihood: 3, treasury: -2, favor: -1, reputation: 1 };
        break;
      case "factional":
        calculation = "他先盘点受令牵涉的人里有哪些同乡、故旧和上司门生，准备把真正的代价引向关系较远的一边。";
        action = "在执行名册上留下数个例外，把查核和摊派重点转向无援的小户与外来人。";
        addendum = "旧例有据者免议，其余从严核办";
        drift = 24;
        effects = { livelihood: -4, reputation: -3, favor: 1 };
        break;
      default:
        calculation = "他决定照常规办理。";
        action = "誊录原批并转交下一级。";
    }

    const officialReports = {
      literal: unclear
        ? "奉批。原文未尽处已援引本衙旧例补正，现造册转行，俟各项勘明续报。"
        : "奉批。各款均已逐条誊录转行，责任人、期限与回文格式俱照原批办理。",
      cautious: "奉批。此事关系重大，现已封存文移、造具清册，并令经手各员先行勘验，俟确实后续报。",
      careerist: "奉批。紧要各款业已列入限期，承办人等正在昼夜赶办，初步情形尚称顺遂。",
      broker: "奉批。承办人役业已选妥，所需物料与开销均令据实核销，地方称便。",
      guardian: "奉批。现已先行安抚地方并约束差役，贫弱户暂得安堵，未闻滋扰。",
      factional: "奉批。查得旧例有据者若干，已分别存案；其余人户一体列册，从严核办。"
    };
    const officialReport = officialReports[agent.style] || "奉批。已照常规转行办理，续候结报。";

    const receivedText = item.forwardedText;
    const forwardedText = `${receivedText}【${agent.role}口径：${addendum}】`.slice(0, 260);
    const fidelity = clamp(100 - drift, 35, 98);
    const step = {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      style: agent.style,
      receivedText,
      interpretation: `他将此令理解为“${intent}”。`,
      calculation,
      action,
      officialReport,
      forwardedText,
      fidelity,
      holdDays,
      effects,
      day: state.day
    };

    item.chain.push(step);
    item.nextAgentIndex += 1;
    item.forwardedText = forwardedText;
    item.drift = clamp(item.drift + Math.round(drift * (100 - item.drift) / 100));
    item.holdDays += holdDays;
    item.modifiers = mergeEffects(item.modifiers, effects);
    agent.handled += 1;
    agent.lastMove = action;
    agent.lastOfficialReport = officialReport;
    return step;
  }

  async function enrichAgentStep(item, agent, step) {
    const client = window.GuanLiaoAgents;
    if (!client?.propagate) return "fallback";
    const response = await client.propagate({
      era: state.era,
      day: step.day,
      orderText: item.orderText,
      receivedText: step.receivedText,
      analysis: {
        clarity: item.analysis.clarity,
        clarityLabel: item.analysis.clarityLabel,
        dominant: item.analysis.dominant
      },
      agent: agentDescriptor(agent),
      controllerProjection: {
        narrative: {
          interpretation: step.interpretation,
          calculation: step.calculation,
          action: step.action,
          officialReport: step.officialReport,
          forwardedText: step.forwardedText
        },
        fidelity: step.fidelity,
        holdDays: step.holdDays || 0,
        effects: step.effects
      }
    });
    const narrative = response?.step;
    if (!narrative || !["interpretation", "calculation", "action", "officialReport", "forwardedText"]
      .every((key) => typeof narrative[key] === "string" && narrative[key].trim())) return "fallback";
    step.interpretation = narrative.interpretation;
    step.calculation = narrative.calculation;
    step.action = narrative.action;
    step.officialReport = narrative.officialReport;
    step.forwardedText = narrative.forwardedText;
    step.provider = response.provider || "fallback";
    item.forwardedText = step.forwardedText;
    agent.lastMove = step.action;
    agent.lastOfficialReport = step.officialReport;
    return step.provider;
  }

  function advanceDirective(item, initial = false) {
    if (!initial && item.holdDays > 0) {
      item.holdDays -= 1;
      return item.holdDays === 0 && item.nextAgentIndex >= item.agentIds.length;
    }
    const agentId = item.agentIds[item.nextAgentIndex];
    if (agentId) processAgent(item, agentById(agentId));
    return item.nextAgentIndex >= item.agentIds.length && item.holdDays === 0;
  }

  function createDirective(documentItem, optionIndex, customText = "", issuedDay = state.day) {
    const option = documentItem.options[optionIndex];
    const custom = customText.trim().length > 0;
    const orderText = custom
      ? customText.trim()
      : `${option.label}。${option.description}。责成有关衙门${option.delay}日内施行具报，不得擅增扰民。`;
    const directive = {
      id: `${issuedDay}-${documentItem.id}-${state.seed}-${Math.floor(nextRandom() * 10000)}`,
      caseId: documentItem.id,
      optionIndex,
      custom,
      order: option.label,
      orderText,
      issuedDay,
      analysis: analyzeOrder(orderText),
      agentIds: state.agents.map((agent) => agent.id),
      nextAgentIndex: 0,
      chain: [],
      forwardedText: orderText,
      drift: 0,
      holdDays: 0,
      modifiers: {}
    };
    advanceDirective(directive, true);
    return directive;
  }

  async function issueDecision(caseId, optionIndex, customText = "") {
    if (agentBusy || !state.docket.includes(caseId) || state.decisions[caseId] !== undefined) return;
    const documentItem = findDocument(caseId);
    const trimmedCustom = customText.trim();
    if (trimmedCustom && trimmedCustom.length < 4) {
      showToast("朱批至少写四个字");
      return;
    }
    const resolvedOptionIndex = trimmedCustom ? matchCustomOrder(trimmedCustom, documentItem) : optionIndex;
    const option = documentItem.options[resolvedOptionIndex];
    if (!option) return;
    const activeState = state;
    setAgentBusy(true, "经手官正在拟具接令回文");
    try {
      const directive = createDirective(documentItem, resolvedOptionIndex, trimmedCustom);
      state.decisions[caseId] = {
        optionIndex: resolvedOptionIndex,
        custom: directive.custom,
        orderText: directive.orderText,
        analysis: directive.analysis
      };
      state.pending.push(directive);
      saveState();
      renderAll();
      const first = directive.chain[0];
      await enrichAgentStep(directive, agentById(first.agentId), first);
      if (state !== activeState) return;
      saveState();
      renderAll();
      showToast(`${first.role}${first.agentName}回文已递，原批继续转行`);
    } finally {
      setAgentBusy(false);
    }
  }

  function buildCausalText(item) {
    const mostDistorting = item.chain.slice().sort((a, b) => a.fidelity - b.fidelity)[0];
    if (!mostDistorting) return "原批未经完整转行记录，执行缘由无从稽考。";
    if (item.analysis.clarity < 55) {
      return `原批措辞含混，${mostDistorting.role}${mostDistorting.agentName}遂以自身利害补足空白：${mostDistorting.calculation}`;
    }
    if (item.drift >= 40) {
      return `原批虽较明确，却在层层转行中偏移${item.drift}%；影响最大的是${mostDistorting.role}${mostDistorting.agentName}：${mostDistorting.action}`;
    }
    return `原批主旨大体保留，但${mostDistorting.role}${mostDistorting.agentName}的执行口径仍改变了轻重缓急：${mostDistorting.action}`;
  }

  function buildCompletionReport(step, incoming, outcome, success, isDirect = false) {
    const source = incoming
      ? isDirect ? "所属承办各处" : `${incoming.role}${incoming.agentName}`
      : "现场承办人役";
    const matter = `“${outcome.title}”`;
    const reportingCalculations = {
      literal: "他要让结报与卷宗逐项相合，即使不利情形也不敢擅自删改。",
      cautious: "他先判断哪些话一旦写死便要担责，准备把结论写成仍待复核。",
      careerist: success
        ? "他要把成效写成自己严催督办之功，让上司一眼看见可记入考成的成绩。"
        : "他要证明部署本无差错，把失败归到末端承办和突发情势上。",
      broker: "他要遮住经手人情与额外开销，只报局面是否暂时压住。",
      guardian: "他最在意民情是否承受得住，会淡化违背严令之处，强调地方安危。",
      factional: success
        ? "他准备把功劳归给自己照应的人，把其他经手写成奉命随办。"
        : "他先挑出没有门路的承办人担责，避免牵连故旧与同乡。"
    };
    const reportTexts = {
      literal: `奉结。据${source}回呈，${matter}。${incoming ? "原报与清册已经逐项核对，手续、数目俱留卷备查。" : `${outcome.text} 现场验记及经手名册一并附呈。`}`,
      cautious: success
        ? `奉结。据${source}回呈，${matter}，目前已见成效；惟后续是否反复尚待复核，已令续具清册。`
        : `奉结。据${source}回呈，前令尚未全竣，现有${matter}之情；各项缘由仍在复核，不敢遽称定局。`,
      careerist: success
        ? `奉结。经严催${source}昼夜办理，现已报${matter}，紧要数款俱有成效，可据此销案考成。`
        : `奉结。前令部署本已周密，嗣因${source}承办失当并有突发情势，遂见${matter}；现已另饬补救。`,
      broker: success
        ? `奉结。经${source}妥为通融承办，现报${matter}；人役、物料与开销俱称核实，地方暂无异议。`
        : `奉结。据${source}称办理中另有枝节，现见${matter}；经手与开销已经另册核过，不便在正报中烦叙。`,
      guardian: success
        ? `奉结。据${source}回报，${matter}；办理间先安民再行事，贫弱人户尚得保全，地方情绪已稳。`
        : `奉结。据${source}回报，现有${matter}之情；为免再扰地方，已先停催安抚，请准从缓补办。`,
      factional: success
        ? `奉结。经分派得人、各照旧例办理，现已报${matter}；有据可循者俱已列名存案。`
        : `奉结。据${source}回报，末端无援人役违误章程，遂致${matter}；相关责任已经分别列册候参。`
    };
    return {
      agentId: step.agentId,
      agentName: step.agentName,
      role: step.role,
      style: step.style,
      day: state.day,
      receivedReport: incoming
        ? incoming.reportText
        : `现场执行实情：${outcome.title}。${outcome.text}`,
      reportingCalculation: reportingCalculations[step.style] || "他决定据实转呈，并留下可以复核的文书。",
      reportText: reportTexts[step.style] || `奉结。据${source}回呈，${matter}，相关情形已经具卷上报。`
    };
  }

  function buildCompletionChain(item, outcome, success) {
    const completionChain = [];
    let incoming = null;
    item.chain.slice().reverse().forEach((step) => {
      const completion = buildCompletionReport(step, incoming, outcome, success, step === item.chain[0]);
      completionChain.push(completion);
      incoming = completion;
      const agent = agentById(step.agentId);
      if (agent) agent.lastOfficialReport = completion.reportText;
    });
    return completionChain;
  }

  async function enrichCompletionChain(item, outcome, completionChain) {
    const client = window.GuanLiaoAgents;
    if (!client?.complete) return { provider: "fallback", chain: completionChain };
    const response = await client.complete({
      era: state.era,
      day: state.day,
      orderText: item.orderText,
      outcome: {
        success: outcome.success,
        title: outcome.title,
        text: outcome.text
      },
      agents: completionChain.map((fallback) => ({
        agent: agentDescriptor(agentById(fallback.agentId)),
        fallback
      }))
    });
    if (!Array.isArray(response?.completionChain) || response.completionChain.length !== completionChain.length) {
      return { provider: "fallback", chain: completionChain };
    }
    const chain = completionChain.map((fallback, index) => {
      const generated = response.completionChain[index];
      if (!generated || typeof generated.reportingCalculation !== "string" || typeof generated.reportText !== "string") return fallback;
      return {
        ...fallback,
        receivedReport: typeof generated.receivedReport === "string" ? generated.receivedReport : fallback.receivedReport,
        reportingCalculation: generated.reportingCalculation,
        reportText: generated.reportText
      };
    });
    chain.forEach((completion) => {
      const agent = agentById(completion.agentId);
      if (agent) agent.lastOfficialReport = completion.reportText;
    });
    return { provider: response.provider || "fallback", chain };
  }

  async function resolvePending(item) {
    const documentItem = findDocument(item.caseId);
    const option = documentItem.options[item.optionIndex];
    const averageFidelity = item.chain.reduce((sum, step) => sum + step.fidelity, 0) / item.chain.length;
    const averageCompetence = item.agentIds.reduce((sum, id) => sum + agentById(id).competence, 0) / item.agentIds.length;
    const brokerCount = item.chain.filter((step) => step.style === "broker").length;
    const institutionalScore = item.analysis.clarity * 0.32
      + averageFidelity * 0.42
      + averageCompetence * 0.26
      - brokerCount * 8
      + (state.stats.reputation + state.stats.favor - 100) * 0.03;
    const outcomeThreshold = clamp(institutionalScore + (option.chance - 0.65) * 22, 18, 90);
    const success = nextRandom() * 100 < outcomeThreshold;
    const outcome = { ...(success ? option.success : option.failure), success };
    const finalEffects = mergeEffects(outcome.effects, item.modifiers);
    const fallbackCompletionChain = buildCompletionChain(item, outcome, success);
    const enrichedCompletion = await enrichCompletionChain(item, outcome, fallbackCompletionChain);
    const completionChain = enrichedCompletion.chain;
    const directOfficialReport = completionChain.at(-1)?.reportText || `奉结。${outcome.title}。`;
    const finalOfficialReport = directOfficialReport;
    applyEffects(finalEffects, true);
    state.merit = Math.max(0, state.merit + (success ? Math.max(5, Math.round(averageFidelity / 10)) : -6));
    const report = {
      id: item.id,
      day: state.day,
      category: documentItem.category,
      order: item.order,
      orderText: item.orderText,
      custom: item.custom,
      success,
      title: outcome.title,
      text: `${outcome.text} 政令最终以“${item.chain[item.chain.length - 1].action}”的口径落地。`,
      cause: buildCausalText(item),
      effects: finalEffects,
      chain: item.chain,
      completionChain,
      agentProvider: enrichedCompletion.provider,
      finalOfficialReport,
      directOfficialReport,
      finalOrder: item.forwardedText,
      clarity: item.analysis.clarity,
      drift: item.drift,
      read: false
    };
    state.reports.unshift(report);
    state.unreadReports += 1;
    return report;
  }

  async function endDay() {
    if (agentBusy || Object.keys(state.decisions).length !== state.docket.length) return;
    const activeState = state;
    setAgentBusy(true, "各级经手官正在转行并拟具回文");
    try {
      state.day += 1;
      const ready = [];
      const enrichments = [];
      state.pending.forEach((item) => {
        const chainLength = item.chain.length;
        if (advanceDirective(item)) ready.push(item);
        if (item.chain.length > chainLength) {
          const step = item.chain.at(-1);
          enrichments.push(enrichAgentStep(item, agentById(step.agentId), step));
        }
      });
      await Promise.all(enrichments);
      if (state !== activeState) return;
      const freshReports = await Promise.all(ready.map(resolvePending));
      if (state !== activeState) return;
      state.pending = state.pending.filter((item) => !ready.includes(item));
      const promotion = updateRank();
      if (promotion) {
        freshReports.unshift({
          success: true,
          category: "考成",
          title: "吏部考成",
          text: promotion,
          cause: "任期内多道政令的执行结果汇入考成。",
          effects: {},
          chain: [],
          read: true
        });
      }
      drawDocket();
      saveState();
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (freshReports.length) showResultModal(freshReports);
      else showToast("新的一日，政令又向下转行了一层");
    } finally {
      setAgentBusy(false);
    }
  }

  function showResultModal(reports) {
    $("#resultList").innerHTML = reports.map((report) => {
      const direct = report.chain?.[0];
      const directCompletion = directCompletionOf(report);
      const isOpaque = state.difficulty === "opaque" && report.chain?.length;
      const isReports = state.difficulty === "reports" && report.chain?.length;
      const officialTitle = `${directCompletion?.role || direct?.role || "承办官"}${directCompletion?.agentName || direct?.agentName || ""}办结回报`;
      const visibleTitle = isOpaque || isReports ? officialTitle : report.title;
      const visibleText = isOpaque || isReports
        ? directCompletion?.reportText || report.directOfficialReport || report.finalOfficialReport || report.text
        : report.text;
      const flow = state.difficulty === "guided"
        ? `<details class="chain-record"><summary>展开两程流转</summary>
            <div class="report-phases">
              <section class="report-phase"><h3>政令下行 · 真实底稿</h3>${chainStepsHtml(report.chain)}</section>
              <section class="report-phase completion-phase"><h3>办结回文 · 结果上行</h3>${completionReportsHtml(report.completionChain, true)}</section>
            </div>
          </details>`
        : isReports ? `<details class="chain-record"><summary>展开两程回文 · 接令 ${report.chain.length} / 办结 ${report.completionChain?.length || 0}</summary>${twoStageReportsHtml(report)}</details>` : "";
      const guidedCompletion = state.difficulty === "guided" && directCompletion
        ? `<div class="completion-summary"><div><span>直属办结回文</span><strong>${escapeHtml(directCompletion.role)} · ${escapeHtml(directCompletion.agentName)}</strong></div><p>${escapeHtml(directCompletion.reportText)}</p></div>`
        : "";
      return `
        <article class="result-card${state.difficulty === "guided" && !report.success ? " negative" : ""}">
          ${report.chain?.length ? `<span class="report-stage-tag">办结回文</span>` : ""}
          <h2>${escapeHtml(visibleTitle)}</h2>
          <p>${escapeHtml(visibleText)}</p>
          ${state.difficulty === "guided" && report.cause ? `<p class="report-cause">${escapeHtml(report.cause)}</p>` : ""}
          ${state.difficulty === "guided" && report.effects && Object.keys(report.effects).length ? `<div class="effects">${effectsHtml(report.effects)}</div>` : ""}
          ${guidedCompletion}
          ${report.chain?.length ? flow : ""}
        </article>
      `;
    }).join("");
    $("#resultModal").hidden = false;
  }

  function switchView(viewName) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function markReportsRead() {
    state.reports.forEach((report) => { report.read = true; });
    state.unreadReports = 0;
    saveState();
    renderReports();
    showToast("回报均已阅毕");
  }

  function bindEvents() {
    $("#documentStack").addEventListener("click", (event) => {
      const customButton = event.target.closest(".custom-dispatch");
      if (customButton) {
        const caseId = customButton.dataset.customCase;
        const textarea = document.querySelector(`textarea[data-custom-input="${caseId}"]`);
        issueDecision(caseId, null, textarea?.value || "");
        return;
      }
      const button = event.target.closest(".decision-button");
      if (!button) return;
      issueDecision(button.dataset.case, Number(button.dataset.option));
    });
    $("#documentStack").addEventListener("input", (event) => {
      const textarea = event.target.closest("textarea[data-custom-input]");
      if (!textarea) return;
      const caseId = textarea.dataset.customInput;
      const count = document.querySelector(`[data-count-for="${caseId}"]`);
      const button = document.querySelector(`[data-custom-case="${caseId}"]`);
      if (count) count.textContent = textarea.value.length;
      if (button) button.disabled = textarea.value.trim().length < 4;
    });
    $("#endDayButton").addEventListener("click", endDay);
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
    $("#markReportsRead").addEventListener("click", markReportsRead);
    $("#closeResultButton").addEventListener("click", () => { $("#resultModal").hidden = true; });

    $("#eraOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-era]");
      if (!button) return;
      selectedEra = button.dataset.era;
      $$("#eraOptions button").forEach((item) => item.classList.toggle("active", item === button));
    });
    $("#difficultyOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-difficulty]");
      if (!button) return;
      selectedDifficulty = button.dataset.difficulty;
      $$("#difficultyOptions button").forEach((item) => item.classList.toggle("active", item === button));
    });
    $("#routeOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-route]");
      if (!button) return;
      selectedRoute = button.dataset.route;
      $$("#routeOptions button").forEach((item) => item.classList.toggle("active", item === button));
    });
    $("#startGameButton").addEventListener("click", () => {
      state = createState(selectedEra, selectedRoute, $("#nameInput").value, selectedDifficulty);
      drawDocket();
      saveState();
      renderAll();
      $("#onboarding").hidden = true;
      showToast("官印已接，今日三份公文候批");
    });

    const openResetConfirmation = () => { $("#confirmModal").hidden = false; };
    $("#newGameButton").addEventListener("click", openResetConfirmation);
    $("#mobileNewGameButton").addEventListener("click", openResetConfirmation);
    $("#cancelReset").addEventListener("click", () => { $("#confirmModal").hidden = true; });
    $("#confirmReset").addEventListener("click", () => {
      clearSavedState();
      $("#resultModal").hidden = true;
      $("#resultList").replaceChildren();
      selectedEra = "ming";
      selectedRoute = "local";
      selectedDifficulty = "guided";
      state = createState(selectedEra, selectedRoute, "顾惟诚", selectedDifficulty);
      drawDocket();
      $$("#eraOptions button").forEach((item) => item.classList.toggle("active", item.dataset.era === selectedEra));
      $$("#routeOptions button").forEach((item) => item.classList.toggle("active", item.dataset.route === selectedRoute));
      $$("#difficultyOptions button").forEach((item) => item.classList.toggle("active", item.dataset.difficulty === selectedDifficulty));
      $("#confirmModal").hidden = true;
      $("#onboarding").hidden = false;
      renderAll();
    });
  }

  const hasSave = loadState();
  bindEvents();
  renderAll();
  $("#onboarding").hidden = hasSave;
  void hydrateRemoteState();

  window.__GUANLIAO_DEBUG__ = {
    snapshot: () => JSON.parse(JSON.stringify(state)),
    decide: issueDecision,
    custom: (caseId, text) => issueDecision(caseId, null, text),
    endDay,
    clearSave: clearSavedState
  };
})();
