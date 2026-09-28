"use client";

import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MAX_PEN, MIN_PEN, SIGNATURE_HEIGHT, SIGNATURE_WIDTH, type Signature } from "@/convex/lib/signature";

// A pen-style signature pad. Strokes thin out as the pen speeds up and thicken with pressure
// (on a stylus that reports it), like ink. Points are kept in the SIGNATURE_WIDTH x
// SIGNATURE_HEIGHT box the server checks (convex/lib/signature.ts), rounded to 0.1.

const MIN_STEP = 1.2;   // box units between kept points, which keeps signatures small
const SMOOTHING = 0.55; // how much of the previous width carries over, so width changes gently
const INK = "#1b2a6b";

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

type Props = { value: Signature; onChange: (value: Signature) => void; disabled?: boolean };

export function SignaturePad({ value, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Signature>(value);
  const current = useRef<{ points: number[]; lastT: number } | null>(null);

  const scale = useCallback(() => {
    const canvas = canvasRef.current!;
    return canvas.width / SIGNATURE_WIDTH;
  }, []);

  const drawSegment = useCallback((ctx: CanvasRenderingContext2D, s: number, x0: number, y0: number, x1: number, y1: number, w: number) => {
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x0 * s, y0 * s);
    ctx.lineTo(x1 * s, y1 * s);
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const s = scale();
    for (const stroke of strokes.current) {
      if (stroke.length === 3) {
        ctx.beginPath();
        ctx.arc(stroke[0] * s, stroke[1] * s, (stroke[2] * s) / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 3; i < stroke.length; i += 3) {
        drawSegment(ctx, s, stroke[i - 3], stroke[i - 2], stroke[i], stroke[i + 1], (stroke[i - 1] + stroke[i + 2]) / 2);
      }
    }
  }, [drawSegment, scale]);

  // Match the canvas to its box and the screen's pixel density, and redraw on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const width = canvas.clientWidth;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round((width * ratio * SIGNATURE_HEIGHT) / SIGNATURE_WIDTH);
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  // Clearing from outside (value set to []) wipes the pad.
  useEffect(() => {
    if (value.length === 0 && strokes.current.length > 0) {
      strokes.current = [];
      redraw();
    }
  }, [value, redraw]);

  const toBox = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * SIGNATURE_WIDTH, 0, SIGNATURE_WIDTH),
      y: clamp(((e.clientY - rect.top) / rect.height) * SIGNATURE_HEIGHT, 0, SIGNATURE_HEIGHT),
    };
  };

  const pressureFactor = (e: PointerEvent | React.PointerEvent) =>
    e.pointerType === "pen" && e.pressure > 0 ? 0.55 + e.pressure * 0.9 : 1;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toBox(e);
    const w = round(clamp(2.6 * pressureFactor(e), MIN_PEN, MAX_PEN));
    current.current = { points: [round(x), round(y), w], lastT: e.timeStamp };
    strokes.current = [...strokes.current, current.current.points];
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!stroke || !ctx) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const s = scale();
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const { x, y } = toBox(ev);
      const p = stroke.points;
      const [px, py, pw] = [p[p.length - 3], p[p.length - 2], p[p.length - 1]];
      const dist = Math.hypot(x - px, y - py);
      if (dist < MIN_STEP) continue;
      // Speed in box units per millisecond: fast strokes draw thin, slow ones thick.
      const speed = dist / Math.max(1, ev.timeStamp - stroke.lastT);
      const target = clamp((MAX_PEN - speed * 3.2) * pressureFactor(ev), MIN_PEN, MAX_PEN);
      const w = round(clamp(pw * SMOOTHING + target * (1 - SMOOTHING), MIN_PEN, MAX_PEN));
      p.push(round(x), round(y), w);
      stroke.lastT = ev.timeStamp;
      drawSegment(ctx, s, px, py, x, y, (pw + w) / 2);
    }
  };

  const onPointerUp = () => {
    if (!current.current) return;
    current.current = null;
    onChange(strokes.current.map((stroke) => [...stroke]));
  };

  const clear = () => {
    strokes.current = [];
    redraw();
    onChange([]);
  };

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-input bg-white">
        <canvas
          ref={canvasRef}
          aria-label="Signature pad. Sign with your finger, a stylus or the mouse."
          className="block aspect-[2/1] w-full cursor-crosshair touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-[22%] flex items-end gap-2 text-muted-foreground/70">
          <span className="text-lg leading-none">×</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{value.length === 0 ? "Sign above with your finger or a stylus." : "Signed. Clear to sign again."}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled || value.length === 0}>
          <Eraser className="size-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
