import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AudienceStrip } from "@/components/marketing/audience-strip";
import { Benefits } from "@/components/marketing/benefits";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StructuredData } from "@/components/marketing/structured-data";
import { WhatsNew } from "@/components/marketing/whats-new";
import { appHomeHref } from "@/lib/app-home";

export const metadata: Metadata = {
  title: { absolute: "Payspace POS: free POS system for coffee shops, bakeries and small stores in the Philippines" },
  description:
    "A point of sale for coffee shops, bakeries, milk tea stands and sari-sari stores in the Philippines, with recipe costing that shows the real profit on every item. GCash, Maya, VAT, stock tracking and receipts. Free to start.",
  alternates: { canonical: "/" },
};

// Landing page, for signed-out visitors (and search engines). Signed-in visitors go straight
// to their shop, or to onboarding if they have none.
export default async function LandingPage() {
  const appHref = await appHomeHref();
  if (appHref) redirect(appHref);
  const ctaHref = "/sign-up";
  const ctaLabel = "Get started for free";

  return (
    <div className="page-white flex min-h-full flex-1 flex-col bg-background text-foreground">
      <StructuredData />
      <SiteHeader appHref={null} />
      <main className="flex-1">
        <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <AudienceStrip />
        <Features ctaHref={ctaHref} />
        <WhatsNew />
        <Pricing ctaHref={ctaHref} />
        <Benefits />
        <Faq />
      </main>
      <SiteFooter appHref={null} />
    </div>
  );
}
