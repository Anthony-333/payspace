import type { MetadataRoute } from "next";
import { POSTS } from "@/content/blog";
import { INDUSTRIES } from "@/content/industries";
import { SITE_URL } from "@/lib/site";

// Public, indexable pages only. Industry pages and blog posts come from their registries, so a
// new one is listed as soon as it's added. Their share images live at hashed URLs
// (opengraph-image-<hash>), so only the home page lists an image.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const newestPost = POSTS.reduce((d, p) => ((p.updated ?? p.published) > d ? (p.updated ?? p.published) : d), "");
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}/opengraph-image`],
    },
    { url: `${SITE_URL}/pos`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    ...INDUSTRIES.map((i) => ({
      url: `${SITE_URL}/pos/${i.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/blog`, lastModified: newestPost ? new Date(newestPost) : lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...POSTS.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.published),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/sign-up`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/sign-in`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
