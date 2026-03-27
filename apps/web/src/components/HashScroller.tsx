"use client";

import { useEffect } from "react";

export function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    // Wait for page to render
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
