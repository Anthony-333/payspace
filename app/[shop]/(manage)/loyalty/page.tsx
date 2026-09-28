import { LoyaltyPage } from "@/components/loyalty/loyalty-page";
import { PageBody } from "@/components/shop/app-shell";

export default async function Page({ searchParams }: PageProps<"/[shop]/loyalty">) {
  // ?sale=128 comes from a receipt's "Loyalty stamp" button.
  const { sale } = await searchParams;
  const saleNumber = typeof sale === "string" && /^\d{1,9}$/.test(sale) ? Number(sale) : undefined;
  return (
    <PageBody>
      <LoyaltyPage saleNumber={saleNumber} />
    </PageBody>
  );
}
