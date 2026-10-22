import type { FactAssessmentRule } from "@tashuo/core";

export const LOST_CONTROL_DEMO_REPORT_RUBRIC: FactAssessmentRule[] = [
  {
    factId: "robot_failed", kind: "observation",
    evidence: [
      { contentId: "demo_clip_viral", originIds: ["lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "tv_breaking", originIds: ["lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "fuller_angle", originIds: ["lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "public_safety_special", originIds: ["venue_fixed_camera", "lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "closing_summary_demo", originIds: ["venue_fixed_camera", "lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "demo_visible_collision", contentIds: ["demo_clip_viral"], acceptedJudgments: ["true"], confidenceRange: [78, 94], explanation: "首发画面直接记录设备偏离路线并碰撞展架，可以确认演示运行异常，不能由此指定内部原因。" },
      { id: "demo_reported_collision", contentIds: ["tv_breaking"], acceptedJudgments: ["true"], confidenceRange: [78, 94], explanation: "报道完整呈现同一首发画面及出处，足以确认事故；电视与首发仍是同源，不能相加为两名独立目击者。" },
      { id: "demo_continuous_collision", contentIds: ["fuller_angle"], acceptedJudgments: ["true"], confidenceRange: [84, 97], explanation: "连续原片包含偏转前后和碰撞，支持事故发生，但仍不单独证明技术归因。" },
      { id: "demo_two_camera_collision", contentIds: ["public_safety_special"], acceptedJudgments: ["true"], confidenceRange: [90, 98], explanation: "节目对照主办方固定机位与观众手机两个记录，能够核对现场异常和碰撞过程。" },
      { id: "demo_final_recorded_collision", contentIds: ["closing_summary_demo"], acceptedJudgments: ["true"], confidenceRange: [90, 98], explanation: "总结明确引用已有影像与记录确认故障，不因为发布时间靠后而获得额外独立来源。" },
    ],
  },
  {
    factId: "video_edited", kind: "source",
    evidence: [
      // The short version acquires direction only when a complete version-comparison route is public.
      { contentId: "demo_clip_viral", originIds: ["lin_phone_recording"], role: "record" },
      { contentId: "fuller_angle", originIds: ["lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "public_safety_special", originIds: ["lin_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "lin_scope_clarification", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "lin_source_note", originIds: ["lin_phone_recording"], role: "context" },
    ],
    routes: [
      { id: "demo_clip_version_comparison", contentIds: ["demo_clip_viral", "fuller_angle"], acceptedJudgments: ["true"], confidenceRange: [90, 99], explanation: "对照六秒首发与二十六秒原片，可定位被截掉的黄色提示及操作画面；版本来自同一手机是比较成立的条件，不能据此断言恶意剪辑动机。" },
      { id: "demo_broadcast_version_comparison", contentIds: ["demo_clip_viral", "public_safety_special"], acceptedJudgments: ["true"], confidenceRange: [86, 97], explanation: "首发与节目呈现的连续原片具有不同起点，支持截取省略了前文；节目引用的手机片段仍是同一原始来源。" },
    ],
  },
  {
    factId: "fully_remote", kind: "causal",
    evidence: [
      { contentId: "fraud_thread", originIds: ["lin_phone_recording", "company_first_statement"], role: "claim" },
      { contentId: "fuller_angle", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "lin_scope_clarification", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "lin_source_note", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "public_safety_special", originIds: ["venue_fixed_camera", "lin_phone_recording"], role: "context" },
      { contentId: "industry_test_records", originIds: ["rescue_control_manual"], role: "context" },
      { contentId: "company_correction", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["false"] },
      { contentId: "timeline_analysis", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["false"] },
      { contentId: "closing_summary_demo", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "demo_control_modes_with_record", contentIds: ["industry_test_records", "company_correction"], acceptedJudgments: ["false"], confidenceRange: [84, 96], explanation: "接口允许的控制模式与当日封存记录相符，存在本机导航帧和短时接管，反对全程人工方向输入；不能反过来说完全没有人工辅助。" },
      { id: "demo_command_sequence", contentIds: ["timeline_analysis"], acceptedJudgments: ["false"], confidenceRange: [88, 98], explanation: "节目呈现起步至碰撞的指令来源和有限接管记录，能区分部分人工辅助与全程遥控。" },
      { id: "demo_control_modes_review", contentIds: ["closing_summary_demo"], acceptedJudgments: ["false"], confidenceRange: [88, 98], explanation: "总结引用接口和实际运行记录辨认两类控制指令，证据来源仍是这些记录，不把总结本身视为新测量。" },
    ],
    counterContentIds: ["fraud_thread"],
  },
  {
    factId: "human_assist", kind: "observation",
    evidence: [
      { contentId: "fuller_angle", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "lin_scope_clarification", originIds: ["lin_phone_recording"], role: "context" },
      { contentId: "public_safety_special", originIds: ["venue_fixed_camera", "lin_phone_recording"], role: "context" },
      { contentId: "industry_test_records", originIds: ["rescue_control_manual"], role: "context" },
      { contentId: "company_correction", originIds: ["sealed_controller_export", "rescue_control_manual", "company_first_statement"], role: "record", supportsJudgments: ["true"] },
      { contentId: "timeline_analysis", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["true"] },
      { contentId: "closing_summary_demo", originIds: ["sealed_controller_export", "rescue_control_manual", "company_first_statement"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "demo_assistance_disclosure", contentIds: ["company_correction"], acceptedJudgments: ["true"], confidenceRange: [86, 98], explanation: "公司补充说明承认此前未说明有限辅助安排，附当日实际接管请求记录；判断限定于存在辅助，不推定接管成功或全程遥控。" },
      { id: "demo_assistance_record_and_history", contentIds: ["company_correction", "timeline_analysis"], acceptedJudgments: ["true"], confidenceRange: [88, 98], explanation: "更正交代此前披露不足，节目核对实际请求；两篇稿件引用同一控制记录，不因为转述两次就增加独立来源。" },
      { id: "demo_assistance_review", contentIds: ["closing_summary_demo"], acceptedJudgments: ["true"], confidenceRange: [86, 97], explanation: "总结明确连接实际短时接管与活动说明不充分，保留人工介入范围的限制。" },
    ],
  },
  {
    factId: "known_instability", kind: "source",
    evidence: [
      { contentId: "former_engineer_logs", originIds: ["historical_test_archive"], role: "record", supportsJudgments: ["true"] },
      { contentId: "business_financing", originIds: ["historical_test_archive"], role: "record", supportsJudgments: ["true"] },
      { contentId: "industry_test_records", originIds: ["historical_test_archive"], role: "record", supportsJudgments: ["true"] },
      { contentId: "independent_mechanism_report", originIds: ["historical_test_archive"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "demo_signed_risk_sheet", contentIds: ["former_engineer_logs"], acceptedJudgments: ["true"], confidenceRange: [76, 91], explanation: "T-17风险栏和负责人签收支持公司事前接触过特定环境风险；这不能使发帖者另外的网络归因自动成立。" },
      { id: "demo_risk_sheet_industry_report", contentIds: ["industry_test_records"], acceptedJudgments: ["true"], confidenceRange: [82, 95], explanation: "行业报道核对风险条件与签收，支持事先知道稳定性风险，不等于知道当天一定碰撞。" },
      { id: "demo_risk_sheet_business_check", contentIds: ["former_engineer_logs", "business_financing"], acceptedJudgments: ["true"], confidenceRange: [80, 94], explanation: "公开表格与商报对签收对应关系的核对相连；融资或验收背景不能替代风险文件，转载也不能成为新来源。" },
      { id: "demo_risk_sheet_mechanism_check", contentIds: ["independent_mechanism_report"], acceptedJudgments: ["true"], confidenceRange: [82, 95], explanation: "检测报道同时引用旧风险记录，支持已知风险；此事实的源头仍是测试档案，不把新的实验误计成事前知情的另一份记录。" },
    ],
  },
  {
    factId: "network_cause", kind: "causal",
    evidence: [
      { contentId: "fraud_thread", originIds: ["company_first_statement", "lin_phone_recording"], role: "claim" },
      { contentId: "former_engineer_logs", originIds: ["historical_test_archive"], role: "claim" },
      { contentId: "industry_test_records", originIds: ["rescue_control_manual"], role: "context" },
      { contentId: "company_correction", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["false"] },
      { contentId: "timeline_analysis", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["false"] },
      { contentId: "independent_mechanism_report", originIds: ["independent_bench_examination"], role: "record", supportsJudgments: ["false"] },
      { contentId: "closing_summary_demo", originIds: ["rescue_control_manual", "sealed_controller_export", "independent_bench_examination"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "demo_network_path_and_actual_input", contentIds: ["industry_test_records", "company_correction"], acceptedJudgments: ["false"], confidenceRange: [82, 95], explanation: "接口说明排除监看通道直接下发转向，封存记录将实际故障帧定位到本机旧队列；论证依赖机制与实际输入，不依赖近一分钟时间差。" },
      { id: "demo_network_command_trace", contentIds: ["timeline_analysis"], acceptedJudgments: ["false"], confidenceRange: [86, 97], explanation: "同一报道给出输入通道、帧来源和队列状态，足以反对监看异常直接导致本次碰撞；不能泛化为网络永远不影响安全。" },
      { id: "demo_network_independent_test", contentIds: ["independent_mechanism_report"], acceptedJudgments: ["false"], confidenceRange: [90, 98], explanation: "独立对照实验与机构自行读取的事故存储共同指向本机缺陷；仅靠正常网络下也能发生相似现象尚不充分，实际存储对应关系不可省略。" },
      { id: "demo_network_mechanism_review", contentIds: ["closing_summary_demo"], acceptedJudgments: ["false"], confidenceRange: [88, 98], explanation: "总结完整引用接口、封存记录与独立实验；它是既有证据的复用，不是新的独立事故样本。" },
    ],
    counterContentIds: ["fraud_thread", "former_engineer_logs"],
  },
  {
    factId: "former_employee_truth", kind: "source",
    evidence: [
      // A source's original assertions need the comparison route before they support a verdict on their accuracy.
      { contentId: "former_engineer_logs", originIds: ["historical_test_archive"], role: "record" },
      { contentId: "industry_test_records", originIds: ["historical_test_archive", "rescue_control_manual"], role: "context" },
      { contentId: "company_correction", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["partial", "false"] },
      { contentId: "timeline_analysis", originIds: ["sealed_controller_export", "rescue_control_manual"], role: "record", supportsJudgments: ["partial", "false"] },
      { contentId: "independent_mechanism_report", originIds: ["historical_test_archive", "independent_bench_examination"], role: "record", supportsJudgments: ["partial", "false"] },
    ],
    routes: [
      { id: "demo_employee_mixed_claims", contentIds: ["former_engineer_logs", "industry_test_records", "company_correction"], acceptedJudgments: ["partial", "false"], confidenceRange: [82, 96], explanation: "原帖风险档案有据，网络归因却与接口及实际输入不符；可以说‘部分准确’或‘并非全部准确’，不能说所有材料都是假的。" },
      { id: "demo_employee_trace_comparison", contentIds: ["former_engineer_logs", "timeline_analysis"], acceptedJudgments: ["partial", "false"], confidenceRange: [85, 97], explanation: "把原帖实际说法与控制链路核对，区分真实风险记录和不成立的现场归因。" },
      { id: "demo_employee_experiment_comparison", contentIds: ["former_engineer_logs", "independent_mechanism_report"], acceptedJudgments: ["partial", "false"], confidenceRange: [88, 98], explanation: "独立检测及旧记录同时说明哪些部分可靠、哪些解释过度；原帖必须被引用，不能只因其身份或离职经历否定其全部内容。" },
    ],
  },
  {
    factId: "competitor_push", kind: "source",
    evidence: [
      { contentId: "fraud_thread", originIds: ["company_first_statement", "lin_phone_recording"], role: "context" },
      { contentId: "sponsor_disclosure", originIds: ["promotion_settlement_record"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "demo_paid_distribution_record", contentIds: ["sponsor_disclosure"], acceptedJudgments: ["true"], confidenceRange: [86, 97], explanation: "具体事故话题分发结算与账号更正支持竞争企业推动传播；一般合作关系、激烈批评或事故本身均不足以证明这一点，更不能证明竞争者制造事故。" },
    ],
  },
];
