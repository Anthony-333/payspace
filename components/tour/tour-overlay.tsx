"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/components/tour/steps";
import { cn } from "@/lib/utils";

const PAD = 8; // space between the target and the spotlight's edge
const GAP = 14; // space between the spotlight and the popover
const MARGIN = 16; // closest the popover gets to the screen's edge
const GIVE_UP_MS = 2500; // a target that never shows up gets a centred popover instead

type Spot = { top: number; left: number; width: number; height: number };
type Placement =
  | { kind: "beside"; top: number; left: number }
  | { kind: "dock"; edge: "top" | "bottom" }
  | { kind: "center" };
type Layout = { stepId: string; spot: Spot | null; placement: Placement };

/** The first element on screen for any of the step's `data-tour` names, in order. */
function findTarget(names: string[]) {
  for (const name of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
  }
  return null;
}

function toSpot(rect: DOMRect, vw: number, vh: number): Spot {
  // Clipped to the screen, so a tall target (the POS menu) still gets a visible outline.
  const top = Math.max(rect.top - PAD, 4);
  const left = Math.max(rect.left - PAD, 4);
  const bottom = Math.min(rect.bottom + PAD, vh - 4);
  const right = Math.min(rect.right + PAD, vw - 4);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

/** Beside the spotlight if there's room (right, left, below, above); otherwise docked to an edge. */
function place(spot: Spot, pw: number, ph: number, vw: number, vh: number): Placement {
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), vw - pw - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, MARGIN), vh - ph - MARGIN);
  const midX = spot.left + spot.width / 2;
  const midY = spot.top + spot.height / 2;
  if (vw >= 640) {
    const right = spot.left + spot.width;
    const bottom = spot.top + spot.height;
    if (right + GAP + pw <= vw - MARGIN) return { kind: "beside", left: right + GAP, top: clampY(midY - ph / 2) };
    if (spot.left - GAP - pw >= MARGIN) return { kind: "beside", left: spot.left - GAP - pw, top: clampY(midY - ph / 2) };
    if (bottom + GAP + ph <= vh - MARGIN) return { kind: "beside", top: bottom + GAP, left: clampX(midX - pw / 2) };
    if (spot.top - GAP - ph >= MARGIN) return { kind: "beside", top: spot.top - GAP - ph, left: clampX(midX - pw / 2) };
  }
  return { kind: "dock", edge: midY > vh / 2 ? "top" : "bottom" };
}

function sameLayout(a: Layout | null, b: Layout) {
  if (!a || a.stepId !== b.stepId) return false;
  const spotsMatch = a.spot === b.spot || (a.spot !== null && b.spot !== null
    && a.spot.top === b.spot.top && a.spot.left === b.spot.left
    && a.spot.width === b.spot.width && a.spot.height === b.spot.height);
  return spotsMatch && JSON.stringify(a.placement) === JSON.stringify(b.placement);
}

export function TourOverlay({ step, index, total, routeReady, onNext, onPrevious, onSkip }: {
  step: TourStep;
  index: number;
  total: number;
  /** False while the tour is still navigating to the step's page. */
  routeReady: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const isLast = index === total - 1;

  // Follows the target every frame while the step is showing. That copes with late-mounting
  // pages, scrolling, resizing and the rail's own layout without wiring up separate observers.
  useEffect(() => {
    if (!routeReady) return;
    const names = step.targets ?? [];
    const startedAt = performance.now();
    let target: HTMLElement | null = null;
    let scrolled = false;
    let frame = 0;
    const tick = () => {
      if (!target?.isConnected) target = names.length ? findTarget(names) : null;
      if (target && !scrolled) {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
        scrolled = true;
      }
      const searching = names.length > 0 && !target && performance.now() - startedAt < GIVE_UP_MS;
      if (!searching) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const spot = target ? toSpot(target.getBoundingClientRect(), vw, vh) : null;
        const pop = popoverRef.current;
        const placement: Placement = spot
          ? place(spot, pop?.offsetWidth ?? 352, pop?.offsetHeight ?? 220, vw, vh)
          : { kind: "center" };
        const next: Layout = { stepId: step.id, spot, placement };
        setLayout((prev) => (sameLayout(prev, next) ? prev : next));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, routeReady]);

  const current = layout?.stepId === step.id ? layout : null;
  const shownStepId = current?.stepId;

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [shownStepId]);

  // Puts focus back where it was once the tour closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "Tab") {
        // Keeps focus inside the popover while the rest of the page is covered.
        const buttons = [...(popoverRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
        if (buttons.length === 0) return;
        const at = buttons.indexOf(document.activeElement as HTMLElement);
        const nextAt = event.shiftKey ? (at <= 0 ? buttons.length - 1 : at - 1) : (at + 1) % buttons.length;
        event.preventDefault();
        buttons[nextAt]!.focus();
      }
    }
    // Pages and menus move focus too (the POS search box, a dropdown handing focus back to its
    // trigger); while the tour is open, it comes straight back.
    function onFocusIn(event: FocusEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) nextRef.current?.focus({ preventScroll: true });
    }
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [onNext, onPrevious, onSkip]);

  const spot = current?.spot ?? null;
  const placement = current?.placement;

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-60 print:hidden">
      {/* Covers the page so a stray tap can't wander off mid-tour. */}
      <div
        aria-hidden
        className={cn("absolute inset-0 transition-colors duration-200", spot ? "bg-transparent" : "bg-black/55")}
      />
      {spot && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] motion-safe:transition-all motion-safe:duration-300"
          style={spot}
        />
      )}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "absolute w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-card p-5 text-card-foreground shadow-xl",
          "motion-safe:transition-[top,left,opacity] motion-safe:duration-300",
          // Transparent rather than invisible while it measures, so it can still hold focus.
          !placement && "pointer-events-none opacity-0",
          placement?.kind === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          placement?.kind === "dock" && "inset-x-0 mx-auto",
          placement?.kind === "dock" && (placement.edge === "top" ? "top-4" : "bottom-4"),
        )}
        style={placement?.kind === "beside" ? { top: placement.top, left: placement.left } : undefined}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Step {index + 1} of {total}
        </p>
        <h2 id={titleId} className="mt-1 text-lg font-semibold">{step.title}</h2>
        <p id={bodyId} className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          {!isLast && (
            <Button variant="ghost" className="h-11 px-3 text-muted-foreground" onClick={onSkip}>
              Skip
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="h-11" onClick={onPrevious} disabled={index === 0}>
              Previous
            </Button>
            <Button ref={nextRef} className="h-11 min-w-20" onClick={onNext}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
