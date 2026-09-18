"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisMoney, ChartCard, DataTable, EmptyState, Legend, SERIES, TipRows } from "@/components/analytics/chart-parts";
import { formatMoney } from "@/convex/lib/money";

// Every chart here has one job: magnitude. So they use one hue (the brand blue) and let
// length carry the value. Colour only becomes categorical where the series are the subject,
// which is the payment mix alone.

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const hourLabel = (hour: number) => `${((hour + 11) % 12) + 1}${hour < 12 ? "am" : "pm"}`;

/** When the shop is busy. A column per hour of the shop's own day. */
export function HourlyChart({ byHour }: { byHour: number[] }) {
  const data = HOURS.map((hour) => ({ hour, label: hourLabel(hour), revenue: byHour[hour] ?? 0 }));
  const busiest = data.reduce((best, row) => (row.revenue > best.revenue ? row : best), data[0]);
  const hasSales = busiest.revenue > 0;

  return (
    <ChartCard
      title="Sales by hour"
      description={hasSales ? `Busiest at ${busiest.label}.` : "When your shop is busiest."}
      table={
        <DataTable
          head={["Hour", "Sales"]}
          rows={data.filter((row) => row.revenue > 0).map((row) => [row.label, formatMoney(row.revenue)])}
        />
      }
    >
      {hasSales ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={2}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickFormatter={axisMoney(busiest.revenue)}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TipRows
                    title={String(payload[0].payload.label)}
                    rows={[{ label: "in sales", value: formatMoney(Number(payload[0].value)) }]}
                  />
                ) : null
              }
            />
            {/* One series, so no legend: the card's title already names what is plotted. */}
            <Bar dataKey="revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="Your busiest hours appear after your first sale." />
      )}
    </ChartCard>
  );
}

const METHODS = [
  { key: "cash", label: "Cash", color: SERIES[0] },
  { key: "ewallet", label: "E-wallet", color: SERIES[1] },
  { key: "card", label: "Card", color: SERIES[2] },
] as const;

/**
 * Part-to-whole across three classes: one horizontal stacked bar, not a pie. Segments are
 * separated by a 2px gap in the surface colour rather than by a stroke.
 */
export function PaymentMix({ mix }: { mix: { cash: number; ewallet: number; card: number } }) {
  const total = mix.cash + mix.ewallet + mix.card;
  const segments = METHODS.map((method) => ({
    ...method,
    amount: mix[method.key],
    share: total > 0 ? (mix[method.key] / total) * 100 : 0,
  }));

  return (
    <ChartCard
      title="Payment mix"
      description="What people paid with, for cash planning."
      table={
        <DataTable
          head={["Method", "Taken", "Share"]}
          rows={segments.map((s) => [s.label, formatMoney(s.amount), `${s.share.toFixed(1)}%`])}
        />
      }
    >
      {total > 0 ? (
        <div className="grid gap-4">
          <div className="flex h-10 w-full gap-0.5 overflow-hidden rounded-lg" role="img"
            aria-label={segments.map((s) => `${s.label} ${s.share.toFixed(0)} percent`).join(", ")}>
            {segments.filter((s) => s.amount > 0).map((s) => (
              <div
                key={s.key}
                className="h-full min-w-1 first:rounded-l-lg last:rounded-r-lg"
                style={{ width: `${s.share}%`, background: s.color }}
                title={`${s.label} ${formatMoney(s.amount)}`}
              />
            ))}
          </div>
          <Legend items={segments.map((s) => ({ label: s.label, color: s.color }))} />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {segments.map((s) => (
              <div key={s.key}>
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(s.amount)}</dd>
                <dd className="text-xs text-muted-foreground tabular-nums">{s.share.toFixed(0)}%</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <EmptyState message="Your payment mix appears after your first sale." />
      )}
    </ChartCard>
  );
}

type TopItem = {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
  marginBps: number | null;
};

/**
 * Ranked magnitude: horizontal bars in one hue, value at the tip. Two of these sit side by
 * side, because what sells most and what earns most are rarely the same list.
 */
export function TopItems({ title, description, items, metric }: {
  title: string;
  description: string;
  items: TopItem[];
  metric: "revenue" | "profit";
}) {
  const most = Math.max(...items.map((item) => item[metric]), 1);

  return (
    <ChartCard
      title={title}
      description={description}
      table={
        <DataTable
          head={["Item", "Sold", "Sales", "Profit"]}
          rows={items.map((item) => [item.name, item.qty, formatMoney(item.revenue), formatMoney(item.profit)])}
        />
      }
    >
      {items.length > 0 ? (
        <ol className="grid gap-3">
          {items.map((item) => (
            <li key={item.productId} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(item[metric])}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max((item[metric] / most) * 100, 2)}%`, background: SERIES[0] }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {item.qty} sold
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState message="Your best sellers appear after your first sale." />
      )}
    </ChartCard>
  );
}
