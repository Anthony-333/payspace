import type { Metadata } from "next";
import { PublicReceipt } from "@/components/receipt/public-receipt";

export const metadata: Metadata = {
  title: "Receipt",
  // A receipt is for the customer who has the link, not for search engines.
  robots: { index: false, follow: false },
};

export default async function Page({ params, searchParams }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const { print } = await searchParams;
  return (
    <main className="flex-1 bg-background p-4 py-10 print:p-0">
      <PublicReceipt token={token} autoPrint={print === "1"} />
    </main>
  );
}
