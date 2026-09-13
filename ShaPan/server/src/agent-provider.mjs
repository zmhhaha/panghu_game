function text(value, fallback, max = 280) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, max);
}

function clockLabel(value) {
  const minute = Number(value);
  const normalized = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function normalizeReportText(value) {
  return String(value || "").replace(/(于|在|截至|至|到|为)\s*(\d{3,4})\s*分钟(?!\s*(?:内|后|以内|之内))/g, (match, prefix, rawMinute) => {
    const minute = Number(rawMinute);
    return minute >= 180 && minute <= 2879 ? `${prefix}${clockLabel(minute)}` : match;
  });
}

export function buildAgentPromptInput(value) {
  if (Array.isArray(value)) return value.map(buildAgentPromptInput);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (typeof item === "number" && (key === "clockMinute" || key === "startMinute" || key === "deadlineMinute" || key.endsWith("AtMinute"))) {
      return [key.replace(/Minute$/, "Time"), clockLabel(item)];
    }
    return [key, buildAgentPromptInput(item)];
  }));
}

function chineseReport(value, fallback, max) {
  const candidate = normalizeReportText(text(value, fallback, max));
  // Unit names and map labels may contain abbreviations, but a report field
  // dominated by Latin words breaks the Chinese command-room experience.
  return /[A-Za-z]{3,}/.test(candidate) ? fallback : candidate;
}

function fallbackDecision(job) {
  if (job.jobType === "local_battle") {
    const [friendly, hostile] = job.input.participants || [];
    return {
      subject: `${friendly?.name || "前沿部队"}与${hostile?.name || "敌军"}发生局部交战`,
      body: `局部战局指挥组依据双方已知位置、通信与接敌情况判定：${friendly?.name || "己方部队"}正在与${hostile?.name || "敌军"}争夺同一战术区域。该判断不包含战区全局情报，后续战报将由己方通信链路回传。`,
      status: "局部交战",
      summary: "局部战局指挥组正在维护参战部队之间的有限已知态势。",
      morale: "承压",
      comms: "前沿电台回传"
    };
  }
  const unit = job.input.unit;
  if (job.jobType === "enemy_action") {
    return {
      subject: `${unit.name}调整进攻方向`,
      body: `前沿观察点报告，${unit.name}正在${unit.role}。敌军行动已改变局部压力，但具体兵力仍待确认。`,
      status: "正在行动",
      summary: `${unit.name}正在执行新的战术机动。`,
      morale: "不明",
      comms: "情报推定"
    };
  }
  if (job.jobType === "order_response") {
    return {
      subject: `${unit.name}确认收到军令`,
      body: `${unit.name}已收到“${job.input.order.text.slice(0, 90)}”。部队将结合当前态势和通信状况执行，并在出现重大变化时回报。`,
      status: "执行军令",
      summary: `${unit.name}已按最新军令调整行动。`,
      morale: "稳定",
      comms: "已建立联络"
    };
  }
  return {
    subject: `${unit.name}报告自主调整部署`,
    body: `${unit.name}依据战役目标与最近态势，自行调整行军、警戒和通信安排，继续执行“${unit.role}”。`,
    status: "自主行动",
    summary: `${unit.name}正在依据战场态势自主推进任务。`,
    morale: "稳定",
    comms: "联络断续"
  };
}

function providerConfig() {
  // 模型调用统一走集群内 llm-service；本服务不再持有任何 provider 凭据。
  // model 传的是 llm-service 注册的**别名**（如 deepseek-guarded），不是上游模型名。
  // 配置缺失时退回规则口径（rules-v1）——那是产品行为，不是直连 provider 的兜底。
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_SERVICE_TOKEN;
  if (!baseUrl || !apiKey) return { provider: "fallback", apiKey: null, baseUrl: null, model: "rules-v1" };
  return { provider: "llm-service", apiKey, baseUrl, model: process.env.LLM_MODEL || "deepseek-guarded" };
}

/**
 * 不再用 response_format，模型可能把 JSON 包进 ``` 代码块或前后带话术，所以自己剥一层。
 * 剥完仍不是合法 JSON 就抛错，由调用方退回规则口径。
 */
function parseModelObject(content) {
  const trimmed = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("LLM returned invalid JSON");
  }
}

function validateDecision(value, fallback) {
  return {
    subject: chineseReport(value?.subject, fallback.subject, 100),
    body: chineseReport(value?.body, fallback.body, 600),
    status: chineseReport(value?.status, fallback.status, 40),
    summary: chineseReport(value?.summary, fallback.summary, 180),
    morale: chineseReport(value?.morale, fallback.morale, 30),
    comms: chineseReport(value?.comms, fallback.comms, 40)
  };
}

export async function runAgentJob(job) {
  const fallback = fallbackDecision(job);
  const config = providerConfig();
  if (!config.apiKey || config.provider === "fallback") {
    return { decision: { ...fallback, provider: "fallback" }, run: { provider: "fallback", model: "rules-v1", resultStatus: "succeeded" } };
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS || 20_000));
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.35,
        messages: [
          { role: "system", content: "你是二战战役沙盘中的部队指挥智能体。只能依据给定军令、任务和不完整态势行动。输出JSON，字段必须为subject、body、status、summary、morale、comms；所有字段必须使用简体中文，不得输出英文标题、英文战报、中英混合句或技术术语。输入中的时间已经换算为HH:MM格式，战报必须沿用该格式，不得输出累计分钟数。不得引用战役全局百分比，不得宣称知道未提供的敌情，不得替上级决定战役胜负。" },
          { role: "user", content: JSON.stringify(buildAgentPromptInput(job.input)) }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned no content");
    const parsed = parseModelObject(content);
    return {
      decision: { ...validateDecision(parsed, fallback), provider: config.provider },
      run: { provider: config.provider, model: config.model, durationMs: Date.now() - startedAt, resultStatus: "succeeded" }
    };
  } catch (error) {
    return {
      decision: { ...fallback, provider: "fallback" },
      run: { provider: config.provider, model: config.model, durationMs: Date.now() - startedAt, resultStatus: "fallback", error: String(error?.message || error).slice(0, 300) }
    };
  } finally {
    clearTimeout(timer);
  }
}
