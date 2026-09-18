"use client";

import { useState } from "react";
import { ChartCard, DataTable, EmptyState, HEAT } from "@/components/analytics/chart-parts";
import { formatMoney } from "@/convex/lib/money";

// Hour by weekday: a grid whose job is magnitude, so colour is sequential - one hue, more is
// darker in light mode and lighter in dark. Each cell is its own hit target with a tooltip
// on hover and on focus, and the same numbers are one button away in the table view.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Shop hours: a café rarely trades at 3am, and 24 columns on a phone is unreadable. */
const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => i + FIRST_HOUR);

const hourLabel = (hour: number) => `${((hour + 11) % 12) + 1}${hour < 12 ? "am" : "pm"}`;

/** Which of the five steps a value sits on. Zero always takes the lightest step. */
function step(value: number, most: number) {
  if (value <= 0) return 0;
  return Math.min(HEAT.length - 1, Math.ceil((value / most) * (HEAT.length - 1)));
}

export function WeekdayHeatmap({ byWeekdayHour }: { byWeekdayHour: number[][] }) {
  const [hovered, setHovered] = useState<{ day: number; hour: number } | null>(null);
  const most = Math.max(...byWeekdayHour.flat(), 0);

  const busiest = { day: 0, hour: 0, revenue: 0 };
  byWeekdayHour.forEach((hours, day) =>
    hours.forEach((revenue, hour) => {
      if (revenue > busiest.revenue) Object.assign(busiest, { day, hour, revenue });
    }));

  const rows = byWeekdayHour.flatMap((hours, day) =>
    hours
      .map((revenue, hour) => ({ day, hour, revenue }))
      .filter((cell) => cell.revenue > 0)
      .map((cell) => [`${DAYS[cell.day]} ${hourLabel(cell.hour)}`, formatMoney(cell.revenue)]));

  return (
    <ChartCard
      title="Busiest times"
      description={most > 0
        ? `Busiest on ${DAYS[busiest.day]} at ${hourLabel(busiest.hour)}.`
        : "When you need a second pair of hands."}
      table={<DataTable head={["When", "Sales"]} rows={rows} />}
    >
      {most > 0 ? (
        <div className="grid gap-3">
          <div className="overflow-x-auto">
            <div className="min-w-[34rem]">
              {/* Hour scale across the top, every third hour so the labels never collide. */}
              <div className="mb-1 grid gap-0.5 pl-10" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                {HOURS.map((hour) => (
                  <span key={hour} className="text-center text-[10px] text-muted-foreground">
                    {(hour - FIRST_HOUR) % 3 === 0 ? hourLabel(hour) : ""}
                  </span>
                ))}
              </div>
              {DAYS.map((name, day) => (
                <div key={name} className="mb-0.5 flex items-center gap-0.5">
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{name}</span>
                  <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                    {HOURS.map((hour) => {
                      const revenue = byWeekdayHour[day]?.[hour] ?? 0;
                      const on = hovered?.day === day && hovered.hour === hour;
                      return (
                        <button
                          key={hour}
                          type="button"
                          // Every cell is focusable, so the readout is reachable without a pointer.
                          onMouseEnter={() => setHovered({ day, hour })}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered({ day, hour })}
                          onBlur={() => setHovered(null)}
                          aria-label={`${name} ${hourLabel(hour)}: ${formatMoney(revenue)}`}
                          className="h-6 rounded-[3px] outline-none transition-[outline] focus-visible:ring-2 focus-visible:ring-ring"
                          style={{
                            background: HEAT[step(revenue, most)],
                            outline: on ? "2px solid var(--color-foreground)" : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="min-h-5 text-sm">
              {hovered ? (
                <>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(byWeekdayHour[hovered.day]?.[hovered.hour] ?? 0)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    on {DAYS[hovered.day]} at {hourLabel(hovered.hour)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Point at a square for its takings.</span>
              )}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Quiet
              <span className="flex gap-0.5">
                {HEAT.map((color) => (
                  <span key={color} aria-hidden className="size-4 rounded-[3px]" style={{ background: color }} />
                ))}
              </span>
              Busy
            </div>
          </div>
        </div>
      ) : (
        <EmptyState message="This fills in once you have a few days of sales." />
      )}
    </ChartCard>
  );
}
