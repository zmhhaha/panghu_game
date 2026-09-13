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
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(system: string, user: string): Promise<unknown> {
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

  private async request(messages: Message[], temperature: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 20000));
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          temperature,
          max_tokens: Number(process.env.LLM_MAX_TOKENS ?? 1000),
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

/**
 * 模型调用统一走集群内 llm-service：密钥、别名路由与提示词劫持防护都由它负责。
 * LLM_MODEL 传的是 llm-service 注册的**别名**（deepseek-guarded），不是上游模型名 ——
 * 改回 `deepseek-v4-flash` 之类会被 400 拒掉。
 *
 * 返回 null 表示未配置模型，此时编排器使用主控给出的确定性文本；这是产品行为，
 * 不是直连 provider 的回退路径 —— 本服务已经没有任何直连 provider 的代码。
 */
export function createAgentProvider(): AgentProvider | null {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  if (!baseUrl) return unavailableProvider("llm-service", "missing LLM_BASE_URL");
  if (!isHttpUrl(baseUrl)) return unavailableProvider("llm-service", "invalid LLM_BASE_URL");
  const apiKey = process.env.LLM_SERVICE_TOKEN?.trim();
  if (!apiKey) return unavailableProvider("llm-service", "missing LLM_SERVICE_TOKEN");
  return new OpenAiCompatibleProvider("llm-service", baseUrl, apiKey, process.env.LLM_MODEL?.trim() || "deepseek-guarded");
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
