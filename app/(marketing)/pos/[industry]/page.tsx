import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { CostTable } from "@/components/marketing/cost-table";
import { breadcrumbs, JsonLd } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PostCard } from "@/components/marketing/post-card";
import { getPost } from "@/content/blog";
import { getIndustry, INDUSTRIES } from "@/content/industries";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({ params }: PageProps<"/pos/[industry]">): Promise<Metadata> {
  const industry = getIndustry((await params).industry);
  if (!industry) return {};
  const path = `/pos/${industry.slug}`;
  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    keywords: industry.keywords,
    alternates: { canonical: path },
    openGraph: { url: path, title: industry.metaTitle, description: industry.metaDescription },
    twitter: { title: industry.metaTitle, description: industry.metaDescription },
  };
}

export default async function IndustryPage({ params }: PageProps<"/pos/[industry]">) {
  const industry = getIndustry((await params).industry);
  if (!industry) notFound();
  const url = `${SITE_URL}/pos/${industry.slug}`;
  const guides = industry.guides.map(getPost).filter((p) => p !== undefined);
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);

  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${url}#webpage`,
              url,
              name: industry.metaTitle,
              description: industry.metaDescription,
              inLanguage: "en-PH",
              about: { "@id": `${SITE_URL}/#software` },
            },
            breadcrumbs([
              ["POS systems", "/pos"],
              [industry.name, `/pos/${industry.slug}`],
            ]),
            {
              "@type": "FAQPage",
              mainEntity: industry.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="rounded-[32px] bg-foreground px-7 py-12 text-background sm:px-12 sm:py-16">
          <p className="text-sm text-background/70">
            <Link href="/pos" className="hover:text-background">
              POS systems
            </Link>{" "}
            / {industry.name}
          </p>
          <p className="mt-6 text-sm font-medium text-brand">{industry.metaTitle}</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[3.25rem]">
            {industry.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/75">{industry.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Get started for free
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <Link href="/#pricing" className="text-sm font-semibold text-background/85 hover:text-background">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section aria-labelledby="problems" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <h2 id="problems" className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          What makes running {industry.name.toLowerCase()} hard
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {industry.pains.map((p) => (
            <li key={p.title} className="rounded-3xl bg-muted p-6">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section aria-labelledby="features" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <h2 id="features" className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          How Payspace helps
        </h2>
        <ul className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {industry.features.map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="size-4" strokeWidth={2.6} />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Worked example */}
      <section aria-labelledby="example" className="mx-auto w-full max-w-3xl px-4 pt-16 sm:px-6">
        <h2 id="example" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          See the profit on every item
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{industry.exampleIntro}</p>
        <CostTable example={industry.example} />
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {industry.exampleNote} Prices are examples.
        </p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl px-4 pt-16 sm:px-6">
        <h2 id="faq" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions from {industry.name.toLowerCase()}
        </h2>
        <dl className="mt-6 divide-y">
          {industry.faqs.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="text-lg font-semibold">{f.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Guides */}
      {guides.length > 0 && (
        <section aria-labelledby="guides" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
          <h2 id="guides" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Guides for {industry.name.toLowerCase()}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </ul>
        </section>
      )}

      {/* Other industries */}
      <nav aria-label="Payspace for other businesses" className="mx-auto w-full max-w-7xl px-4 pt-12 pb-4 sm:px-6">
        <p className="text-sm text-muted-foreground">Payspace is also built for</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((i) => (
            <li key={i.slug}>
              <Link href={`/pos/${i.slug}`} className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-medium hover:bg-accent">
                {i.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </MarketingShell>
  );
}
