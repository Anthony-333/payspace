import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/marketing/logo";
import { PosMockup, TabletFrame } from "@/components/marketing/mockups";

/**
 * Sign-in, sign-up and onboarding: the form on white beside the landing page's dark hero
 * card, so moving from the landing page into the app feels like one place. The dark card
 * is decoration and drops away below `lg`.
 */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="page-white grid min-h-dvh flex-1 grid-cols-1 gap-4 bg-background p-4 lg:grid-cols-[1fr_1.1fr]">
      <main className="flex flex-col px-2 py-4 sm:px-6">
        <Link href="/" aria-label="Payspace home" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 text-muted-foreground">{description}</p>
          {children}
        </div>
      </main>

      <aside
        aria-hidden
        className="relative isolate hidden flex-col overflow-hidden rounded-2xl bg-foreground p-10 text-background lg:flex"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[40%] -right-24 size-96 rounded-full border border-background/10" />
          <div className="absolute top-[50%] -right-6 size-64 rounded-full border border-background/10" />
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-brand/20 blur-3xl" />
        </div>
        <p className="text-sm text-background/75">The point of sale for coffee shops, bakeries and small stores 🚀</p>
        <p className="mt-4 max-w-lg text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
          Know the real profit on everything you sell
        </p>
        <div className="relative mt-10 flex-1">
          <TabletFrame
            label="Payspace checkout screen"
            className="absolute -right-24 -bottom-24 h-90 w-150"
          >
            <PosMockup />
          </TabletFrame>
        </div>
      </aside>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
