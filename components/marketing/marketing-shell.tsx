import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Frame for the static marketing pages (legal, industry pages, blog). They're prerendered,
// so the header and footer show the signed-out calls to action.
export function MarketingShell({ children, current = null }: { children: ReactNode; current?: string | null }) {
  return (
    <div className="page-white flex min-h-full flex-1 flex-col bg-background text-foreground">
      <SiteHeader appHref={null} current={current} />
      <main className="flex-1">{children}</main>
      <SiteFooter appHref={null} />
    </div>
  );
}

// Long-form text styles for blog articles; this project has no typography plugin.
export const PROSE =
  "text-[17px] leading-relaxed text-foreground/85 " +
  "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground " +
  "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground " +
  "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-2 [&_li]:pl-1 " +
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[15px] " +
  "[&_th]:border-b [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground " +
  "[&_td]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_tfoot_td]:font-semibold [&_tfoot_td]:text-foreground " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]";
