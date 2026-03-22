import { Check, PartyPopper, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessScreenProps {
  accountNumber?: string;
  message: string;
  visible: boolean;
}

const SuccessScreen = ({ accountNumber, message, visible }: SuccessScreenProps) => {
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (visible) {
      const colors = ["#4F6EF7", "#7C3AED", "#10B981", "#F59E0B", "#EC4899"];
      setStars(Array.from({ length: 24 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 10,
        delay: Math.random() * 0.8,
        color: colors[i % colors.length],
      })));
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(240,242,252,0.7)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      animation: "fadeInUp 0.4s ease forwards",
    }}>
      {/* Particle stars */}
      {stars.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: "50%",
          background: s.color,
          boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
          animationDelay: `${s.delay}s`,
        }} className="particle" />
      ))}

      {/* Main card */}
      <div style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: 28,
        padding: "3rem 2.5rem",
        textAlign: "center",
        maxWidth: 420,
        width: "90%",
        boxShadow: "0 32px 80px rgba(16,185,129,0.2), 0 8px 32px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden",
        animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
      }}>
        {/* Top shimmer */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: "linear-gradient(90deg, #4F6EF7, #7C3AED, #10B981, #7C3AED, #4F6EF7)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        }} />

        {/* Checkmark */}
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(34,197,94,0.1))",
          border: "2px solid rgba(16,185,129,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
          boxShadow: "0 0 0 0 rgba(16,185,129,0.4)",
        }} className="animate-success-glow">
          <Check size={42} strokeWidth={2.5} style={{ color: "#10B981" }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <PartyPopper size={20} style={{ color: "#F59E0B" }} />
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "1.6rem", color: "var(--ink)",
            margin: 0,
          }}>Success!</h2>
          <Sparkles size={20} style={{ color: "#7C3AED" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-main)", fontSize: "0.9rem",
          color: "var(--ink-muted)", lineHeight: 1.65, marginBottom: "1.25rem",
        }}>{message}</p>

        {accountNumber && (
          <div style={{
            background: "linear-gradient(135deg, rgba(79,110,247,0.08), rgba(124,58,237,0.06))",
            border: "1px solid rgba(79,110,247,0.2)",
            borderRadius: 16, padding: "1rem 1.5rem", marginTop: "0.5rem",
          }}>
            <span style={{
              display: "block", fontSize: "0.65rem", fontFamily: "var(--font-mono)",
              fontWeight: 700, color: "var(--accent)", letterSpacing: "0.18em",
              marginBottom: 6, textTransform: "uppercase",
            }}>Reference Number</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontWeight: 800,
              fontSize: "1.3rem", color: "var(--ink)",
              letterSpacing: "0.08em",
            }}>{accountNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessScreen;
