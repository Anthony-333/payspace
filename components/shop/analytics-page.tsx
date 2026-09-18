"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { WeekdayHeatmap } from "@/components/analytics/heatmap";
import { KpiTiles, MarginNote } from "@/components/analytics/kpi-tiles";
import { rangeFrom, RangePicker, useShopToday, type Preset, type Range } from "@/components/analytics/range-picker";
import { HourlyChart, PaymentMix, TopItems } from "@/components/analytics/sales-charts";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { api } from "@/convex/_generated/api";
import { daysBetween, formatBusinessDate } from "@/convex/lib/businessDate";

// Reads the rollups checkout writes, so these numbers are live: they tick up while the owner
// watches. Charts follow the dataviz method - the form is picked by the job, colour last.

/** Top items read a row per product per day, so the server caps their range at 31 days. */
const TOP_ITEMS_MAX_DAYS = 31;

export function AnalyticsPage() {
  const shop = useShop();
  const manage = canManage(shop.role);
  const today = useShopToday(shop.timezone);
  const [preset, setPreset] = useState<Preset>("7");
  const [custom, setCustom] = useState<Range | null>(null);
  // Derived, not stored: a preset range is just today and the preset, so nothing can drift.
  const range = preset === "custom" ? custom : today ? rangeFrom(today, preset) : null;

  const summary = useQuery(api.analytics.summary, manage && range ? { tenantId: shop.tenantId, ...range } : "skip");
  const withinTopRange = range ? daysBetween(range.from, range.to) <= TOP_ITEMS_MAX_DAYS : true;
  const top = useQuery(
    api.analytics.topProducts,
    manage && range && withinTopRange ? { tenantId: shop.tenantId, ...range } : "skip",
  );

  if (!manage) {
    return <PageHeader title="Analytics" description="Only owners and managers can see sales and profit." />;
  }

  const oneDay = range?.from === range?.to;
  return (
    <>
      <PageHeader
        title="Analytics"
        description={!range
          ? "Sales and profit, compared with the week before."
          : oneDay
            ? `${formatBusinessDate(range.from)}, compared with the same weekday last week.`
            : `${formatBusinessDate(range.from)} to ${formatBusinessDate(range.to)}, compared with the week before.`}
      />
      <div className="grid gap-5">
        {range && today && (
          <RangePicker
            preset={preset}
            range={range}
            today={today}
            maxDays={TOP_ITEMS_MAX_DAYS * 12}
            onChange={(nextPreset, nextRange) => {
              setPreset(nextPreset);
              if (nextPreset === "custom") setCustom(nextRange);
            }}
          />
        )}

        <KpiTiles
          current={summary?.current}
          previous={summary?.previous}
          loading={summary === undefined}
          comparison={oneDay ? "the same weekday last week" : "the week before"}
        />
        {summary && (
          <MarginNote marginBps={summary.current.marginBps} targetBps={summary.targetMarginBps} />
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HourlyChart byHour={summary?.byHour ?? []} />
          </div>
          <PaymentMix mix={summary?.current ?? { cash: 0, ewallet: 0, card: 0 }} />
        </div>

        <WeekdayHeatmap byWeekdayHour={summary?.byWeekdayHour ?? []} />

        {withinTopRange ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <TopItems
              title="Top items by profit"
              description="What actually makes you money."
              items={top?.byProfit ?? []}
              metric="profit"
            />
            <TopItems
              title="Top items by revenue"
              description="What sells the most."
              items={top?.byRevenue ?? []}
              metric="revenue"
            />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Top items cover up to {TOP_ITEMS_MAX_DAYS} days at a time. Narrow the range to see them.
          </p>
        )}
        {top?.capped && (
          <p className="text-sm text-muted-foreground">
            This shop sells enough that the lists above are based on a sample of the range.
          </p>
        )}
      </div>
    </>
  );
}
