import { PageBody } from "@/components/shop/app-shell";
import { CountPage } from "@/components/inventory/count-page";

export default function Page() {
  return (
    <PageBody className="max-w-3xl pb-0">
      <CountPage />
    </PageBody>
  );
}
