import { useEffect, useRef } from "react";
import ChatLoader from "./ChatLoader";

interface Message { role: "user" | "ai"; text: string; }
interface ConversationPanelProps { messages: Message[]; isVisible: boolean; status?: string; }

const VISIBLE_COUNT = 5;

const ConversationPanel = ({ messages, isVisible, status }: ConversationPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  if (!isVisible || (messages.length === 0 && status !== "processing")) return null;

  const visible = messages.slice(-VISIBLE_COUNT);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          padding: "10px 4px",
          scrollbarWidth: "none"
        }}
      >
        {messages.length > VISIBLE_COUNT && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            fontWeight: 700,
            color: "var(--ink-soft)",
            textAlign: "center",
            borderBottom: "1px solid rgba(79,110,247,0.12)",
            paddingBottom: 8,
            marginBottom: 4,
            letterSpacing: "0.08em",
          }}>
            ↑ {messages.length - VISIBLE_COUNT} earlier message{messages.length - VISIBLE_COUNT > 1 ? "s" : ""}
          </div>
        )}

        {visible.map((msg, i) => (
          <div
            key={messages.length - VISIBLE_COUNT + i}
            className={msg.role === "ai" ? "bubble-ai" : "bubble-user"}
            style={{ animation: `fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both` }}
          >
            {msg.role === "ai" && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: "0.58rem",
                letterSpacing: "0.14em",
                color: "var(--accent)",
                marginBottom: 5,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "inline-block",
                    boxShadow: "0 0 6px var(--accent)"
                  }}
                  className="animate-blink"
                />
                AURA AI
              </div>
            )}

            {msg.role === "user" && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: "0.58rem",
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.65)",
                marginBottom: 5,
              }}>
                YOU
              </div>
            )}

            <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.8rem" }}>
              {msg.text}
            </p>
          </div>
        ))}
        
        {status === "processing" && (
          <ChatLoader />
        )}
      </div>
    </div>
  );
};

export default ConversationPanel;