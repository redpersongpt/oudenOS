"use client";

import { useEffect, useRef } from "react";

interface Star {
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  depth: number; // 0-1, controls parallax strength
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothMouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate stars
    function generateStars() {
      const w = window.innerWidth;
      const h = document.documentElement.scrollHeight;
      canvas!.width = w;
      canvas!.height = h;

      let s = 42;
      const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

      const count = Math.min(Math.floor((w * h) / 4000), 1200);
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          baseX: Math.floor(rand() * w),
          baseY: Math.floor(rand() * h),
          size: rand() > 0.85 ? 2 : 1,
          opacity: 0.12 + rand() * 0.35,
          depth: 0.2 + rand() * 0.8, // deeper = more parallax
        });
      }
      starsRef.current = stars;
    }

    // Draw with parallax offset
    function draw() {
      if (!ctx || !canvas) return;

      // Smooth lerp toward mouse
      smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * 0.08;
      smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * 0.08;

      const mx = smoothMouseRef.current.x;
      const my = smoothMouseRef.current.y;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of starsRef.current) {
        // Parallax: deeper stars move more
        const px = star.baseX + mx * star.depth * 15;
        const py = star.baseY + my * star.depth * 10;

        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.fillRect(Math.floor(px), Math.floor(py), star.size, star.size);
      }

      // Mouse glow
      const glowX = (mouseRef.current.x + 1) * canvas.width / 2;
      const glowY = (mouseRef.current.y + 1) * canvas.height / 2;
      const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 250);
      gradient.addColorStop(0, "rgba(255,255,255,0.025)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(glowX - 250, glowY - 250, 500, 500);

      rafRef.current = requestAnimationFrame(draw);
    }

    function onMouseMove(e: MouseEvent) {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function onResize() {
      generateStars();
    }

    generateStars();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);

    // Re-measure after content loads
    setTimeout(onResize, 1000);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ imageRendering: "pixelated", zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
