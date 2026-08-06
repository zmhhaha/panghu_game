function text(value, fallback, max = 280) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, max);
}

function fallbackDecision(job) {
  if (job.jobType === "local_battle") {
    const [friendly, hostile] = job.input.participants || [];
    return {
      subject: `${friendly?.name || "前沿部队"}与${hostile?.name || "敌军"}发生局部交战`,
      body: `局部战局指挥组依据双方已知位置、通信与接敌情况判定：${friendly?.name || "己方部队"}正在与${hostile?.name || "敌军"}争夺同一战术区域。该判断不包含战区全局情报，后续战报将由己方通信链路回传。`,
      status: "局部交战",
      summary: "局部战局 Agent 正在维护参战部队之间的有限已知上下文。",
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
      body: `${unit.name}已收到“${job.input.order.text.slice(0, 90)}”。部队将结合当前接敌和通信状况执行，并在出现重大变化时回报。`,
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
  const provider = (process.env.PROVIDER || "fallback").toLowerCase();
  if (provider === "deepseek") return {
    provider,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
  };
  if (provider === "openai") return {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  };
  return { provider: "fallback", apiKey: null, baseUrl: null, model: "rules-v1" };
}

function validateDecision(value, fallback) {
  return {
    subject: text(value?.subject, fallback.subject, 100),
    body: text(value?.body, fallback.body, 600),
    status: text(value?.status, fallback.status, 40),
    summary: text(value?.summary, fallback.summary, 180),
    morale: text(value?.morale, fallback.morale, 30),
    comms: text(value?.comms, fallback.comms, 40)
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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是二战战役沙盘中的部队指挥Agent。只能依据给定军令、任务和不完整态势行动。输出JSON，字段必须为subject、body、status、summary、morale、comms；不得宣称知道未提供的敌情，不得替上级决定战役胜负。" },
          { role: "user", content: JSON.stringify(job.input) }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned no content");
    const parsed = JSON.parse(content);
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
