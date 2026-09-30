"use client";

import { useEffect, useRef } from "react";

// Brand orange first, then the landing page's tint accents.
const COLORS = ["#ff6a13", "#c2410c", "#ffb27a", "#7c5cff", "#2f9e5b", "#3b82f6", "#facc15"];
const GRAVITY = 0.12;
const DRAG = 0.992;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
  wobble: number;
  round: boolean;
  life: number;
};

/**
 * A one-off confetti burst on a full-screen canvas: two cannons from the bottom corners and
 * a shower from the top. Plain canvas, no library. Skipped for people who ask for less motion.
 */
export function Confetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!fire || !canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const piece = (x: number, y: number, vx: number, vy: number): Piece => ({
      x, y, vx, vy,
      size: rand(6, 11),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      angle: rand(0, Math.PI * 2),
      spin: rand(-0.25, 0.25),
      wobble: rand(0, Math.PI * 2),
      round: Math.random() < 0.3,
      life: 0,
    });

    const pieces: Piece[] = [];
    const power = Math.min(h / 42, 22);
    for (let i = 0; i < 90; i++) {
      pieces.push(piece(0, h, rand(3, 10), -rand(power * 0.6, power)));
      pieces.push(piece(w, h, -rand(3, 10), -rand(power * 0.6, power)));
    }
    // The shower arrives a moment later, so the cannons land first.
    const shower = window.setTimeout(() => {
      for (let i = 0; i < 80; i++) pieces.push(piece(rand(0, w), -20, rand(-1.5, 1.5), rand(1, 4)));
    }, 450);

    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life++;
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.wobble += 0.1;
        p.x += p.vx + Math.sin(p.wobble) * 0.6;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y > window.innerHeight + 40 || p.life > 600) {
          pieces.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.min(1, (600 - p.life) / 120);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Squashing the width by the wobble makes each strip look like it's flipping.
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * Math.cos(p.wobble), p.size / 2);
        }
        ctx.restore();
      }
      frame = pieces.length > 0 ? requestAnimationFrame(tick) : 0;
    };
    frame = requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(shower);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fire]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />;
}
