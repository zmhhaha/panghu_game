import { z } from "zod";

export const agentStyleSchema = z.enum(["literal", "cautious", "careerist", "broker", "guardian", "factional"]);

export const officialAgentSchema = z.object({
  id: z.string().min(1).max(80),
  role: z.string().min(1).max(40),
  name: z.string().min(1).max(40),
  style: agentStyleSchema,
  personaLabel: z.string().min(1).max(40),
  publicFace: z.string().min(1).max(240),
  traits: z.object({
    competence: z.number().min(0).max(100),
    loyalty: z.number().min(0).max(100),
    ambition: z.number().min(0).max(100),
    greed: z.number().min(0).max(100),
    caution: z.number().min(0).max(100),
  }),
});

export const stepNarrativeSchema = z.object({
  interpretation: z.string().trim().min(8).max(320),
  calculation: z.string().trim().min(8).max(360),
  action: z.string().trim().min(8).max(320),
  officialReport: z.string().trim().min(8).max(420),
  forwardedText: z.string().trim().min(4).max(500),
});

const effectSchema = z.record(z.number().min(-18).max(18));

export const propagationRequestSchema = z.object({
  era: z.enum(["ming", "qing"]),
  day: z.number().int().min(1).max(10000),
  orderText: z.string().trim().min(4).max(500),
  receivedText: z.string().trim().min(4).max(500),
  analysis: z.object({
    clarity: z.number().min(0).max(100),
    clarityLabel: z.string().min(1).max(20),
    dominant: z.string().min(1).max(40),
  }),
  agent: officialAgentSchema,
  controllerProjection: z.object({
    narrative: stepNarrativeSchema,
    fidelity: z.number().min(0).max(100),
    holdDays: z.number().int().min(0).max(10),
    effects: effectSchema,
  }),
});

export const completionNarrativeSchema = z.object({
  reportingCalculation: z.string().trim().min(8).max(360),
  reportText: z.string().trim().min(8).max(500),
});

export const completionFallbackSchema = completionNarrativeSchema.extend({
  agentId: z.string().min(1).max(80),
  agentName: z.string().min(1).max(40),
  role: z.string().min(1).max(40),
  style: agentStyleSchema,
  day: z.number().int().min(1).max(10000),
  receivedReport: z.string().trim().min(4).max(1000),
});

export const completionRequestSchema = z.object({
  era: z.enum(["ming", "qing"]),
  day: z.number().int().min(1).max(10000),
  orderText: z.string().trim().min(4).max(500),
  outcome: z.object({
    success: z.boolean(),
    title: z.string().trim().min(1).max(160),
    text: z.string().trim().min(4).max(800),
  }),
  agents: z.array(z.object({
    agent: officialAgentSchema,
    fallback: completionFallbackSchema,
  })).min(1).max(8),
});

export type OfficialAgent = z.infer<typeof officialAgentSchema>;
export type StepNarrative = z.infer<typeof stepNarrativeSchema>;
export type PropagationRequest = z.infer<typeof propagationRequestSchema>;
export type CompletionNarrative = z.infer<typeof completionNarrativeSchema>;
export type CompletionFallback = z.infer<typeof completionFallbackSchema>;
export type CompletionRequest = z.infer<typeof completionRequestSchema>;
