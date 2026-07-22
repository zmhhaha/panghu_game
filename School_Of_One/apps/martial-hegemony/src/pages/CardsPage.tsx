import { useState, useMemo, useEffect } from "react";
import { FACTIONS, getAllPresetCards, PresetCard } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";
import { api } from "@school-of-one/api-client";
import type { CustomCardResponse } from "@school-of-one/api-client";

/** 展开为书脊列表 */
function buildBooks() {
  const allCards = getAllPresetCards() as PresetCard[];
  const books: {
    subId: string;
    subName: string;
    subDesc: string;
    factionId: string;
    factionName: string;
    factionIcon: string;
    cards: PresetCard[];
  }[] = [];

  FACTIONS.forEach((f) => {
    const iconMap: Record<string, string> = {
      shaolin: "", wudang: "", northern: "", southern: "",
    };
    const icon = iconMap[f.group] || "";
    f.subStyles.forEach((sub) => {
      const cards = sub.cardIds
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c): c is PresetCard => !!c);
      books.push({
        subId: sub.id,
        subName: sub.name,
        subDesc: sub.description,
        factionId: f.id,
        factionName: f.name,
        factionIcon: icon,
        cards,
      });
    });
  });
  return books;
}

export function CardsPage() {
  const books = useMemo(() => buildBooks(), []);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [customCards, setCustomCards] = useState<CustomCardResponse[]>([]);

  // 加载已解锁卡牌 + 自创卡牌
  useEffect(() => {
    api.cards.mine()
      .then((res) => setUnlockedIds(new Set(res.cardIds)))
      .catch(() => { /* 离线也能看全卡牌 */ });
    api.cards.listCustom()
      .then((res) => setCustomCards(res.customCards))
      .catch(() => {});
  }, []);

  // 构造自创卡牌的书本
  const hermitBook = useMemo(() => {
    if (customCards.length === 0) return null;
    return {
      subId: "hermit-custom",
      subName: "自创武功",
      subDesc: "世外高人独创，独步天下",
      factionId: "hermit",
      factionName: "无门无派",
      factionIcon: "🧙",
      cards: customCards.map((cc) => ({
        id: cc.cardId,
        factionId: cc.factionId,
        gameId: cc.gameId as "martial-hegemony",
        name: cc.name,
        subtitle: "自创武功",
        description: cc.description,
        displacement: cc.displacement,
        source: "custom" as const,
        isStarter: false,
        keywords: [] as string[],
        createdAt: cc.createdAt,
        updatedAt: undefined,
        verses: [] as string[],
        artAssetId: undefined,
      }) as PresetCard),
    };
  }, [customCards]);

  // 合并书本（预设 + 自创）
  const allBooks = useMemo(() => {
    if (!hermitBook) return books;
    return [...books, hermitBook];
  }, [books, hermitBook]);

  const activeBook = activeSubId ? allBooks.find((b) => b.subId === activeSubId) : null;

  // 书架视图
  if (!activeBook) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
           藏经阁
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 20, padding: "20px 0",
        }}>
          {allBooks.map((book) => {
            // 统计该分支已解锁卡数
            const bookUnlocked = book.cards.filter((c) => unlockedIds.has(c.id)).length;
            const isHermitBook = book.subId === "hermit-custom";
            return (
              <div
                key={book.subId}
                onClick={() => setActiveSubId(book.subId)}
                style={{
                  ...(isHermitBook ? {
                    border: "1px solid #7c4dff",
                    background: "linear-gradient(145deg, #1a1a2e, #0d0d1a)",
                  } : {
                    border: "1px solid #a08050",
                    backgroundImage: "url(/assets/slipcase.png)",
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }),
                  height: 210, cursor: "pointer", position: "relative",
                  boxShadow: "4px 4px 12px rgba(0,0,0,0.15)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", textAlign: "center",
                  transition: "all 0.2s",
                  fontFamily: "'KaiTi','STKaiti','Noto Serif SC',serif",
                  color: "#2c1810", justifyContent: "flex-start",
                  paddingTop: 40,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "4px 6px 16px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "4px 4px 12px rgba(0,0,0,0.15)";
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6, position: "relative", zIndex: 1 }}>
                  {book.factionIcon}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: "bold", letterSpacing: 3,
                  writingMode: "vertical-rl", position: "relative", zIndex: 1,
                  textShadow: "0 1px 3px rgba(242,230,201,0.6)",
                }}>
                  {book.subName}
                </div>
                <div style={{
                  fontSize: 11, color: "#5a3a2a", opacity: 0.6,
                  position: "absolute", bottom: 16, zIndex: 1,
                }}>
                  {book.factionName} · {bookUnlocked}/{book.cards.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 打开拳谱内页
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <div
        onClick={() => setActiveSubId(null)}
        style={{
          display: "inline-block", marginBottom: 16,
          padding: "6px 16px", border: "1px solid #b8956a",
          cursor: "pointer", fontSize: 13, letterSpacing: 2,
          transition: "all 0.2s", color: "#d4a373",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,100,55,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        ← 返回书架
      </div>
      <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: "#f5e6c8", marginBottom: 4 }}>
        {activeBook.factionIcon} {activeBook.subName}
      </div>
      <div style={{ fontSize: 13, color: "#8B7D6B", marginBottom: 16 }}>
        {activeBook.factionName} · {activeBook.subDesc} · {activeBook.cards.length}式
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16, justifyItems: "center",
      }}>
        {activeBook.cards.map((card) => {
          const owned = unlockedIds.has(card.id);
          return owned ? (
            <CardComponent key={card.id} card={card} size="sm" />
          ) : (
            <div key={card.id}
              style={{
                width: 180, height: 260,
                background: "linear-gradient(145deg, #1a1414, #0d0a0a)",
                border: "1px solid #3b2f2f", borderRadius: 12,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 8, opacity: 0.5,
              }}>
              <div style={{ fontSize: 32 }}>🔒</div>
              <div style={{ fontSize: 11, color: "#5a4a3a" }}>
                习武解锁
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
