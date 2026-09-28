import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private areas stay out of every crawler. Shop pages live at /[slug] and can't be listed
// here; they redirect to sign-in and carry noindex (app/[shop]/layout.tsx).
const PRIVATE = ["/api/", "/r/", "/loyalty/", "/onboarding"];

// AI search and assistant crawlers, allowed by name so answer engines can cite the site.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
