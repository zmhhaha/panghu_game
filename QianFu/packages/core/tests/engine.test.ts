import { describe, expect, it } from "vitest";
import { CampaignEngine, createInitialWorld, toPublicGameEvents, toPublicWorldState, type CampaignDefinition, type WorldState } from "../src/index.js";

const campaign: CampaignDefinition = {
  id: "test", version: "1.0.0", engineVersion: "1.0.0", name: "Test",
  startTime: "1942-05-12T08:00:00.000Z",
  locations: [
    { id: "office", name: "Office", district: "A", travelMinutes: { station: 20 } },
    { id: "station", name: "Station", district: "A", travelMinutes: { office: 20 } },
  ],
  characters: [],
  intel: [{ id: "shipment", title: "Shipment", truth: "true", requiredFields: ["time"], sourceCharacterIds: [], expiresAt: "1942-05-13T20:00:00.000Z" }],
  objectives: [{ id: "send", required: true, deadline: "1942-05-13T20:00:00.000Z", requiredIntelIds: ["shipment"], minimumConfidence: 0.7, acceptedDeliveryMethods: ["radio"], recipientId: "organization" }],
};

describe("CampaignEngine", () => {
  it("advances time once for an idempotent action", () => {
    const engine = new CampaignEngine(campaign, createInitialWorld(campaign, "game-1", "user-1"));
    const action = { type: "move" as const, destinationId: "station", durationMinutes: 20, idempotencyKey: "move-1" };
    const first = engine.execute(action);
    const duplicate = engine.execute(action);
    expect(first.state.currentLocationId).toBe("station");
    expect(first.state.currentTime).toBe("1942-05-12T08:20:00.000Z");
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state.currentTime).toBe(first.state.currentTime);
  });

  it("finishes after verified intelligence is transmitted", () => {
    const engine = new CampaignEngine(campaign, createInitialWorld(campaign, "game-2", "user-1"));
    engine.execute({ type: "record_intel", intelId: "shipment", fields: ["time"], confidenceDelta: 0.8, durationMinutes: 20, idempotencyKey: "record-1" });
    const result = engine.execute({ type: "transmit_intel", intelId: "shipment", method: "radio", durationMinutes: 20, idempotencyKey: "send-1" });
    expect(result.state.status).toBe("finished");
    expect(result.state.ending?.type).toBe("complete_success");
  });

  it("does not finish when required fields are missing", () => {
    const engine = new CampaignEngine(campaign, createInitialWorld(campaign, "game-3", "user-1"));
    engine.execute({ type: "record_intel", intelId: "shipment", fields: [], confidenceDelta: 0.9, durationMinutes: 20, idempotencyKey: "record-2" });
    expect(() => engine.execute({ type: "transmit_intel", intelId: "shipment", method: "radio", durationMinutes: 20, idempotencyKey: "send-2" })).toThrow("no known fields");
    expect(engine.getState().status).toBe("active");
    expect(engine.getState().currentTime).toBe("1942-05-12T08:20:00.000Z");
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

    const background = engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "background_check", durationMinutes: 60, idempotencyKey: "screen-background" });
    engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "controlled_leak", durationMinutes: 40, idempotencyKey: "screen-leak" });
    engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "discipline_check", durationMinutes: 30, idempotencyKey: "screen-discipline" });
    expect(background.state.characters.recruit.recruitmentCase.evidence[0]?.result).toBe("favorable");
    expect(() => engine.execute({ type: "recruitment_test", targetCharacterId: "recruit", testType: "discipline_check", durationMinutes: 30, idempotencyKey: "screen-duplicate" })).toThrow("同类甄别已经完成");
    expect(engine.getState().characters.recruit.recruited).toBe(false);

    const recruited = engine.execute({ type: "recruit_candidate", targetCharacterId: "recruit", durationMinutes: 30, idempotencyKey: "recruit-formal" });
    expect(recruited.state.characters.recruit.recruited).toBe(true);
    expect(recruited.state.characters.recruit.recruitmentCase.stage).toBe("recruited");
    expect(recruited.state.network.activeMemberIds).toContain("recruit");
    expect(JSON.stringify(toPublicGameEvents(background.events))).not.toContain("loyalty");
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
    delete (oldState.network as { tasks?: WorldState["network"]["tasks"] }).tasks;
    const publicState = toPublicWorldState(oldState);
    expect(publicState.investigation).toEqual({ pressure: 0, locationHeat: {}, surveillanceLocationIds: [], lastActionAt: null });
    expect(publicState.network.tasks).toEqual([]);
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
