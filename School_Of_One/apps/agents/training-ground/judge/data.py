"""
武术门派与卡牌数据 — 启动时从 Node.js Server 同步

通过 HTTP 从 Server 的 /api/v1/factions 和 /api/v1/cards/preset 拉取，
确保 Python AI Agent 与 TypeScript 源码的数据始终一致。

环境变量:
  SERVER_URL — Server 地址（默认 http://server-service:3001）
"""

from __future__ import annotations

import json
import logging
import os
import urllib.request
import urllib.error
from typing import Any

logger = logging.getLogger(__name__)

SERVER_URL = os.getenv("SERVER_URL", "http://server-service:3001")
RELOAD_INTERVAL = int(os.getenv("DATA_RELOAD_INTERVAL", "300"))  # 5 分钟自动刷新

# ── 模块级缓存 ──────────────────────────────────────────

FACTIONS: list[dict[str, Any]] = []
FACTION_MAP: dict[str, dict[str, Any]] = {}
PRESET_CARDS: list[dict[str, Any]] = []
CARD_MAP: dict[str, dict[str, Any]] = {}
_loaded = False


# ── HTTP 工具 ───────────────────────────────────────────

def _http_get(url: str, timeout: int = 5) -> Any:
    """GET 请求 + JSON 解析"""
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


# ── 数据加载 ────────────────────────────────────────────

def _load() -> None:
    """从 Server 拉取门派 + 卡牌数据，失败时静默保留上次加载的数据。"""
    global FACTIONS, FACTION_MAP, PRESET_CARDS, CARD_MAP, _loaded

    factions_url = f"{SERVER_URL}/api/v1/factions"
    cards_url = f"{SERVER_URL}/api/v1/cards/preset"

    try:
        factions_data = _http_get(factions_url)
        raw_factions = factions_data["factions"]

        # 补充 Python 侧需要的 masterPersonality（Server /api/v1/factions 已包含）
        FACTIONS = raw_factions
        FACTION_MAP = {f["id"]: f for f in FACTIONS}

        cards_data = _http_get(cards_url)
        raw_cards = cards_data["cards"]

        PRESET_CARDS = raw_cards
        CARD_MAP = {c["id"]: c for c in PRESET_CARDS}

        _loaded = True
        logger.info(f"数据加载成功: {len(FACTIONS)} 门派, {len(PRESET_CARDS)} 张卡牌 (来自 {SERVER_URL})")
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, json.JSONDecodeError) as e:
        if _loaded:
            logger.warning(f"刷新数据失败，继续使用缓存: {e}")
        else:
            logger.error(f"首次加载数据失败，习武场可能无法正常工作: {e}")
            raise


def ensure_loaded() -> None:
    """确保数据已加载（对外部调用透明）。"""
    if not _loaded:
        _load()


# ── 兼容旧接口（保持 import 不变即可使用） ──────────────


def get_factions() -> list[dict[str, Any]]:
    """获取所有门派列表（不含 masterPersonality 简化版）"""
    ensure_loaded()
    return [{k: v for k, v in f.items() if k != "masterPersonality"} for f in FACTIONS]


def get_faction(faction_id: str) -> dict[str, Any] | None:
    """获取单个门派"""
    ensure_loaded()
    return FACTION_MAP.get(faction_id)


def get_cards_by_faction(faction_id: str) -> list[dict[str, Any]]:
    """获取某个门派下的所有卡牌"""
    ensure_loaded()
    faction = FACTION_MAP.get(faction_id)
    substyle_ids = {s["id"] for s in faction.get("subStyles", [])} if faction else set()
    return [c for c in PRESET_CARDS
            if c["factionId"] == faction_id or c["factionId"] in substyle_ids]


def get_cards_by_substyle(substyle_id: str) -> list[dict[str, Any]]:
    """获取某个分支下的所有卡牌"""
    ensure_loaded()
    return [c for c in PRESET_CARDS if c["factionId"] == substyle_id]


def search_cards_by_keywords(keywords: list[str]) -> list[dict[str, Any]]:
    """按关键词搜索卡牌"""
    ensure_loaded()
    kws = set(k.lower() for k in keywords)
    return sorted(
        (c for c in PRESET_CARDS if kws & set(k.lower() for k in c.get("keywords", []))),
        key=lambda c: -len(kws & set(k.lower() for k in c.get("keywords", []))),
    )


def reload() -> None:
    """强制重新加载（供 on_event("startup") 调用）。"""
    global _loaded
    _loaded = False
    _load()


# ==================== 工具函数 ====================

def get_factions() -> list[dict]:
    """获取所有门派列表（不含 masterPersonality 简化版）"""
    return [
        {k: v for k, v in f.items() if k != "masterPersonality"}
        for f in FACTIONS
    ]


def get_faction(faction_id: str) -> dict | None:
    """获取单个门派"""
    for f in FACTIONS:
        if f["id"] == faction_id:
            return f
    return None


def get_cards_by_faction(faction_id: str) -> list[dict]:
    """获取某个门派下的所有卡牌"""
    return [c for c in PRESET_CARDS if c["factionId"] == faction_id or
            any(s["id"] == faction_id for s in FACTION_MAP.get(faction_id, {}).get("subStyles", []))]


def get_cards_by_substyle(substyle_id: str) -> list[dict]:
    """获取某个分支下的所有卡牌"""
    return [c for c in PRESET_CARDS if c["factionId"] == substyle_id]


def search_cards_by_keywords(keywords: list[str]) -> list[dict]:
    """按关键词搜索卡牌"""
    results = []
    kws = set(k.lower() for k in keywords)
    for c in PRESET_CARDS:
        card_kws = set(k.lower() for k in c.get("keywords", []))
        if kws & card_kws:
            results.append(c)
    return sorted(results, key=lambda c: -len(kws & set(k.lower() for k in c.get("keywords", []))))
