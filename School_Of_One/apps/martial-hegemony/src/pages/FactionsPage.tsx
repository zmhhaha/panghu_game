import { FACTIONS } from "@school-of-one/core";

const GROUP_COLORS: Record<string, string> = {
  shaolin: "#8B4513",
  wudang: "#2F4F4F",
  northern: "#37474F",
  southern: "#BF360C",
};

const GROUP_ICONS: Record<string, string> = {
  shaolin: "🏯",
  wudang: "☯️",
  northern: "🥋",
  southern: "🐉",
};

export function FactionsPage() {
  // 按 group 分组
  const groups = FACTIONS.map((f) => {
    const totalCards = f.subStyles.reduce((s, sub) => s + sub.cardIds.length, 0);
    return { ...f, totalCards };
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 24, color: "#f5e6c8", marginBottom: 24, textAlign: "center" }}>
        🏛️ 四大师门
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {groups.map((faction) => (
          <div key={faction.id} style={{
            background: "linear-gradient(145deg, #2d2320, #1a1414)",
            border: `1px solid ${GROUP_COLORS[faction.group] || "#4E342E"}`,
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: 4 }}>
                  {GROUP_ICONS[faction.group]} {faction.name}
                </div>
                <div style={{ fontSize: 12, color: "#8B7D6B" }}>{faction.englishName}</div>
                <div style={{ fontSize: 13, color: "#a09080", marginTop: 8, lineHeight: 1.6 }}>
                  {faction.description}
                </div>
                <div style={{ fontSize: 12, color: "#6d9e6d", marginTop: 6 }}>
                  师傅：{faction.masterName}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#8B7D6B", textAlign: "right" }}>
                <div>{faction.playStyle}</div>
                <div style={{ color: "#d4a373" }}>底牌 {faction.totalCards} 张</div>
              </div>
            </div>

            {/* 分支展示 */}
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              {faction.subStyles.map((sub) => (
                <div key={sub.id} style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: `${GROUP_COLORS[faction.group]}22`,
                  border: `1px solid ${GROUP_COLORS[faction.group]}44`,
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: "bold", color: "#f5e6c8" }}>{sub.name}</div>
                  <div style={{ fontSize: 11, color: "#8B7D6B" }}>{sub.description}</div>
                  <div style={{ fontSize: 11, color: "#d4a373" }}>{sub.cardIds.length} 式</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
