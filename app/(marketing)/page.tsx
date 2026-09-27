import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";
import { AudienceStrip } from "@/components/marketing/audience-strip";
import { Benefits } from "@/components/marketing/benefits";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StructuredData } from "@/components/marketing/structured-data";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: { absolute: "Payspace POS: free POS system for coffee shops, bakeries and small stores in the Philippines" },
  description:
    "A point of sale for coffee shops, bakeries, milk tea stands and sari-sari stores in the Philippines, with recipe costing that shows the real profit on every item. GCash, Maya, VAT, stock tracking and receipts. Free to start.",
  alternates: { canonical: "/" },
};

// Landing page. Signed-in visitors see it too, with the calls to action pointing at their
// shop (or onboarding if they have none) instead of sign-up.
export default async function LandingPage() {
  let appHref: string | null = null;
  if (await isAuthenticated()) {
    const shops = await fetchAuthQuery(api.tenants.mine, {});
    appHref = shops.length > 0 ? `/${shops[0].slug}` : "/onboarding";
  }
  const ctaHref = appHref ?? "/sign-up";
  const ctaLabel = appHref ? "Open my shop" : "Get started for free";

  return (
    <div className="page-white flex min-h-full flex-1 flex-col bg-background text-foreground">
      <StructuredData />
      <SiteHeader appHref={appHref} />
      <main className="flex-1">
        <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <AudienceStrip />
        <Features ctaHref={ctaHref} />
        <Pricing ctaHref={ctaHref} />
        <Benefits />
        <Faq />
      </main>
      <SiteFooter appHref={appHref} />
    </div>
  );
}
