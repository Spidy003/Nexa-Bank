import { useEffect, useState } from "react";

interface AuraOrbProps {
  status: "idle" | "listening" | "speaking" | "processing";
  onClick: () => void;
}

const AuraOrb = ({ status, onClick }: AuraOrbProps) => {
  const [bars, setBars] = useState<number[]>(Array(20).fill(5));

  useEffect(() => {
    if (status === "listening" || status === "speaking") {
      const interval = setInterval(() => {
        setBars(Array(20).fill(0).map(() => Math.random() * 28 + 4));
      }, 75);
      return () => clearInterval(interval);
    }
    setBars(Array(20).fill(5));
  }, [status]);

  const config = {
    idle:       { bg: "linear-gradient(135deg,#1a237e 0%,#0d47a1 100%)", glow: "rgba(26,35,126,0.35)", label: "TAP TO BEGIN", ring: false, barColor: "rgba(79,110,247,0.4)" },
    listening:  { bg: "linear-gradient(135deg,#4F6EF7 0%,#3B82F6 100%)",  glow: "rgba(79,110,247,0.6)",  label: "LISTENING...",  ring: true,  barColor: "#4F6EF7" },
    speaking:   { bg: "linear-gradient(135deg,#10B981 0%,#22C55E 100%)",  glow: "rgba(16,185,129,0.6)",  label: "SPEAKING...",   ring: true,  barColor: "#10B981" },
    processing: { bg: "linear-gradient(135deg,#7C3AED 0%,#A855F7 100%)", glow: "rgba(124,58,237,0.6)", label: "PROCESSING...", ring: false, barColor: "#7C3AED" },
  }[status];

  const animClass = {
    idle:       "",
    listening:  "animate-orb-listening",
    speaking:   "animate-orb-pulse",
    processing: "animate-orb-thinking",
  }[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      
      {/* Waveform visualiser */}
      <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 38 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 3,
            height: `${h}px`,
            background: config.barColor,
            transition: "height 0.07s ease",
            opacity: status === "idle" ? 0.25 : 0.5 + (h / 36) * 0.5,
            boxShadow: status !== "idle" ? `0 0 6px ${config.barColor}66` : "none",
          }} />
        ))}
      </div>

      {/* Orb button */}
      <button
        onClick={onClick}
        style={{ position: "relative", cursor: "pointer", background: "transparent", border: "none", padding: 0, outline: "none" }}
        aria-label={config.label}
      >
        {/* Ripple rings */}
        {config.ring && (<>
          <div style={{ position: "absolute", inset: -12, borderRadius: "50%", border: `2px solid ${config.glow.replace("0.6", "0.4")}`, animation: "orbRingPulse 2s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: -24, borderRadius: "50%", border: `1.5px solid ${config.glow.replace("0.6", "0.2")}`, animation: "orbRingPulse 2s ease-in-out infinite 0.5s" }} />
          <div style={{ position: "absolute", inset: -38, borderRadius: "50%", border: `1px solid ${config.glow.replace("0.6", "0.1")}`, animation: "orbRingPulse 2s ease-in-out infinite 1s" }} />
        </>)}

        {/* Glass outer ring */}
        <div style={{
          width: 108, height: 108,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          {/* Main orb */}
          <div style={{
            width: 94, height: 94,
            borderRadius: "50%",
            background: config.bg,
            boxShadow: `0 0 40px ${config.glow}, 0 8px 32px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.25)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            position: "relative",
            overflow: "hidden",
          }} className={animClass}>
            {/* Sheen on orb */}
            <div style={{
              position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
              width: 36, height: 16, borderRadius: 20,
              background: "rgba(255,255,255,0.25)",
              filter: "blur(4px)",
            }} />
            {/* Inner ₹ symbol */}
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 900, fontSize: "1.2rem", color: "white",
              textShadow: "0 0 12px rgba(255,255,255,0.6)",
            }}>₹</div>
          </div>
        </div>
      </button>

      {/* Status label */}
      <div style={{
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(18px) saturate(1.8)",
        border: "1px solid rgba(79,110,247,0.15)",
        borderRadius: 24,
        padding: "5px 18px",
        fontFamily: "var(--font-mono)",
        fontWeight: 800, fontSize: "0.62rem", letterSpacing: "0.14em",
        color: status === "idle" ? "var(--ink-muted)" : "var(--accent)",
        boxShadow: status !== "idle" ? "0 0 16px rgba(79,110,247,0.1)" : "none",
        transition: "all 0.3s ease",
      }}>
        {config.label}
      </div>
    </div>
  );
};

export default AuraOrb;
