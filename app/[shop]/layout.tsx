import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShopProvider } from "@/components/shop/shop-provider";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

// Shop screens are private: keep them out of search results.
export const metadata: Metadata = {
  title: "Shop",
  robots: { index: false, follow: false },
};

// Resolves the slug to a shop the caller belongs to. Convex re-checks membership on every call.
export default async function ShopLayout({ children, params }: LayoutProps<"/[shop]">) {
  const { shop: slug } = await params;
  if (!(await isAuthenticated())) redirect(`/sign-in?next=/${encodeURIComponent(slug)}`);
  const shop = await fetchAuthQuery(api.tenants.bySlug, { slug });
  if (!shop) notFound();
  return <ShopProvider shop={shop}>{children}</ShopProvider>;
}
