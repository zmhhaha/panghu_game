import { useEffect, useState } from "react";
import { PresetCard, getAllPresetCards } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";

export function CardsPage() {
  const [cards, setCards] = useState<PresetCard[]>([]);
  const [factionFilter, setFactionFilter] = useState("全部");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setCards(getAllPresetCards() as PresetCard[]);
  }, []);

  const factionIds = [...new Set(cards.map((c) => c.factionId))];
  // 用首次出现顺序排序
  const orderedFactions = cards.filter((c, i, arr) => arr.findIndex((x) => x.factionId === c.factionId) === i).map((c) => c.factionId);

  const filtered = factionFilter === "全部"
    ? cards
    : cards.filter((c) => c.factionId === factionFilter);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
        📖 武术秘籍 · {filtered.length} 式
      </h2>

      {/* 门派筛选 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => setFactionFilter("全部")} style={btnStyle(factionFilter === "全部")}>
          全部
        </button>
        {orderedFactions.map((fid) => (
          <button key={fid} onClick={() => setFactionFilter(fid)} style={btnStyle(factionFilter === fid)}>
            {fid.replace("-sub", "").replace(/-/g, " ")}
          </button>
        ))}
      </div>

      {/* 卡牌网格 */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 20, justifyItems: "center",
      }}>
        {filtered.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            size="sm"
            state={selected === card.id ? "selected" : "default"}
            onClick={() => setSelected(selected === card.id ? null : card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: 16, border: "1px solid #4E342E",
    background: active ? "#4E342E" : "transparent",
    color: active ? "#f5e6c8" : "#a09080",
    cursor: "pointer", fontSize: 12, fontFamily: "inherit",
    transition: "all 0.2s",
  };
}
