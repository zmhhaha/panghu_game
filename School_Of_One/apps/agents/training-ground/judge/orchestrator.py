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
    training_type: str = "faction"  # "faction" | "hermit"
    rounds: list[TrainingRound] = field(default_factory=list)
    started_at: float = 0.0
    current_round: int = 0
    max_rounds: int = 5
    completed: bool = False
    final_card_id: str = ""
    final_card_name: str = ""
    final_confidence: float = 0.0
    master_summary: str = ""
    # hermit 模式字段
    card_description: str = ""
    card_displacement: float = 0.0

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
        "training_type": s.training_type,
        "card_description": s.card_description,
        "card_displacement": s.card_displacement,
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


def create_hermit_session() -> TrainingSession:
    """创建世外高人习武会话"""
    session = TrainingSession(
        session_id=str(uuid.uuid4())[:8],
        faction_id="hermit",
        faction_name="世外高人",
        master_name="世外高人",
        training_type="hermit",
        started_at=time.time(),
    )
    _save_session(session)
    logger.info(f"创建世外高人会话: {session.session_id}")
    return session


def get_session(session_id: str) -> TrainingSession | None:
    """获取习武会话"""
    return _load_session(session_id)


def _build_substyle_info(faction_id: str) -> str:
    """构建子分支信息文本（含卡牌 ID，供 LLM 返回真实 ID）"""
    faction = get_faction(faction_id)
    if not faction:
        return ""
    lines = []
    for ss in faction.get("subStyles", []):
        cards = get_cards_by_substyle(ss["id"])
        card_infos = ", ".join(f"{c['name']}(id={c['id']})" for c in cards)
        lines.append(f"- {ss['name']}（{ss['description']}）招式：{card_infos}")
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

    logger.info(f"--- {'世外高人' if session.training_type == 'hermit' else '习武'}第 {round_num} 轮 ---")
    logger.info(f"  描述: {student_description[:60]}...")

    if session.training_type == "hermit":
        # 世外高人：引导用户细化描述，不匹配卡牌
        system_prompt = tasks.build_hermit_system()
        user_prompt = tasks.build_hermit_user(
            round_num=round_num,
            prev_count=len(session.rounds),
            history=session.history_text,
            student_description=student_description,
        )

        raw = call_llm(system_prompt, user_prompt, temperature=0.7)
        data = _extract_json(raw)

        t_round = TrainingRound(
            round_num=round_num,
            student_description=student_description,
            master_feedback=data.get("master_feedback", "（高人正在思考...）"),
            matched_card_id="",
            matched_card_name="",
            confidence=0.0,
            match_reason="",
            recommended_substyle="",
            recommended_substyle_id="",
        )

        session.rounds.append(t_round)
        _save_session(session)

    else:
        master = get_master(session.faction_id)
        faction = get_faction(session.faction_id)
        if not master or not faction:
            raise ValueError(f"未找到门派或大师: {session.faction_id}")

        substyle_info = _build_substyle_info(session.faction_id)

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

        if t_round.confidence > 0.7:
            session.completed = True
            session.final_card_id = t_round.matched_card_id
            session.final_card_name = t_round.matched_card_name
            session.final_confidence = t_round.confidence
            logger.info(f"  ✅ confidence > 0.7，自动完成匹配")

        session.rounds.append(t_round)
        _save_session(session)

    return t_round


def _build_card_catalog(faction_id: str) -> str:
    """构建卡牌目录文本（含 ID）"""
    faction = get_faction(faction_id)
    if not faction:
        return ""
    lines = []
    for ss in faction.get("subStyles", []):
        cards = get_cards_by_substyle(ss["id"])
        if cards:
            lines.append(f"【{ss['name']}】")
            for c in cards:
                lines.append(f"  {c['name']}（id={c['id']}）")
    return "\n".join(lines)


def finalize_match(session: TrainingSession) -> dict:
    """最终匹配 — 基于全部对话历史给出最终卡牌"""
    card_catalog = _build_card_catalog(session.faction_id)

    system_prompt = tasks.build_final_match_system()
    user_prompt = tasks.build_final_match_user(
        total_rounds=len(session.rounds),
        full_history=session.history_text,
        card_catalog=card_catalog,
    )

    logger.info(f"--- 最终匹配 ---")
    raw = call_llm(system_prompt, user_prompt, temperature=0.3)
    data = _extract_json(raw)

    final_confidence = float(data.get("final_confidence", 0))
    session.final_confidence = final_confidence
    session.master_summary = data.get("master_summary", "")
    session.completed = True

    # 只有 confidence >= 0.7 才算真正匹配上
    if final_confidence >= 0.7:
        session.final_card_id = data.get("final_card_id", session.final_card_id)
        session.final_card_name = data.get("final_card_name", session.final_card_name)
        data["matched"] = True
        logger.info(f"  ✅ 最终匹配: {session.final_card_name} (confidence={final_confidence:.2f})")
    else:
        session.final_card_id = ""
        session.final_card_name = ""
        data["matched"] = False
        logger.info(f"  ❌ 匹配不达标: confidence={final_confidence:.2f} < 0.7，未获得招式")

    _save_session(session)

    return data


def finalize_hermit(session: TrainingSession) -> dict:
    """世外高人 — 基于全部对话生成自定义卡牌"""
    system_prompt = tasks.build_hermit_finalize_system()
    user_prompt = tasks.build_hermit_finalize_user(
        total_rounds=len(session.rounds),
        full_history=session.history_text,
    )

    logger.info(f"--- 世外高人最终生成 ---")
    raw = call_llm(system_prompt, user_prompt, temperature=0.4)
    data = _extract_json(raw)

    is_reasonable = data.get("is_reasonable", False) and data.get("has_sufficient_detail", False)
    session.final_confidence = 1.0 if is_reasonable else 0.0
    session.card_description = data.get("card_description", "")
    session.card_displacement = float(data.get("displacement", 0.3))
    session.master_summary = data.get("master_summary", "")
    session.completed = True

    if is_reasonable:
        session.final_card_id = "hermit-placeholder"
        session.final_card_name = data.get("card_name", "自创招式")
        data["matched"] = True
        logger.info(f"  ✅ 世外高人: {session.final_card_name}")
    else:
        session.final_card_id = ""
        session.final_card_name = ""
        data["matched"] = False
        logger.info(f"  ❌ 世外高人: 描述不够具体，未生成卡牌")

    _save_session(session)
    return data


