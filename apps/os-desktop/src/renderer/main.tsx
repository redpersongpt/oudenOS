import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { setPlatform } from "@/lib/platform";
import { tauriBackend } from "@/lib/platform-tauri";
import "./styles/globals.css";

// Canonical runtime: Tauri
setPlatform(tauriBackend);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
