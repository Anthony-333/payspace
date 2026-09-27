import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

/**
 * Where a signed-in visitor belongs: their first shop, or onboarding if they have none.
 * Null when signed out. Used to send signed-in visitors past the landing and auth pages.
 */
export async function appHomeHref(): Promise<string | null> {
  if (!(await isAuthenticated())) return null;
  const shops = await fetchAuthQuery(api.tenants.mine, {});
  return shops.length > 0 ? `/${shops[0].slug}` : "/onboarding";
}
