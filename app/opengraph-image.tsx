import { OG_SIZE, ogCard } from "@/lib/og-card";

// Default link-preview image for every page (Facebook, Messenger, Viber, X, Google Discover).
export const alt = "Payspace POS: the point of sale that shows the real profit on everything you sell";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogCard({
    eyebrow: "The point of sale for coffee shops, bakeries and small stores",
    title: "Know the real profit on everything you sell",
    tags: ["Recipe costing", "GCash & Maya", "Stock ledger", "VAT receipts"],
  });
}
