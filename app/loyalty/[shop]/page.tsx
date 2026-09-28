import type { Metadata } from "next";
import { CustomerCard } from "@/components/loyalty/customer-card";

export const metadata: Metadata = {
  title: "Loyalty card",
  // A customer's card is private to them; keep the page out of search results.
  robots: { index: false, follow: false },
};

export default async function Page({ params }: PageProps<"/loyalty/[shop]">) {
  const { shop } = await params;
  return (
    <main className="flex-1 bg-background px-4 py-10">
      <CustomerCard shop={shop} />
    </main>
  );
}
