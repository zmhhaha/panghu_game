"""
招式连招可行性判定 Agent — FastAPI 服务

输入前一个动作和后一个动作，输出衔接可行性评分和分析。
"""

from __future__ import annotations

import os
import sys
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from judge.orchestrator import judge_combo
from judge.llm import get_provider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("combo-judge")

app = FastAPI(
    title="🥋 招式连招可行性判定 Agent",
    description="输入前一个动作和后一个动作，分析衔接可行性。",
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

class ComboRequest(BaseModel):
    moveA: str = Field(..., min_length=1, max_length=500, description="前一个动作描述")
    moveB: str = Field(..., min_length=1, max_length=500, description="后一个动作描述")
    context: str = Field(default="", max_length=500, description="可选额外上下文")


class ComboResponse(BaseModel):
    moveA: str
    moveB: str
    feasibility: float
    difficulty: str
    key_limitation: str
    improvement_suggestion: str
    analysis: dict
    provider: str = ""


# ============================================================
#  API Endpoints
# ============================================================

@app.get("/api/combo/health")
def health():
    return {"status": "ok", "service": "combo-judge-agent", "provider": get_provider()}


@app.post("/api/combo/judge", response_model=ComboResponse)
def combo_endpoint(req: ComboRequest):
    """提交连招可行性判定"""
    logger.info(f"收到连招判定请求")
    logger.info(f"  前动作: {req.moveA}")
    logger.info(f"  后动作: {req.moveB}")

    try:
        result = judge_combo(moveA=req.moveA, moveB=req.moveB, context=req.context)

        # 将所有分析数据打包
        analysis = {
            "moveA_end_state": result.moveA_end_state,
            "moveB_requirements": result.moveB_requirements,
            "feasibility_analysis": result.feasibility_analysis,
        }

        return ComboResponse(
            moveA=result.moveA,
            moveB=result.moveB,
            feasibility=result.feasibility,
            difficulty=result.difficulty,
            key_limitation=result.key_limitation,
            improvement_suggestion=result.improvement_suggestion,
            analysis=analysis,
            provider=get_provider(),
        )

    except Exception as e:
        logger.error(f"连招判定失败 ❌: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  CLI
# ============================================================

def cli():
    import argparse
    import json

    parser = argparse.ArgumentParser(description="🥋 招式连招可行性判定")
    parser.add_argument("moveA", help="前一个动作描述")
    parser.add_argument("moveB", help="后一个动作描述")
    parser.add_argument("--context", default="", help="额外上下文")
    parser.add_argument("--pretty", action="store_true", help="JSON 美化输出")
    args = parser.parse_args()

    result = judge_combo(moveA=args.moveA, moveB=args.moveB, context=args.context)

    output = {
        "moveA": result.moveA,
        "moveB": result.moveB,
        "feasibility": result.feasibility,
        "difficulty": result.difficulty,
        "key_limitation": result.key_limitation,
        "improvement_suggestion": result.improvement_suggestion,
        "analysis": {
            "moveA_end_state": result.moveA_end_state,
            "moveB_requirements": result.moveB_requirements,
            "feasibility_analysis": result.feasibility_analysis,
        },
    }
    print(json.dumps(output, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    import uvicorn

    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        cli()
    else:
        port = int(os.getenv("PORT", "8004"))
        logger.info(f"🥋 连招可行性判定 Agent 启动 (port={port})")
        uvicorn.run("combo_judge:app", host="0.0.0.0", port=port, reload=True)
