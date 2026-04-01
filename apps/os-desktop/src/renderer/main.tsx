import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { setPlatform } from "@/lib/platform";
import "./styles/globals.css";

if (window.__TAURI__) {
  import("@/lib/platform-tauri").then(({ tauriBackend }) => {
    setPlatform(tauriBackend);
  });
}

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
