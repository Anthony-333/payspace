import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbs, JsonLd, ORG_ID } from "@/components/marketing/json-ld";
import { MarketingShell, PROSE } from "@/components/marketing/marketing-shell";
import { PostCard } from "@/components/marketing/post-card";
import { formatPostDate, getPost, POSTS, relatedPosts } from "@/content/blog";
import { getIndustry } from "@/content/industries";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      section: post.category,
      tags: post.keywords,
    },
    twitter: { title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const url = `${SITE_URL}/blog/${post.slug}`;
  const industries = post.industries.map(getIndustry).filter((i) => i !== undefined);
  const { Body } = post;

  return (
    <MarketingShell current="/blog">
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": `${url}#article`,
              headline: post.title,
              description: post.description,
              url,
              mainEntityOfPage: url,
              datePublished: post.published,
              dateModified: post.updated ?? post.published,
              articleSection: post.category,
              keywords: post.keywords.join(", "),
              inLanguage: "en-PH",
              author: { "@id": ORG_ID },
              publisher: { "@id": ORG_ID },
            },
            breadcrumbs([
              ["Blog", "/blog"],
              [post.title, `/blog/${post.slug}`],
            ]),
            ...(post.faqs
              ? [
                  {
                    "@type": "FAQPage",
                    mainEntity: post.faqs.map((f) => ({
                      "@type": "Question",
                      name: f.q,
                      acceptedAnswer: { "@type": "Answer", text: f.a },
                    })),
                  },
                ]
              : []),
          ],
        }}
      />

      <article className="mx-auto w-full max-w-3xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <ChevronRight className="size-3.5" />
          <span>{post.category}</span>
        </nav>
        <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{post.description}</p>
        <p className="mt-5 text-sm text-muted-foreground">
          By the Payspace team · <time dateTime={post.published}>{formatPostDate(post.published)}</time> ·{" "}
          {post.readingMinutes} min read
        </p>

        <div className={`mt-10 border-t pt-4 ${PROSE}`}>
          <Body />

          {post.faqs && (
            <section aria-labelledby="faq">
              <h2 id="faq">Frequently asked questions</h2>
              {post.faqs.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        {industries.length > 0 && (
          <nav aria-label="Payspace for your business" className="mt-12 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted-foreground">Payspace for:</span>
            {industries.map((i) => (
              <Link
                key={i.slug}
                href={`/pos/${i.slug}`}
                className="rounded-full bg-muted px-4 py-1.5 font-medium hover:bg-accent"
              >
                {i.name}
              </Link>
            ))}
          </nav>
        )}
      </article>

      <section aria-labelledby="more" className="mx-auto w-full max-w-7xl px-4 pt-8 pb-4 sm:px-6">
        <h2 id="more" className="text-2xl font-semibold tracking-tight">
          Keep reading
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {relatedPosts(post).map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}
