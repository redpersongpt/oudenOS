"use client";

import { useEffect, useRef, useState } from "react";

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

      const density = Math.floor((canvas.width * canvas.height) / 4000);
      const starCount = Math.min(density, 1200);

      for (let i = 0; i < starCount; i++) {
        const x = Math.floor(rand() * canvas.width);
        const y = Math.floor(rand() * canvas.height);
        const size = rand() > 0.85 ? 2 : 1;
        const opacity = 0.15 + rand() * 0.35;

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

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0"
        style={{ imageRendering: "pixelated", zIndex: 1 }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed"
        style={{
          left: mousePos.x - 200,
          top: mousePos.y - 200,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          zIndex: 1,
          transition: "left 0.3s ease-out, top 0.3s ease-out",
        }}
        aria-hidden="true"
      />
    </>
  );
}
