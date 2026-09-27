"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TESTIMONIALS } from "./content";

// The hero's testimonial card: one quote at a time, stepped with the arrows.
export function QuoteCarousel() {
  const [index, setIndex] = useState(0);
  const t = TESTIMONIALS[index];
  const step = (by: number) =>
    setIndex((i) => (i + by + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <figure className="flex h-full flex-col justify-between gap-5 rounded-2xl bg-tint-peach p-6">
      <blockquote aria-live="polite" className="text-lg font-medium leading-snug text-tint-peach-foreground">
        “{t.quote}”
      </blockquote>
      <div className="flex items-center justify-between gap-3">
        <figcaption className="flex items-center gap-3 rounded-2xl bg-card py-2 pr-4 pl-2">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {t.initials}
          </span>
          <span className="text-sm">
            <span className="block font-semibold">{t.name}</span>
            <span className="text-muted-foreground">{t.role}</span>
          </span>
        </figcaption>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous testimonial"
            className="grid size-9 place-items-center rounded-full transition-colors hover:bg-card"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next testimonial"
            className="grid size-9 place-items-center rounded-full text-primary transition-colors hover:bg-card"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </figure>
  );
}
