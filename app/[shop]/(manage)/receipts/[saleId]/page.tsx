import { PageBody } from "@/components/shop/app-shell";
import { StaffReceipt } from "@/components/receipt/staff-receipt";

export default async function Page({ params }: PageProps<"/[shop]/receipts/[saleId]">) {
  const { saleId } = await params;
  return (
    <PageBody className="print:max-w-none print:p-0">
      <StaffReceipt saleId={saleId} />
    </PageBody>
  );
}
