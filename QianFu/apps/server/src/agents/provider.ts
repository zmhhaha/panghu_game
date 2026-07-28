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
        { role: "user", content: "上一次内容语义不变，只修正格式。仅输出合法JSON对象，字段必须是visibleSpeech字符串、privateIntent字符串、evidenceQuote字符串、requestedEffects数组。" },
      ], 0);
      return parseModelJson(repaired);
    }
  }

  private async request(messages: Array<{ role: string; content: string }>, temperature: number): Promise<string> {
    if (!this.baseUrl || !this.apiKey) throw new Error("LLM provider is not configured");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 8000));
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, temperature, response_format: { type: "json_object" }, messages }),
      });
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content");
      return content;
    } finally { clearTimeout(timer); }
  }
}

class AnthropicProvider implements AgentProvider {
  readonly name = "anthropic";

  async complete(system: string, user: string): Promise<unknown> {
    const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Anthropic provider is not configured");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 8000));
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/messages`, { method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest", max_tokens: 800, system, messages: [{ role: "user", content: user }] }), });
      if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
      const payload = await response.json() as { content?: Array<{ text?: string }> };
      const content = payload.content?.find((item) => item.text)?.text;
      if (!content) throw new Error("Anthropic returned no content");
      return parseModelJson(content);
    } finally { clearTimeout(timer); }
  }
}

export function createAgentProvider(): AgentProvider | null {
  switch ((process.env.PROVIDER ?? "fallback").toLowerCase()) {
    case "openai":
    case "openai-compatible":
      return new OpenAiCompatibleProvider("openai", process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL ?? "gpt-4o-mini");
    case "anthropic":
      return new AnthropicProvider();
    case "deepseek":
      return new OpenAiCompatibleProvider("deepseek", process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com", process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash");
    case "custom":
      return new OpenAiCompatibleProvider("custom", process.env.CUSTOM_BASE_URL, process.env.CUSTOM_API_KEY, process.env.CUSTOM_MODEL ?? "qianfu-npc");
    default:
      return null;
  }
}

export function parseNpcResponse(value: unknown): NpcAgentResponse {
  return npcResponseSchema.parse(value);
}
