import { PresetCard, DuelEngine, getAllPresetCards } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";
import { api } from "@school-of-one/api-client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";

type DuelPhase = "selecting" | "result" | "finished";

interface DuelPlayer {
  name: string;
  hearts: number;
  lastCard: PresetCard | null;
  currentCard: PresetCard | null;
}

/** 从卡牌 description 截取前 200 字 */
function cardToMoveDescription(card: PresetCard): string {
  const desc = card.description || card.name;
  return desc.length > 200 ? desc.slice(0, 200) + "…" : desc;
}

const allPresetCards = getAllPresetCards() as PresetCard[];

function drawFromDeck(deckIds: string[]): PresetCard[] {
  const pool = deckIds
    .map((id) => allPresetCards.find((c) => c.id === id))
    .filter((c): c is PresetCard => !!c);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
}

/** 从 localStorage 读取卡组（兼容新旧格式） */
function loadDeck(): { starterId: string | null; normalIds: string[] } {
  try {
    const raw = localStorage.getItem("duelDeck");
    if (!raw) return { starterId: null, normalIds: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 旧格式：纯 string[]
      return { starterId: null, normalIds: parsed };
    }
    return {
      starterId: parsed.starterId ?? null,
      normalIds: Array.isArray(parsed.normalIds) ? parsed.normalIds : [],
    };
  } catch {
    return { starterId: null, normalIds: [] };
  }
}

export function DuelPage() {
  const { starterId: rawStarter, normalIds: rawNormals } = useMemo(() => loadDeck(), []);
  const starterId = useMemo(
    () => rawStarter ?? rawNormals.find((id) => allPresetCards.find((c) => c.id === id)?.isStarter) ?? null,
    [rawStarter, rawNormals],
  );
  const deckNormalIds = useMemo(() => {
    // 如果起手式混在 normalIds 里，剔除出去
    const starter = rawStarter ?? rawNormals.find((id) => allPresetCards.find((c) => c.id === id)?.isStarter);
    return rawNormals.filter((id) => id !== starter);
  }, [rawNormals, rawStarter]);
  const deckValid = useMemo(
    () => starterId !== null && deckNormalIds.length >= 14 && deckNormalIds.length <= 29,
    [starterId, deckNormalIds],
  );

  // 如果卡组不合法，显示提示页面
  if (!deckValid) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24 }}>
           比武场
        </h2>
        <div style={{ fontSize: 14, color: "#8B7D6B", marginBottom: 16 }}>
          需要一套有效的卡组才能比武
        </div>
        <div style={{ fontSize: 12, color: "#5a4a3a", marginBottom: 24 }}>
          请先在演武场配好卡组（1 张起手式 + 14~29 张招式卡牌）
        </div>
        <a
          href="/deck"
          style={{
            display: "inline-block", padding: "10px 32px", fontSize: 14,
            border: "2px solid #d4a373", borderRadius: 8,
            background: "#4E342E", color: "#f5e6c8",
            textDecoration: "none", fontFamily: "inherit",
          }}
        >
          去组卡
        </a>
      </div>
    );
  }

  return <DuelArena starterId={starterId!} normalIds={deckNormalIds} />;
}

function DuelArena({ starterId, normalIds }: { starterId: string; normalIds: string[] }) {
  const [phase, setPhase] = useState<DuelPhase>("selecting");
  const [distance, setDistance] = useState(2.0);
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [engine, setEngine] = useState<DuelEngine | null>(null);
  const [playerHand, setPlayerHand] = useState<PresetCard[]>([]);
  const [player] = useState<DuelPlayer>({
    name: "玩家", hearts: 10, lastCard: null, currentCard: null,
  });
  const [ai] = useState<DuelPlayer>({
    name: "AI", hearts: 10, lastCard: null, currentCard: null,
  });
  const [isFall, setIsFall] = useState(false);

  // 换牌
  const [mulliganCount, setMulliganCount] = useState(2);
  const MAX_MULLIGAN = 2;

  // 连招评分
  const [comboScores, setComboScores] = useState<Record<string, { feasibility: number; difficulty: string } | null>>({});
  const [comboLoading, setComboLoading] = useState(false);
  const lastPlayedCardRef = useRef<PresetCard | null>(null);

  // AI 手牌用全量卡池（AI 不受卡组限制）
  const aiHandRef = useRef<PresetCard[]>([]);

  // ── 初始化 ──
  useEffect(() => {
    const startCard = allPresetCards.find((c) => c.id === starterId);
    if (!startCard) return;

    const aiId = allPresetCards
      .filter((c) => c.isStarter && c.id !== starterId)
      .sort(() => Math.random() - 0.5)[0]?.id ?? starterId;
    const aiStartCard = allPresetCards.find((c) => c.id === aiId) ?? startCard;

    const eng = new DuelEngine("player", "ai", starterId, aiId);
    setEngine(eng);

    setPlayerHand(drawFromDeck(normalIds));
    setDistance(2.0);
    setRound(0);
    setIsFall(false);
    player.hearts = 10;
    ai.hearts = 10;
    player.lastCard = null;
    ai.lastCard = null;
    aiHandRef.current = drawFromDeck(
      allPresetCards.filter((c) => !c.isStarter).map((c) => c.id),
    );
    // 起手式作为上一招的基准
    lastPlayedCardRef.current = startCard;

    setLog([
      `比武开始！双方相距 2米\n甲摆出【${startCard.name}】（起手式）\n乙摆出【${aiStartCard.name}】（起手式）`,
    ]);
    setPhase("selecting");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canPlayCard = (card: PresetCard) => {
    if (!engine) return false;
    return card.displacement <= distance;
  };

  /** 换牌 */
  const mulligan = () => {
    if (mulliganCount <= 0) return;
    setPlayerHand(drawFromDeck(normalIds));
    setMulliganCount((c) => c - 1);
    setLog((prev) => [`换牌（剩余 ${mulliganCount - 1} 次）`, ...prev]);
  };

  /** 跳过回合 */
  const skipTurn = async () => {
    if (!engine) return;
    setPhase("result");

    const aiCard = engine.pickAICard(aiHandRef.current);
    aiHandRef.current = drawFromDeck(
      allPresetCards.filter((c) => !c.isStarter).map((c) => c.id),
    );

    // 放弃回合：退回起手式姿态
    const startCard = allPresetCards.find((c) => c.id === starterId);
    if (!startCard) return;

    let msg: string;
    try {
      const verdict = await api.duel.judge({
        moveA: `[放弃进攻，退回起手式] ${cardToMoveDescription(startCard)}`,
        moveB: cardToMoveDescription(aiCard),
        distance: distance,
        cardA: startCard.name,
        cardB: aiCard.name,
        round: round + 1,
      });
      const { newState } = engine.applyExternalVerdict(startCard, aiCard, {
        feasibilityA: verdict.feasibilityA,
        feasibilityB: verdict.feasibilityB,
        succeededA: verdict.succeededA,
        succeededB: verdict.succeededB,
        damageA: verdict.damageA,
        damageB: verdict.damageB,
        distanceAfter: verdict.distanceAfter,
        narration: verdict.narration,
      });
      setDistance(newState.distance);
      setRound(newState.round);
      player.hearts = newState.heartsA;
      ai.hearts = newState.heartsB;
      ai.currentCard = aiCard;
      ai.lastCard = aiCard;
      // 放弃回合退回起手式，后续连招以起手式为基准
      lastPlayedCardRef.current = startCard;
      msg = `第${newState.round}回合：甲放弃进攻退回起手式\n${verdict.narration}\n${verdict.succeededB ? `乙命中甲，造成${verdict.damageB}点伤害。` : "乙未命中。"}`;
    } catch {
      const { result, newState } = engine.skipTurn(aiCard);
      setDistance(newState.distance);
      setRound(newState.round);
      player.hearts = newState.heartsA;
      ai.hearts = newState.heartsB;
      ai.currentCard = aiCard;
      ai.lastCard = aiCard;
      lastPlayedCardRef.current = startCard;
    }
    setLog((prev) => [msg, ...prev]);
    setPlayerHand(drawFromDeck(normalIds));
    setMulliganCount(MAX_MULLIGAN);
    setTimeout(() => {
      setIsFall(false);
      setPhase("selecting");
    }, 2000);
  };

  // ── 选牌时连招判定（以上一张打出的牌或起手式为基准） ──
  useEffect(() => {
    if (phase !== "selecting" || !lastPlayedCardRef.current) {
      setComboScores({});
      return;
    }

    const prevCard = lastPlayedCardRef.current;
    let cancelled = false;

    const judgeAll = async () => {
      setComboLoading(true);
      const scores: Record<string, { feasibility: number; difficulty: string } | null> = {};

      const results = await Promise.allSettled(
        playerHand.map(async (card) => {
          const res = await api.combo.judge({
            moveA: cardToMoveDescription(prevCard),
            moveB: cardToMoveDescription(card),
            context: `当前距离 ${distance.toFixed(1)}m，上一招是「${prevCard.name}」。`,
          });
          return { cardId: card.id, feasibility: res.feasibility, difficulty: res.difficulty };
        }),
      );

      if (cancelled) return;

      for (const r of results) {
        if (r.status === "fulfilled") {
          scores[r.value.cardId] = { feasibility: r.value.feasibility, difficulty: r.value.difficulty };
        }
      }
      setComboScores(scores);
      setComboLoading(false);
    };

    judgeAll();
    return () => { cancelled = true; };
  }, [playerHand, phase, distance]);

  // ── 出牌 ──
  const playCard = async (card: PresetCard) => {
    if (!engine || !canPlayCard(card)) return;

    setPhase("result");

    const aiCard = engine.pickAICard(aiHandRef.current);
    aiHandRef.current = drawFromDeck(
      allPresetCards.filter((c) => !c.isStarter).map((c) => c.id),
    );

    const combo = lastPlayedCardRef.current ? comboScores[card.id] : null;
    let moveADesc = cardToMoveDescription(card);
    let stabilityNote = "";
    if (combo && combo.feasibility < 0.4) {
      moveADesc = `[${lastPlayedCardRef.current!.name}后姿势不稳，强行出招] ${cardToMoveDescription(card)}`;
      stabilityNote = "但身形不稳";
    } else if (combo && combo.feasibility < 0.7) {
      moveADesc = `[从${lastPlayedCardRef.current!.name}衔接] ${cardToMoveDescription(card)}`;
      stabilityNote = "但动作略有迟滞";
    }

    try {
      const verdict = await api.duel.judge({
        moveA: moveADesc,
        moveB: cardToMoveDescription(aiCard),
        distance: distance,
        cardA: card.name,
        cardB: aiCard.name,
        round: round + 1,
      });

      const { newState } = engine.applyExternalVerdict(card, aiCard, {
        feasibilityA: verdict.feasibilityA,
        feasibilityB: verdict.feasibilityB,
        succeededA: verdict.succeededA,
        succeededB: verdict.succeededB,
        damageA: verdict.damageA,
        damageB: verdict.damageB,
        distanceAfter: verdict.distanceAfter,
        narration: verdict.narration,
      });

      const fell = verdict.distanceAfter === 1.0
        && distance - card.displacement - aiCard.displacement < 0;
      setIsFall(fell);

      setDistance(newState.distance);
      setRound(newState.round);
      player.hearts = newState.heartsA;
      ai.hearts = newState.heartsB;
      player.currentCard = card;
      player.lastCard = card;
      ai.currentCard = aiCard;
      ai.lastCard = aiCard;
      lastPlayedCardRef.current = card;

      const msg = buildLog(newState.round, card, aiCard, stabilityNote,
        verdict.succeededA, verdict.succeededB,
        verdict.damageA, verdict.damageB, verdict.narration);
      setLog((prev) => [msg, ...prev]);
      setPlayerHand(drawFromDeck(normalIds));
      setMulliganCount(MAX_MULLIGAN);

      setTimeout(() => {
        setIsFall(false);
        if (newState.status === "finished") {
          setPhase("finished");
          // 保存对战记录
          const finalLog = [...document.querySelectorAll('.duel-log-entry')].map(el => el.textContent);
          api.duels.record({
            winner: newState.winner === "A" ? "player" : "ai",
            rounds: newState.round,
            playerHearts: newState.heartsA,
            aiHearts: newState.heartsB,
            history: log.map((msg) => ({ log: msg })),
          }).catch(() => {});
        } else {
          setPhase("selecting");
        }
      }, 2000);
    } catch (err) {
      console.warn("duel-judge 降级", err);
      const { result, newState } = engine.executeRound(card, aiCard);
      const fell = newState.distance === 1.0 && distance - card.displacement - aiCard.displacement < 0;
      setIsFall(fell);
      setDistance(newState.distance);
      setRound(newState.round);
      player.hearts = newState.heartsA;
      ai.hearts = newState.heartsB;
      player.currentCard = card;
      player.lastCard = card;
      ai.currentCard = aiCard;
      ai.lastCard = aiCard;
      lastPlayedCardRef.current = card;

      const msg = buildLog(newState.round, card, aiCard, stabilityNote,
        result.succeededA, result.succeededB,
        result.damageA, result.damageB, result.narration) + " [本地裁决]";
      setLog((prev) => [msg, ...prev]);
      setPlayerHand(drawFromDeck(normalIds));
      setMulliganCount(MAX_MULLIGAN);
      setTimeout(() => {
        setIsFall(false);
        if (newState.status === "finished") {
          setPhase("finished");
        } else {
          setPhase("selecting");
        }
      }, 2000);
    }
  };

  // 距离 → 左右偏移
  const pct = Math.max(0, Math.min(distance / 2.0 * 30, 30));
  const playerLeft = Math.max(2, 35 - pct);
  const aiRight = Math.max(2, 35 - pct);

  // 结算画面
  if (phase === "finished") {
    const winnerName = player.hearts > 0 ? "甲" : "乙";
    const isPlayerWin = player.hearts > 0;

    const downloadDuelLog = () => {
      const data = {
        version: "school-of-one.v1.duel",
        recordedAt: new Date().toISOString(),
        result: {
          winner: isPlayerWin ? "player" : "ai",
          rounds: round,
          playerHearts: player.hearts,
          aiHearts: ai.hearts,
        },
        log: [...log].reverse(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `比武记录_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24 }}>
           比武结果
        </h2>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {isPlayerWin ? "🏆" : "💀"}
        </div>
        <div style={{ fontSize: 22, color: isPlayerWin ? "#d4a373" : "#EF5350", marginBottom: 8 }}>
          {winnerName} 获胜！
        </div>
        <div style={{ fontSize: 14, color: "#8B7D6B", marginBottom: 32 }}>
          {round} 回合结束 · 甲{player.hearts}❤️ · 乙{ai.hearts}❤️
        </div>

        {/* 战况回顾 */}
        <div style={{
          background: "#0d0a0a", borderRadius: 8, padding: 16, maxHeight: 200, overflowY: "auto",
          textAlign: "left", marginBottom: 32, maxWidth: 600, marginLeft: "auto", marginRight: "auto",
        }}>
          <div style={{ fontSize: 12, color: "#8B7D6B", marginBottom: 8 }}>战况回顾</div>
          {[...log].reverse().map((msg, i) => (
            <div key={i} style={{
              fontSize: 12, color: "#5a4a3a", marginBottom: 6,
              whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>{msg}</div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={downloadDuelLog}
            style={{
              padding: "12px 32px", fontSize: 14, borderRadius: 8,
              border: "1px solid #b8956a", background: "#3b2f2f",
              color: "#d4a373", cursor: "pointer", fontFamily: "inherit",
            }}>
            下载战报 (JSON)
          </button>
          <button onClick={() => window.location.reload()}
            style={{
              padding: "12px 40px", fontSize: 16, borderRadius: 8,
              border: "2px solid #d4a373", background: "#4E342E",
              color: "#f5e6c8", cursor: "pointer", fontFamily: "inherit",
            }}>
            再来一局
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
         比武场
      </h2>

      {/* Arena */}
      <div style={{
        background: "linear-gradient(145deg, #2d2320, #1a1414)",
        border: "1px solid #4E342E", borderRadius: 12,
        padding: "24px 60px", marginBottom: 24, minHeight: 300,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
          <div style={{ fontSize: 18, color: "#8B7D6B", letterSpacing: 2 }}>
             第 {round} 回合
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(180deg, transparent 0%, rgba(60,40,20,0.3) 100%)",
          pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 50, left: "10%", right: "10%",
          height: 1, background: "rgba(90,74,58,0.25)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 42, left: "50%", transform: "translateX(-50%)",
          fontSize: 12, color: "#8B7D6B", letterSpacing: 4, zIndex: 2 }}>
          相距 {distance.toFixed(1)}m
        </div>

        {/* 对战双方 */}
        <div style={{ position: "relative", height: 240, marginTop: 40, zIndex: 1 }}>
          <div style={{ position: "absolute", bottom: 0,
            left: isFall ? "35%" : `${playerLeft}%`, right: "auto",
            textAlign: "center", transition: "left 0.4s ease" }}>
            <div style={{ color: "#d4a373", fontSize: 13, marginBottom: 4 }}>{player.name}</div>
            <HeartsDisplay count={player.hearts} max={10} />
            <div style={{ marginTop: 8 }}>
              <img src={isFall ? "/assets/fallen.png" : "/assets/picture.png"} alt=""
                style={{ height: isFall ? 90 : 130, width: "auto", objectFit: "contain" }} />
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 0,
            right: isFall ? "35%" : `${aiRight}%`, left: "auto",
            textAlign: "center", transition: "right 0.4s ease" }}>
            <div style={{ color: "#EF5350", fontSize: 13, marginBottom: 4 }}>{ai.name}</div>
            <HeartsDisplay count={ai.hearts} max={10} />
            <div style={{ marginTop: 8 }}>
              <img src={isFall ? "/assets/fallen.png" : "/assets/picture.png"} alt=""
                style={{ height: isFall ? 90 : 130, width: "auto", objectFit: "contain",
                  transform: "scaleX(-1)" }} />
            </div>
          </div>
          {isFall && phase === "result" && (
            <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
              fontSize: 36, zIndex: 3 }}>💫</div>
          )}
        </div>
      </div>

      {/* 动作按钮 + 手牌 */}
      <div style={{ marginBottom: 24 }}>
        {/* 换牌 + 跳过 */}
        {phase === "selecting" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 12 }}>
            <button onClick={mulligan} disabled={mulliganCount <= 0}
              style={{
                padding: "6px 16px", fontSize: 12, borderRadius: 6,
                border: "1px solid #4E342E",
                background: mulliganCount > 0 ? "#3b2f2f" : "#1a1414",
                color: mulliganCount > 0 ? "#d4a373" : "#5a4a3a",
                cursor: mulliganCount > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}>
              换牌 ({mulliganCount}/{MAX_MULLIGAN})
            </button>
            <button onClick={skipTurn}
              style={{
                padding: "6px 16px", fontSize: 12, borderRadius: 6,
                border: "1px solid #E65100", background: "#3b2f2f",
                color: "#FF8A65", cursor: "pointer", fontFamily: "inherit",
              }}>
              放弃本回合
            </button>
          </div>
        )}
        <div style={{ fontSize: 14, color: "#8B7D6B", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8 }}>
          <span>选择招式</span>
          {comboLoading && <span style={{ fontSize: 11, color: "#5a4a3a" }}>连招判定中…</span>}
          {lastPlayedCardRef.current && (
            <span style={{ fontSize: 11, color: "#d4a373" }}>
              上一招「{lastPlayedCardRef.current.name}」
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {playerHand.map((card) => {
            const combo = comboScores[card.id];
            return (
              <div key={card.id}
                onClick={() => phase === "selecting" && canPlayCard(card) && playCard(card)}
                style={{ opacity: phase === "selecting" ? (canPlayCard(card) ? 1 : 0.35) : 0.5,
                  cursor: phase === "selecting" && canPlayCard(card) ? "pointer" : "not-allowed",
                  transition: "all 0.2s", position: "relative" }}>
                <CardComponent card={card} size="sm" />
                <div style={{ fontSize: 11, color: "#8B7D6B", marginTop: 4, textAlign: "center" }}>
                  📍 {card.displacement >= 0 ? "+" : ""}{card.displacement}m
                </div>
                {combo !== undefined && combo !== null && phase !== "result" && (
                  <div style={{ position: "absolute", top: -6, right: -6,
                    background: combo.feasibility >= 0.6 ? "#2E7D32"
                      : combo.feasibility >= 0.3 ? "#E65100" : "#C62828",
                    color: "#fff", fontSize: 10, fontWeight: "bold",
                    borderRadius: "50%", width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #1a1414",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)", zIndex: 10,
                  }}
                    title={`连招可行性: ${(combo.feasibility * 100).toFixed(0)}%, ${combo.difficulty}`}>
                    {(combo.feasibility * 100).toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 战况记录 */}
      <div style={{ background: "#0d0a0a", borderRadius: 8, padding: 16, maxHeight: 140, overflowY: "auto" }}>
        <div style={{ fontSize: 12, color: "#8B7D6B", marginBottom: 8 }}>战况记录</div>
        {log.map((msg, i) => (
          <div key={i} style={{ fontSize: 12, color: i === 0 ? "#f5e6c8" : "#5a4a3a",
            marginBottom: 6, opacity: i === 0 ? 1 : 0.6,
            whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

function buildLog(
  roundNum: number, card: PresetCard, aiCard: PresetCard,
  stabilityNote: string,
  succeededA: boolean, succeededB: boolean,
  damageA: number, damageB: number, narration: string,
) {
  const movePrefix = `甲出招【${card.name}】${stabilityNote}，乙出招【${aiCard.name}】`;
  let ds: string;
  if (succeededA && succeededB) ds = `双方各中一招，甲受${damageB}点伤害，乙受${damageA}点伤害。`;
  else if (succeededA) ds = `甲命中乙，造成${damageA}点伤害；乙未命中。`;
  else if (succeededB) ds = `乙命中甲，造成${damageB}点伤害；甲未命中。`;
  else ds = `双方均未命中。`;
  return `第${roundNum}回合：${movePrefix}\n${narration}\n${ds}`;
}

function HeartsDisplay({ count, max }: { count: number; max: number }) {
  const row1 = count > 5 ? "❤️".repeat(5) : "❤️".repeat(count);
  const row1Empty = count > 5 ? "" : "🖤".repeat(5 - count);
  const row2 = count > 5 ? "❤️".repeat(count - 5) + "🖤".repeat(10 - count) : "";
  return (
    <div style={{ fontSize: 14, lineHeight: 1.15, letterSpacing: 0 }}>
      <div>{row1}{row1Empty}</div>
      {row2 ? <div>{row2}</div> : null}
    </div>
  );
}
