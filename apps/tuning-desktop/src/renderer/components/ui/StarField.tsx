import { useEffect, useRef } from "react";

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function draw() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let s = 42;
      function rand() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      const count = Math.min(Math.floor((canvas!.width * canvas!.height) / 6000), 600);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(rand() * canvas!.width);
        const y = Math.floor(rand() * canvas!.height);
        const size = rand() > 0.88 ? 2 : 1;
        ctx!.fillStyle = `rgba(255,255,255,${0.06 + rand() * 0.16})`;
        ctx!.fillRect(x, y, size, size);
      }
    }
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" style={{ imageRendering: "pixelated" as const, zIndex: 0 }} />;
}
