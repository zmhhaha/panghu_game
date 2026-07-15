import { useState, useEffect, useCallback } from "react";
import { getAllPresetCards, PresetCard, DuelEngine } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";

type DuelPhase = "ready" | "selecting" | "result";

interface DuelPlayer {
  name: string;
  hearts: number;
  lastCard: PresetCard | null;
  currentCard: PresetCard | null;
}

function randomStartingMove(cards: PresetCard[]): PresetCard {
  const starters = cards.filter((c) => c.isStarter);
  return starters.length > 0
    ? starters[Math.floor(Math.random() * starters.length)]
    : cards[Math.floor(Math.random() * cards.length)];
}

const allPresetCards = getAllPresetCards() as PresetCard[];

export function DuelPage() {
  const [phase, setPhase] = useState<DuelPhase>("ready");
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

  const startDuel = useCallback(() => {
    const startingA = randomStartingMove(allPresetCards);
    const startingB = randomStartingMove(allPresetCards);
    const eng = new DuelEngine("player", "ai", startingA.id, startingB.id);
    setEngine(eng);

    const hand = [...allPresetCards].sort(() => Math.random() - 0.5).slice(0, 5);
    setPlayerHand(hand);
    setDistance(2.0);
    setRound(0);
    setIsFall(false);
    setLog(["比武开始！双方相距 2米"]);
    player.hearts = 10;
    ai.hearts = 10;
    player.lastCard = null;
    ai.lastCard = null;
    setPhase("selecting");
  }, [player, ai]);

  const canPlayCard = (card: PresetCard) => {
    if (!engine) return false;
    return card.displacement <= distance;
  };

  const playCard = (card: PresetCard) => {
    if (!engine || !canPlayCard(card)) return;

    // AI 选牌
    const aiHand = [...allPresetCards].sort(() => Math.random() - 0.5).slice(0, 5);
    const aiCard = engine.pickAICard(aiHand);

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

    const msg = `第${newState.round}回合：${result.narration}`;
    setLog((prev) => [msg, ...prev]);

    setPhase("result");
    setTimeout(() => {
      setIsFall(false);
      setPhase(newState.status === "finished" ? "ready" : "selecting");
    }, 2000);
  };

  // 距离 → 左右偏移百分比（0m→靠拢35%, 2.5m→两端5%, 5m→不动）
  const pct = Math.min(distance / 2.5 * 20, 20);
  const playerLeft = (5 - pct / 2);
  const aiRight = (5 - pct / 2);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
         比武场
      </h2>

      {phase === "ready" ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}></div>
          <div style={{ fontSize: 16, color: "#8B7D6B", marginBottom: 24 }}>
            准备好了吗？选择你的起手式开始比武
          </div>
          <button onClick={startDuel} style={{
            padding: "12px 40px", fontSize: 18, borderRadius: 8,
            border: "2px solid #d4a373", background: "#4E342E",
            color: "#f5e6c8", cursor: "pointer", fontFamily: "inherit",
          }}>
            开始比武
          </button>
        </div>
      ) : (
        <>
          {/* === Arena === */}
          <div style={{
            background: "linear-gradient(145deg, #2d2320, #1a1414)",
            border: "1px solid #4E342E", borderRadius: 12,
            padding: "24px 60px", marginBottom: 24, minHeight: 300,
            position: "relative", overflow: "hidden",
          }}>
            {/* 回合信息在最顶部 */}
            <div style={{
              position: "absolute", top: 8, left: 0, right: 0,
              textAlign: "center", zIndex: 2,
            }}>
              <div style={{ fontSize: 18, color: "#8B7D6B", letterSpacing: 2 }}>
                 第 {round} 回合
              </div>
              <div style={{ fontSize: 12, color: "#8B7D6B", fontStyle: "italic", marginTop: 2 }}>
                {phase === "result" && player.lastCard?.name
                  ? `你出「${player.lastCard.name}」 — AI 出「${ai.lastCard?.name}」`
                  : ""}
              </div>
            </div>

            {/* 地面透视 */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
              background: "linear-gradient(180deg, transparent 0%, rgba(60,40,20,0.3) 100%)",
              pointerEvents: "none",
            }} />

            {/* 距离刻度线 */}
            <div style={{
              position: "absolute", bottom: 50, left: "10%", right: "10%",
              height: 1, background: "rgba(90,74,58,0.25)", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: 56, left: "25%",
              fontSize: 9, color: "rgba(90,74,58,0.4)", pointerEvents: "none",
              transform: "translateX(-50%)",
            }}>1m</div>
            <div style={{
              position: "absolute", bottom: 56, left: "50%",
              fontSize: 9, color: "rgba(90,74,58,0.4)", pointerEvents: "none",
              transform: "translateX(-50%)",
            }}>0m</div>
            <div style={{
              position: "absolute", bottom: 56, left: "75%",
              fontSize: 9, color: "rgba(90,74,58,0.4)", pointerEvents: "none",
              transform: "translateX(-50%)",
            }}>1m</div>

            {/* 地面线 */}
            <div style={{
              position: "absolute", bottom: 36, left: "8%", right: "8%",
              height: 1,
              background: "linear-gradient(90deg, transparent, #5a4a3a, transparent)",
            }} />
            <div style={{
              position: "absolute", bottom: 42, left: "50%", transform: "translateX(-50%)",
              fontSize: 12, color: "#8B7D6B", letterSpacing: 4, zIndex: 2,
            }}>
              相距 {distance.toFixed(1)}m
            </div>

            {/* 对战双方 */}
            <div style={{ position: "relative", height: 240, marginTop: 40, zIndex: 1 }}>
              {/* 玩家 */}
              <div style={{
                position: "absolute", bottom: 0,
                left: isFall ? "35%" : `${playerLeft}%`,
                right: "auto",
                textAlign: "center",
                transition: "left 0.4s ease",
              }}>
                <div style={{ color: "#d4a373", fontSize: 13, marginBottom: 4 }}>{player.name}</div>
                <HeartsDisplay count={player.hearts} max={10} />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                  <div style={{
                    width: 100, height: 140,
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0.9, transition: "all 0.3s",
                    transform: isFall ? "rotate(90deg)" : "none",
                  }}>
                    <img
                      src="/assets/picture.png"
                      alt=""
                      style={{ height: 130, width: "auto", objectFit: "contain" }}
                    />
                  </div>
                </div>
              </div>

              {/* AI */}
              <div style={{
                position: "absolute", bottom: 0,
                right: isFall ? "35%" : `${aiRight}%`,
                left: "auto",
                textAlign: "center",
                transition: "right 0.4s ease",
              }}>
                <div style={{ color: "#EF5350", fontSize: 13, marginBottom: 4 }}>{ai.name}</div>
                <HeartsDisplay count={ai.hearts} max={10} />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                  <div style={{
                    width: 100, height: 140,
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0.9, transition: "all 0.3s",
                    transform: `${isFall ? "rotate(90deg)" : "none"} scaleX(-1)`,
                  }}>
                    <img
                      src="/assets/picture.png"
                      alt=""
                      style={{ height: 130, width: "auto", objectFit: "contain" }}
                    />
                  </div>
                </div>
              </div>

              {/* 摔倒特效 */}
              {isFall && phase === "result" && (
                <div style={{
                  position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
                  fontSize: 36, zIndex: 3, animation: "none",
                }}>
                  💫
                </div>
              )}
            </div>
          </div>

          {/* 手牌 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: "#8B7D6B", marginBottom: 12 }}>
              选择招式（点击出牌）
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {playerHand.map((card) => (
                <div
                  key={card.id}
                  onClick={() => phase === "selecting" && canPlayCard(card) && playCard(card)}
                  style={{
                    opacity: phase === "selecting" ? (canPlayCard(card) ? 1 : 0.35) : 0.5,
                    cursor: phase === "selecting" && canPlayCard(card) ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                  }}
                >
                  <CardComponent card={card} size="sm" />
                  <div style={{ fontSize: 11, color: "#8B7D6B", marginTop: 4, textAlign: "center" }}>
                    📍 {card.displacement >= 0 ? "+" : ""}{card.displacement}m
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 战况记录 */}
          <div style={{
            background: "#0d0a0a", borderRadius: 8, padding: 16, maxHeight: 140, overflowY: "auto",
          }}>
            <div style={{ fontSize: 12, color: "#8B7D6B", marginBottom: 8 }}>战况记录</div>
            {log.map((msg, i) => (
              <div key={i} style={{
                fontSize: 12, color: i === 0 ? "#f5e6c8" : "#5a4a3a",
                marginBottom: 4, opacity: i === 0 ? 1 : 0.6,
              }}>
                {msg}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeartsDisplay({ count, max }: { count: number; max: number }) {
  const row1 = count > 5 ? "".repeat(5) : "".repeat(count);
  const row1Empty = count > 5 ? "" : "🖤".repeat(5 - count);
  const row2 = count > 5 ? "".repeat(count - 5) + "🖤".repeat(10 - count) : "";
  return (
    <div style={{ fontSize: 14, lineHeight: 1.15, letterSpacing: 0 }}>
      <div>{row1}{row1Empty}</div>
      {row2 && <div>{row2}</div>}
    </div>
  );
}
