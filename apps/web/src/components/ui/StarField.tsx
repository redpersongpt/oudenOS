"use client";

import { useEffect, useRef } from "react";

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = document.documentElement.scrollHeight;
      draw();
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Seed-based pseudo-random for consistent stars
      const seed = 42;
      let s = seed;
      function rand() {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
      }

      const density = Math.floor((canvas.width * canvas.height) / 8000);
      const starCount = Math.min(density, 600);

      for (let i = 0; i < starCount; i++) {
        const x = Math.floor(rand() * canvas.width);
        const y = Math.floor(rand() * canvas.height);
        const size = rand() > 0.92 ? 2 : 1;
        const opacity = 0.08 + rand() * 0.18;

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, size, size);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    const observer = new MutationObserver(() => resize());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(resize, 1000);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    />
  );
}
