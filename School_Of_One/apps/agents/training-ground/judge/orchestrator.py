"""
编排器 — 习武场多轮对话引擎

每轮执行：大师反馈 + 卡牌语义匹配
最多 5 轮，confidence > 0.7 可提前结束

Session 存储通过 Redis（环境变量 REDIS_URL）
Redis 不可用时兜底回退到内存存储
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any

from .llm import call_llm
from .data import get_faction, get_cards_by_substyle
from .agents import get_master
from . import tasks
from . import redis_client as rds

logger = logging.getLogger(__name__)


# ============================================================
#  数据类
# ============================================================

@dataclass
class TrainingRound:
    """一轮习武记录"""
    round_num: int
    student_description: str
    master_feedback: str
    matched_card_id: str
    matched_card_name: str
    confidence: float
    match_reason: str
    recommended_substyle: str
    recommended_substyle_id: str


@dataclass
class TrainingSession:
    """一次习武会话"""
    session_id: str
    faction_id: str
    faction_name: str
    master_name: str
    rounds: list[TrainingRound] = field(default_factory=list)
    started_at: float = 0.0
    current_round: int = 0
    max_rounds: int = 5
    completed: bool = False
    final_card_id: str = ""
    final_card_name: str = ""
    final_confidence: float = 0.0
    master_summary: str = ""

    @property
    def history_text(self) -> str:
        lines = []
        for r in self.rounds:
            lines.append(f"\n--- 第{r.round_num}轮 ---")
            lines.append(f"弟子描述：{r.student_description}")
            lines.append(f"大师反馈：{r.master_feedback}")
            if r.matched_card_name:
                lines.append(f"匹配招式：{r.matched_card_name}（confidence: {r.confidence:.2f}）")
        return "\n".join(lines) if lines else "暂无历史"


# ============================================================
#  Session 序列化 / 反序列化
# ============================================================

def _session_to_dict(s: TrainingSession) -> dict:
    """TrainingSession → dict（存 Redis）"""
    return {
        "session_id": s.session_id,
        "faction_id": s.faction_id,
        "faction_name": s.faction_name,
        "master_name": s.master_name,
        "rounds": [asdict(r) for r in s.rounds],
        "started_at": s.started_at,
        "current_round": s.current_round,
        "max_rounds": s.max_rounds,
        "completed": s.completed,
        "final_card_id": s.final_card_id,
        "final_card_name": s.final_card_name,
        "final_confidence": s.final_confidence,
        "master_summary": s.master_summary,
    }


def _session_from_dict(d: dict) -> TrainingSession:
    """dict → TrainingSession"""
    rounds_data = d.pop("rounds", [])
    s = TrainingSession(**d)
    s.rounds = [TrainingRound(**r) for r in rounds_data]
    return s


# ============================================================
#  Session 存储（Redis / 内存回退）
# ============================================================

_fallback_store: dict[str, TrainingSession] = {}


def _save_session(s: TrainingSession) -> None:
    """持久化 session 到 Redis（或内存回退）"""
    if rds.is_enabled():
        rds.set_session(s.session_id, _session_to_dict(s))
    else:
        _fallback_store[s.session_id] = s
    # 每次写入后刷新过期时间
    if rds.is_enabled():
        rds.refresh_ttl(s.session_id)


def _load_session(session_id: str) -> TrainingSession | None:
    """从 Redis（或内存回退）加载 session"""
    if rds.is_enabled():
        data = rds.get_session(session_id)
        if data:
            return _session_from_dict(data)
        return None
    return _fallback_store.get(session_id)


# ============================================================
#  公开 API
# ============================================================

def create_session(faction_id: str) -> TrainingSession:
    """创建新的习武会话"""
    faction = get_faction(faction_id)
    if not faction:
        raise ValueError(f"未找到门派: {faction_id}")

    session = TrainingSession(
        session_id=str(uuid.uuid4())[:8],
        faction_id=faction_id,
        faction_name=faction["name"],
        master_name=faction["masterName"],
        started_at=time.time(),
    )
    _save_session(session)
    logger.info(f"创建习武会话: {session.session_id} @ {faction['name']} "
                f"(存储: {'Redis' if rds.is_enabled() else '内存'})")
    return session


def get_session(session_id: str) -> TrainingSession | None:
    """获取习武会话"""
    return _load_session(session_id)


def _build_substyle_info(faction_id: str) -> str:
    """构建子分支信息文本"""
    faction = get_faction(faction_id)
    if not faction:
        return ""
    lines = []
    for ss in faction.get("subStyles", []):
        cards = get_cards_by_substyle(ss["id"])
        card_names = ", ".join(c["name"] for c in cards[:5])
        lines.append(f"- {ss['name']}（{ss['description']}）代表招式：{card_names}...")
    return "\n".join(lines)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    if "```" in text:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start: end + 1])
            except json.JSONDecodeError:
                pass
    raise ValueError(f"无法从 LLM 回复中提取 JSON:\n{text[:500]}")


def process_round(session: TrainingSession, student_description: str) -> TrainingRound:
    """处理一轮习武对话"""
    if session.current_round >= session.max_rounds:
        raise RuntimeError(f"已达最大轮数 {session.max_rounds}")

    session.current_round += 1
    round_num = session.current_round

    master = get_master(session.faction_id)
    faction = get_faction(session.faction_id)
    if not master or not faction:
        raise ValueError(f"未找到门派或大师: {session.faction_id}")

    substyle_info = _build_substyle_info(session.faction_id)

    logger.info(f"--- 习武第 {round_num} 轮 ---")
    logger.info(f"  描述: {student_description[:60]}...")

    system_prompt = tasks.build_feedback_system(
        master_personality=faction.get("masterPersonality", ""),
        faction_name=session.faction_name,
        master_name=session.master_name,
        substyle_info=substyle_info,
    )
    user_prompt = tasks.build_feedback_user(
        faction_name=session.faction_name,
        round_num=round_num,
        prev_count=len(session.rounds),
        history=session.history_text,
        student_description=student_description,
        master_name=session.master_name,
    )

    raw = call_llm(system_prompt, user_prompt, temperature=0.6)
    data = _extract_json(raw)

    t_round = TrainingRound(
        round_num=round_num,
        student_description=student_description,
        master_feedback=data.get("master_feedback", "（大师正在思考...）"),
        matched_card_id=data.get("matched_card_id", ""),
        matched_card_name=data.get("matched_card_name", ""),
        confidence=float(data.get("confidence", 0)),
        match_reason=data.get("match_reason", ""),
        recommended_substyle=data.get("recommended_substyle", ""),
        recommended_substyle_id=data.get("recommended_substyle_id", ""),
    )

    session.rounds.append(t_round)

    # 持久化（每次轮次后立即写入 Redis）
    _save_session(session)

    logger.info(f"  大师反馈: {t_round.master_feedback[:50]}...")
    logger.info(f"  匹配: {t_round.matched_card_name} (confidence={t_round.confidence:.2f})")

    if t_round.confidence > 0.7:
        session.completed = True
        session.final_card_id = t_round.matched_card_id
        session.final_card_name = t_round.matched_card_name
        session.final_confidence = t_round.confidence
        _save_session(session)
        logger.info(f"  ✅ confidence > 0.7，自动完成匹配")

    return t_round


def finalize_match(session: TrainingSession) -> dict:
    """最终匹配 — 基于全部对话历史给出最终卡牌"""
    system_prompt = tasks.build_final_match_system()
    user_prompt = tasks.build_final_match_user(
        total_rounds=len(session.rounds),
        full_history=session.history_text,
    )

    logger.info(f"--- 最终匹配 ---")
    raw = call_llm(system_prompt, user_prompt, temperature=0.3)
    data = _extract_json(raw)

    session.final_card_id = data.get("final_card_id", session.final_card_id)
    session.final_card_name = data.get("final_card_name", session.final_card_name)
    session.final_confidence = float(data.get("final_confidence", session.final_confidence))
    session.master_summary = data.get("master_summary", "")
    session.completed = True

    _save_session(session)

    logger.info(f"  最终匹配: {session.final_card_name} (confidence={session.final_confidence:.2f})")

    return data
