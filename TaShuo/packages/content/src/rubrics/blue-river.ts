import type { FactAssessmentRule } from "@tashuo/core";

export const BLUE_RIVER_REPORT_RUBRIC: FactAssessmentRule[] = [
  {
    factId: "blue_video_real", kind: "observation",
    evidence: [
      { contentId: "river_first_clip", originIds: ["he_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "tv_morning_river", originIds: ["he_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "angler_timeline", originIds: ["he_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "resident_safety_report", originIds: ["he_phone_recording"], role: "record", supportsJudgments: ["true"] },
      { contentId: "tv_evening_river", originIds: ["he_phone_recording"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "river_visible_landmarks", contentIds: ["river_first_clip"], acceptedJudgments: ["true"], confidenceRange: [75, 92], explanation: "首发原片提供可辨认的码头与时钟，支持该时地的蓝色水带观察；单一视频不能直接证明水质、毒性或全天状况。" },
      { id: "river_reported_landmarks", contentIds: ["tv_morning_river"], acceptedJudgments: ["true"], confidenceRange: [77, 93], explanation: "节目核对首发位置和画面时刻，仍来自老何手机，不因电视转载形成独立拍摄。" },
      { id: "river_recording_sequence", contentIds: ["river_first_clip", "angler_timeline"], acceptedJudgments: ["true"], confidenceRange: [83, 95], explanation: "同一码头连续记录与原顺序增强时地可核验性；同源的多段视频不能按数量堆成多次独立检测。" },
      { id: "river_sequence_report", contentIds: ["resident_safety_report"], acceptedJudgments: ["true"], confidenceRange: [83, 95], explanation: "民生报道核对三个片段的时地与范围，支持视频观察的真实性，不推出鱼类死因。" },
      { id: "river_recording_review", contentIds: ["tv_evening_river"], acceptedJudgments: ["true"], confidenceRange: [83, 95], explanation: "回看引用首发和早段记录确认画面真实性，不能把后来报道当成新的原始来源。" },
    ],
  },
  {
    factId: "tracer_primary", kind: "causal",
    evidence: [
      { contentId: "river_first_clip", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "deleted_tracer_notice", originIds: ["municipal_procurement_archive"], role: "context" },
      { contentId: "contractor_response", originIds: ["contractor_first_statement", "municipal_procurement_archive"], role: "claim" },
      { contentId: "contractor_records_report", originIds: ["contractor_operation_log", "municipal_procurement_archive"], role: "context" },
      { contentId: "factory_accusation", originIds: ["he_phone_recording", "factory_public_statement"], role: "claim" },
      { contentId: "factory_violation", originIds: ["municipal_pipe_survey"], role: "record", supportsJudgments: ["true"] },
      { contentId: "official_full_notice", originIds: ["municipal_pipe_survey", "contractor_operation_log"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "river_tracer_path_and_fingerprint", contentIds: ["factory_violation"], acceptedJudgments: ["true"], confidenceRange: [86, 97], explanation: "管线摄录追到入河路径，显色成分匹配示踪批次，共同支撑主要水色来源；只知道计划使用示踪剂不足以完成归因。" },
      { id: "river_tracer_operation_and_path", contentIds: ["contractor_records_report", "factory_violation"], acceptedJudgments: ["true"], confidenceRange: [90, 98], explanation: "实际作业记录与独立市政路径及成分结果相互支持，排除仅靠许可或企业自述推断去向。" },
      { id: "river_tracer_published_findings", contentIds: ["official_full_notice"], acceptedJudgments: ["true"], confidenceRange: [88, 98], explanation: "阶段通报明确引用加注、管线及成分三项依据；可以核验其公开链接，但通报不是第三份独立原始采样。" },
    ],
    counterContentIds: ["factory_accusation"],
  },
  {
    factId: "tracer_overdose", kind: "causal",
    evidence: [
      { contentId: "deleted_tracer_notice", originIds: ["municipal_procurement_archive"], role: "context" },
      { contentId: "contractor_response", originIds: ["contractor_first_statement", "municipal_procurement_archive"], role: "claim" },
      // Each component supports the compound direction; only the authored route confirms both components.
      { contentId: "contractor_records_report", originIds: ["contractor_operation_log", "municipal_procurement_archive"], role: "record", supportsJudgments: ["partial", "true"] },
      { contentId: "factory_violation", originIds: ["municipal_pipe_survey"], role: "record", supportsJudgments: ["partial", "true"] },
      { contentId: "official_full_notice", originIds: ["contractor_operation_log", "municipal_pipe_survey"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "river_overdose_only_established", contentIds: ["contractor_records_report"], acceptedJudgments: ["partial"], confidenceRange: [75, 92], explanation: "公开表格能确认超量，但这篇报道尚未给出错接入河复核；合理结论是超量部分成立、具体入河路径仍待核验，不能把合取命题整体写成已证实。" },
      { id: "river_overdose_and_misconnection", contentIds: ["contractor_records_report", "factory_violation"], acceptedJudgments: ["true"], confidenceRange: [90, 98], explanation: "加注表证明实际超量，独立管线和成分复核证明经错接入河，两部分均有依据后才能确认完整陈述。" },
      { id: "river_overdose_linked_findings", contentIds: ["official_full_notice"], acceptedJudgments: ["true"], confidenceRange: [87, 97], explanation: "通报同时列出实际加注及错接路径证据，完整覆盖命题；许可本身或删帖行为均不能代替这两项。" },
    ],
    counterContentIds: ["contractor_response"],
  },
  {
    factId: "fish_due_tracer", kind: "causal",
    evidence: [
      { contentId: "river_first_clip", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "angler_timeline", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "angler_scope_note", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "resident_safety_report", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "dead_fish_old_photo", originIds: ["old_bridge_news_archive"], role: "claim" },
      { contentId: "contractor_response", originIds: ["contractor_first_statement"], role: "claim" },
      { contentId: "official_preliminary", originIds: ["environment_morning_samples"], role: "context" },
      { contentId: "oxygen_investigation", originIds: ["river_sensor_and_gate_archive", "university_ecology_samples"], role: "record", supportsJudgments: ["false"] },
      { contentId: "official_full_notice", originIds: ["river_sensor_and_gate_archive", "university_ecology_samples"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "river_fish_mechanism_comparison", contentIds: ["oxygen_investigation"], acceptedJudgments: ["false"], confidenceRange: [86, 97], explanation: "连续溶解氧、独立留样及控制氧条件的对照支持低氧为本次主因；仅凭鱼异常早于蓝带、上午未检出或材料一般说明都不足以否定示踪剂毒性归因。" },
      { id: "river_fish_linked_findings", contentIds: ["official_full_notice"], acceptedJudgments: ["false"], confidenceRange: [84, 96], explanation: "通报引用连续监测与独立研究说明主要鱼群异常，结论限于该时段和实测浓度，不能扩成任何剂量示踪剂均无害。" },
    ],
    counterContentIds: ["dead_fish_old_photo"],
  },
  {
    factId: "sewer_overflow", kind: "causal",
    evidence: [
      { contentId: "angler_timeline", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "angler_scope_note", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "resident_safety_report", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "official_preliminary", originIds: ["environment_morning_samples"], role: "context" },
      { contentId: "oxygen_investigation", originIds: ["river_sensor_and_gate_archive", "university_ecology_samples"], role: "record", supportsJudgments: ["true"] },
      { contentId: "official_full_notice", originIds: ["river_sensor_and_gate_archive", "university_ecology_samples"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "river_oxygen_overflow_mechanism", contentIds: ["oxygen_investigation"], acceptedJudgments: ["true"], confidenceRange: [86, 97], explanation: "闸门输入、上下游连续溶解氧、独立现场采样和增氧对照共同连接雨污混流与主要鱼群异常；不能只用先后顺序当作因果证明。" },
      { id: "river_oxygen_published_findings", contentIds: ["official_full_notice"], acceptedJudgments: ["true"], confidenceRange: [84, 96], explanation: "阶段通报链接的监测与独立样品支持低氧机制，必须限制为此次主要异常，不能由此排除所有其他环境风险。" },
    ],
  },
  {
    factId: "factory_compliant", kind: "source",
    evidence: [
      { contentId: "factory_denial", originIds: ["factory_public_statement"], role: "claim" },
      { contentId: "factory_accusation", originIds: ["factory_public_statement"], role: "context" },
      { contentId: "factory_violation", originIds: ["factory_outfall_monitoring"], role: "record", supportsJudgments: ["false"] },
      { contentId: "official_full_notice", originIds: ["factory_outfall_monitoring"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "river_factory_outfall_noncompliance", contentIds: ["factory_violation"], acceptedJudgments: ["false"], confidenceRange: [90, 99], explanation: "当日排口补录中的化学需氧量超标足以反驳所有排放合规，不能用这一项违规解释颜色和全部鱼异常。" },
      { id: "river_factory_record_in_findings", contentIds: ["official_full_notice"], acceptedJudgments: ["false"], confidenceRange: [88, 98], explanation: "通报明确列出当日超标记录，支持否定全面合规；它与报纸援引同一监测数据，不是两次独立测量。" },
    ],
    counterContentIds: ["factory_denial"],
  },
  {
    factId: "factory_caused_blue", kind: "causal",
    evidence: [
      { contentId: "factory_accusation", originIds: ["he_phone_recording", "factory_public_statement"], role: "claim" },
      { contentId: "factory_denial", originIds: ["factory_public_statement"], role: "claim" },
      { contentId: "angler_scope_note", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "deleted_tracer_notice", originIds: ["municipal_procurement_archive"], role: "context" },
      { contentId: "factory_violation", originIds: ["municipal_pipe_survey"], role: "record", supportsJudgments: ["false"] },
      { contentId: "official_full_notice", originIds: ["municipal_pipe_survey", "contractor_operation_log"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "river_blue_actual_drain_path", contentIds: ["factory_violation"], acceptedJudgments: ["false"], confidenceRange: [86, 97], explanation: "支管摄录、排口分流和显色成分核对把此次蓝色水带定位到施工示踪，反对工厂造成蓝水；不是相信企业否认，也不是认定企业完全无违规。" },
      { id: "river_blue_published_source_chain", contentIds: ["official_full_notice"], acceptedJudgments: ["false"], confidenceRange: [85, 96], explanation: "通报给出示踪剂经错接入河的公开证据链，足以否定本次主要蓝色水体归因于工厂，但不免除其他排放责任。" },
    ],
    counterContentIds: ["factory_accusation"],
  },
  {
    factId: "old_fish_photo", kind: "source",
    evidence: [
      { contentId: "dead_fish_old_photo", originIds: ["old_bridge_news_archive"], role: "record", supportsJudgments: ["false"] },
      { contentId: "factory_violation", originIds: ["old_bridge_news_archive"], role: "record", supportsJudgments: ["false"] },
      { contentId: "tv_evening_river", originIds: ["old_bridge_news_archive"], role: "record", supportsJudgments: ["false"] },
    ],
    routes: [
      { id: "river_photo_archive_and_correction", contentIds: ["dead_fish_old_photo"], acceptedJudgments: ["false"], confidenceRange: [89, 99], explanation: "该公开版本已包含相同照片的两年前报道链接和资料图更正，能核对年代；不能仅依据原帖主张标签继续将它当作当天照片。" },
      { id: "river_photo_archive_newspaper", contentIds: ["factory_violation"], acceptedJudgments: ["false"], confidenceRange: [91, 99], explanation: "报纸明确核对旧桥影像与公开报道存档，否定照片为当日所拍；不能因此否定本次真实发生的少量鱼异常。" },
      { id: "river_photo_archive_review", contentIds: ["tv_evening_river"], acceptedJudgments: ["false"], confidenceRange: [88, 98], explanation: "电视回看引用同一旧照档案，支持时间错位判断，但不增加独立原始照片数量。" },
    ],
  },
  {
    factId: "official_result_true", kind: "source",
    evidence: [
      { contentId: "angler_source_note", originIds: ["he_phone_recording"], role: "context" },
      { contentId: "official_preliminary", originIds: ["environment_morning_samples"], role: "record", supportsJudgments: ["true"] },
      { contentId: "official_full_notice", originIds: ["environment_morning_samples"], role: "record", supportsJudgments: ["true"] },
      { contentId: "tv_evening_river", originIds: ["environment_morning_samples"], role: "record", supportsJudgments: ["true"] },
    ],
    routes: [
      { id: "river_morning_sample_scope", contentIds: ["official_preliminary"], acceptedJudgments: ["true"], confidenceRange: [78, 93], explanation: "公开采样单对应09:10的点位与所检项目，支持该批样品结果；不应仅因更早存在异常就断言检测伪造，也不能扩展为全天没有问题。" },
      { id: "river_morning_sample_followup", contentIds: ["official_full_notice"], acceptedJudgments: ["true"], confidenceRange: [83, 96], explanation: "后续通报补足早时段记录并保留原采样范围，说明真实结果与不完整叙事可以并存；这不是新的独立09:10采样。" },
      { id: "river_morning_sample_review", contentIds: ["tv_evening_river"], acceptedJudgments: ["true"], confidenceRange: [82, 95], explanation: "节目呈现采样时间、点位与项目限制，允许肯定该结果同时指出它不能回答凌晨和全天问题。" },
    ],
  },
];
