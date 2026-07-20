import { Link } from "react-router-dom";

export function HomePage() {
  const card: React.CSSProperties = {
    background: "linear-gradient(145deg, #2d2320, #1a1414)",
    border: "1px solid #4E342E",
    borderRadius: 12,
    padding: "32px 24px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    textDecoration: "none",
    color: "#e8dcc8",
  };
  const title: React.CSSProperties = { fontSize: 28, fontWeight: "bold", marginBottom: 8, color: "#f5e6c8" };
  const subtitle: React.CSSProperties = { fontSize: 14, color: "#a09080", marginBottom: 24 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}></div>
        <h1 style={title}>武林争霸</h1>
        <p style={subtitle}>School of One · Martial Hegemony</p>
        <p style={{ fontSize: 14, color: "#8B7D6B", lineHeight: 1.8 }}>
          赤手空拳，以身为器。<br />
          拜师学艺，自成一家。演武排阵，擂台称雄。
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        <Link to="/training" style={card}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>习武场</div>
          <div style={{ fontSize: 12, color: "#8B7D6B", marginTop: 8 }}>
            拜师学艺 · 门派习武 · 世外高人
          </div>
        </Link>
        <Link to="/deck" style={card}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>演武场</div>
          <div style={{ fontSize: 12, color: "#8B7D6B", marginTop: 8 }}>
            编卡组 · 练招式 · 排兵布阵
          </div>
        </Link>
        <Link to="/duel" style={card}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>比武场</div>
          <div style={{ fontSize: 12, color: "#8B7D6B", marginTop: 8 }}>
            PvP 对决 · PvAI 切磋 · 好友邀请
          </div>
        </Link>
      </div>
    </div>
  );
}
