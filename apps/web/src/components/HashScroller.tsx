"use client";

import { useEffect } from "react";

export function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    // Wait for sections to render, then scroll
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
