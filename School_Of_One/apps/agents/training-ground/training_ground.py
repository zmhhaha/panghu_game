"""
习武场 Agent — FastAPI 服务

玩家选择门派，在掌门大师指导下多轮优化招式描述，
最终从卡牌库中匹配最合适的招式。

API:
  GET  /api/training/factions  → 门派列表
  POST /api/training/start     → 开始习武
  POST /api/training/round     → 提交描述
  POST /api/training/match     → 最终匹配
  GET  /api/training/health    → 健康检查
"""

from __future__ import annotations

import os
import sys
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from judge.orchestrator import create_session, get_session, process_round, finalize_match
from judge.data import get_factions
from judge.llm import get_provider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("training-ground")

app = FastAPI(
    title="🥋 习武场 Agent",
    description="在各门派大师指导下，多轮优化招式描述并匹配卡牌",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  Schemas
# ============================================================

class StartRequest(BaseModel):
    factionId: str = Field(..., min_length=1, description="门派 ID")


class StartResponse(BaseModel):
    sessionId: str
    factionName: str
    masterName: str
    maxRounds: int


class RoundRequest(BaseModel):
    sessionId: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1, max_length=500)


class RoundResponse(BaseModel):
    roundNum: int
    masterFeedback: str
    matchedCardId: str
    matchedCardName: str
    confidence: float
    matchReason: str
    recommendedSubstyle: str
    completed: bool


class MatchResponse(BaseModel):
    finalCardId: str
    finalCardName: str
    finalConfidence: float
    matchExplanation: str
    masterSummary: str
    substyleName: str
    totalRounds: int
    completed: bool
    provider: str


class FactionItem(BaseModel):
    id: str
    name: str
    description: str
    playStyle: str
    strength: str
    weakness: str
    masterName: str
    startingMoveName: str
    group: str
    subStyles: list[dict]


# ============================================================
#  API Endpoints
# ============================================================

@app.get("/api/training/health")
def health():
    return {"status": "ok", "service": "training-ground-agent", "provider": get_provider()}


@app.get("/api/training/factions", response_model=list[FactionItem])
def list_factions():
    """获取所有门派列表"""
    return get_factions()


@app.post("/api/training/start", response_model=StartResponse)
def start_training(req: StartRequest):
    """开始习武 — 选择门派，创建一个新的习武会话"""
    try:
        session = create_session(req.factionId)
        return StartResponse(
            sessionId=session.session_id,
            factionName=session.faction_name,
            masterName=session.master_name,
            maxRounds=session.max_rounds,
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/training/round", response_model=RoundResponse)
def training_round(req: RoundRequest):
    """提交一轮招式描述，获得大师反馈 + 卡牌匹配"""
    session = get_session(req.sessionId)
    if not session:
        raise HTTPException(404, detail=f"会话不存在: {req.sessionId}")

    if session.completed:
        raise HTTPException(400, detail="习武已完成，请使用 /api/training/match 查看最终结果")

    if session.current_round >= session.max_rounds:
        raise HTTPException(400, detail=f"已达最大轮数 {session.max_rounds}")

    try:
        t_round = process_round(session, req.description)
        return RoundResponse(
            roundNum=t_round.round_num,
            masterFeedback=t_round.master_feedback,
            matchedCardId=t_round.matched_card_id,
            matchedCardName=t_round.matched_card_name,
            confidence=t_round.confidence,
            matchReason=t_round.match_reason,
            recommendedSubstyle=t_round.recommended_substyle,
            completed=session.completed,
        )
    except Exception as e:
        logger.error(f"处理习武回合失败: {e}", exc_info=True)
        raise HTTPException(500, detail=str(e))


@app.post("/api/training/match", response_model=MatchResponse)
def match_result(req: RoundRequest):
    """获取最终匹配结果（如果未完成，强制完成）"""
    session = get_session(req.sessionId)
    if not session:
        raise HTTPException(404, detail=f"会话不存在: {req.sessionId}")

    if not session.completed:
        try:
            finalize_match(session)
        except Exception as e:
            logger.error(f"最终匹配失败: {e}", exc_info=True)
            raise HTTPException(500, detail=str(e))

    # 从卡牌数据获取子分支信息
    substyle = ""
    if session.final_card_id:
        from judge.data import CARD_MAP
        card = CARD_MAP.get(session.final_card_id)
        if card:
            from judge.data import get_cards_by_substyle
            for f in get_factions():
                for ss in f.get("subStyles", []):
                    if ss["id"] == card.get("factionId"):
                        substyle = ss["name"]
                        break
                if substyle:
                    break

    # 生成总结
    return MatchResponse(
        finalCardId=session.final_card_id,
        finalCardName=session.final_card_name,
        finalConfidence=session.final_confidence,
        matchExplanation=session.rounds[-1].match_reason if session.rounds else "",
        masterSummary=session.master_summary,
        substyleName=substyle,
        totalRounds=len(session.rounds),
        completed=session.completed,
        provider=get_provider(),
    )


# ============================================================
#  CLI
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8005"))
    logger.info(f"🥋 习武场 Agent 启动 (port={port})")
    uvicorn.run("training_ground:app", host="0.0.0.0", port=port, reload=True)
