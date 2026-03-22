import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

/* ── Global Error Boundary ── */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f0f2fc", fontFamily: "monospace", padding: 40,
        }}>
          <div style={{ background: "white", padding: 32, borderRadius: 16, border: "1px solid rgba(239,68,68,0.3)", maxWidth: 600, boxShadow: "0 8px 32px rgba(239,68,68,0.1)" }}>
            <h2 style={{ color: "#EF4444", marginBottom: 12, fontSize: "1.1rem" }}>⚠ Render Error</h2>
            <pre style={{ color: "#374151", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>{this.state.error}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
