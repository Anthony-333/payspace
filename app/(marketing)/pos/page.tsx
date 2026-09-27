import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { breadcrumbs, JsonLd } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { INDUSTRIES } from "@/content/industries";
import { SITE_URL } from "@/lib/site";

const TITLE = "POS System for Small Businesses in the Philippines";
const DESCRIPTION =
  "Payspace is a free-to-start POS system for coffee shops, milk tea shops, bakeries, sari-sari stores and groceries in the Philippines, with recipe costing, stock tracking and GCash and Maya payments.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pos" },
  openGraph: { url: "/pos", title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PosHubPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${SITE_URL}/pos#webpage`,
              url: `${SITE_URL}/pos`,
              name: TITLE,
              description: DESCRIPTION,
              inLanguage: "en-PH",
              about: { "@id": `${SITE_URL}/#software` },
              mainEntity: {
                "@type": "ItemList",
                itemListElement: INDUSTRIES.map((i, n) => ({
                  "@type": "ListItem",
                  position: n + 1,
                  name: i.metaTitle,
                  url: `${SITE_URL}/pos/${i.slug}`,
                })),
              },
            },
            breadcrumbs([["POS systems", "/pos"]]),
          ],
        }}
      />
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-primary">Payspace POS</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          A POS system built for small shops in the Philippines
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((i) => (
            <li key={i.slug} className="group relative flex flex-col rounded-3xl bg-muted p-6 transition-colors hover:bg-accent/60">
              <h2 className="text-xl font-semibold tracking-tight">
                <Link href={`/pos/${i.slug}`} className="after:absolute after:inset-0">
                  POS for {i.name.toLowerCase()}
                </Link>
              </h2>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">{i.intro}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
