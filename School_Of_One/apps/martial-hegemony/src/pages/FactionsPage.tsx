import { api } from "@school-of-one/api-client";
import { getAllPresetCards, PresetCard, FACTIONS } from "@school-of-one/core";
import { useState, useEffect } from "react";

/** 颜色池：以后加门派就在这里加一条 */
const FACTION_COLORS: Record<string, string> = {
  "shaolin-temple": "#8B4513",
  "wudang-sect": "#2F4F4F",
  "northern-school": "#37474F",
  "southern-school": "#BF360C",
};

const FACTION_ICONS: Record<string, string> = {
  "shaolin-temple": "",
  "wudang-sect": "",
  "northern-school": "",
  "southern-school": "",
};

const allCards = getAllPresetCards() as PresetCard[];

/** 获取该门派的卡牌：所有子分支下的卡牌 */
function getFactionCards(factionId: string): PresetCard[] {
  const faction = FACTIONS.find((f) => f.id === factionId);
  if (!faction) return [];
  const subIds = faction.subStyles.map((s) => s.id);
  return allCards.filter((c) => c.factionId && subIds.includes(c.factionId));
}

export function FactionsPage() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<string | null>(null);

  useEffect(() => {
    api.cards.mine()
      .then((res) => setUnlockedIds(new Set(res.cardIds)))
      .catch(() => {});
  }, []);

  const joinFaction = async (factionId: string) => {
    if (joiningId) return;
    // 已拜师的门派不能再次拜师
    const factionCardIds = FACTIONS.find((f) => f.id === factionId)?.subStyles.flatMap((s) => s.cardIds) ?? [];
    if (factionCardIds.some((id) => unlockedIds.has(id))) {
      return;
    }
    setJoiningId(factionId);
    try {
      const factionCards = getFactionCards(factionId);
      const locked = factionCards.filter((c) => !unlockedIds.has(c.id));
      if (locked.length === 0) {
        setJoiningId(null);
        return;
      }
      const pick = locked[Math.floor(Math.random() * locked.length)];
      await api.cards.unlock(pick.id);
      setUnlockedIds((prev) => new Set(prev).add(pick.id));
      const factionName = FACTIONS.find((f) => f.id === factionId)?.name ?? "";
      setNewCard(`拜入${factionName}门下，习得【${pick.name}】`);
      setTimeout(() => setNewCard(null), 4000);
    } catch {
      // 忽略错误
    }
    setJoiningId(null);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
         师门
      </h2>

      {newCard && (
        <div style={{
          textAlign: "center", padding: "10px 20px", marginBottom: 16,
          background: "#1b5e20", color: "#a5d6a7", borderRadius: 8, fontSize: 14,
        }}>
          🎉 {newCard}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {FACTIONS.map((faction) => {
          const totalCards = faction.subStyles.reduce((s, sub) => s + sub.cardIds.length, 0);
          const color = FACTION_COLORS[faction.id] || "#4E342E";
          const icon = FACTION_ICONS[faction.id] || "";
          const factionCardIds = faction.subStyles.flatMap((s) => s.cardIds);
          const joined = factionCardIds.some((id) => unlockedIds.has(id));
          return (
            <div key={faction.id} style={{
              background: "linear-gradient(145deg, #2d2320, #1a1414)",
              border: `1px solid ${color}`,
              borderRadius: 12, padding: 24,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>
                    {icon} {faction.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#8B7D6B" }}>
                    师傅：{faction.masterName}
                  </div>
                  <div style={{ fontSize: 13, color: "#a09080", marginTop: 8, lineHeight: 1.6 }}>
                    {faction.description}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#d4a373" }}>{faction.playStyle}</div>
                  <div style={{ fontSize: 12, color: "#8B7D6B" }}>底牌 {totalCards} 张</div>
                  {joined ? (
                    <div style={{ padding: "6px 18px", fontSize: 12, borderRadius: 6,
                      border: "1px solid #3b2f2f", background: "#1a1414",
                      color: "#5a4a3a", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      ✅ 已拜师
                    </div>
                  ) : (
                    <button onClick={() => joinFaction(faction.id)}
                      disabled={joiningId === faction.id}
                      style={{
                        padding: "6px 18px", fontSize: 12, borderRadius: 6,
                        border: "1px solid #d4a373", background: "#4E342E",
                        color: "#f5e6c8", cursor: "pointer", fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}>
                      {joiningId === faction.id ? "入门中..." : "拜师入门"}
                    </button>
                  )}
                </div>
              </div>

              {/* 分支展示 */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {faction.subStyles.map((sub) => {
                  const unlocked = sub.cardIds.filter((id) => unlockedIds.has(id)).length;
                  return (
                    <div key={sub.id} style={{
                      padding: "6px 14px", borderRadius: 8,
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      fontSize: 12,
                      display: "inline-block",
                    }}>
                      <div style={{ fontWeight: "bold", color: "#f5e6c8", whiteSpace: "nowrap" }}>{sub.name}</div>
                      <div style={{ fontSize: 10, color: "#8B7D6B", opacity: 0.8 }}>
                        {sub.description} · {unlocked}/{sub.cardIds.length}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
