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

const required = (value: string | undefined, name: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required for the shared LLM service`);
  return trimmed;
};

/**
 * 模型调用统一走集群内 llm-service：密钥、别名路由与提示词劫持防护都由它负责。
 * LLM_MODEL 传的是 llm-service 注册的**别名**（deepseek-guarded），不是上游模型名 ——
 * 改回 `deepseek-v4-flash` 之类会被 400 拒掉。
 *
 * TaShuo 不提供 fallback：缺配置就抛错让进程拒绝启动，模型失败时游戏实例保持原状态等待重试。
 */
export function createRequiredAgentProvider(env: NodeJS.ProcessEnv = process.env): AgentProvider {
  const baseUrl = required(env.LLM_BASE_URL, "LLM_BASE_URL");
  const serviceToken = required(env.LLM_SERVICE_TOKEN, "LLM_SERVICE_TOKEN");
  const model = env.LLM_MODEL?.trim() || "deepseek-guarded";
  const timeoutMs = Number(env.LLM_TIMEOUT_MS ?? 120_000);
  return new OpenAiCompatibleProvider("llm-service", baseUrl, serviceToken, model, timeoutMs);
}

