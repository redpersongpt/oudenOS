import { Component, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { WizardPage } from "./pages/wizard/WizardPage";
import { StarField } from "@/components/ui/StarField";
import { clearPersistedSession } from "@/stores/session";
import { tStatic } from "@/i18n";

// Error Boundary
// Catches unhandled renderer crashes and shows recovery UI instead of a black
// screen. Restart clears the persisted wizard session: if the crash came from
// stored state (e.g. an older app version), reloading into it would loop.

interface ErrorState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorState> {
  state: ErrorState = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#000000",
            color: "#E8E8E8",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.2rem", fontWeight: 500, marginBottom: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            {tStatic("error.title")}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#999999", maxWidth: 420, marginBottom: "0.5rem" }}>
            {this.state.error || tStatic("error.unexpected")}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#777777", maxWidth: 420, marginBottom: "1rem" }}>
            {tStatic("error.restartHint")}
          </p>
          <button
            onClick={() => {
              clearPersistedSession();
              this.setState({ hasError: false, error: "" });
              window.location.hash = "/wizard";
              window.location.reload();
            }}
            style={{
              padding: "0.5rem 1.5rem",
              background: "#E8E8E8",
              color: "#000000",
              border: "none",
              borderRadius: "2px",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
            }}
          >
            {tStatic("error.restart")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// App
// (The standalone /donation page was unreachable and showed a placeholder
// supporter list; the wizard's own donation step is the only donation UI.)

export function App() {
  return (
    <ErrorBoundary>
      <StarField />
      <Routes>
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
