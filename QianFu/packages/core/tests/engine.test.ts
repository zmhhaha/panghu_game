import { describe, expect, it } from "vitest";
import { CampaignEngine, createInitialWorld, type CampaignDefinition } from "../src/index.js";

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
    engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "request_information", tone: "neutral", playerText: "告诉我最近的安排。", durationMinutes: 10, idempotencyKey: "dialogue-locked" });
    expect(engine.getState().intel.fact.knownFields).toHaveLength(0);
    engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "build_trust", tone: "friendly", playerText: "我们可以先从小事合作。", durationMinutes: 10, idempotencyKey: "dialogue-trust" });
    const result = engine.execute({ type: "dialogue", targetCharacterId: "source", goal: "request_information", tone: "neutral", playerText: "现在可以谈谈那批货了吗？", durationMinutes: 20, idempotencyKey: "dialogue-info" });
    expect(result.state.intel.fact.knownFields).toHaveLength(1);
    expect(result.state.intel.fact.collectedSourceIds).toEqual(["source"]);
  });

  it("requires staged rapport before a recruit joins the network", () => {
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
    expect(engine.getState().characters.recruit.recruited).toBe(false);
    for (let index = 0; index < 3; index += 1) {
      engine.execute({ type: "dialogue", targetCharacterId: "recruit", goal: "recruit_probe", tone: "formal", playerText: "愿意接受一次低风险测试吗？", durationMinutes: 30, idempotencyKey: `recruit-probe-${index}` });
    }
    expect(engine.getState().characters.recruit.recruited).toBe(true);
    expect(engine.getState().network.activeMemberIds).toContain("recruit");
  });
});
