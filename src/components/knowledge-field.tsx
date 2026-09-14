"use client";
import { useEffect, useRef } from "react";
export function KnowledgeField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let tick = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      width = c.clientWidth;
      height = c.clientHeight;
      c.width = width * devicePixelRatio;
      c.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const render = () => {
      tick += 0.004;
      ctx.clearRect(0, 0, width, height);
      const points = [];
      for (let i = 0; i < 150; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / 150);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + tick;
        const x = Math.sin(phi) * Math.cos(theta);
        const z = Math.sin(phi) * Math.sin(theta);
        const y = Math.cos(phi);
        const radius = Math.min(width, height) * 0.35;
        points.push({
          x: width / 2 + x * radius,
          y: height / 2 + y * radius,
          z,
        });
      }
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 60 && Math.abs(p.z - q.z) < 0.5) {
            ctx.strokeStyle = `rgba(57,227,190,${0.13 * (1 - dist / 60) * (p.z + 1.5)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle =
          p.z > 0
            ? `rgba(101,255,210,${0.4 + p.z * 0.6})`
            : "rgba(60,119,155,.3)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2 + (p.z + 1) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      c.dataset.ready = "true";
      if (!reduced) frame = requestAnimationFrame(render);
    };
    resize();
    render();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="knowledge-field" aria-hidden="true" />;
}
