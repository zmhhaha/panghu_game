import { z } from "zod";

const npcResponseSchema = z.object({
  visibleSpeech: z.string().min(1).max(800),
  privateIntent: z.string().max(300).default(""),
  requestedEffects: z.array(z.object({ type: z.string().max(40), value: z.number().min(-20).max(20), reason: z.string().max(200) })).max(8).default([]),
});

export type NpcAgentResponse = z.infer<typeof npcResponseSchema>;
export type AgentProvider = {
  readonly name: string;
  complete(system: string, user: string): Promise<unknown>;
};

function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("LLM returned invalid JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 8000));
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, temperature: 0.7, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content");
      return parseModelJson(content);
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
      return new OpenAiCompatibleProvider("deepseek", process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com", process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL ?? "deepseek-chat");
    case "custom":
      return new OpenAiCompatibleProvider("custom", process.env.CUSTOM_BASE_URL, process.env.CUSTOM_API_KEY, process.env.CUSTOM_MODEL ?? "qianfu-npc");
    default:
      return null;
  }
}

export function parseNpcResponse(value: unknown): NpcAgentResponse {
  return npcResponseSchema.parse(value);
}
