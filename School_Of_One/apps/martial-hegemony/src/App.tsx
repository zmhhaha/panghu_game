import { Routes, Route, Link } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { FactionsPage } from "./pages/FactionsPage";
import { CardsPage } from "./pages/CardsPage";
import { DeckBuilderPage } from "./pages/DeckBuilderPage";
import { DuelPage } from "./pages/DuelPage";
import { TrainingGroundPage } from "./pages/TrainingGroundPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1a1414 0%, #2d2320 50%, #1a1414 100%)",
      color: "#e8dcc8",
      fontFamily: "'Noto Serif SC', 'KaiTi', serif",
    }}>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/factions" element={<FactionsPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/training" element={<TrainingGroundPage />} />
        <Route path="/deck" element={<DeckBuilderPage />} />
        <Route path="/duel" element={<DuelPage />} />
      </Routes>
    </div>
  );
}

function NavBar() {
  const { user, isLoading } = useAuth();
  const linkStyle: React.CSSProperties = {
    color: "#d4a373", textDecoration: "none", fontSize: 16,
    padding: "8px 16px", borderBottom: "2px solid transparent",
    transition: "all 0.2s",
  };
  return (
    <nav style={{
      display: "flex", gap: 8, padding: "12px 24px",
      alignItems: "center", background: "#0d0a0a80", backdropFilter: "blur(8px)",
      borderBottom: "1px solid #3b2f2f",
    }}>
      <span style={{ fontSize: 20, fontWeight: "bold", color: "#f5e6c8", marginRight: 20 }}>
        🥋 武林争霸
      </span>
      <Link to="/" style={linkStyle}>首页</Link>
      <Link to="/factions" style={linkStyle}>师门</Link>
      <Link to="/cards" style={linkStyle}>卡牌</Link>
      <Link to="/training" style={linkStyle}>习武场</Link>
      <Link to="/deck" style={linkStyle}>演武场</Link>
      <Link to="/duel" style={linkStyle}>比武场</Link>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {isLoading ? (
          <span style={{ fontSize: 12, color: "#6a5a4a" }}>...</span>
        ) : user ? (
          <>
            <span style={{ fontSize: 14, color: "#f5e6c8" }}>
              🥷 {user.username}
            </span>
            <a
              href="/oauth2/sign_out"
              style={{
                fontSize: 12, color: "#8B7D6B", textDecoration: "none",
                padding: "2px 8px", border: "1px solid #4E342E", borderRadius: 4,
              }}
            >
              退出
            </a>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "#6a5a4a" }}>未登录</span>
        )}
      </div>
    </nav>
  );
}

export default App;
