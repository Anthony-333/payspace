import { getIndustry, INDUSTRIES } from "@/content/industries";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Payspace POS for small businesses in the Philippines";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industry: i.slug }));
}

export default async function Image({ params }: { params: Promise<{ industry: string }> }) {
  const industry = getIndustry((await params).industry);
  return ogCard({
    eyebrow: industry?.metaTitle ?? "POS system for small businesses",
    title: industry?.headline ?? "Know the real profit on everything you sell",
    tags: ["Recipe costing", "GCash & Maya", "Stock ledger", "Free to start"],
  });
}
