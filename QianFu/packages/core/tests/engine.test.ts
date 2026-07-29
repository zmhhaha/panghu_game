import { describe, expect, it } from "vitest";
import { CampaignEngine, calculateScore, createInitialWorld, getCountermeasureOptions, getRadioSites, isIntelUnlocked, isObjectiveUnlocked, toPublicGameEvents, toPublicWorldState, type CampaignDefinition, type WorldState } from "../src/index.js";

const campaign: CampaignDefinition = {
  id: "test", version: "1.0.0", engineVersion: "1.0.0", name: "Test",
  startTime: "1942-05-12T00:00:00.000Z",
  locations: [
    { id: "office", name: "Office", district: "A", travelMinutes: { station: 20 } },
    { id: "station", name: "Station", district: "A", travelMinutes: { office: 20 } },
  ],
  characters: [],
  intel: [{ id: "shipment", title: "Shipment", truth: "true", requiredFields: ["time"], sourceCharacterIds: [], expiresAt: "1942-05-13T20:00:00.000Z" }],
  objectives: [{ id: "send", required: true, deadline: "1942-05-13T20:00:00.000Z", requiredIntelIds: ["shipment"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio"], recipientId: "organization" }],
};

describe("CampaignEngine", () => {
  const recruitmentPlan = { objective: "确认对方是否能守住最小秘密", steps: "先建立独立来源。\n再安排低风险核对。", safeguards: "分段传递，不接触核心名单。", abortCondition: "发现异常扩散就停止并撤退。" };
  it("limits a profile start to its public contact and requires an introduction before dialogue", () => {
    const undercoverCampaign: CampaignDefinition = {
      ...campaign,
      locations: [
        { id: "archive-office", name: "Archive", district: "A", travelMinutes: { "radio-office": 10 } },
        { id: "radio-office", name: "Radio", district: "A", travelMinutes: { "archive-office": 10 } },
      ],
      characters: [
        { id: "chen-jingwen", name: "Chen", publicIdentity: "Chief", hiddenAlignment: "variable", initialLocationId: "archive-office", recruitable: false, schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "work" }], reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 } },
        { id: "stranger", name: "Stranger", publicIdentity: "Visitor", hiddenAlignment: "neutral", initialLocationId: "archive-office", recruitable: false, schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "wait" }], reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 } },
      ],
    };
    const engine = new CampaignEngine(undercoverCampaign, createInitialWorld(undercoverCampaign, "profile-start", "user-1"));
    expect(engine.getState().discoveredLocationIds).toEqual(["archive-office"]);
    expect(engine.getState().knownCharacterIds).toEqual(["chen-jingwen"]);
    expect(() => engine.execute({ type: "dialogue_start", targetCharacterId: "stranger", goal: "small_talk", tone: "neutral", allocatedMinutes: 10, durationMinutes: 0, idempotencyKey: "unknown-contact" })).toThrow("尚未获得");
  });

  it("advances time once for an idempotent action", () => {
    const engine = new CampaignEngine(campaign, createInitialWorld(campaign, "game-1", "user-1"));
    const action = { type: "move" as const, destinationId: "station", durationMinutes: 20, idempotencyKey: "move-1" };
    const first = engine.execute(action);
    const duplicate = engine.execute(action);
    expect(first.state.currentLocationId).toBe("station");
    expect(first.state.currentTime).toBe("1942-05-12T00:20:00.000Z");
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state.currentTime).toBe(first.state.currentTime);
  });

  it("finishes after verified intelligence is transmitted", () => {
    const state = createInitialWorld(campaign, "game-2", "user-1");
    state.narrativeThreads = [{ id: "shipment-thread", title: "追查运输", summary: "查清运输安排", status: "active", sourceEventId: "opening", updatedAt: state.currentTime }];
    const engine = new CampaignEngine(campaign, state);
    engine.execute({ type: "record_intel", intelId: "shipment", fields: ["time"], confidenceDelta: 0.8, durationMinutes: 20, idempotencyKey: "record-1" });
    const result = engine.execute({ type: "transmit_intel", intelId: "shipment", method: "radio", durationMinutes: 20, idempotencyKey: "send-1" });
    expect(result.state.status).toBe("finished");
    expect(result.state.ending?.type).toBe("complete_success");
    expect(result.state.narrativeThreads?.[0]?.status).toBe("resolved");
    expect(result.events.some((event) => event.type === "narrative.thread_updated")).toBe(true);
  });

  it("does not finish when required fields are missing", () => {
    const engine = new CampaignEngine(campaign, createInitialWorld(campaign, "game-3", "user-1"));
    engine.execute({ type: "record_intel", intelId: "shipment", fields: [], confidenceDelta: 0.9, durationMinutes: 20, idempotencyKey: "record-2" });
    expect(() => engine.execute({ type: "transmit_intel", intelId: "shipment", method: "radio", durationMinutes: 20, idempotencyKey: "send-2" })).toThrow("no known fields");
    expect(engine.getState().status).toBe("active");
    expect(engine.getState().currentTime).toBe("1942-05-12T00:20:00.000Z");
  });

  it("treats a completed mission under extreme investigation pressure as costly", () => {
    const state = createInitialWorld(campaign, "high-pressure-success", "user-1");
    state.investigation.pressure = 100;
    const engine = new CampaignEngine(campaign, state);
    engine.execute({ type: "record_intel", intelId: "shipment", fields: ["time"], confidenceDelta: 0.8, durationMinutes: 20, idempotencyKey: "pressure-record" });
    const result = engine.execute({ type: "transmit_intel", intelId: "shipment", method: "radio", durationMinutes: 20, idempotencyKey: "pressure-send" });
    expect(result.state.ending?.type).toBe("costly_success");
    expect(result.state.ending?.reasons.some((reason) => reason.includes("调查压力"))).toBe(true);
    expect(result.state.ending?.score.grade).not.toBe("S");
  });

  it("moves scheduled characters when the world clock crosses a schedule boundary", () => {
    const scheduled: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "editor", name: "Editor", publicIdentity: "Editor", hiddenAlignment: "variable",
        initialLocationId: "office", recruitable: true,
        schedule: [{ startMinute: 480, endMinute: 540, locationId: "office", activity: "work" }, { startMinute: 540, endMinute: 600, locationId: "station", activity: "meet" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }],
    };
    const engine = new CampaignEngine(scheduled, createInitialWorld(scheduled, "game-schedule", "user-1"));
    const result = engine.execute({ type: "wait", durationMinutes: 60, idempotencyKey: "schedule-1" });
    expect(result.state.characters.editor.locationId).toBe("station");
    expect(result.events.some((event) => event.type === "character.schedule_advanced")).toBe(true);
  });

  it("enforces a different per-turn text limit for each dialogue goal", () => {
    const dialogueCampaign: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "contact", name: "Contact", publicIdentity: "Shopkeeper", hiddenAlignment: "neutral",
        initialLocationId: "office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }],
    };

    const shortEngine = new CampaignEngine(dialogueCampaign, createInitialWorld(dialogueCampaign, "game-short-dialogue", "user-1"));
    shortEngine.execute({ type: "dialogue_start", targetCharacterId: "contact", goal: "small_talk", tone: "friendly", allocatedMinutes: 10, durationMinutes: 0, idempotencyKey: "short-start" });
    expect(() => shortEngine.execute({ type: "dialogue_turn", sessionId: "short-start", playerText: "寒".repeat(81), durationMinutes: 2, idempotencyKey: "short-turn" })).toThrow("最多 80 个字符");
    const fallback = shortEngine.execute({ type: "dialogue_turn", sessionId: "short-start", playerText: "今天天气挺好。", durationMinutes: 2, idempotencyKey: "short-turn-valid" });
    expect(fallback.narration).toContain("Shopkeeper");
    expect(fallback.narration).not.toContain("钟摆");
    for (let index = 2; index <= 5; index += 1) {
      shortEngine.execute({ type: "dialogue_turn", sessionId: "short-start", playerText: `第${index}轮寒暄。`, durationMinutes: 2, idempotencyKey: `short-turn-${index}` });
    }
    expect(shortEngine.getState().activeDialogue?.status).toBe("completed");
    shortEngine.execute({ type: "dialogue_end", sessionId: "short-start", durationMinutes: 0, idempotencyKey: "short-end" });
    expect(shortEngine.getState().activeDialogue).toBeNull();

    const longEngine = new CampaignEngine(dialogueCampaign, createInitialWorld(dialogueCampaign, "game-long-dialogue", "user-1"));
    longEngine.execute({ type: "dialogue_start", targetCharacterId: "contact", goal: "long_talk", tone: "formal", allocatedMinutes: 60, durationMinutes: 0, idempotencyKey: "long-start" });
    const result = longEngine.execute({ type: "dialogue_turn", sessionId: "long-start", playerText: "谈".repeat(300), durationMinutes: 2, idempotencyKey: "long-turn" });
    expect(result.state.activeDialogue?.turnCount).toBe(1);
  });

  it("keeps fallback trust dialogue contextual and avoids repeating its previous line", () => {
    const dialogueCampaign: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "contact", name: "Contact", publicIdentity: "Clerk", hiddenAlignment: "neutral",
        initialLocationId: "office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
        personality: { traits: ["谨慎"], speechStyle: "克制", values: ["秩序"], fears: ["牵连"], verbalHabits: ["按规矩说"], sensitiveTopics: [] },
      }],
    };
    const engine = new CampaignEngine(dialogueCampaign, createInitialWorld(dialogueCampaign, "fallback-dialogue", "user-1"));
    engine.execute({ type: "dialogue_start", targetCharacterId: "contact", goal: "build_trust", tone: "formal", allocatedMinutes: 20, durationMinutes: 0, idempotencyKey: "fallback-start" });
    const first = engine.execute({ type: "dialogue_turn", sessionId: "fallback-start", playerText: "我只是普通人，不明白你说的合作是什么意思。", durationMinutes: 2, idempotencyKey: "fallback-turn-1" });
    const second = engine.execute({ type: "dialogue_turn", sessionId: "fallback-start", playerText: "我确实没有听懂。", durationMinutes: 2, idempotencyKey: "fallback-turn-2" });
    const npcLines = second.state.activeDialogue?.transcript.filter((turn) => turn.speaker === "npc").map((turn) => turn.text) ?? [];

    expect(first.npcReply).not.toContain("合作并非没有可能");
    expect(npcLines).toHaveLength(2);
    expect(npcLines[1]).not.toBe(npcLines[0]);
  });

  it("infers an old active dialogue as NPC-initiated when its first turn is an NPC opening", () => {
    const state = createInitialWorld(campaign, "legacy-proactive-dialogue", "user-1");
    state.activeDialogue = {
      id: "legacy-session", characterId: "contact", goal: "build_trust", tone: "formal", targetIntelId: null,
      allocatedMinutes: 20, elapsedMinutes: 8, maxTurns: 10, turnCount: 4, status: "active", discoveredFields: [],
      transcript: [{ speaker: "npc", text: "我正好有件事想问你。", at: state.currentTime }],
    };

    expect(toPublicWorldState(state).activeDialogue?.initiatedBy).toBe("npc");
  });

  it("shares a controlled intelligence fragment only after rapport is built", () => {
    const conversational: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "source", name: "Source", publicIdentity: "Clerk", hiddenAlignment: "organization",
        initialLocationId: "office", recruitable: true,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 90, discipline: 70, pressureResistance: 70, courage: 60, competence: 80 },
      }],
      intel: [{ id: "fact", title: "Fact", truth: "true", requiredFields: ["when", "where"], sourceCharacterIds: ["source"], expiresAt: "1942-05-13T20:00:00.000Z" }],
    };
    const engine = new CampaignEngine(conversational, createInitialWorld(conversational, "game-dialogue", "user-1"));
    engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "request_information", tone: "neutral", playerText: "告诉我最近的安排。", durationMinutes: 30, idempotencyKey: "dialogue-locked" });
    expect(engine.getState().intel.fact.knownFields).toHaveLength(0);
    engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "build_trust", tone: "friendly", playerText: "我们可以先从小事合作。", durationMinutes: 20, idempotencyKey: "dialogue-trust" });
    const result = engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "request_information", tone: "neutral", playerText: "现在可以谈谈那批货了吗？", durationMinutes: 30, idempotencyKey: "dialogue-info" });
    expect(result.state.intel.fact.knownFields).toHaveLength(1);
    expect(result.state.intel.fact.collectedSourceIds).toEqual(["source"]);
  });

  it("rewards sustained dialogue with additional intelligence opportunities", () => {
    const conversational: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "source", name: "Source", publicIdentity: "Clerk", hiddenAlignment: "organization",
        initialLocationId: "office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 90, discipline: 70, pressureResistance: 70, courage: 60, competence: 80 },
      }],
      intel: [{ id: "fact", title: "Fact", truth: "true", requiredFields: ["when", "where"], sourceCharacterIds: ["source"], expiresAt: "1942-05-13T20:00:00.000Z" }],
    };
    const engine = new CampaignEngine(conversational, createInitialWorld(conversational, "session-fragment", "user-1"));
    engine.execute({ type: "dialogue_start", targetCharacterId: "source", goal: "build_trust", tone: "friendly", allocatedMinutes: 20, durationMinutes: 0, idempotencyKey: "session-trust" });
    for (let turn = 0; turn < 10; turn += 1) engine.execute({ type: "dialogue_turn", sessionId: "session-trust", playerText: `Trust ${turn}`, durationMinutes: 2, idempotencyKey: `session-trust-${turn}` });
    engine.execute({ type: "dialogue_end", sessionId: "session-trust", durationMinutes: 0, idempotencyKey: "session-trust-end" });
    engine.execute({ type: "dialogue_start", targetCharacterId: "source", goal: "request_information", tone: "friendly", allocatedMinutes: 30, durationMinutes: 0, idempotencyKey: "session-request" });
    for (let turn = 0; turn < 2; turn += 1) engine.execute({ type: "dialogue_turn", sessionId: "session-request", playerText: `Question ${turn}`, durationMinutes: 2, idempotencyKey: `session-request-${turn}` });
    expect(engine.getState().intel.fact.knownFields).toHaveLength(0);
    for (let turn = 2; turn < 15; turn += 1) engine.execute({ type: "dialogue_turn", sessionId: "session-request", playerText: `Question ${turn}`, durationMinutes: 2, idempotencyKey: `session-request-${turn}` });
    expect(engine.getState().intel.fact.knownFields).toEqual(["when", "where"]);
  });

  it("does not grant intelligence when the model reply states no evidence", () => {
    const conversational: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "source", name: "Source", publicIdentity: "Clerk", hiddenAlignment: "organization",
        initialLocationId: "office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 90, discipline: 70, pressureResistance: 70, courage: 60, competence: 80 },
      }],
      intel: [{ id: "fact", title: "Fact", truth: "true", requiredFields: ["when"], fieldValues: { when: "午夜" }, sourceCharacterIds: ["source"], expiresAt: "1942-05-13T20:00:00.000Z" }],
    };
    const state = createInitialWorld(conversational, "grounded-dialogue", "user-1");
    state.characters.source.familiarity = 12;
    state.characters.source.privateTrust = 10;
    const engine = new CampaignEngine(conversational, state);
    engine.execute({
      type: "dialogue", targetCharacterId: "source", goal: "request_information", tone: "neutral", playerText: "那批货什么时候到？", durationMinutes: 30, idempotencyKey: "model-refusal",
      agentOutcome: { visibleSpeech: "这件事我不能告诉你。", privateIntent: "拒绝透露", requestedEffects: [], evidenceQuote: "", provider: "model" },
    });
    expect(engine.getState().intel.fact.knownFields).toEqual([]);
  });

  it("requires rapport, three distinct screening tests, and an explicit recruitment decision", () => {
    const recruitCampaign: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "recruit", name: "Recruit", publicIdentity: "Courier", hiddenAlignment: "organization",
        initialLocationId: "office", recruitable: true,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 90, discipline: 80, pressureResistance: 70, courage: 60, competence: 80 },
      }],
    };
    const engine = new CampaignEngine(recruitCampaign, createInitialWorld(recruitCampaign, "game-recruit", "user-1"));
    engine.execute({ type: "dialogue", targetCharacterId: "recruit", goal: "build_trust", tone: "friendly", playerText: "先从一件小事合作。", durationMinutes: 20, idempotencyKey: "recruit-trust" });
    engine.execute({ type: "dialogue", targetCharacterId: "recruit", goal: "build_trust", tone: "friendly", playerText: "这段时间的往来可以继续。", durationMinutes: 20, idempotencyKey: "recruit-trust-more" });
    engine.execute({ type: "dialogue", targetCharacterId: "recruit", goal: "recruit_probe", tone: "formal", playerText: "愿意接受一次低风险测试吗？", durationMinutes: 30, idempotencyKey: "recruit-probe" });
    expect(engine.getState().characters.recruit.recruited).toBe(false);
    expect(() => engine.execute({ type: "recruit_candidate", targetCharacterId: "recruit", durationMinutes: 30, idempotencyKey: "recruit-too-early" })).toThrow("三类不同甄别");

    const background = engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "background_check", plan: recruitmentPlan, durationMinutes: 60, idempotencyKey: "screen-background" });
    engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "controlled_leak", plan: recruitmentPlan, durationMinutes: 40, idempotencyKey: "screen-leak" });
    engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "discipline_check", plan: recruitmentPlan, durationMinutes: 30, idempotencyKey: "screen-discipline" });
    expect(background.state.characters.recruit.recruitmentCase.evidence[0]?.result).toBe("favorable");
    expect(() => engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "discipline_check", plan: recruitmentPlan, durationMinutes: 30, idempotencyKey: "screen-duplicate" })).toThrow("同类甄别已经完成");
    expect(engine.getState().characters.recruit.recruited).toBe(false);

    const recruited = engine.execute({ type: "recruit_candidate", targetCharacterId: "recruit", durationMinutes: 30, idempotencyKey: "recruit-formal" });
    expect(recruited.state.characters.recruit.recruited).toBe(true);
    expect(recruited.state.characters.recruit.recruitmentCase.stage).toBe("recruited");
    expect(recruited.state.network.activeMemberIds).toContain("recruit");
    expect(JSON.stringify(toPublicGameEvents(background.events))).not.toContain("loyalty");
    expect(JSON.stringify(toPublicGameEvents(background.events, "undercover"))).toContain('"result":"favorable"');
    expect(JSON.stringify(toPublicGameEvents(background.events, "iron_curtain"))).not.toContain('"result"');
    expect(toPublicWorldState(recruited.state).characters.recruit).not.toHaveProperty("recruitmentCase");
  });

  it("migrates recruitment dossiers in an existing save", () => {
    const recruitCampaign: CampaignDefinition = {
      ...campaign,
      characters: [{
        id: "legacy-recruit", name: "Legacy", publicIdentity: "Clerk", hiddenAlignment: "neutral",
        initialLocationId: "office", recruitable: true,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }],
    };
    const oldState = createInitialWorld(recruitCampaign, "legacy-recruitment", "user-1");
    delete (oldState.characters["legacy-recruit"] as Partial<typeof oldState.characters[string]>).recruitmentCase;
    const migrated = new CampaignEngine(recruitCampaign, oldState).getState();
    expect(migrated.characters["legacy-recruit"].recruitmentCase).toEqual({ stage: "contact", completedTestTypes: [], evidence: [] });
  });
});

describe("public cover identity", () => {
  const coverCampaign: CampaignDefinition = {
    ...campaign,
    locations: [
      { id: "archive-office", name: "Archive", district: "A", travelMinutes: {} },
      { id: "safe-flat", name: "Safe Flat", district: "B", travelMinutes: {}, radioSite: { baseRisk: 5, initiallyAvailable: true } },
    ],
    objectives: [{ ...campaign.objectives[0], deadline: "1942-05-20T20:00:00.000Z" }],
  };

  it("records completed public work and prevents the daily absence penalty", () => {
    const engine = new CampaignEngine(coverCampaign, createInitialWorld(coverCampaign, "cover-work", "user-1"));
    const worked = engine.execute({ type: "cover_work", workKind: "file_sorting", durationMinutes: 60, idempotencyKey: "cover-file-work" });
    expect(worked.state.cover.credibility).toBe(73);
    expect(worked.state.cover.observations.at(-1)?.type).toBe("work_completed");
    const endOfShift = engine.execute({ type: "wait", durationMinutes: 480, idempotencyKey: "cover-wait-shift" });
    expect(endOfShift.state.cover.consecutiveRecordGaps).toBe(0);
    expect(endOfShift.events.some((event) => event.type === "cover.absence_recorded")).toBe(false);
  });

  it("evaluates a travelling merchant by verifiable business records instead of office attendance", () => {
    const merchantCampaign: CampaignDefinition = {
      ...coverCampaign,
      locations: [
        { id: "jianghai-hotel", name: "Hotel", district: "Trade", travelMinutes: {} },
        { id: "safe-flat", name: "Safe Flat", district: "B", travelMinutes: {}, radioSite: { baseRisk: 5, initiallyAvailable: true } },
      ],
    };
    const state = createInitialWorld(merchantCampaign, "merchant-record-gap", "user-1", "undercover", "travelling_merchant");
    const result = new CampaignEngine(merchantCampaign, state).execute({ type: "wait", durationMinutes: 670, idempotencyKey: "merchant-no-business" });
    const gap = result.events.find((event) => event.type === "cover.absence_recorded");
    expect(result.state.cover.recordStatus).toBe("gap");
    expect(result.state.cover.consecutiveRecordGaps).toBe(1);
    expect(result.state.cover.scrutiny).toBeGreaterThan(0);
    expect(gap?.payload).toMatchObject({ eventLabel: "经营断档" });
    expect(JSON.stringify(gap?.payload)).toContain("货账");
    expect(JSON.stringify(gap?.payload)).not.toMatch(/档案科|上级|缺勤|到岗/);
  });

  it("lets merchant business records prevent scrutiny and rejects employee leave", () => {
    const merchantCampaign: CampaignDefinition = {
      ...coverCampaign,
      locations: [
        { id: "jianghai-hotel", name: "Hotel", district: "Trade", travelMinutes: {} },
        { id: "safe-flat", name: "Safe Flat", district: "B", travelMinutes: {}, radioSite: { baseRisk: 5, initiallyAvailable: true } },
      ],
    };
    const state = createInitialWorld(merchantCampaign, "merchant-business-record", "user-1", "undercover", "travelling_merchant");
    const engine = new CampaignEngine(merchantCampaign, state);
    expect(() => engine.execute({ type: "request_leave", reason: "official", durationMinutes: 10, idempotencyKey: "merchant-leave" })).toThrow("没有固定考勤");
    engine.execute({ type: "cover_work", workKind: "settle_accounts", durationMinutes: 60, idempotencyKey: "merchant-settle-accounts" });
    const result = engine.execute({ type: "wait", durationMinutes: 610, idempotencyKey: "merchant-close-business" });
    expect(result.state.cover.recordStatus).toBe("recorded");
    expect(result.state.cover.consecutiveRecordGaps).toBe(0);
    expect(result.events.some((event) => event.type === "cover.absence_recorded")).toBe(false);
  });

  it("counts sustained workplace dialogue as a verifiable public attendance record", () => {
    const workplaceCampaign: CampaignDefinition = {
      ...coverCampaign,
      characters: [{
        id: "chen-jingwen", name: "Chen", publicIdentity: "Chief", hiddenAlignment: "neutral", initialLocationId: "archive-office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 70 },
      }],
    };
    const state = createInitialWorld(workplaceCampaign, "cover-dialogue-credit", "user-1");
    state.currentTime = "1942-05-12T00:00:00.000Z";
    const engine = new CampaignEngine(workplaceCampaign, state);
    engine.execute({ type: "dialogue_start", targetCharacterId: "chen-jingwen", goal: "long_talk", tone: "formal", allocatedMinutes: 60, durationMinutes: 0, idempotencyKey: "cover-dialogue-start" });
    let credited = false;
    for (let turn = 1; turn <= 30; turn += 1) {
      const result = engine.execute({ type: "dialogue_turn", sessionId: "cover-dialogue-start", playerText: `Review record ${turn}`, durationMinutes: 2, idempotencyKey: `cover-dialogue-turn-${turn}` });
      credited ||= result.events.some((event) => event.type === "cover.activity_credited");
    }
    expect(engine.getState().cover.recordCreditMinutesByDate?.["1942-05-12"]).toBe(60);
    expect(engine.getState().cover.completedRecordDates).toContain("1942-05-12");
    expect(credited).toBe(true);
  });

  it("allows safehouse rest at any time and recovers energy without charging action fatigue", () => {
    const state = createInitialWorld(coverCampaign, "night-rest", "user-1");
    state.currentTime = "1942-05-12T20:00:00.000Z";
    state.currentLocationId = "safe-flat";
    state.playerEnergy = 24;
    const engine = new CampaignEngine(coverCampaign, state);
    const result = engine.execute({ type: "rest", sleepMinutes: 8 * 60, durationMinutes: 0, idempotencyKey: "night-rest-action" });
    expect(result.state.currentTime).toBe("1942-05-13T04:00:00.000Z");
    expect(result.state.playerEnergy).toBe(74);
    expect(result.events.some((event) => event.type === "player.rested")).toBe(true);
    const shortRestState = createInitialWorld(coverCampaign, "short-night-rest", "user-1");
    shortRestState.currentTime = "1942-05-12T20:00:00.000Z";
    shortRestState.currentLocationId = "safe-flat";
    shortRestState.playerEnergy = 24;
    const shortRest = new CampaignEngine(coverCampaign, shortRestState).execute({ type: "rest", sleepMinutes: 3 * 60, durationMinutes: 0, idempotencyKey: "short-rest-action" });
    expect(shortRest.state.playerEnergy).toBe(39);
    const dayState = createInitialWorld(coverCampaign, "day-rest", "user-1");
    dayState.currentTime = "1942-05-12T10:00:00.000Z";
    dayState.currentLocationId = "safe-flat";
    const dayRest = new CampaignEngine(coverCampaign, dayState).execute({ type: "rest", sleepMinutes: 8 * 60, durationMinutes: 0, idempotencyKey: "day-rest-action" });
    expect(dayRest.state.currentTime).toBe("1942-05-12T18:00:00.000Z");
  });

  it("lets rest reduce investigation pressure according to difficulty", () => {
    const state = createInitialWorld(coverCampaign, "pressure-rest", "user-1", "undercover");
    state.currentTime = "1942-05-12T20:00:00.000Z";
    state.currentLocationId = "safe-flat";
    state.investigation.pressure = 60;
    const result = new CampaignEngine(coverCampaign, state).execute({ type: "rest", sleepMinutes: 6 * 60, durationMinutes: 0, idempotencyKey: "pressure-rest-action" });
    expect(result.state.investigation.pressure).toBeLessThan(60);
  });

  it("does not retroactively mark the opening day absent when a campaign starts after work", () => {
    const lateOpeningCampaign = { ...coverCampaign, startTime: "1942-05-12T09:00:00.000Z" };
    const state = createInitialWorld(lateOpeningCampaign, "late-opening", "user-1", "undercover", "archive_clerk");
    expect(state.cover.lastRecordEvaluatedDate).toBe("1942-05-12");
    const result = new CampaignEngine(lateOpeningCampaign, state).execute({ type: "wait", durationMinutes: 10, idempotencyKey: "late-opening-wait" });
    expect(result.state.cover.consecutiveRecordGaps).toBe(0);
    expect(result.events.some((event) => event.type === "cover.absence_recorded")).toBe(false);
  });

  it("does not allow conversations with NPCs outside their scheduled public routine", () => {
    const scheduledCampaign: CampaignDefinition = {
      ...coverCampaign,
      characters: [{
        id: "chen-jingwen", name: "Chen", publicIdentity: "Chief", hiddenAlignment: "neutral", initialLocationId: "archive-office", recruitable: false,
        schedule: [{ startMinute: 480, endMinute: 960, locationId: "archive-office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }],
    };
    const state = createInitialWorld(scheduledCampaign, "after-hours-contact", "user-1");
    state.currentTime = "1942-05-12T22:00:00.000Z";
    const engine = new CampaignEngine(scheduledCampaign, state);
    expect(() => engine.execute({ type: "dialogue_start", targetCharacterId: "chen-jingwen", goal: "small_talk", tone: "neutral", allocatedMinutes: 10, durationMinutes: 0, idempotencyKey: "after-hours-dialogue" })).toThrow("公开作息");
  });

  it("uses a public work lead to introduce a location and contact before secret dialogue", () => {
    const leadCampaign: CampaignDefinition = {
      ...coverCampaign,
      locations: [
        { id: "archive-office", name: "Archive", district: "A", travelMinutes: { "radio-office": 10 } },
        { id: "radio-office", name: "Radio", district: "A", travelMinutes: { "archive-office": 10 } },
      ],
      characters: [{
        id: "chen-jingwen", name: "Chen", publicIdentity: "Chief", hiddenAlignment: "neutral", initialLocationId: "archive-office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }, {
        id: "zhou-qiming", name: "Zhou", publicIdentity: "Technician", hiddenAlignment: "neutral", initialLocationId: "radio-office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "radio-office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
      }],
      publicLeads: [{
        id: "public-repair-record", trigger: "cover_work", profileId: "archive_clerk", workKind: "file_sorting",
        locationIds: ["radio-office"], characterIds: ["zhou-qiming"], hint: "A public repair record needs checking.",
      }],
    };
    const engine = new CampaignEngine(leadCampaign, createInitialWorld(leadCampaign, "cover-lead", "user-1"));
    const result = engine.execute({ type: "cover_work", workKind: "file_sorting", durationMinutes: 60, idempotencyKey: "public-lead-work" });
    expect(result.state.discoveredLocationIds).toContain("radio-office");
    expect(result.state.knownCharacterIds).toContain("zhou-qiming");
    expect(result.state.resolvedLeadIds).toContain("public-repair-record");
    expect(result.events.some((event) => event.type === "lead.resolved")).toBe(true);
    expect(result.events.some((event) => event.type === "intel.dialogue_discovered")).toBe(false);
    expect(result.events.find((event) => event.type === "location.discovered")?.payload).toMatchObject({ locationName: "Radio", hint: "A public repair record needs checking." });
    expect(result.events.find((event) => event.type === "character.introduced")?.payload).toMatchObject({ characterName: "Zhou", publicIdentity: "Technician", hint: "A public repair record needs checking." });
  });

  it("uses relationship-driven controller events to stage and then unlock a location", () => {
    const eventCampaign: CampaignDefinition = {
      ...coverCampaign,
      locations: [
        { id: "archive-office", name: "Archive", district: "A", travelMinutes: { "radio-office": 10, dock: 20 } },
        { id: "radio-office", name: "Radio", district: "A", travelMinutes: { "archive-office": 10, dock: 20 } },
        { id: "dock", name: "Dock", district: "B", travelMinutes: { "archive-office": 20, "radio-office": 20 } },
      ],
      characters: [{
        id: "technician", name: "Technician", publicIdentity: "Technician", hiddenAlignment: "neutral", initialLocationId: "archive-office", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 70 },
      }, {
        id: "dispatcher", name: "Dispatcher", publicIdentity: "Dispatcher", hiddenAlignment: "neutral", initialLocationId: "dock", recruitable: false,
        schedule: [{ startMinute: 0, endMinute: 1440, locationId: "dock", activity: "work" }],
        reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 70 },
      }],
      narrativeEvents: [{
        id: "receipt-rumor", title: "Missing receipt", visibleSummary: "A receipt is missing.",
        trigger: { type: "relationship", characterId: "technician", minFamiliarity: 4, minInteractionCount: 5 },
        effects: { locations: [{ locationId: "dock", stage: "rumored", hint: "The route reaches the river." }], thread: { id: "receipt", title: "Missing receipt", summary: "Find a public reason to inspect it." } },
      }, {
        id: "receipt-referral", title: "Public referral", visibleSummary: "A public referral is ready.",
        trigger: { type: "relationship", characterId: "technician", minFamiliarity: 8, minPrivateTrust: 3, minInteractionCount: 10, requiredEventIds: ["receipt-rumor"] },
        effects: { locations: [{ locationId: "dock", stage: "accessible", hint: "The referral permits a visit." }], introduceCharacterIds: ["dispatcher"], thread: { id: "receipt", title: "Inspect receipt", summary: "Visit the dispatcher." } },
      }],
    };
    const state = createInitialWorld(eventCampaign, "controller-events", "user-1");
    state.knownCharacterIds = ["technician"];
    const engine = new CampaignEngine(eventCampaign, state);
    engine.execute({ type: "dialogue_start", targetCharacterId: "technician", goal: "build_trust", tone: "friendly", allocatedMinutes: 20, durationMinutes: 0, idempotencyKey: "event-dialogue" });
    for (let turn = 1; turn <= 5; turn += 1) {
      engine.execute({ type: "dialogue_turn", sessionId: "event-dialogue", playerText: `Public work ${turn}`, durationMinutes: 2, idempotencyKey: `event-turn-${turn}` });
    }
    expect(engine.getState().locationKnowledge?.dock?.stage).toBe("rumored");
    expect(engine.getState().discoveredLocationIds).not.toContain("dock");
    expect(engine.getState().narrativeThreads?.find((thread) => thread.id === "receipt")?.title).toBe("Missing receipt");
    let finalTurn;
    for (let turn = 6; turn <= 10; turn += 1) {
      finalTurn = engine.execute({ type: "dialogue_turn", sessionId: "event-dialogue", playerText: `Public work ${turn}`, durationMinutes: 2, idempotencyKey: `event-turn-${turn}` });
    }
    expect(engine.getState().locationKnowledge?.dock?.stage).toBe("accessible");
    expect(engine.getState().discoveredLocationIds).toContain("dock");
    expect(engine.getState().knownCharacterIds).toContain("dispatcher");
    expect(engine.getState().resolvedNarrativeEventIds).toEqual(["receipt-rumor", "receipt-referral"]);
    expect(finalTurn?.events.find((event) => event.type === "location.stage_changed")?.payload).toMatchObject({ locationName: "Dock", stage: "accessible", hint: "The referral permits a visit." });
    expect(finalTurn?.events.find((event) => event.type === "character.introduced")?.payload).toMatchObject({ characterName: "Dispatcher", publicIdentity: "Dispatcher" });
  });

  it("accepts leave as a public record instead of treating it as an unexplained absence", () => {
    const engine = new CampaignEngine(coverCampaign, createInitialWorld(coverCampaign, "cover-leave", "user-1"));
    const leave = engine.execute({ type: "request_leave", reason: "family", durationMinutes: 10, idempotencyKey: "cover-leave-request" });
    expect(leave.state.cover.recordStatus).toBe("excused");
    const endOfShift = engine.execute({ type: "wait", durationMinutes: 530, idempotencyKey: "cover-leave-wait" });
    expect(endOfShift.state.cover.consecutiveRecordGaps).toBe(0);
    expect(endOfShift.events.some((event) => event.type === "cover.absence_recorded")).toBe(false);
  });

  it("escalates repeated unexplained absences into a supervisor check", () => {
    const engine = new CampaignEngine(coverCampaign, createInitialWorld(coverCampaign, "cover-absence", "user-1"));
    const result = engine.execute({ type: "wait", durationMinutes: 1980, idempotencyKey: "cover-two-days" });
    expect(result.state.cover.consecutiveRecordGaps).toBe(2);
    expect(result.state.cover.scrutiny).toBeGreaterThanOrEqual(32);
    expect(result.events.some((event) => event.type === "cover.supervisor_check")).toBe(true);
    expect(result.state.personalSuspicion).toBeGreaterThan(0);
  });

  it("migrates missing cover records and includes cover state in the score", () => {
    const legacy = createInitialWorld(coverCampaign, "cover-legacy", "user-1");
    delete (legacy as Partial<WorldState>).cover;
    expect(new CampaignEngine(coverCampaign, legacy).getState().cover.recordStatus).toBe("pending");
    expect(toPublicWorldState(legacy).cover.credibility).toBe(65);
    const baseline = createInitialWorld(coverCampaign, "cover-score-base", "user-1");
    const damaged = structuredClone(baseline);
    damaged.cover.credibility = 0;
    damaged.cover.scrutiny = 100;
    expect(calculateScore(coverCampaign, damaged).cover).toBeLessThan(calculateScore(coverCampaign, baseline).cover);
  });
});

describe("field-level intelligence evidence", () => {
  const evidenceCampaign: CampaignDefinition = {
    ...campaign,
    characters: ["source-a", "source-b", "source-c"].map((id) => ({
      id, name: id.toUpperCase(), publicIdentity: "Clerk", hiddenAlignment: "neutral" as const,
      initialLocationId: "office", recruitable: false,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
      reliability: { loyalty: 60, discipline: 60, pressureResistance: 60, courage: 60, competence: 60 },
    })),
    intel: [{
      id: "shipment", title: "Shipment", truth: "true", requiredFields: ["time"], fieldLabels: { time: "Departure time" },
      sourceCharacterIds: ["source-a", "source-b", "source-c"],
      sourceOrigins: { "source-a": "shared-register", "source-b": "shared-register" },
      expiresAt: "1942-05-13T20:00:00.000Z",
    }],
  };

  function preparedState(gameId: string, definition = evidenceCampaign) {
    const state = createInitialWorld(definition, gameId, "user-1");
    for (const character of Object.values(state.characters)) {
      character.familiarity = 10;
      character.privateTrust = 10;
    }
    return state;
  }

  it("distinguishes independent corroboration from repetition of the same upstream source", () => {
    const engine = new CampaignEngine(evidenceCampaign, preparedState("evidence-chain"));
    engine.execute({ type: "dialogue", targetCharacterId: "source-a", goal: "request_information", tone: "neutral", playerText: "When?", durationMinutes: 30, idempotencyKey: "evidence-first" });
    engine.execute({ type: "dialogue", targetCharacterId: "source-b", goal: "verify_intel", targetIntelId: "shipment", tone: "neutral", playerText: "Can you confirm?", durationMinutes: 20, idempotencyKey: "evidence-dependent" });
    engine.execute({ type: "dialogue", targetCharacterId: "source-c", goal: "verify_intel", targetIntelId: "shipment", tone: "neutral", playerText: "What did you see?", durationMinutes: 20, idempotencyKey: "evidence-independent" });
    const evidence = engine.getState().intel.shipment.evidence;
    expect(evidence.map((item) => item.assessment)).toEqual(["unverified", "dependent", "corroborates"]);
    expect(engine.getState().intel.shipment.knownFields).toEqual(["time"]);
    const publicEvidence = toPublicWorldState(engine.getState()).intel.shipment.evidence;
    expect(publicEvidence).toHaveLength(3);
    expect(publicEvidence[0]).not.toHaveProperty("sourceId");
    expect(publicEvidence[0]).not.toHaveProperty("upstreamSourceId");
  });

  it("records a contradiction when an independent source disputes partial intelligence", () => {
    const partialCampaign: CampaignDefinition = {
      ...evidenceCampaign,
      intel: [{ ...evidenceCampaign.intel[0], truth: "partial" }],
    };
    const engine = new CampaignEngine(partialCampaign, preparedState("evidence-conflict", partialCampaign));
    engine.execute({ type: "dialogue", targetCharacterId: "source-a", goal: "request_information", tone: "neutral", playerText: "When?", durationMinutes: 30, idempotencyKey: "conflict-first" });
    engine.execute({ type: "dialogue", targetCharacterId: "source-c", goal: "verify_intel", targetIntelId: "shipment", tone: "neutral", playerText: "Can you verify it?", durationMinutes: 20, idempotencyKey: "conflict-second" });
    expect(engine.getState().intel.shipment.evidence.at(-1)?.assessment).toBe("contradicts");
  });

  it("requires and preserves a specific intelligence target for verification dialogue", () => {
    const state = preparedState("targeted-verification");
    state.intel.shipment.knownFields = ["time"];
    const engine = new CampaignEngine(evidenceCampaign, state);
    expect(() => engine.execute({ type: "dialogue_start", targetCharacterId: "source-a", goal: "verify_intel", tone: "formal", allocatedMinutes: 20, durationMinutes: 0, idempotencyKey: "verify-without-target" })).toThrow("必须选择具体情报");
    const started = engine.execute({ type: "dialogue_start", targetCharacterId: "source-a", goal: "verify_intel", targetIntelId: "shipment", tone: "formal", allocatedMinutes: 20, durationMinutes: 0, idempotencyKey: "verify-with-target" });
    expect(started.state.activeDialogue?.targetIntelId).toBe("shipment");
  });

  it("migrates old saves without evidence records", () => {
    const state = createInitialWorld(evidenceCampaign, "legacy-evidence", "user-1");
    delete (state.intel.shipment as Partial<typeof state.intel[string]>).evidence;
    expect(new CampaignEngine(evidenceCampaign, state).getState().intel.shipment.evidence).toEqual([]);
    expect(toPublicWorldState(state).intel.shipment.evidence).toEqual([]);
  });
});

describe("sequential missions, interrogation, and radio sites", () => {
  const sequentialCampaign: CampaignDefinition = {
    ...campaign,
    locations: [
      { id: "archive-office", name: "Archive", district: "A", travelMinutes: { "safe-flat": 20, "ally-shop": 20 } },
      { id: "safe-flat", name: "Safe Flat", district: "B", travelMinutes: { "archive-office": 20, "ally-shop": 20 }, radioSite: { baseRisk: 5, initiallyAvailable: true } },
      { id: "ally-shop", name: "Ally Shop", district: "B", travelMinutes: { "archive-office": 20, "safe-flat": 20 }, radioSite: { baseRisk: 8, requiresRecruitedCharacterId: "ally" } },
    ],
    characters: [{
      id: "ally", name: "Ally", publicIdentity: "Shopkeeper", hiddenAlignment: "organization", initialLocationId: "ally-shop", recruitable: true,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "ally-shop", activity: "work" }],
      reliability: { loyalty: 90, discipline: 80, pressureResistance: 70, courage: 70, competence: 80 },
    }, {
      id: "interrogator", name: "Interrogator", publicIdentity: "Investigator", hiddenAlignment: "enemy", initialLocationId: "archive-office", recruitable: false,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "archive-office", activity: "work" }],
      reliability: { loyalty: 10, discipline: 90, pressureResistance: 90, courage: 80, competence: 90 },
    }],
    intel: ["first", "second", "third"].map((id) => ({
      id, title: id, truth: "true" as const, requiredFields: ["fact"], sourceCharacterIds: [], expiresAt: "1942-05-20T20:00:00.000Z",
    })),
    objectives: [
      { id: "mission-1", title: "任务一", sequence: 1, required: true, deadline: "1942-05-15T20:00:00.000Z", requiredIntelIds: ["first"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio"], recipientId: "organization", completionEffects: { investigationPressure: 20, notice: "敌方扩大清查。" } },
      { id: "mission-2", title: "任务二", sequence: 2, required: true, unlockAfterObjectiveIds: ["mission-1"], deadline: "1942-05-17T20:00:00.000Z", requiredIntelIds: ["second"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio"], recipientId: "organization", completionEffects: { investigationPressure: 10, notice: "敌方开始追查交通线。" } },
      { id: "mission-3", title: "任务三", sequence: 3, required: true, unlockAfterObjectiveIds: ["mission-2"], deadline: "1942-05-20T20:00:00.000Z", requiredIntelIds: ["third"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio"], recipientId: "organization" },
    ],
  };

  const completeIntel = (engine: CampaignEngine, intelId: string) => {
    engine.execute({ type: "record_intel", intelId, fields: ["fact"], confidenceDelta: 0.8, durationMinutes: 10, idempotencyKey: `record-${intelId}` });
    return engine.execute({ type: "transmit_intel", intelId, method: "radio", durationMinutes: 10, idempotencyKey: `send-${intelId}` });
  };

  it("locks future intelligence and continues into the second mission instead of settling", () => {
    const engine = new CampaignEngine(sequentialCampaign, createInitialWorld(sequentialCampaign, "sequential-one", "user-1"));
    expect(() => engine.execute({ type: "record_intel", intelId: "second", fields: ["fact"], confidenceDelta: 0.8, durationMinutes: 10, idempotencyKey: "locked-second" })).toThrow("后续任务尚未解锁");
    const result = completeIntel(engine, "first");
    expect(result.state.completedObjectiveIds).toEqual(["mission-1"]);
    expect(result.state.status).toBe("active");
    expect(result.events.some((event) => event.type === "mission.objective_completed")).toBe(true);
    expect(result.events.some((event) => event.type === "mission.objective_unlocked")).toBe(true);
    expect(result.state.investigation.pressure).toBeGreaterThanOrEqual(20);
  });

  it("settles only after all three missions and applies each completion effect once", () => {
    const engine = new CampaignEngine(sequentialCampaign, createInitialWorld(sequentialCampaign, "sequential-all", "user-1"));
    completeIntel(engine, "first");
    completeIntel(engine, "second");
    const result = completeIntel(engine, "third");
    expect(result.state.completedObjectiveIds).toEqual(["mission-1", "mission-2", "mission-3"]);
    expect(new Set(result.state.completedObjectiveIds).size).toBe(3);
    expect(result.state.status).toBe("finished");
    expect(result.state.ending?.type).toMatch(/success/);
  });

  it("fails an overdue mission but unlocks the next mission and keeps the campaign active", () => {
    const state = createInitialWorld(sequentialCampaign, "sequential-missed-first", "user-1");
    state.currentTime = sequentialCampaign.objectives[0].deadline;
    const result = new CampaignEngine(sequentialCampaign, state).execute({
      type: "wait", durationMinutes: 10, idempotencyKey: "settle-missed-first",
    });
    expect(result.state.status).toBe("active");
    expect(result.state.failedObjectiveIds).toEqual(["mission-1"]);
    expect(result.events.some((event) => event.type === "mission.objective_failed")).toBe(true);
    expect(result.events.some((event) => event.type === "mission.objective_unlocked" && (event.payload as { objectiveId?: string }).objectiveId === "mission-2")).toBe(true);
    expect(isObjectiveUnlocked(result.state, sequentialCampaign.objectives[1])).toBe(true);
    expect(isIntelUnlocked(sequentialCampaign, result.state, "second")).toBe(true);
  });

  it("settles as a partial success after later missions continue beyond an earlier failure", () => {
    const state = createInitialWorld(sequentialCampaign, "sequential-partial", "user-1");
    state.currentTime = sequentialCampaign.objectives[0].deadline;
    const engine = new CampaignEngine(sequentialCampaign, state);
    engine.execute({ type: "wait", durationMinutes: 10, idempotencyKey: "fail-first-before-recovery" });
    completeIntel(engine, "second");
    const result = completeIntel(engine, "third");
    expect(result.state.failedObjectiveIds).toEqual(["mission-1"]);
    expect(result.state.completedObjectiveIds).toEqual(["mission-2", "mission-3"]);
    expect(result.state.status).toBe("finished");
    expect(result.state.ending?.type).toBe("partial_success");
  });

  it("starts with one usable radio safehouse and unlocks an ally site only after recruitment", () => {
    const state = createInitialWorld(sequentialCampaign, "radio-sites", "user-1");
    expect(state.discoveredLocationIds).toContain("safe-flat");
    expect(getRadioSites(sequentialCampaign, state).find((site) => site.id === "safe-flat")?.available).toBe(true);
    expect(getRadioSites(sequentialCampaign, state).find((site) => site.id === "ally-shop")?.available).toBe(false);

    state.currentLocationId = "safe-flat";
    state.intel.first.knownFields = ["fact"];
    state.intel.first.confidence = 0.8;
    const sent = new CampaignEngine(sequentialCampaign, state).execute({
      type: "send_radio_message", items: [{ intelId: "first", fields: ["fact"] }], format: "compressed", codebookId: "book_cipher",
      timing: "immediate", locationId: "safe-flat", durationMinutes: 0, idempotencyKey: "safehouse-radio",
    });
    expect(sent.state.radio.transmissions).toHaveLength(1);

    state.network.activeMemberIds.push("ally");
    expect(getRadioSites(sequentialCampaign, state).find((site) => site.id === "ally-shop")?.available).toBe(true);
  });

  it("allows rest only at the initial safehouse or an active comrade site", () => {
    const officeState = createInitialWorld(sequentialCampaign, "rest-office", "user-1");
    officeState.currentTime = "1942-05-12T12:00:00.000Z";
    expect(() => new CampaignEngine(sequentialCampaign, officeState).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-at-office",
    })).toThrow("没有安全过夜条件");

    const safeState = createInitialWorld(sequentialCampaign, "rest-safe", "user-1");
    safeState.currentTime = "1942-05-12T12:00:00.000Z";
    safeState.currentLocationId = "safe-flat";
    const rested = new CampaignEngine(sequentialCampaign, safeState).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-at-safehouse",
    });
    expect(rested.state.currentTime).toBe("1942-05-12T18:00:00.000Z");

    const allyState = createInitialWorld(sequentialCampaign, "rest-ally", "user-1");
    allyState.currentTime = "1942-05-12T12:00:00.000Z";
    allyState.currentLocationId = "ally-shop";
    allyState.discoveredLocationIds.push("ally-shop");
    allyState.locationKnowledge!["ally-shop"] = { stage: "accessible", sourceEventId: "test", hint: null, updatedAt: allyState.currentTime };
    expect(() => new CampaignEngine(sequentialCampaign, allyState).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-before-recruitment",
    })).toThrow("正式加入网络后");
    allyState.network.activeMemberIds.push("ally");
    expect(new CampaignEngine(sequentialCampaign, allyState).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-after-recruitment",
    }).state.currentTime).toBe("1942-05-12T18:00:00.000Z");
  });

  it("rejects rest at a compromised or exposed comrade site", () => {
    const state = createInitialWorld(sequentialCampaign, "rest-compromised", "user-1");
    state.currentTime = "1942-05-12T12:00:00.000Z";
    state.currentLocationId = "ally-shop";
    state.discoveredLocationIds.push("ally-shop");
    state.network.activeMemberIds.push("ally");
    state.locationKnowledge!["ally-shop"] = { stage: "compromised", sourceEventId: "raid", hint: null, updatedAt: state.currentTime };
    expect(() => new CampaignEngine(sequentialCampaign, state).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-compromised-site",
    })).toThrow("已经暴露或被封锁");

    state.locationKnowledge!["ally-shop"].stage = "accessible";
    state.characters.ally.exposed = true;
    expect(() => new CampaignEngine(sequentialCampaign, state).execute({
      type: "rest", sleepMinutes: 360, durationMinutes: 0, idempotencyKey: "rest-exposed-member",
    })).toThrow("同志已经暴露");
  });

  it("activates a delayed interrogation, blocks other actions, and resolves after three answers", () => {
    const interrogationCampaign: CampaignDefinition = {
      ...sequentialCampaign,
      objectives: sequentialCampaign.objectives.map((objective) => objective.id === "mission-1" ? {
        ...objective,
        completionEffects: { investigationPressure: 20, interrogation: { interrogatorCharacterId: "interrogator", delayMinutes: 30 }, notice: "敌方发出传唤。" },
      } : objective),
    };
    const engine = new CampaignEngine(interrogationCampaign, createInitialWorld(interrogationCampaign, "interrogation-flow", "user-1"));
    completeIntel(engine, "first");
    expect(engine.getState().interrogation?.status).toBe("pending");
    engine.execute({ type: "wait", durationMinutes: 30, idempotencyKey: "wait-for-interrogation" });
    expect(engine.getState().interrogation?.status).toBe("active");
    expect(() => engine.execute({ type: "move", destinationId: "safe-flat", durationMinutes: 20, idempotencyKey: "evade-interrogation" })).toThrow("必须先完成回答");

    for (let index = 0; index < 3; index += 1) {
      engine.execute({ type: "interrogation_answer", interrogationId: "mission-1:interrogation", strategy: "formal", playerText: `我按档案科登记调阅了公文，值班同事可以核对第${index + 1}项记录。`, durationMinutes: 10, idempotencyKey: `interrogation-answer-${index}` });
    }
    expect(engine.getState().interrogation?.status).toBe("resolved");
    expect(engine.getState().interrogation?.outcome).toBe("cleared");
    const publicState = toPublicWorldState(engine.getState());
    expect(publicState.interrogation?.answers[0]).not.toHaveProperty("text");
  });

  it("migrates old saves without mission and interrogation state", () => {
    const state = createInitialWorld(sequentialCampaign, "old-sequential-save", "user-1");
    delete (state as { completedObjectiveIds?: string[] }).completedObjectiveIds;
    delete (state as { failedObjectiveIds?: string[] }).failedObjectiveIds;
    delete (state as { interrogation?: WorldState["interrogation"] }).interrogation;
    delete state.intel.second;
    state.discoveredLocationIds = state.discoveredLocationIds.filter((id) => id !== "safe-flat");
    delete state.locationKnowledge?.["safe-flat"];
    const migrated = new CampaignEngine(sequentialCampaign, state).getState();
    expect(migrated.completedObjectiveIds).toEqual([]);
    expect(migrated.failedObjectiveIds).toEqual([]);
    expect(migrated.interrogation).toBeNull();
    expect(migrated.intel.second).toMatchObject({ knownFields: [], deliveredFields: [], confidence: 0 });
    expect(migrated.discoveredLocationIds).toContain("safe-flat");
    expect(migrated.locationKnowledge?.["safe-flat"]?.stage).toBe("accessible");
  });
});

describe("enemy investigation", () => {
  const investigationCampaign: CampaignDefinition = {
    ...campaign,
    characters: [{
      id: "observer-target", name: "Target", publicIdentity: "Clerk", hiddenAlignment: "neutral",
      initialLocationId: "office", recruitable: false,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
      reliability: { loyalty: 50, discipline: 50, pressureResistance: 50, courage: 50, competence: 50 },
    }],
  };

  it("migrates old saves when projecting public state", () => {
    const oldState = createInitialWorld(investigationCampaign, "old-game", "user-1");
    delete (oldState as { investigation?: WorldState["investigation"] }).investigation;
    delete (oldState as { radio?: WorldState["radio"] }).radio;
    delete (oldState.network as { tasks?: WorldState["network"]["tasks"] }).tasks;
    delete (oldState.intel.shipment as Partial<typeof oldState.intel[string]>).deliveredFields;
    const publicState = toPublicWorldState(oldState);
    expect(publicState.investigation).toEqual({ pressure: 0, locationHeat: {}, surveillanceLocationIds: [], lastActionAt: null });
    expect(publicState.network.tasks).toEqual([]);
    expect(publicState.radio.transmissions).toEqual([]);
    expect(publicState.intel.shipment.deliveredFields).toEqual([]);
  });

  it("processes evidence only after crossing a ten-minute boundary", () => {
    const engine = new CampaignEngine(investigationCampaign, createInitialWorld(investigationCampaign, "boundary-game", "user-1"));
    engine.execute({ type: "dialogue_start", targetCharacterId: "observer-target", goal: "small_talk", tone: "friendly", allocatedMinutes: 10, durationMinutes: 0, idempotencyKey: "boundary-start" });
    engine.execute({ type: "dialogue_turn", sessionId: "boundary-start", playerText: "Hello", durationMinutes: 2, idempotencyKey: "boundary-turn-1" });
    expect(engine.getState().investigation.pressure).toBe(0);
    expect(engine.getState().investigation.evidence[0]?.processed).toBe(false);
    for (let index = 2; index <= 5; index += 1) {
      engine.execute({ type: "dialogue_turn", sessionId: "boundary-start", playerText: `Turn ${index}`, durationMinutes: 2, idempotencyKey: `boundary-turn-${index}` });
    }
    expect(engine.getState().investigation.pressure).toBeGreaterThan(0);
    expect(engine.getState().investigation.evidence.every((evidence) => evidence.processed)).toBe(true);
  });

  it("starts surveillance after repeated observation and raises suspicion on follow-up activity", () => {
    const engine = new CampaignEngine(investigationCampaign, createInitialWorld(investigationCampaign, "surveillance-game", "user-1"));
    for (let index = 1; index <= 3; index += 1) {
      engine.execute({ type: "observe", targetCharacterId: "observer-target", durationMinutes: 10, idempotencyKey: `observe-${index}` });
    }
    expect(engine.getState().investigation.surveillanceLocationIds).toContain("office");
    const suspicionBefore = engine.getState().personalSuspicion;
    const followed = engine.execute({ type: "observe", targetCharacterId: "observer-target", durationMinutes: 10, idempotencyKey: "observe-4" });
    expect(followed.state.personalSuspicion).toBeGreaterThan(suspicionBefore + 1);
    expect(followed.notices.some((notice) => notice.includes("人影"))).toBe(true);
  });

  it("keeps investigation evidence out of public state and event payloads", () => {
    const engine = new CampaignEngine(investigationCampaign, createInitialWorld(investigationCampaign, "private-game", "user-1"));
    const result = engine.execute({ type: "observe", targetCharacterId: "observer-target", durationMinutes: 10, idempotencyKey: "private-observe" });
    expect(toPublicWorldState(result.state).investigation).not.toHaveProperty("evidence");
    expect(toPublicGameEvents(result.events).some((event) => event.type.startsWith("investigation.evidence_"))).toBe(false);
  });

  it("keeps a boundary interruption in the completed dialogue transcript", () => {
    const state = createInitialWorld(investigationCampaign, "dialogue-notice-game", "user-1");
    state.investigation.locationHeat.office = 20;
    state.investigation.surveillanceLocationIds.push("office");
    const engine = new CampaignEngine(investigationCampaign, state);
    engine.execute({ type: "dialogue_start", targetCharacterId: "observer-target", goal: "small_talk", tone: "friendly", allocatedMinutes: 10, durationMinutes: 0, idempotencyKey: "notice-start" });
    let result = engine.execute({ type: "dialogue_turn", sessionId: "notice-start", playerText: "Turn 1", durationMinutes: 2, idempotencyKey: "notice-turn-1" });
    for (let index = 2; index <= 5; index += 1) {
      result = engine.execute({ type: "dialogue_turn", sessionId: "notice-start", playerText: `Turn ${index}`, durationMinutes: 2, idempotencyKey: `notice-turn-${index}` });
    }
    expect(result.state.activeDialogue?.status).toBe("completed");
    expect(result.state.activeDialogue?.transcript.some((turn) => turn.speaker === "system" && turn.text.includes("人影"))).toBe(true);
  });
});

describe("radio transmission workflow", () => {
  const radioCampaign: CampaignDefinition = {
    ...campaign,
    locations: [{ id: "wu-clock-shop", name: "Clock Shop", district: "A", travelMinutes: {} }],
    intel: [
      { id: "shipment", title: "Shipment", truth: "true", requiredFields: ["time"], sourceCharacterIds: [], expiresAt: "1942-05-13T20:00:00.000Z" },
      { id: "radio-window", title: "Window", truth: "true", requiredFields: ["start"], sourceCharacterIds: [], expiresAt: "1942-05-13T20:00:00.000Z" },
    ],
  };

  it("selects fields, calculates server-side duration, and settles only after a receipt", () => {
    const engine = new CampaignEngine(radioCampaign, createInitialWorld(radioCampaign, "radio-game", "user-1", "undercover"));
    engine.execute({ type: "record_intel", intelId: "shipment", fields: ["time"], confidenceDelta: 0.9, durationMinutes: 10, idempotencyKey: "radio-record-shipment" });
    engine.execute({ type: "record_intel", intelId: "radio-window", fields: ["start"], confidenceDelta: 0.8, durationMinutes: 10, idempotencyKey: "radio-record-window" });
    const sent = engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "full", codebookId: "one_time_pad", timing: "scheduled", locationId: "wu-clock-shop",
      durationMinutes: 0, idempotencyKey: "radio-send",
    });
    expect(sent.state.currentTime).toBe("1942-05-12T01:40:00.000Z");
    expect(sent.state.radio.transmissions[0]?.receiptStatus).toBe("pending");
    expect(sent.state.intel.shipment.deliveredFields).toEqual([]);
    expect(sent.state.radio.codebooks.find((item) => item.id === "one_time_pad")?.usesRemaining).toBe(1);
    expect(sent.state.status).toBe("active");

    const receipt = engine.execute({ type: "wait", durationMinutes: 20, idempotencyKey: "radio-wait-receipt" });
    expect(receipt.state.radio.transmissions[0]?.receiptStatus).toBe("confirmed");
    expect(receipt.state.intel.shipment.deliveredFields).toEqual(["time"]);
    expect(receipt.state.status).toBe("finished");
    expect(receipt.notices.some((notice) => notice.includes("完整收到"))).toBe(true);
  });

  it("rejects unknown fields and unavailable codebook pages without advancing time", () => {
    const state = createInitialWorld(radioCampaign, "invalid-radio-game", "user-1");
    state.intel.shipment.knownFields = ["time"];
    state.radio.codebooks.find((item) => item.id === "one_time_pad")!.usesRemaining = 0;
    const engine = new CampaignEngine(radioCampaign, state);
    expect(() => engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["place"] }],
      format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop",
      durationMinutes: 0, idempotencyKey: "radio-unknown-field",
    })).toThrow("尚未掌握");
    expect(() => engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "one_time_pad", timing: "immediate", locationId: "wu-clock-shop",
      durationMinutes: 0, idempotencyKey: "radio-empty-pad",
    })).toThrow("已经用尽");
    expect(engine.getState().currentTime).toBe(radioCampaign.startTime);
  });

  it("keeps a campaign open while an on-time transmission is awaiting its receipt", () => {
    const closeDeadlineCampaign: CampaignDefinition = {
      ...radioCampaign,
      objectives: [{ ...radioCampaign.objectives[0], deadline: "1942-05-12T00:40:00.000Z" }],
    };
    const state = createInitialWorld(closeDeadlineCampaign, "pending-deadline", "user-1");
    state.intel.shipment.knownFields = ["time"];
    state.intel.shipment.confidence = 0.9;
    const engine = new CampaignEngine(closeDeadlineCampaign, state);
    const sent = engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "one_time_pad", timing: "immediate", locationId: "wu-clock-shop",
      durationMinutes: 0, idempotencyKey: "deadline-radio-send",
    });
    expect(sent.state.currentTime).toBe("1942-05-12T00:40:00.000Z");
    expect(sent.state.status).toBe("active");
    expect(sent.state.radio.transmissions[0]?.receiptStatus).toBe("pending");
  });

  it("requires manual Morse in iron curtain mode and applies verified performance", () => {
    const ironState = createInitialWorld(radioCampaign, "iron-radio", "user-1", "iron_curtain");
    ironState.intel.shipment.knownFields = ["time"];
    ironState.intel.shipment.confidence = 0.9;
    const ironEngine = new CampaignEngine(radioCampaign, ironState);
    expect(() => ironEngine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop",
      mode: "automatic", durationMinutes: 0, idempotencyKey: "iron-auto-radio",
    })).toThrow("必须由玩家完成");

    const sent = ironEngine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop",
      mode: "manual", manualPerformance: { accuracy: 1, timingScore: 1, completion: 1, grade: "excellent", errorCount: 0, correctionCount: 0, sequence: ".----" },
      durationMinutes: 0, idempotencyKey: "iron-manual-radio",
    });
    expect(sent.state.radio.transmissions[0]?.mode).toBe("manual");
    expect(sent.state.radio.transmissions[0]?.morse?.grade).toBe("excellent");
    expect(sent.state.radio.transmissions[0]?.durationMinutes).toBe(20);
    expect(sent.state.intel.shipment.knownFields).toEqual(["time"]);
  });

  it("makes rough manual operation slower without changing intelligence truth", () => {
    const state = createInitialWorld(radioCampaign, "rough-radio", "user-1", "undercover");
    state.intel.shipment.knownFields = ["time"];
    state.intel.shipment.confidence = 0.9;
    const engine = new CampaignEngine(radioCampaign, state);
    const sent = engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop",
      mode: "manual", manualPerformance: { accuracy: 0.3, timingScore: 0.2, completion: 1, grade: "rough", errorCount: 4, correctionCount: 3, sequence: ".----" },
      durationMinutes: 0, idempotencyKey: "rough-manual-radio",
    });
    expect(sent.state.radio.transmissions[0]?.durationMinutes).toBe(40);
    expect(sent.state.intel.shipment.knownFields).toEqual(["time"]);
    expect(sent.state.intel.shipment).not.toHaveProperty("falseFields");
  });

  it("applies interruption choices and records visible signal warnings", () => {
    const state = createInitialWorld(radioCampaign, "interrupted-radio", "user-1", "undercover");
    state.intel.shipment.knownFields = ["time"];
    const engine = new CampaignEngine(radioCampaign, state);
    const sent = engine.execute({
      type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }],
      format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop", mode: "manual",
      manualPerformance: { accuracy: 1, timingScore: 1, completion: 1, grade: "excellent", errorCount: 0, correctionCount: 0, sequence: ".----", interruptionDecisions: [{ interruptionId: "radio-check-1", decision: "force" }], interruptionTimeMinutes: 0, interruptionRiskDelta: 6 },
      durationMinutes: 0, idempotencyKey: "interrupted-radio-send",
    });
    const transmission = sent.state.radio.transmissions[0]!;
    expect(transmission.warningSigns?.length).toBeGreaterThan(0);
    expect(transmission.signalWeight).toBeGreaterThan(0);
    expect(transmission.exposureDelta).toBeGreaterThan(0);
  });

  it("consumes time when an interrupted operation is destroyed without sending intelligence", () => {
    const state = createInitialWorld(radioCampaign, "aborted-radio", "user-1", "undercover");
    const engine = new CampaignEngine(radioCampaign, state);
    const result = engine.execute({ type: "abort_radio_message", locationId: "wu-clock-shop", interruptionId: "radio-check-1", riskDelta: 3, durationMinutes: 10, idempotencyKey: "abort-radio-operation" });
    expect(result.state.currentTime).toBe("1942-05-12T00:10:00.000Z");
    expect(result.state.radio.transmissions).toHaveLength(0);
    expect(result.events.some((event) => event.type === "radio.operation_aborted")).toBe(true);
  });

  it("makes a partial-receipt retransmission shorter and marks the repeated pattern", () => {
    const state = createInitialWorld(radioCampaign, "retransmit-radio", "user-1", "undercover");
    state.intel.shipment.knownFields = ["time"];
    state.radio.transmissions.push({ id: "first-radio", items: [{ intelId: "shipment", fields: ["time"] }], format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop", fieldCount: 1, durationMinutes: 30, sentAt: state.currentTime, completedAt: state.currentTime, receiptDueAt: state.currentTime, receiptStatus: "no_receipt", receiptSummary: "未收到回执" });
    const engine = new CampaignEngine(radioCampaign, state);
    const result = engine.execute({ type: "send_radio_message", items: [{ intelId: "shipment", fields: ["time"] }], format: "compressed", codebookId: "book_cipher", timing: "immediate", locationId: "wu-clock-shop", mode: "automatic", durationMinutes: 0, idempotencyKey: "retransmit-radio-send" });
    const transmission = result.state.radio.transmissions.at(-1)!;
    expect(transmission.durationMinutes).toBe(20);
    expect(transmission.retransmissionOfId).toBe("first-radio");
    expect(transmission.warningSigns?.some((item) => item.includes("再次"))).toBe(true);
  });
});

describe("autonomous comrade tasks", () => {
  const taskCampaign: CampaignDefinition = {
    ...campaign,
    characters: [{
      id: "member", name: "Member", publicIdentity: "Clerk", hiddenAlignment: "organization",
      initialLocationId: "office", recruitable: true,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
      reliability: { loyalty: 100, discipline: 100, pressureResistance: 100, courage: 100, competence: 100 },
    }],
  };

  const recruitedState = (gameInstanceId: string) => {
    const state = createInitialWorld(taskCampaign, gameInstanceId, "user-1");
    state.characters.member.recruited = true;
    state.network.activeMemberIds.push("member");
    return state;
  };

  it("rejects delegation to a character outside the network", () => {
    const engine = new CampaignEngine(taskCampaign, createInitialWorld(taskCampaign, "unrecruited-task", "user-1"));
    expect(() => engine.execute({ type: "delegate_comrade_task", memberId: "member", kind: "gather_intel", targetId: "shipment", approach: "balanced", durationMinutes: 0, idempotencyKey: "unrecruited-delegation" })).toThrow("not an active network member");
  });

  it("lets a recruited comrade complete work while world time advances", () => {
    const engine = new CampaignEngine(taskCampaign, recruitedState("background-task"));
    const assigned = engine.execute({ type: "delegate_comrade_task", memberId: "member", kind: "gather_intel", targetId: "shipment", approach: "cautious", durationMinutes: 0, idempotencyKey: "gather-delegation" });
    expect(assigned.state.currentTime).toBe(taskCampaign.startTime);
    expect(assigned.state.network.tasks[0]?.status).toBe("active");
    expect(assigned.state.characters.member.agentTier).toBe("active");

    engine.execute({ type: "wait", durationMinutes: 70, idempotencyKey: "task-wait-70" });
    expect(engine.getState().network.tasks[0]?.status).toBe("active");
    const completed = engine.execute({ type: "wait", durationMinutes: 10, idempotencyKey: "task-wait-10" });
    expect(completed.state.network.tasks[0]?.status).toBe("completed");
    expect(completed.state.intel.shipment.knownFields).toHaveLength(1);
    expect(completed.state.characters.member.agentTier).toBe("background");
    expect(completed.notices.some((notice) => notice.includes("Member"))).toBe(true);
  });

  it("allows an active assignment to be withdrawn without advancing time", () => {
    const engine = new CampaignEngine(taskCampaign, recruitedState("cancel-task"));
    engine.execute({ type: "delegate_comrade_task", memberId: "member", kind: "gather_intel", targetId: "shipment", approach: "balanced", durationMinutes: 0, idempotencyKey: "cancel-delegation" });
    const cancelled = engine.execute({ type: "cancel_comrade_task", taskId: "cancel-delegation", durationMinutes: 0, idempotencyKey: "cancel-command" });
    expect(cancelled.state.currentTime).toBe(taskCampaign.startTime);
    expect(cancelled.state.network.tasks[0]?.status).toBe("cancelled");
    expect(cancelled.state.characters.member.agentTier).toBe("background");
  });
});

describe("director contacts and counterintelligence", () => {
  const directorCampaign: CampaignDefinition = {
    ...campaign,
    characters: [{
      id: "visitor", name: "Visitor", publicIdentity: "Editor", hiddenAlignment: "neutral", initialLocationId: "office", recruitable: false,
      schedule: [{ startMinute: 0, endMinute: 1440, locationId: "office", activity: "work" }],
      reliability: { loyalty: 50, discipline: 60, pressureResistance: 60, courage: 50, competence: 70 },
    }],
    narrativeEvents: [{
      id: "visitor-asks", title: "Visitor asks", visibleSummary: "Visitor approaches the player.",
      trigger: { type: "time", notBefore: "1942-05-12T00:10:00.000Z" },
      effects: { contact: {
        characterId: "visitor", reason: "A missing public record needs explanation.", openingLine: "Can you explain this missing record?",
        goal: "probe_attitude", tone: "formal", allocatedMinutes: 20, responseWindowMinutes: 60,
      } },
    }],
  };

  it("offers a proactive NPC contact on a ten-minute boundary and opens dialogue when accepted", () => {
    const engine = new CampaignEngine(directorCampaign, createInitialWorld(directorCampaign, "director-contact", "user-1"));
    const offered = engine.execute({ type: "wait", durationMinutes: 10, idempotencyKey: "director-wait" });
    expect(offered.state.pendingContact).toMatchObject({ characterId: "visitor", openingLine: "Can you explain this missing record?" });
    expect(offered.events.some((event) => event.type === "director.contact_offered")).toBe(true);
    const contactId = offered.state.pendingContact!.id;
    const accepted = engine.execute({ type: "respond_to_contact", contactId, decision: "accept", durationMinutes: 0, idempotencyKey: "director-accept" });
    expect(accepted.state.pendingContact).toBeNull();
    expect(accepted.state.activeDialogue).toMatchObject({ characterId: "visitor", initiatedBy: "npc", goal: "probe_attitude", allocatedMinutes: 20 });
    expect(accepted.state.activeDialogue?.transcript[0]?.text).toBe("Can you explain this missing record?");
  });

  it("allows one deferral and expires an unanswered contact on the world clock", () => {
    const engine = new CampaignEngine(directorCampaign, createInitialWorld(directorCampaign, "director-expiry", "user-1"));
    const offered = engine.execute({ type: "wait", durationMinutes: 10, idempotencyKey: "expiry-wait" });
    const contactId = offered.state.pendingContact!.id;
    const deferred = engine.execute({ type: "respond_to_contact", contactId, decision: "defer", durationMinutes: 0, idempotencyKey: "director-defer" });
    expect(deferred.state.pendingContact?.deferrals).toBe(1);
    expect(() => engine.execute({ type: "respond_to_contact", contactId, decision: "defer", durationMinutes: 0, idempotencyKey: "director-defer-again" })).toThrow("已经推迟过");
    const expired = engine.execute({ type: "wait", durationMinutes: 60, idempotencyKey: "expiry-finish" });
    expect(expired.state.pendingContact).toBeNull();
    expect(expired.events.some((event) => event.type === "director.contact_expired")).toBe(true);
  });

  const counterCampaign: CampaignDefinition = {
    ...campaign,
    locations: [
      { id: "archive-office", name: "Archive", district: "A", travelMinutes: { "safe-flat": 20 } },
      { id: "safe-flat", name: "Safe", district: "B", travelMinutes: { "archive-office": 20 }, radioSite: { baseRisk: 5, initiallyAvailable: true } },
    ],
  };

  it("lets the player shake surveillance, reinforce cover, plant a decoy, and relocate materials", () => {
    const watched = createInitialWorld(counterCampaign, "counter-watch", "user-1");
    watched.investigation.pressure = 30; watched.investigation.locationHeat["archive-office"] = 14; watched.investigation.surveillanceLocationIds = ["archive-office"];
    const watchEngine = new CampaignEngine(counterCampaign, watched);
    expect(getCountermeasureOptions(counterCampaign, watched).find((item) => item.kind === "check_tail")?.available).toBe(true);
    const shaken = watchEngine.execute({ type: "countermeasure", kind: "check_tail", durationMinutes: 20, idempotencyKey: "counter-tail" });
    expect(shaken.state.investigation.surveillanceLocationIds).not.toContain("archive-office");
    expect(shaken.state.investigation.locationHeat["archive-office"]).toBeLessThan(14);

    const cover = createInitialWorld(counterCampaign, "counter-cover", "user-1");
    cover.personalSuspicion = 20; cover.cover.scrutiny = 20; cover.investigation.pressure = 20;
    const covered = new CampaignEngine(counterCampaign, cover).execute({ type: "countermeasure", kind: "reinforce_cover", durationMinutes: 60, idempotencyKey: "counter-cover-work" });
    expect(covered.state.personalSuspicion).toBeLessThan(20);
    expect(covered.state.cover.scrutiny).toBeLessThan(20);

    const decoy = createInitialWorld(counterCampaign, "counter-decoy", "user-1");
    decoy.investigation.pressure = 30; decoy.investigation.locationHeat["archive-office"] = 10;
    const diverted = new CampaignEngine(counterCampaign, decoy).execute({ type: "countermeasure", kind: "plant_decoy", targetLocationId: "safe-flat", durationMinutes: 30, idempotencyKey: "counter-decoy-action" });
    expect(diverted.state.investigation.locationHeat["safe-flat"]).toBeGreaterThan(0);
    expect(diverted.state.network.exposure).toBeGreaterThan(0);

    const materials = createInitialWorld(counterCampaign, "counter-materials", "user-1");
    materials.currentLocationId = "safe-flat"; materials.network.exposure = 20; materials.investigation.locationHeat["safe-flat"] = 10;
    const relocated = new CampaignEngine(counterCampaign, materials).execute({ type: "countermeasure", kind: "relocate_materials", durationMinutes: 30, idempotencyKey: "counter-relocate" });
    expect(relocated.state.network.exposure).toBeLessThan(20);
    expect(relocated.state.investigation.locationHeat["safe-flat"]).toBeLessThan(10);
  });
});
