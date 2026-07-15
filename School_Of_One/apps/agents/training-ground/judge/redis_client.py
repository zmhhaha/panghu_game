"""
Redis 客户端 — 统一连接管理，同步接口

通过环境变量 REDIS_URL 连接 Redis。
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import redis

logger = logging.getLogger(__name__)

_redis: redis.Redis | None = None
SESSION_TTL = 1800  # 30 分钟无活动自动过期


def _get_url() -> str:
    return os.getenv("REDIS_URL", "")


def get_client() -> redis.Redis:
    global _redis
    if _redis is None:
        url = _get_url()
        if url:
            logger.info(f"连接 Redis: {url}")
            _redis = redis.from_url(url, decode_responses=True)
        else:
            logger.warning("REDIS_URL 未设置，使用内存存储后备")
            _redis = None
    return _redis


def is_enabled() -> bool:
    """Redis 是否可用"""
    return bool(_get_url())


def set_session(session_id: str, data: dict) -> None:
    client = get_client()
    key = f"training:session:{session_id}"
    if client:
        client.setex(key, SESSION_TTL, json.dumps(data, ensure_ascii=False))


def get_session(session_id: str, default: Any = None) -> dict | Any:
    client = get_client()
    key = f"training:session:{session_id}"
    if client:
        raw = client.get(key)
        if raw is not None:
            return json.loads(raw)
    return default


def refresh_ttl(session_id: str) -> None:
    client = get_client()
    key = f"training:session:{session_id}"
    if client:
        client.expire(key, SESSION_TTL)


def delete_session(session_id: str) -> None:
    client = get_client()
    key = f"training:session:{session_id}"
    if client:
        client.delete(key)
