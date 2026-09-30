"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarCheck,
  ChartColumn,
  Check,
  ChefHat,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import { cn } from "cn";
import { Chip } from "@/components/marketing/chip";
import { PRO_PRICE } from "@/components/marketing/content";
import { Logo } from "@/components/marketing/logo";
import { Confetti } from "@/components/shop/confetti";
import { usePlan } from "@/components/shop/plan";
import { useShop } from "@/components/shop/shop-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { businessDate, formatBusinessDate } from "@/convex/lib/businessDate";

/** After this long without the webhook, say so instead of spinning forever. */
const SLOW_AFTER_MS = 30_000;

type Unlock = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  tint: string;
};

const UNLOCKS: Unlock[] = [
  {
    icon: ChefHat,
    title: "Recipe costing",
    body: "Cost every item to the gram and see the profit on each sale.",
    href: "/products",
    tint: "bg-tint-violet text-tint-violet-foreground",
  },
  {
    icon: Package,
    title: "Unlimited products",
    body: "Add your whole menu or shelf, with no product cap.",
    href: "/products",
    tint: "bg-tint-green text-tint-green-foreground",
  },
  {
    icon: BellRing,
    title: "Margin and stock alerts",
    body: "Know when a cost rise eats your margin or a shelf runs low.",
    href: "/inventory",
    tint: "bg-tint-blue text-tint-blue-foreground",
  },
  {
    icon: ChartColumn,
    title: "Full history",
    body: "Every day of your dashboard, not just the last few weeks.",
    href: "/analytics",
    tint: "bg-muted text-muted-foreground",
  },
];

/**
 * Where Polar Checkout lands after a successful payment, full screen and styled like the
 * landing page. Polar confirms the subscription by webhook, so the plan may still read Free
 * for a few seconds; billing.status is a live query, so the page turns to the welcome (and
 * fires the confetti) as soon as the webhook lands.
 */
export function BillingSuccess() {
  const shop = useShop();
  const router = useRouter();
  const plan = usePlan();
  const [slow, setSlow] = useState(false);
  const owner = shop.role === "owner";

  // Billing is owner-only, like settings.
  useEffect(() => {
    if (!owner) router.replace(`/${shop.slug}`);
  }, [owner, router, shop.slug]);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const base = `/${shop.slug}`;
  const pro = plan?.plan === "pro";

  return (
    <div className="page-white min-h-dvh bg-background pb-10">
      <Confetti fire={pro} />
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
        <Link href={base} aria-label={`${shop.name} dashboard`}>
          <Logo eager />
        </Link>
        <Link
          href={base}
          className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-40 truncate sm:max-w-none">Back to {shop.name}</span>
        </Link>
      </header>

      {!owner || plan === undefined ? (
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-[1.55fr_1fr]">
          <Skeleton className="h-[560px] rounded-[32px]" />
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      ) : pro ? (
        <Welcome />
      ) : (
        <Confirming slow={slow} settingsHref={`${base}/settings#billing`} />
      )}
    </div>
  );
}

function Welcome() {
  const shop = useShop();
  const plan = usePlan();
  const details = plan?.details;
  const base = `/${shop.slug}`;
  const date = (ms: number | null | undefined) => (ms ? formatBusinessDate(businessDate(ms, shop.timezone)) : null);
  const trialEnd = date(details?.trialEnd);
  const renews = date(details?.currentPeriodEnd);

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 lg:grid-cols-[1.55fr_1fr]">
      {/* Dark lead card, like the landing hero */}
      <section className="relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-[32px] bg-foreground p-7 text-background sm:min-h-[620px] sm:p-10">
        <Rings />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" />

        <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-background/10 py-1 pr-3 pl-1 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
            <Check className="size-3" strokeWidth={3} /> Paid
          </span>
          Payment received
        </span>
        <p className="max-w-xs text-sm text-background/70">{shop.name} just levelled up 🎉</p>
        <h1 className="mt-4 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[3.5rem]">
          Welcome to Payspace Pro
        </h1>
        <p className="mt-4 max-w-md text-sm text-background/70 sm:text-base">
          Every Pro tool is unlocked for {shop.name}. Start with a recipe, and your next sale shows what it really earned.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={base}
            className="inline-flex w-fit items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Open your dashboard
            <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
              <ArrowRight className="size-4" />
            </span>
          </Link>
          <Link
            href={`${base}/settings#billing`}
            className="text-sm font-semibold text-background/80 underline-offset-4 hover:text-background hover:underline"
          >
            Billing settings
          </Link>
        </div>

        {/* A receipt for the plan, cropped by the card's bottom edge like the hero's tablets */}
        <div className="relative mt-10 min-h-[200px] flex-1">
          <div className="absolute -bottom-16 left-0 w-[300px] rotate-[-4deg] rounded-t-2xl bg-card p-5 text-foreground shadow-2xl sm:left-6 sm:w-[340px] md:right-10 md:left-auto">
            <div className="flex items-center justify-between">
              <Logo className="h-5" />
              <span className="rounded-full bg-tint-green px-2 py-0.5 text-[11px] font-semibold text-tint-green-foreground">
                {trialEnd ? "Trial active" : "Active"}
              </span>
            </div>
            <div className="my-4 border-t border-dashed" />
            <dl className="grid gap-2 text-sm">
              <Row label="Shop" value={shop.name} />
              <Row label="Plan" value="Pro, monthly" />
              <Row label="Price" value={`US$${PRO_PRICE.usd} / month`} />
              {trialEnd && <Row label="First charge" value={trialEnd} />}
              {!trialEnd && renews && <Row label="Renews" value={renews} />}
            </dl>
            <div className="my-4 border-t border-dashed" />
            <p className="text-xs text-muted-foreground">A receipt from Polar is on its way to your email.</p>
          </div>
        </div>
      </section>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-tint-peach p-6 sm:col-span-2">
          <Chip icon={CalendarCheck}>Your plan</Chip>
          <div>
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {trialEnd ? `Free until ${trialEnd}` : renews ? `Renews ${renews}` : "Pro is on"}
            </p>
            <p className="mt-2 text-sm text-tint-peach-foreground">
              {trialEnd
                ? "You won't be charged before then, and you can cancel anytime from billing settings."
                : "Change your card, get invoices or cancel anytime from billing settings."}
            </p>
          </div>
        </div>

        {UNLOCKS.map((u) => (
          <UnlockCard key={u.title} unlock={u} href={`${base}${u.href}`} />
        ))}
      </div>
    </main>
  );
}

function UnlockCard({ unlock, href }: { unlock: Unlock; href: string }) {
  const Icon = unlock.icon;
  return (
    <Link
      href={href}
      className={cn("group flex flex-col justify-between gap-6 rounded-2xl p-6 transition-transform hover:-translate-y-0.5", unlock.tint)}
    >
      <span className="grid size-10 place-items-center rounded-full bg-foreground text-background">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{unlock.title}</p>
        <p className="mt-1 text-sm">{unlock.body}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
          Try it <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function Confirming({ slow, settingsHref }: { slow: boolean; settingsHref: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <section className="relative isolate grid min-h-[480px] place-items-center overflow-hidden rounded-[32px] bg-foreground p-8 text-center text-background sm:p-12">
        <Rings />
        <div className="grid max-w-md justify-items-center gap-5">
          <span className="relative grid size-16 place-items-center rounded-full bg-background/10">
            <Loader2 className="size-7 animate-spin text-brand" />
          </span>
          <Chip icon={Sparkles} dark>
            Almost there
          </Chip>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Confirming your payment…</h1>
          <p className="text-sm text-background/70 sm:text-base">
            {slow
              ? "This is taking longer than usual. Your payment went through, and Pro will switch on by itself as soon as Polar confirms it. You can leave this page."
              : "Polar is confirming your subscription. This usually takes a few seconds."}
          </p>
          {slow && (
            <Link
              href={settingsHref}
              className="inline-flex items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground"
            >
              Go to billing settings
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
                <ArrowRight className="size-4" />
              </span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function Rings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute top-[45%] -right-24 size-80 rounded-full border border-background/10" />
      <div className="absolute top-[52%] -right-8 size-56 rounded-full border border-background/10" />
      <div className="absolute top-[60%] -left-20 size-64 rounded-full border border-background/10" />
    </div>
  );
}
