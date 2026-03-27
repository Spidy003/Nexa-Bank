import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAssistant } from "@/context/AssistantContext";
import AuraOrb from "@/components/AuraOrb";
import FormVisualization from "@/components/FormVisualization";
import ConversationPanel from "@/components/ConversationPanel";
import ServiceMenu from "@/components/ServiceMenu";
import SuccessScreen from "@/components/SuccessScreen";
import BankScene3D from "@/components/BankScene3D";
import { processInput, type SessionData, type Intent, type DocumentStatus } from "@/lib/apiClient";
import { voiceService } from "@/lib/voiceService";
import { Mic, MicOff, Shield, Zap, Sun, Moon, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── LOC Bank logo SVG (inline) ─────────────────────────────────────── */
const BrandLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 34, height: 34 }}>
    <rect x="1" y="1" width="38" height="38" rx="10" stroke="url(#gl)" strokeWidth="1.5" />
    <path d="M20 8L32 16V24L20 32L8 24V16L20 8Z" fill="url(#g2)" opacity="0.9" />
    <path d="M20 13L27 17.5V26.5L20 31L13 26.5V17.5L20 13Z" fill="white" opacity="0.2" />
    <defs>
      <linearGradient id="gl" x1="0" y1="0" x2="40" y2="40">
        <stop stopColor="#00E5FF" /><stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="g2" x1="8" y1="8" x2="32" y2="32">
        <stop stopColor="#0284C7" /><stop offset="1" stopColor="#00E5FF" />
      </linearGradient>
    </defs>
  </svg>
);

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status, setStatus, showBalanceGraph, setShowBalanceGraph, setBalanceData } = useAssistant();
  const [showForm, setShowForm] = useState(false);
  const [transcript, setTranscript] = useState("Tap the orb to start your banking session");
  const [interimText, setInterimText] = useState("");
  const [formData, setFormData] = useState<SessionData>({});
  const [activeField, setActiveField] = useState<string>();
  const [validationResult, setValidationResult] = useState<"valid" | "invalid">();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successAccount, setSuccessAccount] = useState<string>();
  const [currentIntent, setCurrentIntent] = useState<Intent>();
  const [currentSection, setCurrentSection] = useState<string>();
  const [currentProgress, setCurrentProgress] = useState<number>();
  const [currentDocuments, setCurrentDocuments] = useState<DocumentStatus[]>();
  const [conversationLog, setConversationLog] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const sessionId = useRef(Math.random().toString(36).substring(7));
  const [started, setStarted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cameraVoiceTrigger, setCameraVoiceTrigger] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [showTestInput, setShowTestInput] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleUserInput = useCallback(async (text: string) => {
    setStatus("processing");
    setConversationLog(prev => [...prev, { role: "user", text }]);
    
    // Intercept "click" for camera
    const isPhotoField = activeField === "aadhaarFrontPhoto" || activeField === "customerPhoto";
    if (isPhotoField && (text.toLowerCase().includes("click") || text.toLowerCase().includes("snap") || text.toLowerCase().includes("capture"))) {
      setCameraVoiceTrigger(true);
      setTimeout(() => setCameraVoiceTrigger(false), 1000); // Reset for next attempt
      setStatus("idle");
      return;
    }
    
    // 🎙️ Advanced Voice Commands
    const lowerInput = text.toLowerCase();
    
    if (lowerInput.includes("explain") && (lowerInput.includes("graph") || lowerInput.includes("chart") || lowerInput.includes("trend"))) {
      const { balance, history } = useAssistant().balanceData;
      const response = `Certainly! Your balance has seen a positive trend, starting at ₹${history[0].value.toLocaleString()} in ${history[0].month} and reaching ₹${balance.toLocaleString()} by ${history[4].month}. You are currently saving approximately ₹12,500 every month, which is excellent financial behavior.`;
      setConversationLog(prev => [...prev, { role: "ai", text: response }]);
      setStatus("speaking");
      await voiceService.speak(response);
      setStatus("idle");
      return;
    }

    if (lowerInput.includes("show") && (lowerInput.includes("offer") || lowerInput.includes("suggestion"))) {
      useAssistant().setTriggerOffer(true);
      const response = "Certainly, I've brought up some personalized financial offers for you in the bottom right corner.";
      setConversationLog(prev => [...prev, { role: "ai", text: response }]);
      setStatus("speaking");
      await voiceService.speak(response);
      setStatus("idle");
      return;
    }

    if (lowerInput.includes("hide") || lowerInput.includes("close") || lowerInput.includes("back") || lowerInput.includes("ok") || lowerInput.includes("thanks")) {
      if (showBalanceGraph) {
        setShowBalanceGraph(false);
        const response = "Closing the balance visualization. How else can I help you?";
        setConversationLog(prev => [...prev, { role: "ai", text: response }]);
        setStatus("speaking");
        await voiceService.speak(response);
        setStatus("idle");
        return;
      }
    }

    await new Promise(r => setTimeout(r, 200));

    const response = await processInput(sessionId.current, text);

    if (response.intent) setCurrentIntent(response.intent);
    if (response.section) setCurrentSection(response.section);
    if (response.progress !== undefined) setCurrentProgress(response.progress);
    if (response.documents) setCurrentDocuments(response.documents);
    if (response.field && response.field !== "theme" && response.field !== "language") { setActiveField(response.field); setShowForm(true); }
    setValidationResult(response.validationResult ?? undefined);
    if (response.formData) setFormData({ ...response.formData });

    // Handle System Control Intents (Theme / Language)
    if (response.field === "theme" && response.value) {
      const t = response.value as "dark" | "light";
      setTheme(t);
      document.documentElement.setAttribute('data-theme', t);
    }
    if (response.field === "language" && response.value) {
      voiceService.setLanguage(response.value);
    }

    setConversationLog(prev => [...prev, { role: "ai", text: response.speak }]);

    if (response.final) {
      if (response.intent === "BALANCE_CHECK") {
        setShowBalanceGraph(true);
        setShowForm(false);
      }
      setSuccessMessage(response.speak);
      setSuccessAccount(response.value);
      if (response.field === "success") {
        const isBalance = response.intent === "BALANCE_CHECK";
        setTimeout(() => setShowSuccess(true), 500);
        
        // Auto-hide success modal, but DON'T reset to menu if it's the balance graph
        setTimeout(() => {
          setShowSuccess(false);
          if (isBalance) {
            if (response.metadata?.balance_data) {
              setBalanceData(response.metadata.balance_data);
            }
            // Redirect to the new Showcase page for the "Insane" animation
            navigate('/showcase');
          } else {
            setShowForm(false);
            setFormData({});
            setActiveField(undefined);
            setCurrentIntent(undefined);
            setCurrentSection(undefined);
            setCurrentProgress(undefined);
            setCurrentDocuments(undefined);
            setTranscript("How else can I help you?");
          }
        }, isBalance ? 2000 : 8000);
      }
    }
    await voiceService.speak(response.speak);
  }, [status, activeField, showBalanceGraph, navigate, setShowBalanceGraph, setBalanceData, setStatus]);

  // Listen for automated intents from Showcase Page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    if (intent === 'fixed_deposit' && started) {
      handleUserInput("Fixed Deposit");
      // Clean up URL so it doesn't re-trigger
      window.history.replaceState({}, document.title, "/");
    }
  }, [started, handleUserInput]);

  useEffect(() => {
    voiceService.setCallbacks(
      (text) => { setTranscript(text); setInterimText(""); handleUserInput(text); },
      (text) => { setInterimText(text); },
      setStatus,
    );
  }, [handleUserInput, setStatus]);

  const handleOrbClick = useCallback(async () => {
    if (status === "listening") { voiceService.stopListening(); return; }
    if (status === "speaking") return;
    if (!started) {
      setStarted(true);
      const welcome = "Welcome to LOC Bank AI Assistant. You can choose to speak in English, Hindi, or Marathi. Additionally, if you'd like to change to dark or light mode, just ask. How can I assist you today?";
      setTranscript("READY");
      setConversationLog([{ role: "ai", text: welcome }]);
      await voiceService.speak(welcome);
      voiceService.startListening();
    } else {
      voiceService.startListening();
    }
  }, [status, started]);

  /* ── status dot color ───────── */
  const dotColor =
    status === "listening" ? "#00E5FF" :
      status === "speaking" ? "#10B981" :
        status === "processing" ? "#0284C7" : "#475569";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "transparent", overflow: "hidden" }}>

      {/* 3D Cyber Grid Background */}
      <div className="cyber-grid-wrapper">
        <div className="cyber-grid" />
      </div>

      {/* Breathing Neon Aurora */}
      <div className="cyber-aurora" />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0, position: "relative", zIndex: 20,
        background: "rgba(10,15,28,0.72)",
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0.7rem 1.8rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandLogo />
          <div>
            <div className="brand-name">LOC Bank</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.58rem", letterSpacing: "0.18em", color: "var(--ink-soft)", marginTop: 1 }}>
              AI KIOSK · RBI COMPLIANT · AADHAAR eKYC
            </div>
          </div>
        </div>

        {/* Center marquee strip */}
        <div style={{
          flex: 1, margin: "0 24px", overflow: "hidden",
          background: "rgba(15,23,42,0.6)", borderRadius: 20,
          padding: "4px 0",
          border: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
        }}>
          <div className="marquee-track" style={{ gap: 48, color: "var(--ink-soft)", fontSize: "0.62rem", fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "0.12em" }}>
            {["ACCOUNT OPENING", "BALANCE CHECK", "FUND TRANSFER", "LOAN APPLICATION", "FIXED DEPOSIT", "CARD SERVICES", "CHEQUE SERVICE", "GRIEVANCE HANDLING",
              "ACCOUNT OPENING", "BALANCE CHECK", "FUND TRANSFER", "LOAN APPLICATION", "FIXED DEPOSIT", "CARD SERVICES", "CHEQUE SERVICE", "GRIEVANCE HANDLING",
            ].map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Status & Theme */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={toggleTheme} className="neo-btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--glass-border)', cursor: 'pointer' }} title="Toggle Theme (Light/Dark)">
            {theme === 'dark' ? <Sun size={14} color="var(--ink)" /> : <Moon size={14} color="var(--ink)" />}
          </button>

          <div className="status-pill">
            {status === "listening" ? <Mic size={12} style={{ color: "var(--accent)" }} /> : <MicOff size={12} style={{ color: "var(--ink-soft)" }} />}
            <div className={`status-dot${status !== "idle" ? " animate-blink" : ""}`} style={{ background: dotColor, boxShadow: status !== "idle" ? `0 0 8px ${dotColor}` : "none" }} />
            <span style={{ color: status === "idle" ? "var(--ink-soft)" : "var(--ink)" }}>
              {started ? status.toUpperCase() : "READY"}
            </span>
            <Shield size={10} style={{ color: "var(--ink-soft)", marginLeft: 2 }} />
          </div>
        </div>
      </header>

      {/* ── BACKGROUND SCENE ───────────────────────────────────────────── */}
      {/* Background is now global in App.tsx */}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Left: Conversation Panel (Only visible when session started) */}
        {started && (
          <div style={{
            width: 320, flexShrink: 0,
            background: "rgba(15,23,42,0.45)",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            pointerEvents: 'auto'
          }}>
            {/* Panel header */}
            <div style={{
              padding: "12px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(5,8,15,0.7)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} className="animate-blink" />
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.62rem", letterSpacing: "0.18em", color: "var(--ink-muted)" }}>
                SESSION LOG
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <button 
                  onClick={() => setShowTestInput(!showTestInput)}
                  title={showTestInput ? "Hide Text Input" : "Show Text Input"}
                  style={{ 
                    background: "transparent", border: "none", cursor: "pointer", 
                    color: showTestInput ? "var(--accent)" : "var(--ink-muted)",
                    display: "flex", alignItems: "center", transition: "all 0.3s ease",
                    padding: 4, borderRadius: 4
                  }}
                  className="hover:bg-white/5"
                >
                  <Keyboard size={12} />
                </button>
                <Zap size={10} style={{ color: "var(--accent)" }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
              <ConversationPanel messages={conversationLog} isVisible={started} status={status} />
            </div>

            {/* Compact build info fallback */}
            <div style={{
              padding: "8px 18px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontFamily: "var(--font-mono)", fontSize: "0.55rem",
              color: "var(--ink-soft)", fontWeight: 600, letterSpacing: "0.1em", opacity: 0.6,
            }}>
              LOC BANK OS v4.2.1 · SESSION_LOG
            </div>
          </div>
        )}

        {/* Right: Main content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", overflow: "hidden" }}>
          
          {/* Subtle Text Input - Hidden by default */}
          {started && showTestInput && (
            <div style={{ 
              width: "100%", 
              padding: "10px 24px", 
              background: "rgba(10,15,28,0.4)", 
              borderBottom: "1px solid rgba(0,229,255,0.15)",
              backdropFilter: "blur(20px)",
              zIndex: 30,
              display: "flex",
              justifyContent: "center",
              animation: "fadeInDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards"
            }}>
              <div style={{ width: "100%", maxWidth: 640, position: "relative" }}>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && testInput.trim()) {
                      handleUserInput(testInput);
                      setTestInput("");
                    }
                  }}
                  placeholder="Type a command..."
                  style={{
                    width: "100%",
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(0,229,255,0.4)",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    paddingRight: "60px",
                    color: "white",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    outline: "none",
                  }}
                />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontSize: "0.5rem", fontWeight: 800, opacity: 0.6 }}>
                  CMD
                </div>
              </div>
            </div>
          )}
          {/* Center content */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", width: "100%", overflow: "auto", padding: "1.5rem 2rem", paddingBottom: "1rem" }}>
            {showForm ? (
              <FormVisualization
                formData={formData}
                activeField={activeField}
                validationResult={validationResult}
                isVisible={showForm}
                intent={currentIntent}
                section={currentSection}
                progress={currentProgress}
                documents={currentDocuments}
                onUserSubmit={handleUserInput}
                voiceTrigger={cameraVoiceTrigger}
              />
            ) : started ? (
              <ServiceMenu isVisible={!showForm && started} />
            ) : (
              <div style={{ width: "100%", animation: "fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards", pointerEvents: "none", position: "relative", zIndex: 10, marginTop: "0%" }}>
                {/* Welcome text floats over the background scene just above the bank roof */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h1 style={{
                    fontFamily: "var(--font-display)", fontWeight: 700,
                    fontSize: "2.8rem", color: "var(--ink)",
                    letterSpacing: "-0.02em", marginBottom: 6,
                    textShadow: "0 4px 24px rgba(0,0,0,0.8)",
                  }}>
                    Welcome to{" "}
                    <span style={{ background: "linear-gradient(135deg,#00E5FF,#0284C7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      LOC Bank
                    </span>
                  </h1>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--ink)", letterSpacing: "0.08em", fontWeight: 600 }}>
                    AI-Powered Banking Kiosk · Tap the orb below to begin
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Transcript + Orb */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 480, pointerEvents: 'auto' }}>
            


            <AuraOrb status={status} onClick={handleOrbClick} />

            {!voiceService.supported && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "#EF4444", fontWeight: 700, textAlign: "center" }}>
                ⚠ Speech recognition not supported. Please use Chrome.
              </p>
            )}
          </div>
        </div>
      </main>

      <SuccessScreen visible={showSuccess} message={successMessage} accountNumber={successAccount} />
    </div>
  );
};

export default Index;
