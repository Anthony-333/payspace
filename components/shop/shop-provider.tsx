"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/convex/lib/money";

export type Shop = NonNullable<FunctionReturnType<typeof api.tenants.bySlug>>;

const ShopContext = createContext<Shop | null>(null);

/**
 * `shop` is the layout's server read. The layout doesn't re-run on client navigation, so
 * subscribe too: a change in Settings (currency, sign, timezone, role) reaches every screen live.
 */
export function ShopProvider({ shop, children }: { shop: Shop; children: ReactNode }) {
  const live = useQuery(api.tenants.bySlug, { slug: shop.slug });
  return <ShopContext.Provider value={live ?? shop}>{children}</ShopContext.Provider>;
}

/** The current shop from the URL slug. Pass `shop.tenantId` to every tenant-scoped Convex call. */
export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop must be used inside app/[shop]");
  return shop;
}

/** `formatMoney` in the shop's own currency sign: `money(14000)` → "$140.00". */
export function useMoney() {
  const { currencySymbol } = useShop();
  return useCallback((minor: number) => formatMoney(minor, currencySymbol), [currencySymbol]);
}

/** Owners and managers edit the catalog and see costs. The server enforces this too. */
export function canManage(role: Shop["role"]) {
  return role === "owner" || role === "manager";
}
