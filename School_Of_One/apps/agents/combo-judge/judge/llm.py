"""
LLM 客户端 — 统一调用接口，支持多Provider

参照 panghu_agent `research_agent/crew.py` 的 LLM 配置模式，
通过环境变量 PROVIDER 切换模型提供商，默认 DeepSeek（兼容 OpenAI 格式）。
"""

import os
import time
from typing import Any

from openai import OpenAI


_clients: dict[str, OpenAI] = {}

PROVIDER_CONFIGS: dict[str, dict[str, Any]] = {
    "deepseek": {
        "env_key": "DEEPSEEK_API_KEY",
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com",
        "model": "gpt-4o-mini",
    },
    "custom": {
        "env_key": "CUSTOM_API_KEY",
        "base_url_key": "CUSTOM_API_BASE",
        "model_key": "CUSTOM_MODEL",
    },
}

ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"
ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514"

MAX_RETRIES = 2
RETRY_DELAY_SEC = 1.5


def get_provider() -> str:
    return os.getenv("PROVIDER", "deepseek").lower()


def _get_client() -> OpenAI:
    provider = get_provider()

    if provider == "anthropic":
        raise RuntimeError("Anthropic 请使用 _call_anthropic()")

    if provider == "deepseek":
        key = os.getenv("DEEPSEEK_API_KEY", "")
        base = "https://api.deepseek.com"
    elif provider == "openai":
        key = os.getenv("OPENAI_API_KEY", "")
        base = "https://api.openai.com"
    elif provider == "custom":
        key = os.getenv("CUSTOM_API_KEY", "")
        base = os.getenv("CUSTOM_API_BASE", "http://localhost:11434/v1")
    else:
        raise ValueError(f"不支持的 Provider: {provider}")

    cache_key = f"{provider}:{key[:8]}"
    if cache_key not in _clients:
        _clients[cache_key] = OpenAI(api_key=key, base_url=base)
    return _clients[cache_key]


def _get_model() -> str:
    provider = get_provider()
    if provider == "anthropic":
        return ANTHROPIC_DEFAULT_MODEL
    config = PROVIDER_CONFIGS.get(provider)
    if not config:
        raise ValueError(f"不支持的 Provider: {provider}")
    if provider == "custom":
        return os.getenv("CUSTOM_MODEL", "gpt-4o-mini")
    return config["model"]


def call_llm(
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
    temperature: float = 0.5,
) -> str:
    provider = get_provider()
    if provider == "anthropic":
        return _call_anthropic(system_prompt, user_prompt, temperature)
    return _call_openai_compat(system_prompt, user_prompt, response_format, temperature)


def _call_openai_compat(
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
    temperature: float = 0.5,
) -> str:
    client = _get_client()
    model = _get_model()

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
    }

    if response_format is not None:
        kwargs["response_format"] = {"type": "json_object"}

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = client.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content or ""
            if response_format is not None:
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1]
                    content = content.rsplit("```", 1)[0]
                content = content.strip()
            return content
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC * (attempt + 1))
                continue
            raise RuntimeError(f"LLM 调用失败（重试 {MAX_RETRIES} 次后）: {last_error}")


def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.5,
) -> str:
    api_key = os.getenv(ANTHROPIC_API_KEY_ENV, "")
    if not api_key:
        raise RuntimeError(f"未设置 {ANTHROPIC_API_KEY_ENV}")

    try:
        from anthropic import Anthropic
    except ImportError:
        raise RuntimeError("调用 Anthropic 需要安装 anthropic 包: pip install anthropic")

    client = Anthropic(api_key=api_key)

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = client.messages.create(
                model=ANTHROPIC_DEFAULT_MODEL,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=temperature,
                max_tokens=4096,
            )
            return resp.content[0].text
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC * (attempt + 1))
                continue
            raise RuntimeError(f"Anthropic 调用失败: {last_error}")
