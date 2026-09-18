"use client";

import { Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

// Shared chart chrome. Every chart here ships a table view, because a tooltip may enhance
// but must never be the only way to reach a number (see the dataviz skill).

export const SERIES = ["var(--viz-series-1)", "var(--viz-series-2)", "var(--viz-series-3)"] as const;
export const HEAT = [
  "var(--viz-heat-0)", "var(--viz-heat-1)", "var(--viz-heat-2)", "var(--viz-heat-3)", "var(--viz-heat-4)",
] as const;

/**
 * Axis ticks are read at a glance rather than reconciled, so no centavos — and one unit for
 * the whole axis, decided by its largest value. Mixing ₱750 with ₱1k on one scale makes the
 * reader do arithmetic to compare two bars.
 */
export function axisMoney(largest: number) {
  const inThousands = Math.abs(largest) >= 100_000; // ₱1,000 and up
  return (minor: number) => {
    const pesos = minor / 100;
    if (!inThousands) return `₱${Math.round(pesos).toLocaleString("en-PH")}`;
    const k = pesos / 1000;
    return `₱${k % 1 === 0 ? k : k.toFixed(1)}k`;
  };
}

/**
 * A chart in a card, with its title, an optional note, and a table view anyone can switch to.
 * The toggle is a real button, so the table is reachable by keyboard and by screen reader.
 */
export function ChartCard({ title, description, table, children, className, action }: {
  title: string;
  description?: string;
  /** The same numbers as a table: the chart's accessible equal, never a lesser fallback. */
  table: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const bodyId = useId();

  return (
    // min-w-0: without it a grid item refuses to shrink below its content, and the
    // scroll container inside pushes the whole page sideways on a phone.
    <section className={cn("min-w-0 rounded-xl border bg-card p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-pressed={showTable}
            aria-controls={bodyId}
            aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
            onClick={() => setShowTable((on) => !on)}
          >
            <Table2 className="size-4" />
          </Button>
        </div>
      </header>
      <div id={bodyId}>{showTable ? <div className="overflow-x-auto">{table}</div> : children}</div>
    </section>
  );
}

/** The table every chart falls back to. Values lead; the label identifies. */
export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          {head.map((cell, index) => (
            <th key={cell} scope="col" className={cn("py-2 font-medium", index === 0 ? "text-left" : "text-right")}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b last:border-0">
            {row.map((cell, index) => (
              <td key={index} className={cn("py-2 tabular-nums", index === 0 ? "text-left" : "text-right")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Identity for two or more series. The swatch carries the colour; the text stays in ink,
 * because a light categorical hue is illegible as text.
 */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: item.color }} />
          <span className="text-muted-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tooltip body shared by the charts: the value leads, the label follows. */
export function TipRows({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 whitespace-nowrap">
          {row.color && <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: row.color }} />}
          <span className="font-semibold tabular-nums">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export { formatMoney };
