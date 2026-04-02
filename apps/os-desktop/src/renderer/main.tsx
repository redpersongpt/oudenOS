import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { setPlatform, platform } from "@/lib/platform";
import { tauriBackend } from "@/lib/platform-tauri";
import "./styles/globals.css";

setPlatform(tauriBackend);

platform().on("service-start-failed", (error) => {
  console.error("[redcore] Service failed to start:", error);
  setTimeout(() => {
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:white;padding:8px 16px;font-size:12px;text-align:center;font-family:system-ui";
    banner.textContent = `Service unavailable — running in demo mode. No changes will be applied. (${error})`;
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
