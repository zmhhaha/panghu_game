"""LLM 客户端 — 统一调用接口，支持多Provider"""
import os, time
from typing import Any
from openai import OpenAI

_clients: dict[str, OpenAI] = {}
PROVIDER_CONFIGS: dict[str, dict[str, Any]] = {
    "deepseek": {"env_key": "DEEPSEEK_API_KEY", "base_url": "https://api.deepseek.com", "model": "deepseek-chat"},
    "openai": {"env_key": "OPENAI_API_KEY", "base_url": "https://api.openai.com", "model": "gpt-4o-mini"},
    "custom": {"env_key": "CUSTOM_API_KEY", "base_url_key": "CUSTOM_API_BASE", "model_key": "CUSTOM_MODEL"},
}
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
        key, base = os.getenv("DEEPSEEK_API_KEY", ""), "https://api.deepseek.com"
    elif provider == "openai":
        key, base = os.getenv("OPENAI_API_KEY", ""), "https://api.openai.com"
    elif provider == "custom":
        key, base = os.getenv("CUSTOM_API_KEY", ""), os.getenv("CUSTOM_API_BASE", "http://localhost:11434/v1")
    else:
        raise ValueError(f"不支持的 Provider: {provider}")
    ck = f"{provider}:{key[:8]}"
    if ck not in _clients:
        _clients[ck] = OpenAI(api_key=key, base_url=base)
    return _clients[ck]

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

def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> str:
    provider = get_provider()
    if provider == "anthropic":
        return _call_anthropic(system_prompt, user_prompt, temperature)
    return _call_openai_compat(system_prompt, user_prompt, temperature)

def _call_openai_compat(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> str:
    client, model = _get_client(), _get_model()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        "temperature": temperature,
    }
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return client.chat.completions.create(**kwargs).choices[0].message.content or ""
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC * (attempt + 1))
                continue
            raise RuntimeError(f"LLM 调用失败（重试 {MAX_RETRIES} 次后）: {last_error}")

def _call_anthropic(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("未设置 ANTHROPIC_API_KEY")
    try:
        from anthropic import Anthropic
    except ImportError:
        raise RuntimeError("需要安装 anthropic: pip install anthropic")
    client = Anthropic(api_key=api_key)
    for attempt in range(MAX_RETRIES + 1):
        try:
            return client.messages.create(
                model=ANTHROPIC_DEFAULT_MODEL, system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=temperature, max_tokens=4096,
            ).content[0].text
        except Exception as e:
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC * (attempt + 1))
                continue
            raise RuntimeError(f"Anthropic 调用失败: {e}")
