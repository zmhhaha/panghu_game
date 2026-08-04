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
        // The provider gets one format-only repair attempt below.
      }
    }
    throw new Error("LLM returned invalid JSON");
  }
}

type Message = { role: "system" | "user" | "assistant"; content: string };

class OpenAiCompatibleProvider implements AgentProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string | undefined,
    private readonly apiKey: string | undefined,
    private readonly model: string | undefined,
  ) {}

  async complete(system: string, user: string): Promise<unknown> {
    this.assertConfigured();
    const messages: Message[] = [{ role: "system", content: system }, { role: "user", content: user }];
    const content = await this.request(messages, 0.72);
    try {
      return parseModelJson(content);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "LLM returned invalid JSON") throw error;
      console.warn(`[GuanLiao Agent] provider=${this.name} response=repair`);
      const repaired = await this.request([
        ...messages,
        { role: "assistant", content },
        { role: "user", content: "保持上一次内容语义不变，只修正格式。仅输出一个合法 JSON 对象，不要 Markdown、解释或额外文字。" },
      ], 0);
      return parseModelJson(repaired);
    }
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.model) throw new Error("LLM provider is not configured");
    const host = safeHostname(this.baseUrl);
    if (!this.apiKey && !["localhost", "127.0.0.1", "::1"].includes(host)) {
      throw new Error("LLM provider API key is not configured");
    }
  }

  private async request(messages: Message[], temperature: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 20000));
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
      const response = await fetch(`${this.baseUrl!.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          model: this.model,
          temperature,
          max_tokens: Number(process.env.LLM_MAX_TOKENS ?? 1000),
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content");
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

class AnthropicProvider implements AgentProvider {
  readonly name = "anthropic";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(system: string, user: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 20000));
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: Number(process.env.LLM_MAX_TOKENS ?? 1000),
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
      const payload = await response.json() as { content?: Array<{ text?: string }> };
      const content = payload.content?.find((item) => item.text)?.text;
      if (!content) throw new Error("Anthropic returned no content");
      return parseModelJson(content);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createAgentProvider(): AgentProvider | null {
  const selectedProvider = (process.env.PROVIDER ?? "fallback").trim().toLowerCase();
  switch (selectedProvider) {
    case "openai":
    case "openai-compatible":
      return createOpenAiCompatibleProvider(
        "openai",
        process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      );
    case "deepseek":
      return createOpenAiCompatibleProvider(
        "deepseek",
        process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      );
    case "anthropic":
      return createAnthropicProvider(
        process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
        process.env.ANTHROPIC_API_KEY,
        process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      );
    case "custom":
      return createOpenAiCompatibleProvider(
        "custom",
        process.env.CUSTOM_BASE_URL,
        process.env.CUSTOM_API_KEY,
        process.env.CUSTOM_MODEL ?? "guanliao-official",
      );
    case "fallback":
      return null;
    default:
      return unavailableProvider(selectedProvider, "unknown PROVIDER value");
  }
}

function createOpenAiCompatibleProvider(
  name: string,
  baseUrl: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): AgentProvider | null {
  const normalizedBaseUrl = baseUrl?.trim();
  const normalizedApiKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedBaseUrl) return unavailableProvider(name, "missing base URL");
  if (!isHttpUrl(normalizedBaseUrl)) return unavailableProvider(name, "invalid base URL");
  if (!normalizedModel) return unavailableProvider(name, "missing model");
  const host = safeHostname(normalizedBaseUrl);
  if (!normalizedApiKey && !["localhost", "127.0.0.1", "::1"].includes(host)) {
    return unavailableProvider(name, "missing API key");
  }
  return new OpenAiCompatibleProvider(name, normalizedBaseUrl, normalizedApiKey, normalizedModel);
}

function createAnthropicProvider(
  baseUrl: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): AgentProvider | null {
  const normalizedBaseUrl = baseUrl?.trim();
  const normalizedApiKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedBaseUrl) return unavailableProvider("anthropic", "missing ANTHROPIC_BASE_URL");
  if (!isHttpUrl(normalizedBaseUrl)) return unavailableProvider("anthropic", "invalid ANTHROPIC_BASE_URL");
  if (!normalizedApiKey) return unavailableProvider("anthropic", "missing ANTHROPIC_API_KEY");
  if (!normalizedModel) return unavailableProvider("anthropic", "missing ANTHROPIC_MODEL");
  return new AnthropicProvider(normalizedBaseUrl, normalizedApiKey, normalizedModel);
}

function unavailableProvider(name: string, reason: string): null {
  console.warn(`[GuanLiao Agent] provider=${name || "unknown"} disabled: ${reason}; using fallback`);
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}
