import { FACTIONS, PresetCard, getAllPresetCards } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";
import { api } from "@school-of-one/api-client";
import type { CustomCardResponse } from "@school-of-one/api-client";
import { useState, useMemo, useEffect } from "react";

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

/** 从 localStorage 读取卡组 */
function loadDeck(): { starterId: string | null; normalIds: string[] } {
  try {
    const raw = localStorage.getItem("duelDeck");
    if (!raw) return { starterId: null, normalIds: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 兼容旧格式：纯 string[]，没有起手式
      return { starterId: null, normalIds: parsed };
    }
    return { starterId: parsed.starterId ?? null, normalIds: parsed.normalIds ?? [] };
  } catch {
    return { starterId: null, normalIds: [] };
  }
}

/** 保存卡组到 localStorage */
function saveDeck(starterId: string | null, normalIds: string[]) {
  localStorage.setItem("duelDeck", JSON.stringify({ starterId, normalIds }));
}

const allCards = getAllPresetCards() as PresetCard[];

export function DeckBuilderPage() {
  const books = useMemo(() => buildBooks(), []);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  const [starterId, setStarterId] = useState<string | null>(() => loadDeck().starterId);
  const [normalIds, setNormalIds] = useState<string[]>(() => loadDeck().normalIds);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [customCards, setCustomCards] = useState<CustomCardResponse[]>([]);

  // 合并查找：先查预设卡牌，无结果再查自定义
  function findCard(id: string): PresetCard | undefined {
    return allCards.find((c) => c.id === id) ?? customCards.find((cc) => cc.cardId === id) as PresetCard | undefined;
  }

  // 加载已解锁卡牌 + 自创卡牌
  useEffect(() => {
    api.cards.mine()
      .then((res) => setUnlockedIds(new Set(res.cardIds)))
      .catch(() => {}); // 离线模式不限制
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

  // 合并书架
  const allBooks = useMemo(() => {
    if (!hermitBook) return books;
    return [...books, hermitBook];
  }, [books, hermitBook]);

  const MIN_NORMAL = 14;
  const MAX_NORMAL = 29;
  const deckValid = starterId !== null && normalIds.length >= MIN_NORMAL && normalIds.length <= MAX_NORMAL;

  // 选择/取消起手式
  const toggleStarter = (id: string) => {
    setStarterId((prev) => {
      const next = prev === id ? null : id;
      saveDeck(next, normalIds);
      return next;
    });
  };

  // 选择/取消普通卡牌
  const toggleNormal = (id: string) => {
    setNormalIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((d) => d !== id)
        : prev.length >= MAX_NORMAL ? prev : [...prev, id];
      saveDeck(starterId, next);
      return next;
    });
  };

  const activeBook = activeSubId ? allBooks.find((b) => b.subId === activeSubId) : null;

  // 书架视图
  if (!activeBook) {
    // 收集所有起手式卡牌
    const allStarters = allCards.filter((c) => c.isStarter && c.gameId === "martial-hegemony");

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* 顶栏 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, color: "#f5e6c8", margin: 0 }}>
             演武场
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#8B7D6B" }}>
              招式:{" "}
              <span style={{ color: normalIds.length >= MAX_NORMAL ? "#EF5350" : "#d4a373" }}>
                {normalIds.length}
              </span>
              /{MAX_NORMAL}
            </div>
            <div style={{
              fontSize: 13, padding: "4px 12px", borderRadius: 4,
              background: deckValid ? "#1b5e20" : "#3b2f2f",
              color: deckValid ? "#a5d6a7" : "#5a4a3a",
            }}>
              {deckValid ? "卡组就绪 ✓" : "卡组不完整"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 2 }}>
            {/* ── 起手式（顶置，始终可见） ── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 14, color: "#d4a373", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚔️ 起手式</span>
                <span style={{ fontSize: 11, color: "#5a4a3a" }}>必须且只能选一张</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {allStarters.map((card) => {
                  const selected = starterId === card.id;
                  const owned = unlockedIds.has(card.id);
                  if (!owned) return null;
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleStarter(card.id)}
                      style={{
                        cursor: "pointer", transition: "all 0.2s", position: "relative",
                        opacity: selected ? 1 : 0.55,
                        outline: selected ? "2px solid #d4a373" : "none",
                        borderRadius: 8,
                      }}
                    >
                      <CardComponent card={card} size="sm" state={selected ? "default" : "disabled"} />
                      {selected && (
                        <div style={{ position: "absolute", top: -4, right: -4, fontSize: 18 }}>⭐</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 书架（普通招式） ── */}
            <div>
              <div style={{ fontSize: 14, color: "#f5e6c8", marginBottom: 12 }}>
                📖 拳谱（选招入组）
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 20,
              }}>
                {allBooks.map((book) => {
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
                      {book.factionName} · {book.cards.length}式
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右侧：卡组面板 */}
          <div style={{
            flex: 1, minWidth: 200,
            background: "linear-gradient(145deg, #2d2320, #1a1414)",
            border: "1px solid #4E342E", borderRadius: 12,
            padding: 16, maxHeight: "80vh", overflowY: "auto",
            alignSelf: "flex-start",
          }}>
            <h3 style={{ fontSize: 13, color: "#f5e6c8", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📜 卡组</span>
              <span style={{ fontSize: 10, color: "#8B7D6B" }}>
                ({normalIds.length + (starterId ? 1 : 0)}/30)
              </span>
            </h3>

            {/* 起手式槽位 */}
            <div style={{
              padding: "8px 10px", marginBottom: 12, borderRadius: 6,
              background: starterId ? "rgba(212,163,115,0.08)" : "#1a1414",
              border: starterId ? "1px solid #d4a373" : "1px dashed #5a4a3a",
              fontSize: 12,
            }}>
              {starterId ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#d4a373" }}>
                    ⭐ {findCard(starterId)?.name ?? starterId}
                  </span>
                  <span onClick={() => toggleStarter(starterId)}
                    style={{ color: "#EF5350", cursor: "pointer", fontSize: 10, marginLeft: 8 }}>
                    移除
                  </span>
                </div>
              ) : (
                <span style={{ color: "#5a4a3a" }}>起手式（未选）</span>
              )}
            </div>

            {/* 普通招式 */}
            {normalIds.length === 0 && !starterId ? (
              <div style={{ fontSize: 12, color: "#5a4a3a", textAlign: "center", padding: 20 }}>
                从拳谱选招入组
              </div>
            ) : (
              normalIds.map((id) => {
                const card = findCard(id);
                return card ? (
                  <div key={id} onClick={() => toggleNormal(id)}
                    style={{
                      padding: "5px 8px", marginBottom: 3, borderRadius: 4,
                      background: "#1a1414", border: "1px solid #3b2f2f",
                      cursor: "pointer", fontSize: 11,
                      display: "flex", justifyContent: "space-between",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d4a373"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3b2f2f"; }}>
                    <span style={{ color: "#e8dcc8" }}>{card.name}</span>
                    <span style={{ color: "#8B7D6B", fontSize: 9 }}>{"subtitle" in card && card.subtitle ? card.subtitle : ""}</span>
                  </div>
                ) : null;
              })
            )}

            {!deckValid && (starterId === null || normalIds.length < MIN_NORMAL) && (
              <div style={{ fontSize: 10, color: "#EF5350", marginTop: 8, textAlign: "center" }}>
                {starterId === null ? "请选择一张起手式" : `还需 ${MIN_NORMAL - normalIds.length} 张招式卡牌`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 打开拳谱内页
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div onClick={() => setActiveSubId(null)}
            style={{
              display: "inline-block", marginBottom: 12,
              padding: "6px 16px", border: "1px solid #b8956a",
              cursor: "pointer", fontSize: 13, letterSpacing: 2,
              transition: "all 0.2s", color: "#d4a373",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,100,55,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            ← 返回书架
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: "#f5e6c8" }}>
            {activeBook.factionIcon} {activeBook.subName}
          </div>
          <div style={{ fontSize: 13, color: "#8B7D6B", marginTop: 4 }}>
            {activeBook.factionName} · {activeBook.subDesc} · {activeBook.cards.length}式
            <span style={{ marginLeft: 16, color: "#d4a373" }}>（点击选招，再点取消）</span>
          </div>
        </div>
        <div style={{ fontSize: 14, color: "#8B7D6B", textAlign: "right" }}>
          卡组:{" "}
          <span style={{ color: normalIds.length >= MAX_NORMAL ? "#EF5350" : "#d4a373" }}>
            {normalIds.length + (starterId ? 1 : 0)}
          </span>
          /30
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16, justifyItems: "center",
      }}>
        {activeBook.cards.map((card) => {
          const owned = unlockedIds.has(card.id);
          const inDeck = normalIds.includes(card.id);
          const isStarterCard = card.isStarter;
          if (!owned) return null;
          return (
            <div key={card.id}
              onClick={() => isStarterCard ? toggleStarter(card.id) : toggleNormal(card.id)}
              style={{
                cursor: "pointer", transition: "all 0.2s",
                opacity: inDeck ? 0.4 : 1,
                position: "relative",
              }}>
              <CardComponent card={card} size="sm"
                state={inDeck ? "disabled" : "default"} />
              <div style={{ fontSize: 11, color: "#8B7D6B", marginTop: 4, textAlign: "center" }}>
                📍 {card.displacement >= 0 ? "+" : ""}{card.displacement}m
              </div>
              {isStarterCard && (
                <div style={{ fontSize: 9, color: "#d4a373", textAlign: "center" }}>
                  起手式
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 浮动卡组 */}
      <div style={{
        position: "fixed", right: 24, top: 100, width: 200,
        background: "linear-gradient(145deg, #2d2320, #1a1414)",
        border: "1px solid #4E342E", borderRadius: 12,
        padding: 16, maxHeight: "70vh", overflowY: "auto",
        zIndex: 50,
      }}>
        <h3 style={{ fontSize: 13, color: "#f5e6c8", margin: "0 0 8px 0" }}>
          己方卡组 ({normalIds.length + (starterId ? 1 : 0)})
        </h3>
        {starterId && (
          <div style={{ padding: "4px 8px", marginBottom: 3, borderRadius: 4,
            background: "#1a1414", border: "1px solid #d4a373", fontSize: 11 }}>
            <span style={{ color: "#d4a373" }}>⭐ {findCard(starterId)?.name}</span>
          </div>
        )}
        {normalIds.map((id) => {
          const card = findCard(id);
          return card ? (
            <div key={id} onClick={() => toggleNormal(id)}
              style={{
                padding: "4px 8px", marginBottom: 3, borderRadius: 4,
                background: "#1a1414", border: "1px solid #3b2f2f",
                cursor: "pointer", fontSize: 11,
                display: "flex", justifyContent: "space-between",
              }}>
              <span style={{ color: "#e8dcc8" }}>{card.name}</span>
              <span style={{ color: "#8B7D6B", fontSize: 9 }}>{"subtitle" in card && card.subtitle ? card.subtitle : ""}</span>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
