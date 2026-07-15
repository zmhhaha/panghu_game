import { FACTIONS, PresetCard, getAllPresetCards } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";
import { useState, useMemo } from "react";

/** 拍平卡牌数据 */
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

export function DeckBuilderPage() {
  const books = useMemo(() => buildBooks(), []);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [deck, setDeck] = useState<string[]>([]);
  const MAX_DECK = 30;

  const toggleCard = (id: string) => {
    setDeck((prev) => {
      if (prev.includes(id)) return prev.filter((d) => d !== id);
      if (prev.length >= MAX_DECK) return prev;
      return [...prev, id];
    });
  };

  const activeBook = activeSubId ? books.find((b) => b.subId === activeSubId) : null;

  // 书架视图（选拳谱）
  if (!activeBook) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, color: "#f5e6c8", margin: 0 }}>
             演武场
          </h2>
          <div style={{ fontSize: 14, color: "#8B7D6B" }}>
            卡组:{" "}
            <span style={{ color: deck.length >= MAX_DECK ? "#EF5350" : "#d4a373" }}>
              {deck.length}
            </span>
            /{MAX_DECK}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {/* 左侧：书架 */}
          <div style={{ flex: 2 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 20, padding: "10px 0",
            }}>
              {books.map((book) => (
                <div
                  key={book.subId}
                  onClick={() => setActiveSubId(book.subId)}
                  style={{
                    height: 210, cursor: "pointer", position: "relative",
                    border: "1px solid #a08050",
                    boxShadow: "4px 4px 12px rgba(0,0,0,0.15)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", textAlign: "center",
                    transition: "all 0.2s",
                    fontFamily: "'KaiTi','STKaiti','Noto Serif SC',serif",
                    color: "#2c1810", justifyContent: "flex-start",
                    paddingTop: 40,
                    backgroundImage: "url(/assets/slipcase.png)",
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
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
                    {book.factionName} · {book.cards.length}式
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：卡组 */}
          <div style={{
            flex: 1, minWidth: 220,
            background: "linear-gradient(145deg, #2d2320, #1a1414)",
            border: "1px solid #4E342E", borderRadius: 12,
            padding: 16, maxHeight: "80vh", overflowY: "auto",
            alignSelf: "flex-start",
          }}>
            <h3 style={{ fontSize: 14, color: "#f5e6c8", margin: "0 0 12px 0" }}>
              己方卡组
            </h3>
            {deck.length === 0 ? (
              <div style={{ fontSize: 12, color: "#5a4a3a", textAlign: "center", padding: 20 }}>
                从拳谱选招入组
              </div>
            ) : (
              deck.map((id) => {
                const allCards = getAllPresetCards() as PresetCard[];
                const card = allCards.find((c) => c.id === id);
                return card ? (
                  <div
                    key={id}
                    onClick={() => toggleCard(id)}
                    style={{
                      padding: "6px 10px", marginBottom: 4, borderRadius: 6,
                      background: "#1a1414", border: "1px solid #3b2f2f",
                      cursor: "pointer", fontSize: 12,
                      display: "flex", justifyContent: "space-between",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d4a373"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3b2f2f"; }}
                  >
                    <span style={{ color: "#e8dcc8" }}>{card.name}</span>
                    <span style={{ color: "#8B7D6B", fontSize: 10 }}>
                      {card.subtitle || ""}
                    </span>
                  </div>
                ) : null;
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // 打开拳谱内页选招
  const allCards = getAllPresetCards() as PresetCard[];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div
            onClick={() => setActiveSubId(null)}
            style={{
              display: "inline-block", marginBottom: 12,
              padding: "6px 16px", border: "1px solid #b8956a",
              cursor: "pointer", fontSize: 13, letterSpacing: 2,
              transition: "all 0.2s", color: "#d4a373",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,100,55,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            ← 返回书架
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: "#f5e6c8" }}>
            {activeBook.factionIcon} {activeBook.subName}
          </div>
          <div style={{ fontSize: 13, color: "#8B7D6B", marginTop: 4 }}>
            {activeBook.factionName} · {activeBook.subDesc} · {activeBook.cards.length}式
            <span style={{ marginLeft: 16, color: "#d4a373" }}>
              （点击选招，再点取消）
            </span>
          </div>
        </div>
        <div style={{ fontSize: 14, color: "#8B7D6B", textAlign: "right" }}>
          卡组:{" "}
          <span style={{ color: deck.length >= MAX_DECK ? "#EF5350" : "#d4a373" }}>
            {deck.length}
          </span>
          /{MAX_DECK}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16, justifyItems: "center",
      }}>
        {activeBook.cards.map((card) => (
          <div
            key={card.id}
            onClick={() => toggleCard(card.id)}
            style={{
              cursor: "pointer", transition: "all 0.2s",
              opacity: deck.includes(card.id) ? 0.4 : 1,
              position: "relative",
            }}
          >
            <CardComponent
              card={card}
              size="sm"
              state={deck.includes(card.id) ? "disabled" : "default"}
            />
            <div style={{
              fontSize: 11, color: "#8B7D6B", marginTop: 4, textAlign: "center",
            }}>
              📍 {card.displacement >= 0 ? "+" : ""}{card.displacement}m
            </div>
          </div>
        ))}
      </div>

      {/* 卡组侧边栏（在选招时浮动显示） */}
      <div style={{
        position: "fixed", right: 24, top: 100, width: 200,
        background: "linear-gradient(145deg, #2d2320, #1a1414)",
        border: "1px solid #4E342E", borderRadius: 12,
        padding: 16, maxHeight: "70vh", overflowY: "auto",
        display: deck.length > 0 ? "block" : "none",
        zIndex: 50,
      }}>
        <h3 style={{ fontSize: 13, color: "#f5e6c8", margin: "0 0 8px 0" }}>
          己方卡组 ({deck.length})
        </h3>
        {deck.map((id) => {
          const card = allCards.find((c) => c.id === id);
          return card ? (
            <div
              key={id}
              onClick={() => toggleCard(id)}
              style={{
                padding: "4px 8px", marginBottom: 3, borderRadius: 4,
                background: "#1a1414", border: "1px solid #3b2f2f",
                cursor: "pointer", fontSize: 11,
                display: "flex", justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#e8dcc8" }}>{card.name}</span>
              <span style={{ color: "#8B7D6B", fontSize: 9 }}>{card.subtitle || ""}</span>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
