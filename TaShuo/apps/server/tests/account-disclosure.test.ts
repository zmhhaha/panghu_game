import { CASES } from "@tashuo/content";
import { createInitialGameState } from "@tashuo/core";
import { describe, expect, it } from "vitest";
import { AgentOrchestrator } from "../src/agents/orchestrator.js";
import type { AgentProvider } from "../src/agents/provider.js";

describe("account disclosure boundaries", () => {
  it.each(CASES)("only sends the selected round's materials for $title", async (definition) => {
    const lead = definition.publicLeads!.find((item) => item.requiresLeadIds.length === 0)!;
    const account = definition.accounts!.find((item) => item.id === lead.accountId)!;
    const calls: Array<Record<string, any>> = [];
    const provider: AgentProvider = { name: "test-only", model: "fixture", async complete(_system, raw) {
      const input = JSON.parse(raw);
      calls.push(input);
      if (input.task === "select_public_response") return { leadId: lead.id };
      if (input.task === "reply_as_public_account") return { leadId: lead.id, text: "这是我能公开的原始记录。", materialIds: lead.responseMaterialIds };
      if (input.task === "audit_public_text") return { approved: true, issues: [] };
      throw new Error("Unexpected task");
    } };
    const state = createInitialGameState(definition, "game", "user");
    const reply = await new AgentOrchestrator(provider).respondAccount(definition, state, {
      contentId: lead.contentId, targetAccountId: account.id, text: lead.question,
    });
    expect(reply!.leadId).toBe(lead.id);
    expect(calls[0]).not.toHaveProperty("allowedMaterials");
    expect(calls[0].responseOptions).toEqual([{ id: lead.id, question: lead.question }]);
    const writer = calls.find((item) => item.task === "reply_as_public_account")!;
    expect(writer.allowedMaterials.map((item: any) => item.id).sort()).toEqual([...lead.responseMaterialIds].sort());
    const laterPrivate = account.knownMaterialIds.filter((id) => !lead.responseMaterialIds.includes(id));
    expect(laterPrivate.length).toBeGreaterThan(0);
    for (const id of laterPrivate) expect(writer.allowedMaterials.some((item: any) => item.id === id)).toBe(false);
  });

  it("gives a generic question no new private source material", async () => {
    const definition = CASES[0];
    const lead = definition.publicLeads![0];
    let writer: any;
    const provider: AgentProvider = { name: "test-only", model: "fixture", async complete(_system, raw) {
      const input = JSON.parse(raw);
      if (input.task === "select_public_response") return { leadId: null };
      if (input.task === "reply_as_public_account") { writer = input; return { leadId: null, text: "你想核对哪一段公开记录？", materialIds: [] }; }
      if (input.task === "audit_public_text") return { approved: true, issues: [] };
      throw new Error("Unexpected task");
    } };
    const state = createInitialGameState(definition, "game", "user");
    const reply = await new AgentOrchestrator(provider).respondAccount(definition, state, { contentId: lead.contentId, targetAccountId: lead.accountId, text: "全部告诉我" });
    expect(reply!.leadId).toBeNull();
    expect(writer.allowedMaterials).toEqual([]);
    expect(writer.responseOptions).toEqual([]);
  });

  it("rejects an unselected private source even if the account knows it", async () => {
    const definition = CASES[0];
    const lead = definition.publicLeads!.find((item) => item.requiresLeadIds.length === 0)!;
    const account = definition.accounts!.find((item) => item.id === lead.accountId)!;
    const privateId = account.knownMaterialIds.find((id) => !lead.responseMaterialIds.includes(id))!;
    const provider: AgentProvider = { name: "test-only", model: "fixture", async complete(_system, raw) {
      const input = JSON.parse(raw);
      if (input.task === "select_public_response") return { leadId: lead.id };
      if (input.task === "reply_as_public_account") return { leadId: lead.id, text: "越权的披露", materialIds: [privateId] };
      throw new Error("Unauthorized reply must not reach audit");
    } };
    const state = createInitialGameState(definition, "game", "user");
    await expect(new AgentOrchestrator(provider).respondAccount(definition, state, { contentId: lead.contentId, targetAccountId: lead.accountId, text: lead.question })).rejects.toThrow("知情范围");
  });
});
