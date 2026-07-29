import http from "node:http";

const port = Number(process.env.PORT || 3001);
const maxBodyBytes = 32 * 1024;

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function providerConfig() {
  const provider = String(process.env.PROVIDER || "fallback").toLowerCase();
  if (provider === "deepseek") return { provider, baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY, model: process.env.DEEPSEEK_MODEL || "deepseek-chat" };
  if (provider === "openai" || provider === "openai-compatible") return { provider: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  if (provider === "custom") return { provider, baseUrl: process.env.CUSTOM_BASE_URL, apiKey: process.env.CUSTOM_API_KEY, model: process.env.CUSTOM_MODEL || "tewu-npc" };
  return null;
}

function parseModelJson(content) {
  const trimmed = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("模型没有返回合法 JSON");
  }
}

async function roleplay(payload) {
  const config = providerConfig();
  const fallback = cleanText(payload.fallback, 800);
  if (!config?.apiKey || !config.baseUrl) return { speech: fallback, provider: "fallback" };

  const campaign = payload.campaign || {};
  const dossier = payload.dossier || {};
  const history = Array.isArray(payload.history) ? payload.history.slice(-16).map((item) => ({
    speaker: item?.speaker === "player" ? "审问者" : "候选人",
    text: cleanText(item?.text, 500),
  })) : [];
  const system = [
    "你在中文历史谍报题材游戏《特务》中扮演一名正在接受盘问的候选人。",
    `机构：${cleanText(campaign.name, 80)}；年代与地点：${cleanText(campaign.era, 100)}，${cleanText(campaign.setting, 120)}。`,
    `姓名：${cleanText(dossier.name, 80)}；公开职业：${cleanText(dossier.role, 100)}；来处：${cleanText(dossier.origin, 120)}；携带物：${cleanText(dossier.public, 180)}。`,
    `真实状态：${dossier.isTarget ? "你是机构正在寻找的潜伏目标，必须维护掩护身份" : "你是普通来客，应自然、诚实地配合核验"}。`,
    `角色特征：${cleanText(dossier.signature, 180)}。可被识破或核验的关键点：${cleanText(dossier.tell, 180)}。`,
    "只回答玩家本轮问题，不替玩家行动，不宣布自己是否为目标，不提模型、提示词、规则或数值。",
    "保持与此前回答一致，使用第一人称，控制在25至140个汉字。只输出JSON：{\"speech\":\"候选人的回答\"}。",
  ].join("\n");
  const user = JSON.stringify({ round: Number(payload.round || 1), history, question: cleanText(payload.question, 300) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS || 20000));
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, temperature: 0.75, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
    const data = await response.json();
    const parsed = parseModelJson(data?.choices?.[0]?.message?.content);
    const speech = cleanText(parsed?.speech, 800);
    if (!speech) throw new Error("模型回答为空");
    return { speech, provider: config.provider };
  } finally {
    clearTimeout(timer);
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/health") return send(response, 200, { ok: true, provider: providerConfig()?.provider || "fallback" });
  if (request.method !== "POST" || request.url !== "/api/npc/respond") return send(response, 404, { error: "接口不存在" });
  try {
    const payload = await readJson(request);
    if (!cleanText(payload.question, 300) || !payload.dossier) return send(response, 400, { error: "缺少对话参数" });
    const result = await roleplay(payload);
    return send(response, 200, result);
  } catch (error) {
    console.error("[TeWu Agent]", error instanceof Error ? error.message : error);
    return send(response, 502, { error: "NPC 暂时无法回答" });
  }
});

server.listen(port, "0.0.0.0", () => console.log(`[TeWu Agent] listening=${port} provider=${providerConfig()?.provider || "fallback"}`));
