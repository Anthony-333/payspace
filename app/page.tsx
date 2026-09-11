import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

// Entry point: send people to their first shop, onboarding, or sign-in.
export default async function Home() {
  if (!(await isAuthenticated())) redirect("/sign-in");
  const shops = await fetchAuthQuery(api.tenants.mine, {});
  redirect(shops.length > 0 ? `/${shops[0].slug}` : "/onboarding");
}
