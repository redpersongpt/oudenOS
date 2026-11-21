import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { App } from "./App";
import { setPlatform, platform } from "@/lib/platform";
import { tauriBackend } from "@/lib/platform-tauri";
import { useWizardStore } from "@/stores/wizard-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { useUpdateStore } from "@/stores/update-store";
import { tStatic } from "@/i18n";
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
// `pnpm demo:os:mac` launcher) the privileged service can never connect.
// Surface a persistent banner so it is always obvious this is a preview.
if (!window.__TAURI__) {
  const showDemoBanner = () => {
    if (document.getElementById("ouden-demo-banner")) return;
    const banner = document.createElement("div");
    banner.id = "ouden-demo-banner";
    banner.setAttribute("role", "status");
    banner.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1d4ed8;color:white;padding:6px 16px;font-size:12px;text-align:center;font-family:system-ui";
    banner.textContent = tStatic("banner.browserPreview");
    document.body.appendChild(banner);
  };
  if (document.body) {
    showDemoBanner();
  } else {
    window.addEventListener("DOMContentLoaded", showDemoBanner, { once: true });
  }
}

// Service start errors are read from service_status (events emitted before the
// webview listens are lost), so query once at startup.
void useRuntimeStore.getState().refresh();

// The shell refuses to close while changes are being applied.
platform().on("close-blocked", () => useRuntimeStore.getState().noteCloseBlocked());

// Silent update check: only lights the dot on the settings gear. Never installs.
if (window.__TAURI__) {
  window.setTimeout(() => void useUpdateStore.getState().check(true), 3000);
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <App />
      </HashRouter>
    </MotionConfig>
  </StrictMode>
);
