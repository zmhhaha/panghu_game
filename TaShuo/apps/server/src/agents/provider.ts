export interface AgentProvider {
  readonly name: string;
  readonly model: string;
  complete(system: string, user: string, temperature?: number): Promise<unknown>;
}

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("LLM returned invalid JSON");
  }
}

class OpenAiCompatibleProvider implements AgentProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly model: string,
    private readonly timeoutMs: number,
  ) {}

  async complete(system: string, user: string, temperature = 0.4): Promise<unknown> {
    const messages = [{ role: "system", content: system }, { role: "user", content: user }];
    const first = await this.request(messages, temperature);
    try { return parseModelJson(first); } catch (error) {
      if (!(error instanceof Error) || error.message !== "LLM returned invalid JSON") throw error;
      const repaired = await this.request([
        ...messages,
        { role: "assistant", content: first },
        { role: "user", content: "保持上一次回答的语义完全不变，只修复为合法 JSON。只输出 JSON 对象。" },
      ], 0);
      return parseModelJson(repaired);
    }
  }

  private async request(messages: Array<{ role: string; content: string }>, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
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
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly model: string,
    private readonly timeoutMs: number,
  ) {}

  async complete(system: string, user: string, temperature = 0.4): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: this.model, max_tokens: 1600, temperature, system, messages: [{ role: "user", content: user }] }),
      });
      if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
      const payload = await response.json() as { content?: Array<{ text?: string }> };
      const content = payload.content?.find((item) => item.text)?.text;
      if (!content) throw new Error("Anthropic returned no content");
      return parseModelJson(content);
    } finally { clearTimeout(timer); }
  }
}

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`${name} is required for the configured LLM provider`);
  return value;
};

export function createRequiredAgentProvider(env: NodeJS.ProcessEnv = process.env): AgentProvider {
  const provider = required(env.PROVIDER, "PROVIDER").toLowerCase();
  const timeoutMs = Number(env.LLM_TIMEOUT_MS ?? 120_000);
  switch (provider) {
    case "openai":
    case "openai-compatible":
      return new OpenAiCompatibleProvider("openai", env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", required(env.OPENAI_API_KEY, "OPENAI_API_KEY"), env.OPENAI_MODEL ?? "gpt-4o-mini", timeoutMs);
    case "deepseek":
      return new OpenAiCompatibleProvider("deepseek", env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com", required(env.DEEPSEEK_API_KEY, "DEEPSEEK_API_KEY"), env.DEEPSEEK_MODEL ?? "deepseek-chat", timeoutMs);
    case "custom":
      return new OpenAiCompatibleProvider("custom", required(env.CUSTOM_BASE_URL, "CUSTOM_BASE_URL"), required(env.CUSTOM_API_KEY, "CUSTOM_API_KEY"), required(env.CUSTOM_MODEL, "CUSTOM_MODEL"), timeoutMs);
    case "anthropic":
      return new AnthropicProvider(env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1", required(env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"), env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest", timeoutMs);
    default:
      throw new Error(`Unsupported PROVIDER: ${provider}. TaShuo has no fallback provider.`);
  }
}

