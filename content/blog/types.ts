import type { ComponentType } from "react";

export type BlogCategory = "Costing and pricing" | "Inventory" | "Payments" | "Tax";

// One article. Bodies are plain JSX so posts need no MDX tooling; register new posts in
// content/blog/index.ts and they appear in the blog, sitemap, RSS feed and llms.txt.
export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description and the excerpt on the blog index (about 150 characters). */
  description: string;
  category: BlogCategory;
  keywords: string[];
  /** ISO dates (YYYY-MM-DD). */
  published: string;
  updated?: string;
  readingMinutes: number;
  /** Industry page slugs this post links back to. */
  industries: string[];
  faqs?: { q: string; a: string }[];
  Body: ComponentType;
};
