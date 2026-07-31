import type { CaseDefinition } from "@tashuo/core";
import { STANDARD_STAGES } from "../shared.js";

const paragraphs = (lead: string, detail: string, caution: string) => `${lead}\n\n${detail}\n\n${caution}`;
export const LOST_CONTROL_DEMO: CaseDefinition = {
  id: "lost-control-demo", version: "1.0.0", title: "失控的演示", synopsis: "一场救援机器人演示事故，在剪辑视频、企业声明、员工爆料与商业舆论中不断改变面貌。", durationMinutes: 10_080, realSecondsPerGameMinute: 6, stages: STANDARD_STAGES,
  facts: [
    { id: "robot_failed", statement: "机器人公开演示发生控制故障。", truth: "true", importance: "critical", explanation: "多个现场材料可交叉确认。" },
    { id: "video_edited", statement: "热门视频删去了碰撞前接管提示。", truth: "true", importance: "critical", explanation: "连续版本可以互证。" },
    { id: "fully_remote", statement: "机器人全程由人远程操控。", truth: "false", importance: "critical", explanation: "存在自主导航和未公开人工辅助。" },
    { id: "human_assist", statement: "现场存在未公开的人工辅助。", truth: "true", importance: "critical", explanation: "控制台画面与说明相互支持。" },
    { id: "known_instability", statement: "公司事前知道特定环境下的稳定性风险。", truth: "true", importance: "critical", explanation: "测试记录可以印证。" },
    { id: "network_cause", statement: "网络异常直接导致碰撞。", truth: "false", importance: "critical", explanation: "时间戳并不吻合。" },
    { id: "former_employee_truth", statement: "前员工的全部判断都准确。", truth: "partial", importance: "supporting", explanation: "材料真实但归因过度。" },
    { id: "competitor_push", statement: "竞争公司推动了负面话题。", truth: "true", importance: "supporting", explanation: "合作记录支持此点。" },
  ],
  sources: [
    { id: "city_tv_tech", name: "澜江电视台·科技现场", kind: "tv", publicDescription: "城市科技新闻栏目。", agenda: "速度与收视率", knownFactIds: ["robot_failed", "video_edited"] },
    { id: "city_public_channel", name: "澜江市民频道", kind: "tv", publicDescription: "以公共安全和现场求证为主的电视栏目。", agenda: "提示风险", knownFactIds: ["robot_failed", "human_assist"] },
    { id: "city_business", name: "澜江商报", kind: "newspaper", publicDescription: "关注本地企业和产业政策。", agenda: "企业影响", knownFactIds: ["robot_failed", "competitor_push"] },
    { id: "industry_weekly", name: "装备产业周刊", kind: "newspaper", publicDescription: "跟踪技术合规记录的行业报纸。", agenda: "还原测试边界", knownFactIds: ["known_instability", "network_cause"] },
    { id: "zhuguang_official", name: "逐光智能", kind: "official", publicDescription: "认证企业账号。", agenda: "控制声誉", knownFactIds: ["human_assist", "network_cause"] },
    { id: "former_engineer", name: "工程师老周", kind: "self_media", publicDescription: "自称前测试工程师。", agenda: "证明此前意见", knownFactIds: ["known_instability"] },
    { id: "audience_lin", name: "现场的林同学", kind: "resident", publicDescription: "发布现场短视频的观众。", agenda: "记录见闻", knownFactIds: ["video_edited", "human_assist"] },
    { id: "tech_lens", name: "科技透镜", kind: "self_media", publicDescription: "科技测评账号。", agenda: "扩大影响", knownFactIds: ["fully_remote", "competitor_push"] },
  ],
  contents: [
    { id: "former_engineer_logs", sourceId: "former_engineer", kind: "post", publishedAtMinute: 1_440, title: "这类抖动三个月前就出现过", body: "账号展示两张测试表截图，指出复杂反光环境下导航不稳定，并断言本次事故与旧缺陷完全相同。", claims: [{ factId: "known_instability", relation: "supports" }, { factId: "former_employee_truth", relation: "supports" }], misleadingTechniques: ["certainty_inflation"], commentsEnabled: true, trafficWeight: 8 },
    { id: "demo_clip_viral", sourceId: "audience_lin", kind: "short_video", publishedAtMinute: 0, title: "救援机器人突然转向撞倒展架", body: "镜头从机器人急转时切入，随后撞倒侧面的灯架。画外有人喊停一下，视频到此结束。", claims: [{ factId: "robot_failed", relation: "supports" }], misleadingTechniques: ["edited_context"], commentsEnabled: true, trafficWeight: 10 },
    { id: "tv_breaking", sourceId: "city_tv_tech", kind: "tv_news", publishedAtMinute: 90, title: "本市救援机器人公开演示发生意外", body: paragraphs("主持人确认现场无人受伤，受损展架已被撤离。", "主办方表示已要求企业保留资料，企业称正在检查设备和无线网络。", "热门短片能确认碰撞发生，不能单独说明碰撞前的操作过程。"), claims: [{ factId: "robot_failed", relation: "supports" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 8 },
    { id: "fraud_thread", sourceId: "tech_lens", kind: "post", publishedAtMinute: 360, title: "所谓自主机器人恐怕只是遥控模型", body: "账号把操作员照片和撞击视频并列，断言全程遥控，但没有连续控制画面。", claims: [{ factId: "fully_remote", relation: "speculates" }, { factId: "human_assist", relation: "supports" }], misleadingTechniques: ["certainty_inflation"], commentsEnabled: true, trafficWeight: 9 },
    { id: "public_safety_special", sourceId: "city_public_channel", kind: "tv_news", publishedAtMinute: 1_080, title: "演示区域设有接管席位，完整处置记录尚未公开", body: paragraphs("记者回看现场平面图，机器人路线旁设有安全员接管席位。", "观众确认碰撞前控制台出现黄色提示，但无法判断提示持续时间。", "存在人工辅助和人工辅助是否导致碰撞，是需要分别核实的两个问题。"), claims: [{ factId: "robot_failed", relation: "supports" }, { factId: "human_assist", relation: "supports" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 7 },
    { id: "business_financing", sourceId: "city_business", kind: "newspaper", publishedAtMinute: 1_800, title: "逐光智能正处于融资窗口", body: paragraphs("本报梳理公开资料发现，公司多个示范项目正处于验收节点。", "受访投资人称事故可能影响市场信心，但未提供演示造假的证据。", "融资压力值得作为背景阅读，不能替代对控制记录的核查。"), claims: [{ factId: "robot_failed", relation: "supports" }], misleadingTechniques: ["selective_context"], commentsEnabled: false, trafficWeight: 6 },
    { id: "fuller_angle", sourceId: "audience_lin", kind: "short_video", publishedAtMinute: 2_160, title: "我手机里还有前面二十秒", body: "文字描述显示撞击前控制台亮起黄色接管提示，工作人员操作后机器人仍继续偏转。", claims: [{ factId: "video_edited", relation: "supports" }, { factId: "human_assist", relation: "supports" }], misleadingTechniques: [], commentsEnabled: true, trafficWeight: 9 },
    { id: "industry_test_records", sourceId: "industry_weekly", kind: "newspaper", publishedAtMinute: 3_600, title: "反光环境曾被列为测试限制条件", body: paragraphs("本报查阅测试摘要，玻璃幕墙和强反光灯具被列为额外评估条件。", "行业人员称公开演示采用安全员辅助并不罕见，关键是辅助范围是否提前说明。", "记录支持曾存在稳定性风险，不能据此认定事故只有一个原因。"), claims: [{ factId: "known_instability", relation: "supports" }, { factId: "network_cause", relation: "speculates" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 7 },
    { id: "company_correction", sourceId: "zhuguang_official", kind: "official_notice", publishedAtMinute: 4_320, title: "补充说明：安全员可进行有限干预", body: "公司承认现场有人工辅助，称干预没有改变自主决策，并公布网络波动时间。", claims: [{ factId: "human_assist", relation: "supports" }, { factId: "network_cause", relation: "supports" }], misleadingTechniques: ["selective_context"], commentsEnabled: true, trafficWeight: 10 },
    { id: "timeline_analysis", sourceId: "city_tv_tech", kind: "tv_news", publishedAtMinute: 5_040, title: "控制台时间与撞击时间相差近一分钟", body: paragraphs("晚间栏目比对字幕，网络波动早于明显偏转近一分钟。", "专家表示网络波动可能触发保护策略，也可能只是同期变量。", "人工辅助、稳定性问题和网络异常需要分别检验。"), claims: [{ factId: "network_cause", relation: "denies" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 8 },
    { id: "sponsor_disclosure", sourceId: "city_business", kind: "newspaper", publishedAtMinute: 6_480, title: "测评账号合作名单出现竞争企业", body: paragraphs("本报查到科技透镜公开的合作名单中有竞争企业推广项目。", "名单能说明商业关系，不能证明每条批评都受指挥。", "具体说法仍应回到视频和记录本身。"), claims: [{ factId: "competitor_push", relation: "supports" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 6 },
    { id: "closing_summary_demo", sourceId: "city_public_channel", kind: "tv_news", publishedAtMinute: 8_640, title: "完整控制记录仍是演示事故调查关键", body: paragraphs("总结报道确认故障、人工辅助与稳定性问题均存在。", "网络异常、产品造假和商业推动属于不同层次的问题。", "栏目呼吁等待可复核记录，而非把多项线索压成一个结论。"), claims: [{ factId: "robot_failed", relation: "supports" }, { factId: "human_assist", relation: "supports" }, { factId: "known_instability", relation: "supports" }], misleadingTechniques: [], commentsEnabled: false, trafficWeight: 5 },
  ],
  groups: [
    { id: "product_supporters", name: "产品拥护者", description: "维护本地技术企业声誉。", initialFrenzy: 48, attention: 70, exclusivity: 58, dissentSensitivity: 64, mobilization: 55, persistence: 55, narrativeFactIds: ["robot_failed"] },
    { id: "fraud_believers", name: "造假论群体", description: "相信演示是骗局。", initialFrenzy: 72, attention: 86, exclusivity: 78, dissentSensitivity: 82, mobilization: 76, persistence: 70, narrativeFactIds: ["fully_remote"] },
    { id: "industry_workers", name: "行业从业者", description: "关注技术边界。", initialFrenzy: 38, attention: 72, exclusivity: 35, dissentSensitivity: 44, mobilization: 30, persistence: 62, narrativeFactIds: ["human_assist"] },
    { id: "spectators", name: "围观群体", description: "传播失误片段。", initialFrenzy: 58, attention: 90, exclusivity: 25, dissentSensitivity: 30, mobilization: 68, persistence: 28, narrativeFactIds: ["robot_failed"] },
  ],
};
