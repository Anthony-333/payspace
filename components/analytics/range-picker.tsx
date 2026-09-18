"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { addDays, businessDate, daysBetween } from "@/convex/lib/businessDate";
import { cn } from "@/lib/utils";

// Filters sit in one row above the charts (dataviz: filters & time ranges). Ordinary form
// controls styled to match the chart chrome - they are UI, not chart marks.

export type Range = { from: string; to: string };
export type Preset = "today" | "7" | "30" | "custom";

const neverChanges = () => () => {};

/**
 * The shop's today. The clock is external mutable state, so it's read through
 * useSyncExternalStore rather than during render; on the server there is no shop-local today,
 * so this is null until the browser has it and the callers skip their queries until then.
 */
export function useShopToday(timezone: string) {
  return useSyncExternalStore(
    neverChanges,
    () => businessDate(Date.now(), timezone), // a stable string all day, so React sees no change
    () => null,
  );
}

/** A preset range, worked out from a date already in hand. Pure: it never reads the clock. */
export function rangeFrom(today: string, preset: Exclude<Preset, "custom">): Range {
  if (preset === "today") return { from: today, to: today };
  return { from: addDays(today, -(Number(preset) - 1)), to: today };
}

const PRESETS: { value: Exclude<Preset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

export function RangePicker({ preset, range, today, maxDays, onChange }: {
  preset: Preset;
  range: Range;
  today: string;
  /** Beyond this the server refuses the range, so the picker won't offer it either. */
  maxDays?: number;
  onChange: (preset: Preset, range: Range) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function custom(next: Range) {
    if (next.from > next.to) return setError("The start date comes after the end date.");
    if (maxDays && daysBetween(next.from, next.to) > maxDays) {
      return setError(`Choose a range of up to ${maxDays} days.`);
    }
    setError(null);
    onChange("custom", next);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Date range" className="flex gap-1 rounded-xl border bg-muted p-1">
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preset === option.value}
              onClick={() => { setError(null); onChange(option.value, rangeFrom(today, option.value)); }}
              className={cn(
                "min-h-10 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                preset === option.value ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From"
            value={range.from}
            max={range.to}
            className="w-auto"
            onChange={(event) => event.target.value && custom({ ...range, from: event.target.value })}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To"
            value={range.to}
            max={today}
            className="w-auto"
            onChange={(event) => event.target.value && custom({ ...range, to: event.target.value })}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
