import type { CaseDefinition, GameState, GroupReaction, ReportAnalysis, SpeechFeatures } from "@tashuo/core";
import { z } from "zod";
import type { AgentProvider } from "./provider.js";

const speechSchema = z.object({
  expressionType: z.enum(["fact", "inference", "question", "sarcasm", "emotion"]),
  targetIds: z.array(z.string()).max(12),
  supportedFactIds: z.array(z.string()).max(12),
  deniedFactIds: z.array(z.string()).max(12),
  certainty: z.number().min(0).max(100),
  aggression: z.number().min(0).max(100),
  provocation: z.number().min(0).max(100),
  informationDensity: z.number().min(0).max(100),
  citedContentIds: z.array(z.string()).max(12),
  confidence: z.number().min(0).max(100),
});

const groupReactionSchema = z.object({
  stanceConflict: z.number().min(0).max(100),
  targetingTendency: z.number().min(0).max(100),
  reactionIntents: z.array(z.enum(["like", "reply", "challenge", "quote", "report", "pile_on"])).max(6),
  reasonIds: z.array(z.string().max(80)).max(8),
  replies: z.array(z.object({ accountId: z.string().max(80), displayName: z.string().max(80), text: z.string().min(1).max(500) })).max(6),
});

const reportSchema = z.object({
  summary: z.string().min(1).max(2000),
  claims: z.array(z.object({
    factId: z.string(),
    judgment: z.enum(["true", "false", "partial", "unknown"]),
    confidence: z.number().min(0).max(100),
    citedContentIds: z.array(z.string()).max(20),
  })).max(50),
  unresolvedQuestions: z.array(z.string().max(500)).max(20),
});

export class AgentOrchestrator {
  constructor(private readonly provider: AgentProvider) {}

  async analyzeSpeech(definition: CaseDefinition, state: GameState, contentId: string, text: string, speechId: string): Promise<SpeechFeatures> {
    const publicClaims = definition.facts.map((fact) => ({ id: fact.id, statement: fact.statement }));
    const visibleContent = definition.contents.filter((item) => state.revealedContentIds.includes(item.id)).map((item) => ({ id: item.id, title: item.title, body: item.body, sourceId: item.sourceId }));
    const value = await this.provider.complete(
      "你是《它说》的玩家发言解析 Agent。只分析表达方式，不判断玩家观点是否符合隐藏真相。只输出符合要求的 JSON 对象。",
      JSON.stringify({ task: "analyze_public_comment", contentId, text, publicClaims, visibleContent, output: "expressionType,targetIds,supportedFactIds,deniedFactIds,certainty,aggression,provocation,informationDensity,citedContentIds,confidence" }),
      0,
    );
    return { id: speechId, ...speechSchema.parse(value) };
  }

  async reactGroups(definition: CaseDefinition, state: GameState, contentId: string, text: string, speech: SpeechFeatures): Promise<GroupReaction[]> {
    const content = definition.contents.find((item) => item.id === contentId);
    if (!content) throw new Error("评论目标不存在");
    return Promise.all(definition.groups.map(async (group) => {
      const runtime = state.groupStates[group.id];
      const value = await this.provider.complete(
        "你是《它说》的评论区群体 Agent。你只能根据该群体在当前事件中的状态，对公开评论提出反应意图。不要修改事实、时间或数值状态。只输出 JSON。",
        JSON.stringify({
          task: "react_to_player_comment",
          publicPost: { id: content.id, title: content.title, body: content.body },
          playerComment: text,
          speechFeatures: speech,
          group: { id: group.id, name: group.name, description: group.description, eventFrenzy: runtime.eventFrenzy, attention: runtime.attention, exclusivity: runtime.exclusivity, dissentSensitivity: runtime.dissentSensitivity, mobilization: runtime.mobilization, persistence: runtime.persistence },
          output: "stanceConflict,targetingTendency,reactionIntents,reasonIds,replies[{accountId,displayName,text}]",
        }),
        0.5,
      );
      return { groupId: group.id, eventFrenzy: runtime.eventFrenzy, ...groupReactionSchema.parse(value) };
    }));
  }

  async analyzeReport(definition: CaseDefinition, state: GameState, text: string): Promise<ReportAnalysis> {
    const visibleContent = definition.contents.filter((item) => state.revealedContentIds.includes(item.id)).map((item) => ({ id: item.id, title: item.title, body: item.body }));
    const canonicalClaims = definition.facts.map((fact) => ({ id: fact.id, statement: fact.statement }));
    const value = await this.provider.complete(
      "你是《它说》的报告解析 Agent。把玩家报告映射到给定主张，不负责评分，不添加玩家没有表达的结论。只输出 JSON。",
      JSON.stringify({ task: "parse_final_report", report: text, canonicalClaims, visibleContent, output: "summary,claims[{factId,judgment,confidence,citedContentIds}],unresolvedQuestions" }),
      0,
    );
    const parsed = reportSchema.parse(value);
    const factIds = new Set(definition.facts.map((fact) => fact.id));
    const contentIds = new Set(state.revealedContentIds);
    return {
      ...parsed,
      claims: parsed.claims.filter((claim) => factIds.has(claim.factId)).map((claim) => ({ ...claim, citedContentIds: claim.citedContentIds.filter((id) => contentIds.has(id)) })),
    };
  }
}
