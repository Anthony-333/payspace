import { SITE_URL } from "@/lib/site";

/** Renders schema.org JSON-LD. "<" is escaped so the payload can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }} />;
}

export const ORG_ID = `${SITE_URL}/#organization`;

/** BreadcrumbList from [name, path] pairs, starting after Home. */
export function breadcrumbs(items: [name: string, path: string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as const, ...items].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path === "/" ? "" : path}`,
    })),
  };
}
