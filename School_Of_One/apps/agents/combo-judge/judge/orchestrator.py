"""
编排器 (Orchestrator) — 连招可行性判定

单 Agent：分析从前一个动作到后一个动作的衔接可行性。
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from .llm import call_llm, get_provider
from .tasks import ComboInput, build_combo_prompt

logger = logging.getLogger(__name__)


@dataclass
class ComboResult:
    """连招可行性判定结果"""
    moveA: str
    moveB: str

    # 前动作结束态势
    moveA_end_state: dict = field(default_factory=dict)
    # 后动作起手要求
    moveB_requirements: dict = field(default_factory=dict)
    # 各维度评分
    feasibility_analysis: dict = field(default_factory=dict)
    # 最终可行性概率 (0.0-1.0)
    feasibility: float = 0.0
    # 难度评级
    difficulty: str = ""
    # 关键限制因素
    key_limitation: str = ""
    # 改进建议
    improvement_suggestion: str = ""


def _extract_json(text: str) -> dict:
    """从 LLM 回复中提取并解析 JSON"""
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
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"无法从 LLM 回复中提取 JSON:\n{text[:500]}")


def judge_combo(
    moveA: str,
    moveB: str,
    context: str = "",
) -> ComboResult:
    """
    分析从前一个动作到后一个动作的衔接可行性。

    Args:
        moveA: 前一个动作描述
        moveB: 后一个动作描述
        context: 可选额外上下文

    Returns:
        ComboResult 对象
    """
    inp = ComboInput(moveA=moveA, moveB=moveB, context=context)

    system_prompt, user_prompt = build_combo_prompt(inp)

    logger.info("=" * 50)
    logger.info("连招可行性判定 启动")
    logger.info(f"  前动作: {moveA}")
    logger.info(f"  后动作: {moveB}")

    raw = call_llm(system_prompt, user_prompt, temperature=0.3)

    data = _extract_json(raw)

    # 提取各字段
    feasibility = float(data.get("feasibility", 0))
    difficulty = data.get("difficulty", "")

    result = ComboResult(
        moveA=moveA,
        moveB=moveB,
        moveA_end_state=data.get("moveA_end_state", {}),
        moveB_requirements=data.get("moveB_requirements", {}),
        feasibility_analysis=data.get("feasibility_analysis", {}),
        feasibility=feasibility,
        difficulty=difficulty,
        key_limitation=data.get("key_limitation", ""),
        improvement_suggestion=data.get("improvement_suggestion", ""),
    )

    logger.info(f"连招判定完成 ✅")
    logger.info(f"  可行性: {feasibility:.2f}")
    logger.info(f"  难度: {difficulty}")
    logger.info(f"  关键限制: {result.key_limitation[:60]}...")

    return result
