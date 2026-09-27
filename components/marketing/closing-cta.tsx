import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";

export function ClosingCta({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-[32px] bg-foreground px-6 py-20 text-center text-background">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 -right-16 size-80 rounded-full border border-background/10" />
            <div className="absolute -top-8 right-6 size-56 rounded-full border border-background/10" />
            <div className="absolute -bottom-28 -left-16 size-72 rounded-full border border-background/10" />
          </div>
          <h2 className="mx-auto max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Know what you really made today
          </h2>
          <p className="mx-auto mt-4 max-w-md text-background/70">
            Set up your shop in minutes. Start free, and upgrade when profit per item pays for it.
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {ctaLabel}
            <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </section>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-4 pb-10 text-sm text-muted-foreground sm:px-6">
        <Logo className="text-base text-foreground" />
        <nav aria-label="Footer" className="flex gap-6">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
        </nav>
        <p>© {new Date().getFullYear()} Payspace</p>
      </footer>
    </>
  );
}
