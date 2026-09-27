import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";
import { FAQ, PLAN_ROWS } from "./content";
import { JsonLd, ORG_ID } from "./json-ld";

// Schema.org JSON-LD for the landing page, read by Google rich results and AI answer engines.
// Built from the same copy the page shows, so the two never disagree. No ratings or reviews:
// the testimonials are placeholders until real pilot quotes exist.
const APP_ID = `${SITE_URL}/#software`;

const featureList = PLAN_ROWS.filter((r) => r.pro === true || r.free === true).map((r) => r.label);

const graph = [
  {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Payspace",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    areaServed: { "@type": "Country", name: "Philippines" },
  },
  {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-PH",
    publisher: { "@id": ORG_ID },
  },
  {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    alternateName: ["Payspace", "Payspace point of sale"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Point of sale (POS) software",
    operatingSystem: "Web browser (Android, iOS, Windows, macOS, ChromeOS)",
    browserRequirements: "Requires a modern browser with JavaScript enabled.",
    image: `${SITE_URL}/opengraph-image`,
    inLanguage: "en-PH",
    countriesSupported: "PH",
    keywords: SITE_KEYWORDS.join(", "),
    featureList,
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Coffee shops, milk tea stands, bakeries, groceries, sari-sari stores and small retail",
    },
    publisher: { "@id": ORG_ID },
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "Checkout, receipts and stock tracking for up to 50 products. No card needed.",
        url: `${SITE_URL}/sign-up`,
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "5",
        priceCurrency: "USD",
        description: "Unlimited products, recipe costing, profit per item and margin alerts. Billed per shop, not per cashier.",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "5",
          priceCurrency: "USD",
          billingDuration: "P1M",
          unitText: "shop per month",
        },
        url: `${SITE_URL}/sign-up`,
      },
    ],
  },
  {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export function StructuredData() {
  return <JsonLd data={{ "@graph": graph }} />;
}
