"""LLM 客户端 —— 统一走集群内 llm-service。

本服务不持有任何 provider 凭据：密钥、模型别名路由、超时重试与提示词劫持防护
都由 llm-service 负责（见 llm-service/README.md）。这里只给别名和内部令牌。

`LLM_MODEL` 传的是 llm-service 注册的**别名**（如 `deepseek-guarded`），不是上游模型名 ——
别改回 `deepseek-v4-flash` 之类的真实模型名，那样会被 400 拒掉。
"""

import os
import time

from openai import OpenAI

# 模型调用统一走集群内 llm-service。健康检查和响应体里回报的就是它。
BACKEND = "llm-service"

MAX_RETRIES = 2
RETRY_DELAY_SEC = 1.5

_client: OpenAI | None = None


def get_model_alias() -> str:
    """llm-service 注册的模型别名（不是上游模型名）。"""
    return os.getenv("LLM_MODEL", "deepseek-guarded")


def _get_client() -> OpenAI:
    """惰性建客户端；缺配置就早失败，别等第一次请求才炸。"""
    global _client
    if _client is None:
        base_url = os.getenv("LLM_BASE_URL", "").rstrip("/")
        token = os.getenv("LLM_SERVICE_TOKEN", "").strip()
        if not base_url or not token:
            raise RuntimeError(
                "School of One 未配置 llm-service：需要 LLM_BASE_URL 与 LLM_SERVICE_TOKEN"
                "（见 k8s/deployment.yaml 与 vault/inventory/school-of-one-externalsecret.yaml）"
            )
        _client = OpenAI(api_key=token, base_url=base_url)
    return _client


def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> str:
    """调用模型，返回文本回复。"""
    client = _get_client()
    payload = {
        "model": get_model_alias(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
    }

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return client.chat.completions.create(**payload).choices[0].message.content or ""
        except Exception as error:
            last_error = error
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC * (attempt + 1))
    raise RuntimeError(f"LLM 调用失败（重试 {MAX_RETRIES} 次后）: {last_error}")
