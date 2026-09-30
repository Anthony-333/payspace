import type { Metadata } from "next";
import { BillingSuccess } from "@/components/shop/billing-success";

export const metadata: Metadata = { title: "Welcome to Pro" };

// Full screen, outside the (manage) app shell: no sidebar or top bar.
export default function Page() {
  return <BillingSuccess />;
}
