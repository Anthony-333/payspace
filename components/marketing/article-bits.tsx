import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** A highlighted aside inside an article. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-6 rounded-2xl border border-primary/20 bg-accent/60 p-5 [&>p:first-of-type]:mt-2">
      <p className="font-semibold text-foreground">{title}</p>
      {children}
    </aside>
  );
}

/** "How Payspace does this" box at the end of an article. */
export function TryPayspace({ children }: { children: ReactNode }) {
  return (
    <aside className="mt-12 rounded-[28px] bg-foreground p-7 text-background sm:p-9 [&_a]:text-background">
      <p className="text-sm font-medium text-background/70">How Payspace helps</p>
      <div className="mt-2 text-lg leading-relaxed text-background/90">{children}</div>
      <Link
        href="/sign-up"
        className="mt-6 inline-flex items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold !text-primary-foreground !no-underline transition-transform hover:-translate-y-0.5"
      >
        Get started for free
        <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </aside>
  );
}
