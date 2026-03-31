import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./styles/globals.css";

// ─── Smoke test bridge ──────────────────────────────────────────────────────
// Exposes internal question-model functions on window.__smokeTest only when
// the main process sets window.__SMOKE_TEST__ = true. This allows the CI
// smoke test to call applyQuestionnaireOverrides with real answer sets and
// assert on the resulting resolved plan — without bypassing the real app.
if ((window as unknown as Record<string, unknown>).__SMOKE_TEST__) {
  import("@/lib/wizard-question-model").then((qm) => {
    (window as unknown as Record<string, unknown>).__smokeTest = {
      applyQuestionnaireOverrides: qm.applyQuestionnaireOverrides,
      computeWizardImpact: qm.computeWizardImpact,
      buildQuestionnaireDecisionSummary: qm.buildQuestionnaireDecisionSummary,
    };
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
