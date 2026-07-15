"""
编排器 (Orchestrator) — 3 Agent 顺序流水线

参照 panghu_agent `research_agent/crew.py` 的 `create_research_crew()` 模式，
将 Agent + Task 组合起来顺序执行。

Pipeline:
  招式分析师 (Move Analyst) → 对决仲裁官 (Combat Arbiter) → 战况叙述师 (Combat Narrator)

每个 Agent 的 LLM 输出解析为结构化数据，传递给 downstream Agent 的 prompt。
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from .llm import call_llm
from .agents import AgentContext
from . import tasks

logger = logging.getLogger(__name__)


# ============================================================
#  输出结构
# ============================================================

@dataclass
class JudgeResult:
    """最终裁决结果 — 对应 TypeScript DuelRound 接口"""
    round: int
    cardA: str
    cardB: str
    feasibilityA: float
    feasibilityB: float
    succeededA: bool
    succeededB: bool
    distanceAfter: float
    damageA: int
    damageB: int
    narration: str

    # 扩展字段
    explanation: str          # 判定理由
    cardsMatched: dict | None = None  # 卡牌匹配信息（扩展用）


# ============================================================
#  JSON 解析工具
# ============================================================

def _extract_json(text: str) -> dict:
    """从 LLM 回复中提取并解析 JSON"""
    text = text.strip()

    # 尝试直接解析
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # 尝试从 markdown 代码块中提取
    if "```" in text:
        # 找到第一个 { 和最后一个 }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"无法从 LLM 回复中提取 JSON:\n{text[:500]}")


# ============================================================
#  Pipeline 执行
# ============================================================

def _step_analyst(ctx: AgentContext) -> AgentContext:
    """Step 1: 招式分析师"""
    logger.info("=" * 50)
    logger.info("Step 1/3: 招式分析师 启动")
    logger.info(f"  玩家A: {ctx.moveA}")
    logger.info(f"  玩家B: {ctx.moveB}")
    logger.info(f"  距离: {ctx.distance}m")

    system_prompt, user_prompt = tasks.build_analyst_prompt(ctx)

    temperature = 0.4  # 分析用低温度保证准确性
    raw = call_llm(system_prompt, user_prompt, temperature=temperature)

    # 解析并验证 JSON
    analysis = _extract_json(raw)
    ctx.analysisA = json.dumps(analysis.get("playerA", {}), ensure_ascii=False, indent=2)
    ctx.analysisB = json.dumps(analysis.get("playerB", {}), ensure_ascii=False, indent=2)

    logger.info("招式分析完成 ✅")
    logger.debug(f"Player A 分析: {ctx.analysisA}")
    logger.debug(f"Player B 分析: {ctx.analysisB}")

    return ctx


def _step_arbiter(ctx: AgentContext) -> AgentContext:
    """Step 2: 对决仲裁官"""
    logger.info("=" * 50)
    logger.info("Step 2/3: 对决仲裁官 启动")
    logger.info(f"  基于分析结果进行裁决...")

    system_prompt, user_prompt = tasks.build_arbiter_prompt(ctx)

    temperature = 0.3  # 裁决用更低温度保证稳定性
    raw = call_llm(system_prompt, user_prompt, temperature=temperature)

    # 解析并验证 JSON
    verdict = _extract_json(raw)

    # 验证必要字段
    required = ["feasibilityA", "feasibilityB", "succeededA", "succeededB",
                 "damageA", "damageB", "distanceAfter", "explanation"]
    for field in required:
        if field not in verdict:
            logger.warning(f"裁决结果缺少字段: {field}")

    ctx.verdict = json.dumps(verdict, ensure_ascii=False, indent=2)

    logger.info(f"对决裁决完成 ✅")
    logger.info(f"  可行性: A={verdict.get('feasibilityA','?')}  B={verdict.get('feasibilityB','?')}")
    logger.info(f"  命中: A={verdict.get('succeededA','?')}  B={verdict.get('succeededB','?')}")
    logger.info(f"  伤害: A={verdict.get('damageA','?')}  B={verdict.get('damageB','?')}")
    logger.info(f"  新距离: {verdict.get('distanceAfter','?')}m")

    return ctx


def _step_narrator(ctx: AgentContext) -> AgentContext:
    """Step 3: 战况叙述师"""
    logger.info("=" * 50)
    logger.info("Step 3/3: 战况叙述师 启动")

    system_prompt, user_prompt = tasks.build_narrator_prompt(ctx)

    temperature = 0.7  # 叙述用较高温度增加文采
    narration = call_llm(system_prompt, user_prompt, temperature=temperature)

    # 清理叙述文本
    narration = narration.strip()
    if narration.startswith('"') and narration.endswith('"'):
        narration = narration[1:-1]
    if narration.startswith("```"):
        narration = narration.split("\n", 1)[-1]
        narration = narration.rsplit("```", 1)[0]
        narration = narration.strip()

    ctx.narration = narration

    logger.info(f"战况叙述完成 ✅")
    logger.info(f"  描述: {narration[:80]}...")

    return ctx


# ============================================================
#  API 入口函数
# ============================================================

def judge(
    moveA: str,
    moveB: str,
    distance: float,
    cardA: str | None = None,
    cardB: str | None = None,
    round_num: int = 1,
) -> JudgeResult:
    """
    执行完整的对决裁决流程。

    Args:
        moveA: 玩家 A 的动作描述
        moveB: 玩家 B 的动作描述
        distance: 当前距离
        cardA: 可选，玩家 A 的参考卡牌 ID
        cardB: 可选，玩家 B 的参考卡牌 ID
        round_num: 当前回合数

    Returns:
        JudgeResult 对象
    """
    # 构建上下文
    ctx = AgentContext(
        moveA=moveA,
        moveB=moveB,
        distance=distance,
        cardA=cardA,
        cardB=cardB,
    )

    # 顺序执行 3 个 Agent（同 crew.py 的 Process.sequential）
    ctx = _step_analyst(ctx)
    ctx = _step_arbiter(ctx)
    ctx = _step_narrator(ctx)

    # 解析裁决结果
    verdict = json.loads(ctx.verdict)

    return JudgeResult(
        round=round_num,
        cardA=ctx.moveA,
        cardB=ctx.moveB,
        feasibilityA=float(verdict.get("feasibilityA", 0)),
        feasibilityB=float(verdict.get("feasibilityB", 0)),
        succeededA=bool(verdict.get("succeededA", False)),
        succeededB=bool(verdict.get("succeededB", False)),
        distanceAfter=float(verdict.get("distanceAfter", ctx.distance)),
        damageA=int(verdict.get("damageA", 0)),
        damageB=int(verdict.get("damageB", 0)),
        narration=ctx.narration,
        explanation=verdict.get("explanation", ""),
    )
