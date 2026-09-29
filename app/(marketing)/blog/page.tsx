import type { Metadata } from "next";
import { breadcrumbs, JsonLd, ORG_ID } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PostCard } from "@/components/marketing/post-card";
import { POSTS } from "@/content/blog";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Practical guides for Philippine coffee shops, bakeries, milk tea shops and sari-sari stores: recipe costing, pricing, VAT, inventory and GCash payments.";

export const metadata: Metadata = {
  title: "Small shop guides: costing, pricing and VAT",
  description: DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": `${SITE_URL}/blog/rss.xml` } },
  openGraph: { url: "/blog", title: "Small shop guides: costing, pricing and VAT", description: DESCRIPTION },
};

export default function BlogIndexPage() {
  return (
    <MarketingShell current="/blog">
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "Blog",
              "@id": `${SITE_URL}/blog#blog`,
              url: `${SITE_URL}/blog`,
              name: "The Payspace blog",
              description: DESCRIPTION,
              inLanguage: "en-PH",
              publisher: { "@id": ORG_ID },
              blogPost: POSTS.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                url: `${SITE_URL}/blog/${p.slug}`,
                datePublished: p.published,
              })),
            },
            breadcrumbs([["Blog", "/blog"]]),
          ],
        }}
      />
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-primary">The Payspace blog</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Guides for running a more profitable small shop
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
