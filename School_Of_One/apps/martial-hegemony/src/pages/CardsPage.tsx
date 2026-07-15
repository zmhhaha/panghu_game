import { useState, useMemo } from "react";
import { FACTIONS, getAllPresetCards, PresetCard } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";

/** 展开为书脊列表：每个子分支是一本拳谱 */
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

  const activeBook = activeSubId ? books.find((b) => b.subId === activeSubId) : null;

  // 书架视图
  if (!activeBook) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
           武术秘籍
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 20, padding: "20px 0",
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
        {activeBook.cards.map((card) => (
          <CardComponent key={card.id} card={card} size="sm" />
        ))}
      </div>
    </div>
  );
}
