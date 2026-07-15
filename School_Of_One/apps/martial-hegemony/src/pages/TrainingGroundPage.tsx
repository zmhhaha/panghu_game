import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FACTIONS, getAllPresetCards, PresetCard } from "@school-of-one/core";
import { CardComponent } from "@school-of-one/ui-core";

// Types
type PagePhase = "select" | "training" | "result";

interface MasterMsg {
  role: "master";
  content: string;
  matchedCard?: { id: string; name: string; confidence: number; reason: string };
}
interface PlayerMsg {
  role: "player";
  content: string;
}
interface SystemMsg {
  role: "system";
  content: string;
}
type Message = MasterMsg | PlayerMsg | SystemMsg;

interface SessionInfo {
  sessionId: string;
  factionName: string;
  masterName: string;
  maxRounds: number;
}

// API helpers
async function startTraining(factionId: string): Promise<SessionInfo> {
  const res = await fetch("/api/ai/training/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factionId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "开始习武失败");
  return res.json();
}

async function submitRound(
  sessionId: string,
  description: string
): Promise<{
  roundNum: number;
  masterFeedback: string;
  matchedCardId: string;
  matchedCardName: string;
  confidence: number;
  matchReason: string;
  recommendedSubstyle: string;
  completed: boolean;
}> {
  const res = await fetch("/api/ai/training/round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, description }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "提交失败");
  return res.json();
}

async function finalMatch(sessionId: string): Promise<{
  finalCardId: string;
  finalCardName: string;
  finalConfidence: number;
  matchExplanation: string;
  masterSummary: string;
  substyleName: string;
  totalRounds: number;
}> {
  const res = await fetch("/api/ai/training/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "获取结果失败");
  return res.json();
}

// Group icons
const GROUP_ICONS: Record<string, string> = {
  shaolin: "",
  wudang: "",
  northern: "",
  southern: "",
};

// ============================================================
// Main Component
// ============================================================
export function TrainingGroundPage() {
  const [phase, setPhase] = useState<PagePhase>("select");
  const [selectedFaction, setSelectedFaction] = useState<
    (typeof FACTIONS)[number] | null
  >(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [completed, setCompleted] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    card: PresetCard | null;
    confidence: number;
    summary: string;
    substyle: string;
    totalRounds: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Step 1: Select a faction
  const handleSelectFaction = async (faction: (typeof FACTIONS)[number]) => {
    setIsLoading(true);
    setSelectedFaction(faction);
    setError(null);

    try {
      const info = await startTraining(faction.id);
      setSession(info);
      setPhase("training");
      setMessages([
        {
          role: "master",
          content: `贫僧${info.masterName}。既入我${info.factionName}门下，且说来听听——你心中构想的招式，是怎样的？`,
        },
        {
          role: "system",
          content: `共可习武 ${info.maxRounds} 轮，每轮描述你构想的招式，大师会给出指导。`,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "大师正在禅定，请稍后再试");
      setSelectedFaction(null);
    }
    setIsLoading(false);
  };

  // Step 2: Submit a round
  const handleSubmitDescription = async () => {
    const text = inputText.trim();
    if (!text || !session || completed) return;

    setMessages((prev) => [...prev, { role: "player", content: text }]);
    setInputText("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await submitRound(session.sessionId, text);

      const masterMsg: MasterMsg = {
        role: "master",
        content: result.masterFeedback,
        matchedCard: {
          id: result.matchedCardId,
          name: result.matchedCardName,
          confidence: result.confidence,
          reason: result.matchReason,
        },
      };
      const newMsgs: Message[] = [masterMsg];

      if (result.completed) {
        newMsgs.push({
          role: "system",
          content: ` 大师觉得你的招式已趋成熟（confidence: ${(result.confidence * 100).toFixed(0)}%），习武完成！`,
        });
        setCompleted(true);
      } else if (result.confidence > 0.5) {
        newMsgs.push({
          role: "system",
          content: ` 大师已有些许眉目（匹配度 ${(result.confidence * 100).toFixed(0)}%），继续打磨可更精确。`,
        });
      }

      setMessages((prev) => [...prev, ...newMsgs]);
    } catch (err: any) {
      setError(err.message || "大师正在思索，请稍后再试");
      setMessages((prev) => prev.slice(0, -1));
    }
    setIsLoading(false);
  };

  // Step 3: View final result
  const handleViewResult = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await finalMatch(session.sessionId);
      const cards = getAllPresetCards() as PresetCard[];
      const matchedCard = cards.find((c) => c.id === result.finalCardId) || null;

      setMatchResult({
        card: matchedCard,
        confidence: result.finalConfidence,
        summary: result.masterSummary,
        substyle: result.substyleName,
        totalRounds: result.totalRounds,
      });
      setPhase("result");
    } catch (err: any) {
      setError(err.message || "获取最终结果失败");
    }
    setIsLoading(false);
  };

  // Reset
  const handleReset = () => {
    setPhase("select");
    setSelectedFaction(null);
    setSession(null);
    setMessages([]);
    setCompleted(false);
    setMatchResult(null);
    setInputText("");
    setError(null);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitDescription();
    }
  };

  // ============================================================
  // Renders
  // ============================================================

  if (phase === "select") {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <h2
          style={{
            fontSize: 24,
            color: "#f5e6c8",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
           习武场
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#8B7D6B",
            marginBottom: 32,
          }}
        >
          选一位师傅，描述你心中构想的招式，让师傅打磨纠偏
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {FACTIONS.map((faction) => (
            <div
              key={faction.id}
              onClick={() => handleSelectFaction(faction)}
              style={{
                background: "linear-gradient(145deg, #2d2320, #1a1414)",
                border: "1px solid #4E342E",
                borderRadius: 12,
                padding: 24,
                cursor: isLoading ? "wait" : "pointer",
                transition: "all 0.2s",
                opacity: isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#d4a373";
                e.currentTarget.style.background =
                  "linear-gradient(145deg, #3b2f2f, #2d2320)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#4E342E";
                e.currentTarget.style.background =
                  "linear-gradient(145deg, #2d2320, #1a1414)";
              }}
            >
              <div style={{ fontSize: 28 }}>
                {GROUP_ICONS[faction.group]}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                  color: "#f5e6c8",
                }}
              >
                {faction.name}
              </div>
              <div
                style={{ fontSize: 12, color: "#8B7D6B", marginTop: 4 }}
              >
                师傅：{faction.masterName}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#a09080",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                {faction.description}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 12,
                  flexWrap: "wrap",
                }}
              >
                {faction.subStyles.map((s) => (
                  <span
                    key={s.id}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      background: "#3b2f2f",
                      color: "#d4a373",
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Hermit */}
        <div
          style={{
            textAlign: "center",
            background: "linear-gradient(145deg, #1a1a2e, #0d0d1a)",
            border: "1px solid #4A0080",
            borderRadius: 12,
            padding: 32,
            cursor: "pointer",
            opacity: 0.6,
          }}
          title="即将开放"
        >
          <div style={{ fontSize: 48 }}></div>
          <div
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 8,
              color: "#b388ff",
            }}
          >
            世外高人
          </div>
          <div style={{ fontSize: 13, color: "#7c4dff88", marginTop: 4 }}>
            突破门派限制，自创独门绝技（即将开放）
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 24,
              padding: 12,
              background: "#3b1a1a",
              border: "1px solid #c62828",
              borderRadius: 8,
              color: "#ef9a9a",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  if (phase === "training") {
    const remaining = session
      ? session.maxRounds -
        messages.filter((m) => m.role === "master").length
      : 0;

    return (
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 60px)",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid #3b2f2f",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>
              {selectedFaction ? GROUP_ICONS[selectedFaction.group] : ""}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#f5e6c8" }}>
                {session?.factionName}
              </div>
              <div style={{ fontSize: 12, color: "#8B7D6B" }}>
                {session?.masterName}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 12,
                color: completed ? "#4caf50" : "#d4a373",
              }}
            >
              {completed
                ? " 习武完成"
                : `第 ${messages.filter((m) => m.role === "master").length}/${session?.maxRounds || 5} 轮`}
            </span>
            <button
              onClick={handleReset}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "1px solid #4E342E",
                background: "transparent",
                color: "#8B7D6B",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              退出
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flexGrow: 1,
            overflowY: "auto",
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((msg, i) => {
            if (msg.role === "system") {
              return (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "#6a5a4a",
                    padding: "6px 12px",
                    background: "#1a1414",
                    borderRadius: 8,
                    alignSelf: "center",
                    maxWidth: "80%",
                  }}
                >
                  {msg.content}
                </div>
              );
            }
            if (msg.role === "master") {
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    maxWidth: "85%",
                    alignSelf: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#3b2f2f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    
                  </div>
                  <div
                    style={{
                      background: "#2d2320",
                      border: "1px solid #4E342E",
                      borderRadius: "0 12px 12px 12px",
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#d4a373",
                        fontWeight: "bold",
                        marginBottom: 6,
                      }}
                    >
                      {session?.masterName}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#e8dcc8",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.matchedCard && msg.matchedCard.name && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "8px 12px",
                          background: "#1a1414",
                          borderRadius: 8,
                          border: "1px solid #4E342E",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#8B7D6B",
                            marginBottom: 4,
                          }}
                        >
                          匹配招式
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#d4a373",
                            fontWeight: "bold",
                          }}
                        >
                          {msg.matchedCard.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#a09080", marginTop: 2 }}>
                          匹配度：{(msg.matchedCard.confidence * 100).toFixed(0)}%
                        </div>
                        {msg.matchedCard.reason && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8B7D6B",
                              marginTop: 2,
                            }}
                          >
                            {msg.matchedCard.reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            // Player message
            return (
              <div
                key={i}
                style={{
                  maxWidth: "80%",
                  alignSelf: "flex-end",
                  background: "#3b2f2f",
                  border: "1px solid #4E342E",
                  borderRadius: "12px 0 12px 12px",
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#d4a373",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  你
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#e8dcc8",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                maxWidth: "85%",
                alignSelf: "flex-start",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#3b2f2f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                
              </div>
              <div
                style={{
                  background: "#2d2320",
                  border: "1px solid #4E342E",
                  borderRadius: "0 12px 12px 12px",
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#8B7D6B",
                    fontStyle: "italic",
                  }}
                >
                  大师正在思考...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: 10,
              marginBottom: 8,
              background: "#3b1a1a",
              border: "1px solid #c62828",
              borderRadius: 8,
              color: "#ef9a9a",
              fontSize: 12,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {error}
          </div>
        )}

        {/* Input area */}
        <div
          style={{
            padding: "12px 0",
            borderTop: "1px solid #3b2f2f",
            flexShrink: 0,
          }}
        >
          {completed ? (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleViewResult}
                disabled={isLoading}
                style={{
                  flexGrow: 1,
                  padding: "12px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "2px solid #d4a373",
                  background: "#4E342E",
                  color: "#f5e6c8",
                  cursor: isLoading ? "wait" : "pointer",
                  fontWeight: "bold",
                }}
              >
                 查看匹配结果
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: "12px 20px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #4E342E",
                  background: "transparent",
                  color: "#8B7D6B",
                  cursor: "pointer",
                }}
              >
                换个门派
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`描述你构想的招式（还可输入 ${remaining} 轮）...`}
                maxLength={500}
                disabled={isLoading}
                style={{
                  flexGrow: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #4E342E",
                  background: "#1a1414",
                  color: "#e8dcc8",
                  fontSize: 14,
                  fontFamily: "'Noto Serif SC', 'KaiTi', serif",
                  resize: "none",
                  minHeight: 44,
                  maxHeight: 120,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSubmitDescription}
                disabled={!inputText.trim() || isLoading}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #d4a373",
                  background:
                    inputText.trim() && !isLoading ? "#4E342E" : "#2d2320",
                  color:
                    inputText.trim() && !isLoading ? "#f5e6c8" : "#6a5a4a",
                  cursor:
                    inputText.trim() && !isLoading ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                出招
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Result view
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      <h2
        style={{
          fontSize: 24,
          color: "#f5e6c8",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
         习武完成！
      </h2>
      <p
        style={{
          textAlign: "center",
          fontSize: 14,
          color: "#8B7D6B",
          marginBottom: 32,
        }}
      >
        经过 {matchResult?.totalRounds || "数"} 轮打磨，大师为你选定了招式
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {matchResult?.card ? (
          <CardComponent card={matchResult.card} size="lg" />
        ) : (
          <div
            style={{
              width: 280,
              height: 420,
              background: "linear-gradient(180deg, #2d2320, #1a1414)",
              border: "2px solid #d4a373",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8B7D6B",
              fontSize: 14,
            }}
          >
            卡牌数据加载中...
          </div>
        )}

        <div style={{ textAlign: "center", maxWidth: 400 }}>
          {matchResult?.card && (
            <div
              style={{
                fontSize: 22,
                color: "#f5e6c8",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              {matchResult.card.name}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#d4a373", marginBottom: 12 }}>
            {matchResult?.substyle || matchResult?.card?.factionId}
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 16,
              background: "#1a2e1a",
              border: "1px solid #4caf50",
              color: "#81c784",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            匹配度 {((matchResult?.confidence ?? 0) * 100).toFixed(0)}%
          </div>
          {matchResult?.summary && (
            <div
              style={{
                fontSize: 14,
                color: "#a09080",
                lineHeight: 1.7,
                fontStyle: "italic",
                padding: "12px 16px",
                background: "#1a1414",
                borderRadius: 8,
                border: "1px solid #3b2f2f",
              }}
            >
              "{matchResult.summary}"
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {matchResult?.card && (
          <button
            onClick={() => navigate("/cards")}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #4E342E",
              background: "#3b2f2f",
              color: "#d4a373",
              cursor: "pointer",
            }}
          >
             查看全部卡牌
          </button>
        )}
        <button
          onClick={handleReset}
          style={{
            padding: "10px 24px",
            fontSize: 14,
            borderRadius: 8,
            border: "2px solid #d4a373",
            background: "#4E342E",
            color: "#f5e6c8",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
           继续习武
        </button>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 24px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #4E342E",
            background: "transparent",
            color: "#8B7D6B",
            cursor: "pointer",
          }}
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
