import { Component, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { WizardPage } from "./pages/wizard/WizardPage";
import { DonationPage } from "./pages/donation/DonationPage";

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Catches unhandled renderer crashes and shows recovery UI instead of black screen

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
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1e1e22",
          color: "#f0f0f4",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#a0a0ac", maxWidth: 400, marginBottom: "1rem" }}>
            {this.state.error || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: "" });
              window.location.hash = "/wizard";
              window.location.reload();
            }}
            style={{
              padding: "0.5rem 1.5rem",
              background: "#E8254B",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/donation" element={<DonationPage />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
