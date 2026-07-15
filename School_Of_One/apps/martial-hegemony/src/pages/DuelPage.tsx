import { useState, useEffect, useCallback } from "react";
import { getAllPresetCards, PresetCard, DuelEngine } from "@school-of-one/core";
import { CardComponent, MartialArtsFigure } from "@school-of-one/ui-core";

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

  const startDuel = useCallback(() => {
    const startingA = randomStartingMove(allPresetCards);
    const startingB = randomStartingMove(allPresetCards);
    const eng = new DuelEngine("player", "ai", startingA.id, startingB.id);
    setEngine(eng);

    const hand = [...allPresetCards].sort(() => Math.random() - 0.5).slice(0, 5);
    setPlayerHand(hand);
    setDistance(2.0);
    setRound(0);
    setLog(["比武开始！双方相距 2米"]);
    player.hearts = 10;
    ai.hearts = 10;
    setPhase("selecting");
  }, [player, ai]);

  const canPlayCard = (card: PresetCard) => {
    if (!engine) return false;
    return card.displacement <= distance;
  };

  const playCard = (card: PresetCard) => {
    if (!engine || !canPlayCard(card)) return;

    // AI 选牌（从同一副牌随机取 5 张作为 AI 手牌模拟）
    const aiHand = [...allPresetCards].sort(() => Math.random() - 0.5).slice(0, 5);
    const aiCard = engine.pickAICard(aiHand);

    const { result, newState } = engine.executeRound(card, aiCard);

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
      setPhase(newState.status === "finished" ? "ready" : "selecting");
    }, 2000);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
        ⚔️ 比武场
      </h2>

      {phase === "ready" ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
          <div style={{ fontSize: 16, color: "#8B7D6B", marginBottom: 24 }}>
            准备好了吗？选择你的起手式开始比武
          </div>
          <button onClick={startDuel} style={{
            padding: "12px 40px", fontSize: 18, borderRadius: 8,
            border: "2px solid #d4a373", background: "#4E342E",
            color: "#f5e6c8", cursor: "pointer",
          }}>
            开始比武
          </button>
        </div>
      ) : (
        <>
          <div style={{
            background: "linear-gradient(145deg, #2d2320, #1a1414)",
            border: "1px solid #4E342E", borderRadius: 12,
            padding: 24, marginBottom: 24, minHeight: 220,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", bottom: 40, left: "10%", right: "10%",
              height: 1, background: "linear-gradient(90deg, transparent, #5a4a3a, transparent)",
            }} />
            <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)",
              fontSize: 11, color: "#5a4a3a", letterSpacing: 4 }}>
              {distance.toFixed(1)}m
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 180, padding: "0 8%" }}>
              <div style={{
                textAlign: "center", transition: "all 0.3s ease",
                transform: `translateX(${Math.min(distance * 6, 20)}px)`,
              }}>
                <div style={{ fontSize: 13, color: "#d4a373", marginBottom: 4 }}>{player.name}</div>
                <HeartsDisplay count={player.hearts} max={10} />
                <div style={{ marginTop: 8 }}>
                  <MartialArtsFigure size={80} color="#ff6b6b" isFall={distance === 0 && phase === "result"} />
                </div>
              </div>

              <div style={{ textAlign: "center", alignSelf: "center" }}>
                {phase === "result" && (
                  <div style={{ fontSize: 13, color: "#8B7D6B", fontStyle: "italic", marginBottom: 8 }}>
                    {player.lastCard?.name || ""}
                  </div>
                )}
              </div>

              <div style={{
                textAlign: "center", transition: "all 0.3s ease",
                transform: `translateX(${-Math.min(distance * 6, 20)}px)`,
              }}>
                <div style={{ fontSize: 13, color: "#EF5350", marginBottom: 4 }}>{ai.name}</div>
                <HeartsDisplay count={ai.hearts} max={10} />
                <div style={{ marginTop: 8 }}>
                  <MartialArtsFigure size={80} color="#ffd93d" flipped isFall={distance === 0 && phase === "result"} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: "#8B7D6B", marginBottom: 12 }}>
              选择招式（点击出牌）
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {playerHand.map((card) => (
                <div key={card.id} onClick={() => phase === "selecting" && canPlayCard(card) && playCard(card)} style={{
                  opacity: phase === "selecting" ? (canPlayCard(card) ? 1 : 0.35) : 0.5,
                  cursor: phase === "selecting" && canPlayCard(card) ? "pointer" : "not-allowed",
                  transform: phase === "selecting" ? "scale(1)" : "scale(0.95)",
                  transition: "all 0.2s",
                }}>
                  <CardComponent card={card} size="sm" />
                  <div style={{ fontSize: 11, color: "#8B7D6B", marginTop: 4 }}>
                    📍 {card.displacement >= 0 ? "+" : ""}{card.displacement}m
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: "#0d0a0a", borderRadius: 8, padding: 16, maxHeight: 160, overflowY: "auto",
          }}>
            <div style={{ fontSize: 12, color: "#8B7D6B", marginBottom: 8 }}>战况记录</div>
            {log.map((msg, i) => (
              <div key={i} style={{ fontSize: 12, color: i === 0 ? "#f5e6c8" : "#5a4a3a", marginBottom: 4 }}>
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
  return (
    <div style={{ fontSize: 18, letterSpacing: 2 }}>
      {"❤️".repeat(count)}{"🖤".repeat(max - count)}
    </div>
  );
}
