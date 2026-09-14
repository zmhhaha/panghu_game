import { z } from "zod";

const npcResponseSchema = z.object({
  visibleSpeech: z.string().min(1).max(800),
  privateIntent: z.string().max(300).catch("").default(""),
  evidenceQuote: z.string().max(160).catch("").default(""),
  requestedEffects: z.array(z.object({
    type: z.string().max(40),
    value: z.number().min(-20).max(20),
    reason: z.string().max(200),
  })).max(8).catch([]).default([]),
  relationshipReaction: z.enum(["resonated", "respected_boundary", "neutral", "misaligned", "boundary_violation", "inconsistent"]).optional(),
  reactionReason: z.string().max(200).optional(),
});

export type NpcAgentResponse = z.infer<typeof npcResponseSchema>;
export type AgentProvider = {
  readonly name: string;
  complete(system: string, user: string): Promise<unknown>;
};

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        const visibleSpeech = recoverStringField(trimmed, "visibleSpeech", ["privateIntent", "requestedEffects"]);
        if (visibleSpeech) {
          return {
            visibleSpeech,
            privateIntent: recoverStringField(trimmed, "privateIntent", ["requestedEffects"]) ?? "",
            evidenceQuote: "",
            requestedEffects: [],
          };
        }
      }
    }
    if (!/[{}]/.test(trimmed) && trimmed.length <= 800) {
      const speech = trimmed.replace(/^['"]|['"]$/g, "").trim();
      if (speech) return { visibleSpeech: speech, privateIntent: "", evidenceQuote: "", requestedEffects: [] };
    }
    throw new Error("LLM returned invalid JSON");
  }
}

function recoverStringField(content: string, field: string, followingFields: string[]): string | null {
  const next = followingFields.map(escapeRegExp).join("|");
  const doubleQuoted = new RegExp(`"${escapeRegExp(field)}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?=,\\s*"(?:${next})"|[},])`);
  const singleQuoted = new RegExp(`['"]${escapeRegExp(field)}['"]\\s*:\\s*'([\\s\\S]*?)'\\s*(?=,\\s*['"](?:${next})['"]|[},])`);
  const match = content.match(doubleQuoted) ?? content.match(singleQuoted);
  if (!match?.[1]) return null;
  return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class OpenAiCompatibleProvider implements AgentProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string | undefined,
    private readonly apiKey: string | undefined,
    private readonly model: string | undefined,
  ) {}

  async complete(system: string, user: string): Promise<unknown> {
    if (!this.baseUrl || !this.apiKey) throw new Error("LLM provider is not configured");
    const messages = [{ role: "system", content: system }, { role: "user", content: user }];
    const content = await this.request(messages, 0.7);
    try {
      return parseModelJson(content);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "LLM returned invalid JSON") throw error;
      console.warn(`[QianFu Agent] provider=${this.name} response=repair`);
      const repaired = await this.request([
        ...messages,
        { role: "assistant", content },
        { role: "user", content: "上一次内容语义不变，只修正格式。仅输出合法JSON对象，字段必须是visibleSpeech字符串、privateIntent字符串、evidenceQuote字符串、relationshipReaction字符串、reactionReason字符串、requestedEffects数组。relationshipReaction只能是resonated、respected_boundary、neutral、misaligned、boundary_violation、inconsistent之一，不得遗漏。" },
      ], 0);
      return parseModelJson(repaired);
    }
  }

  private async request(messages: Array<{ role: string; content: string }>, temperature: number): Promise<string> {
    if (!this.baseUrl || !this.apiKey) throw new Error("llm-service is not configured");
    const controller = new AbortController();
    // 超时必须盖过服务端最坏耗时，否则会在 llm-service 还在生成时就 abort，
    // 白白丢掉一次已经成功、只是慢的调用。上游是推理模型，耗时方差比直连大得多。
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 60000));
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, temperature, messages }),
      });
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content");
      return content;
    } finally { clearTimeout(timer); }
  }
}

export function createAgentProvider(): AgentProvider | null {
  // 模型调用统一走集群内 llm-service；本服务不再持有任何 provider 凭据。
  // model 传的是 llm-service 注册的**别名**（如 deepseek-guarded），不是上游模型名。
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_SERVICE_TOKEN;
  if (!baseUrl || !apiKey) return null;
  return new OpenAiCompatibleProvider("llm-service", baseUrl, apiKey, process.env.LLM_MODEL ?? "deepseek-guarded");
}

export function parseNpcResponse(value: unknown): NpcAgentResponse {
  return npcResponseSchema.parse(value);
}
