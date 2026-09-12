"use client";

import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, type ReactNode } from "react";
import type { api } from "@/convex/_generated/api";

export type Shop = NonNullable<FunctionReturnType<typeof api.tenants.bySlug>>;

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ shop, children }: { shop: Shop; children: ReactNode }) {
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

/** The current shop from the URL slug. Pass `shop.tenantId` to every tenant-scoped Convex call. */
export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop must be used inside app/[shop]");
  return shop;
}

/** Owners and managers edit the catalog and see costs. The server enforces this too. */
export function canManage(role: Shop["role"]) {
  return role === "owner" || role === "manager";
}
