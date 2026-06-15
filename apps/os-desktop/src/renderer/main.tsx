import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { setPlatform, platform } from "@/lib/platform";
import { tauriBackend } from "@/lib/platform-tauri";
import { useWizardStore } from "@/stores/wizard-store";
import "./styles/globals.css";

// Canonical runtime: Tauri
setPlatform(tauriBackend);

// Demo hosts should always start from a clean wizard state.
if ((navigator.platform || "").toLowerCase().includes("mac")) {
  try {
    useWizardStore.getState().reset();
  } catch {
    // ignore startup reset failures
  }
}

// Mac demo build: with no Tauri runtime (a plain browser, e.g. the
// `pnpm demo:os:mac` launcher) the privileged service can never connect and the
// Tauri "simulated mode" event never fires. Surface a persistent banner so it is
// always obvious this is a preview and nothing is applied to the system. In the
// real Windows app window.__TAURI__ is present, so this never shows there.
if (!window.__TAURI__) {
  const showDemoBanner = () => {
    if (document.getElementById("ouden-demo-banner")) return;
    const banner = document.createElement("div");
    banner.id = "ouden-demo-banner";
    banner.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1d4ed8;color:white;padding:6px 16px;font-size:12px;text-align:center;font-family:system-ui";
    banner.textContent =
      "Demo preview — oudenOS is running without its Windows service. The UI is fully interactive, but nothing is applied to this device.";
    document.body.appendChild(banner);
  };
  if (document.body) {
    showDemoBanner();
  } else {
    window.addEventListener("DOMContentLoaded", showDemoBanner, { once: true });
  }
}

// Listen for service start failure — warn user that app is in demo mode
platform().on("service-start-failed", (error) => {
  console.error("[ouden] Service failed to start:", error);
  // Show a visible warning so the user knows changes won't apply
  setTimeout(() => {
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:white;padding:8px 16px;font-size:12px;text-align:center;font-family:system-ui";
    banner.textContent = `The service is not available. You can review the app, but changes cannot be applied. (${error})`;
    document.body.appendChild(banner);
  }, 500);
});

platform().on("service-simulated-mode", (message) => {
  console.warn("[ouden] Simulated backend:", message);
  setTimeout(() => {
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#1d4ed8;color:white;padding:8px 16px;font-size:12px;text-align:center;font-family:system-ui";
    banner.textContent = typeof message === "string"
      ? message
      : "Demo mode is active on this device. Changes will not be applied here.";
    document.body.appendChild(banner);
  }, 500);
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
