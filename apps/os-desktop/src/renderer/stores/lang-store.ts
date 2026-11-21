import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "tr";

// First launch uses the OS / browser locale: a Turkish system starts in Turkish,
// everything else starts in English. After that the user's explicit choice
// (persisted below) always wins.
function detectLang(): Lang {
  try {
    const nav = (navigator.language || (navigator.languages && navigator.languages[0]) || "").toLowerCase();
    return nav.startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: detectLang(),
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "tr" ? "en" : "tr" }),
    }),
    {
      name: "oudenOS-lang",
      partialize: (state) => ({ lang: state.lang }),
    },
  ),
);

// Keep <html lang> in sync: CSS text-transform: uppercase is language-aware,
// so Turkish needs lang="tr" to uppercase i → İ (not I).
function applyDocumentLang(lang: Lang) {
  try {
    document.documentElement.lang = lang;
  } catch {
    // no DOM (tests)
  }
}
applyDocumentLang(useLangStore.getState().lang);
useLangStore.subscribe((state) => applyDocumentLang(state.lang));
