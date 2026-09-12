"use client";

import { ChartColumn, ChartPie, Clock, Coins, Receipt, ShoppingBag, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";

// Sales rollups (dailyStats, productDailyStats) are written by checkout, which isn't built yet,
// so every figure shows its empty state. The layout matches the Week 6 dashboard plan.

const KPIS: { label: string; icon: LucideIcon; money: boolean }[] = [
  { label: "Sales today", icon: Coins, money: true },
  { label: "Gross profit", icon: TrendingUp, money: true },
  { label: "Orders", icon: ShoppingBag, money: false },
  { label: "Average ticket", icon: Receipt, money: true },
];

export function KpiGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {KPIS.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {kpi.label}
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <kpi.icon className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {kpi.money ? <><span className="text-muted-foreground">₱</span>0.00</> : "0"}
          </div>
          <div className="text-xs text-muted-foreground">No sales yet</div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ title, description, icon: Icon, className }: {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className ?? ""}`}>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex h-48 flex-col items-center justify-center gap-2 rounded-lg bg-muted text-center text-sm text-muted-foreground">
        <Icon className="size-6" />
        Your numbers appear after your first sale.
      </div>
    </section>
  );
}

export function AnalyticsPage() {
  const shop = useShop();
  if (!canManage(shop.role)) {
    return <PageHeader title="Analytics" description="Only owners and managers can see sales and profit." />;
  }
  return (
    <>
      <PageHeader title="Analytics" description="Sales and profit, compared with the same weekday last week." />
      <div className="grid gap-5">
        <KpiGrid />
        <div className="grid gap-5 lg:grid-cols-3">
          <EmptyChart className="lg:col-span-2" title="Sales by hour" description="When your shop is busiest." icon={Clock} />
          <EmptyChart title="Payment mix" description="Cash, e-wallet and card." icon={ChartPie} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <EmptyChart title="Top items by profit" description="What actually makes you money." icon={Trophy} />
          <EmptyChart title="Top items by revenue" description="What sells the most." icon={ChartColumn} />
        </div>
      </div>
    </>
  );
}
