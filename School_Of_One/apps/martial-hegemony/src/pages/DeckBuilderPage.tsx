import { FACTIONS, Faction } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";
import { useState } from "react";

// 示例卡牌数据（后端对接前先用）
const SAMPLE_CARDS = getAllCardsFlat();

function getAllCardsFlat() {
  const cards: any[] = [];
  for (const f of FACTIONS) {
    for (const sub of f.subStyles) {
      const nameMap: Record<string, string[]> = {
        "少林拳": ["罗汉拳", "金刚指", "铁布衫", "少林弹腿", "少林长拳"],
        "罗汉拳": ["罗汉出洞", "罗汉捧经", "罗汉撞钟", "罗汉伏虎"],
        "五形拳": ["金龙探爪", "白蛇吐信", "猛虎扑食", "豹子冲撞"],
        "太极拳": ["揽雀尾", "单鞭", "如封似闭", "野马分鬃", "云手"],
        "八卦掌": ["青龙探爪", "叶底藏花", "游身八卦", "指天划地"],
        "形意拳": ["崩拳", "劈拳", "钻拳", "炮拳", "横拳"],
        "八极拳": ["撑锤", "顶肘", "铁山靠", "崩肘", "大缠丝"],
        "通背拳": ["劈山掌", "猿猴出洞", "冷急带环"],
        "翻子拳": ["双拳密如雨", "双挂拳", "翻背拳"],
        "戳脚": ["鸳鸯腿", "四平腿", "蹶腿", "旋风腿"],
        "螳螂拳": ["螳螂捕蝉", "七星螳螂", "铁环套"],
        "迷踪拳": ["迷踪步", "声东击西", "左右逢源"],
        "咏春拳": ["日字冲拳", "摊手", "膀手", "连环冲拳"],
        "洪拳": ["工字伏虎拳", "虎鹤双形", "铁线拳", "三展手"],
        "蔡李佛": ["穿桥手", "鞭槌", "扭马侧蹬", "四面斗"],
      };
      const names = nameMap[sub.name] || ["起手式"];
      names.forEach((n, i) => {
        cards.push({
          id: `${sub.id}-${i}`,
          factionId: f.id,
          name: n,
          subtitle: sub.name,
          description: "", source: "preset" as const,
          isStarter: i === 0,
          keywords: [], displacement: i * 0.2,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }
  return cards;
}

export function DeckBuilderPage() {
  const [selectedFaction, setSelectedFaction] = useState<string>("all");
  const [deck, setDeck] = useState<string[]>([]);
  const MAX_DECK = 30;

  // 可用卡牌池
  const pool = selectedFaction === "all"
    ? SAMPLE_CARDS
    : SAMPLE_CARDS.filter((c) => c.factionId === selectedFaction);

  const toggleCard = (id: string) => {
    if (deck.includes(id)) {
      setDeck(deck.filter((d) => d !== id));
    } else if (deck.length < MAX_DECK) {
      setDeck([...deck, id]);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, color: "#f5e6c8", margin: 0 }}>
          📋 演武场 · 编卡组
        </h2>
        <div style={{ fontSize: 14, color: "#8B7D6B" }}>
          卡组: <span style={{ color: deck.length >= MAX_DECK ? "#EF5350" : "#d4a373" }}>{deck.length}</span>/{MAX_DECK}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* 左侧：卡牌池 */}
        <div style={{ flex: 2 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "#8B7D6B", marginRight: 12 }}>门派筛选</span>
            <button onClick={() => setSelectedFaction("all")} style={btnStyle(selectedFaction === "all")}>全部</button>
            {FACTIONS.map((f) => (
              <button key={f.id} onClick={() => setSelectedFaction(f.id)} style={btnStyle(selectedFaction === f.id)}>
                {f.name}
              </button>
            ))}
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}>
            {pool.map((card) => (
              <div key={card.id} onClick={() => toggleCard(card.id)} style={{
                opacity: deck.includes(card.id) ? 0.4 : 1,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                <CardComponent card={card} size="sm" state={deck.includes(card.id) ? "disabled" : "default"} />
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
        }}>
          <h3 style={{ fontSize: 14, color: "#f5e6c8", margin: "0 0 12px 0" }}>
            己方卡组
          </h3>
          {deck.length === 0 ? (
            <div style={{ fontSize: 12, color: "#5a4a3a", textAlign: "center", padding: 20 }}>
              从左侧选招入组
            </div>
          ) : (
            deck.map((id) => {
              const card = SAMPLE_CARDS.find((c) => c.id === id);
              return card ? (
                <div key={id} onClick={() => toggleCard(id)} style={{
                  padding: "6px 10px", marginBottom: 4, borderRadius: 6,
                  background: "#1a1414", border: "1px solid #3b2f2f",
                  cursor: "pointer", fontSize: 12,
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ color: "#e8dcc8" }}>{card.name}</span>
                  <span style={{ color: "#8B7D6B", fontSize: 10 }}>
                    {card.subtitle}
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

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px", marginRight: 6, marginBottom: 6, borderRadius: 16,
    border: "1px solid #4E342E",
    background: active ? "#4E342E" : "transparent",
    color: active ? "#f5e6c8" : "#a09080",
    cursor: "pointer", fontSize: 12,
  };
}
