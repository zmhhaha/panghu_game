"""
武林对决裁决 Agent — FastAPI 服务

参照 panghu_agent `app/api/research_agent.py` 的 FastAPI 模式，
提供同步的 HTTP API 调用接口。

用法:
    uvicorn duel_judge:app --reload --port 8003
    或
    python duel_judge.py
"""

from __future__ import annotations

import os
import sys
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 确保能导入 judge 模块
sys.path.insert(0, os.path.dirname(__file__))

from judge.orchestrator import judge as run_judge
from judge.llm import _get_provider

# ── 日志 ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("duel-judge")

# ── FastAPI 应用 ──
app = FastAPI(
    title="⚔️ 武林对决裁决 Agent",
    description="输入两段武术动作描述和距离，判定对决结果。多Agent协作：招式分析师 → 对决仲裁官 → 战况叙述师",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  Schema
# ============================================================

class JudgeRequest(BaseModel):
    """对决判定请求"""
    moveA: str = Field(..., min_length=1, max_length=500, description="玩家 A 的招式描述")
    moveB: str = Field(..., min_length=1, max_length=500, description="玩家 B 的招式描述")
    distance: float = Field(..., ge=0, le=10, description="当前距离（米）")
    cardA: str | None = Field(default=None, description="可选：玩家 A 参考卡牌 ID")
    cardB: str | None = Field(default=None, description="可选：玩家 B 参考卡牌 ID")
    round: int = Field(default=1, ge=1, description="当前回合数")


class JudgeResponse(BaseModel):
    """对决判定响应 — 对应 TypeScript DuelRound 接口"""
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

    # 扩展
    explanation: str
    provider: str = Field(default="", description="当前使用的 LLM Provider")


# ============================================================
#  API Endpoints
# ============================================================

@app.get("/api/duel/health")
def health():
    """健康检查"""
    return {
        "status": "ok",
        "service": "duel-judge-agent",
        "provider": _get_provider(),
    }


@app.post("/api/duel/judge", response_model=JudgeResponse)
def judge_endpoint(req: JudgeRequest):
    """
    提交对决判定请求。

    输入双方动作描述和当前距离，返回裁决结果。
    内部使用 3 Agent Pipeline 顺序执行。
    """
    logger.info("=" * 60)
    logger.info(f"收到对决请求 [回合 {req.round}]")
    logger.info(f"  距离: {req.distance}m")
    logger.info(f"  Player A: {req.moveA}")
    logger.info(f"  Player B: {req.moveB}")

    try:
        result = run_judge(
            moveA=req.moveA,
            moveB=req.moveB,
            distance=req.distance,
            cardA=req.cardA,
            cardB=req.cardB,
            round_num=req.round,
        )

        logger.info("裁决完成 ✅")
        logger.info(f"  结果: A{'命中❤️' if result.succeededA else '未命中'}({result.damageA}伤) "
                     f"B{'命中❤️' if result.succeededB else '未命中'}({result.damageB}伤) "
                     f"→ {result.distanceAfter:.1f}m")

        return JudgeResponse(
            round=result.round,
            cardA=result.cardA,
            cardB=result.cardB,
            feasibilityA=result.feasibilityA,
            feasibilityB=result.feasibilityB,
            succeededA=result.succeededA,
            succeededB=result.succeededB,
            distanceAfter=result.distanceAfter,
            damageA=result.damageA,
            damageB=result.damageB,
            narration=result.narration,
            explanation=result.explanation,
            provider=_get_provider(),
        )

    except Exception as e:
        logger.error(f"裁决失败 ❌: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  CLI 入口
# ============================================================

def cli():
    """命令行直接调用"""
    import argparse
    import json

    parser = argparse.ArgumentParser(description="⚔️ 武林对决裁决 Agent")
    parser.add_argument("moveA", help="玩家 A 的招式描述")
    parser.add_argument("moveB", help="玩家 B 的招式描述")
    parser.add_argument("distance", type=float, help="当前距离（米）")
    parser.add_argument("--cardA", help="可选：玩家 A 的卡牌 ID")
    parser.add_argument("--cardB", help="可选：玩家 B 的卡牌 ID")
    parser.add_argument("--round", type=int, default=1, help="当前回合数")
    parser.add_argument("--pretty", action="store_true", help="JSON 美化输出")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细日志")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    result = run_judge(
        moveA=args.moveA,
        moveB=args.moveB,
        distance=args.distance,
        cardA=args.cardA,
        cardB=args.cardB,
        round_num=args.round,
    )

    indent = 2 if args.pretty else None
    print(json.dumps({
        "round": result.round,
        "cardA": result.cardA,
        "cardB": result.cardB,
        "feasibilityA": result.feasibilityA,
        "feasibilityB": result.feasibilityB,
        "succeededA": result.succeededA,
        "succeededB": result.succeededB,
        "distanceAfter": result.distanceAfter,
        "damageA": result.damageA,
        "damageB": result.damageB,
        "narration": result.narration,
        "explanation": result.explanation,
    }, ensure_ascii=False, indent=indent))


if __name__ == "__main__":
    import uvicorn

    # 检查是否有 CLI 参数
    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        cli()
    else:
        # 启动 Web 服务
        port = int(os.getenv("PORT", "8003"))
        logger.info(f"🚀 武林对决裁决 Agent 启动 (port={port})")
        uvicorn.run("duel_judge:app", host="0.0.0.0", port=port, reload=True)
