"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   OUDEN HERO VISUAL — Premium animated SVG ring

   No Three.js, no WebGL — pure SVG + Framer Motion.
   Works everywhere, zero dependencies, instant render.
   ═══════════════════════════════════════════════════════════════════════ */

// Mouse parallax hook
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

// Generate deterministic particle positions
function generateParticles(count: number) {
  let s = 77;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: count }, () => ({
    cx: 250 + (rand() - 0.5) * 400,
    cy: 250 + (rand() - 0.5) * 400,
    r: 0.3 + rand() * 1.2,
    opacity: 0.05 + rand() * 0.25,
    delay: rand() * 5,
    duration: 3 + rand() * 4,
  }));
}

const PARTICLES = generateParticles(80);

export function HeroScene() {
  const mouse = useMousePosition();

  // Smooth parallax offset
  const offsetX = mouse.x * 8;
  const offsetY = mouse.y * 6;

  return (
    <div className="relative w-[500px] h-[500px] lg:w-[560px] lg:h-[560px] xl:w-[620px] xl:h-[620px] -mt-8 -mr-8">
      <motion.svg
        viewBox="0 0 500 500"
        fill="none"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 0 40px rgba(255,255,255,0.04))" }}
      >
        {/* Particle field — twinkle */}
        <g>
          {PARTICLES.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="white"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, p.opacity, 0],
                cx: [p.cx, p.cx + (Math.sin(i) * 3), p.cx],
                cy: [p.cy, p.cy + (Math.cos(i) * 2), p.cy],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </g>

        {/* Outer orbital ring — very subtle */}
        <motion.circle
          cx={250 + offsetX * 0.3}
          cy={250 + offsetY * 0.3}
          r={195}
          stroke="white"
          strokeWidth={0.3}
          fill="none"
          opacity={0.06}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Middle orbital ring */}
        <motion.circle
          cx={250 + offsetX * 0.5}
          cy={250 + offsetY * 0.5}
          r={155}
          stroke="white"
          strokeWidth={0.4}
          fill="none"
          opacity={0.04}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Ambient glow behind ring */}
        <motion.circle
          cx={250 + offsetX * 0.8}
          cy={250 + offsetY * 0.8}
          r={80}
          fill="url(#ringGlow)"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />

        {/* Main ring — the Ouden mark */}
        <motion.path
          d="M 356.6 302.6 A 80 80 0 1 1 343.9 210.4"
          stroke="url(#ringStroke)"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          style={{
            translateX: offsetX * 0.8,
            translateY: offsetY * 0.8,
          }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Inner glow line — thinner, brighter */}
        <motion.path
          d="M 356.6 302.6 A 80 80 0 1 1 343.9 210.4"
          stroke="white"
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
          style={{
            translateX: offsetX * 0.8,
            translateY: offsetY * 0.8,
          }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2.2, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Outer glow line — wide, very subtle */}
        <motion.path
          d="M 356.6 302.6 A 80 80 0 1 1 343.9 210.4"
          stroke="white"
          strokeWidth={20}
          strokeLinecap="round"
          fill="none"
          opacity={0.015}
          style={{
            translateX: offsetX * 0.8,
            translateY: offsetY * 0.8,
          }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Accent dot — bright */}
        <motion.circle
          cx={343.9 + offsetX * 0.8}
          cy={210.4 + offsetY * 0.8}
          r={5}
          fill="white"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 2, ease: "easeOut" }}
        />

        {/* Dot glow */}
        <motion.circle
          cx={343.9 + offsetX * 0.8}
          cy={210.4 + offsetY * 0.8}
          r={15}
          fill="white"
          opacity={0.08}
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 3, delay: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Breathing pulse on ring */}
        <motion.path
          d="M 356.6 302.6 A 80 80 0 1 1 343.9 210.4"
          stroke="white"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          style={{
            translateX: offsetX * 0.8,
            translateY: offsetY * 0.8,
          }}
          animate={{ opacity: [0.02, 0.06, 0.02] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="ringStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#999999" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#888888" />
          </linearGradient>
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
