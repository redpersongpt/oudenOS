import { Component, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { WizardPage } from "./pages/wizard/WizardPage";
import { DonationPage } from "./pages/donation/DonationPage";
import { StarField } from "@/components/ui/StarField";

// Error Boundary
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
          background: "#000000",
          color: "#E8E8E8",
          fontFamily: "Space Grotesk, system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 500, marginBottom: "0.5rem", fontFamily: "Space Mono, monospace", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            [ERROR]
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#999999", maxWidth: 400, marginBottom: "1rem", fontFamily: "Space Mono, monospace" }}>
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
              background: "#E8E8E8",
              color: "white",
              border: "none",
              borderRadius: "2px",
              fontSize: "0.7rem",
              fontFamily: "Space Mono, monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
            }}
          >
            RESTART
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// App

export function App() {
  return (
    <ErrorBoundary>
      <StarField />
      <Routes>
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/donation" element={<DonationPage />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
