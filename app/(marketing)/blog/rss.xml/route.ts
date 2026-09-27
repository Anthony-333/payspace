import { POSTS } from "@/content/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// RSS feed for the blog, linked from the blog index's <head>. Feed readers and some search
// and AI crawlers discover new posts through it.
export const dynamic = "force-static";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function GET() {
  const items = POSTS.map((p) => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description)}</description>
      <category>${esc(p.category)}</category>
      <pubDate>${new Date(`${p.published}T08:00:00+08:00`).toUTCString()}</pubDate>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${SITE_NAME} blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>Guides for coffee shops, bakeries and small stores in the Philippines.</description>
    <language>en-ph</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
