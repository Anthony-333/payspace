import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "@/lib/site";
import { MarketingShell } from "./marketing-shell";

// Shared layout for /terms and /privacy.
export function LegalPage({
  title,
  effectiveDate,
  intro,
  children,
}: {
  title: string;
  effectiveDate: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-3xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-primary">Effective {effectiveDate}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <div className="mt-6 text-lg leading-relaxed text-muted-foreground">{intro}</div>
        <div className="mt-12 space-y-12 border-t pt-12 text-[15px] leading-relaxed text-foreground/85 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-2 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </MarketingShell>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ContactLink() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}
