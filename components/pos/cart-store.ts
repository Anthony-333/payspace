"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PayMethod = "cash" | "ewallet" | "card";

/**
 * A cart line holds only what checkout will send: the product, the chosen option refs
 * ("groupId:key", in the product's group order) and the quantity. Names and prices are
 * looked up live from the catalog, and the server prices the sale again at checkout.
 */
export type CartLine = { id: string; productId: string; options: string[]; qty: number };
export type TenantCart = { lines: CartLine[]; method: PayMethod };

export const MAX_LINE_QTY = 999;
export const EMPTY_CART: TenantCart = { lines: [], method: "cash" };

type CartState = {
  carts: Record<string, TenantCart>;
  add: (tenantId: string, productId: string, options: string[], qty?: number) => void;
  setQty: (tenantId: string, lineId: string, qty: number) => void;
  clear: (tenantId: string) => void;
  setMethod: (tenantId: string, method: PayMethod) => void;
};

const lineId = (productId: string, options: string[]) => `${productId}|${options.join(",")}`;
const clampQty = (qty: number) => Math.max(0, Math.min(MAX_LINE_QTY, Math.floor(qty)));

export const useCartStore = create<CartState>()(
  persist(
    (set) => {
      const update = (tenantId: string, change: (cart: TenantCart) => TenantCart) =>
        set((state) => ({ carts: { ...state.carts, [tenantId]: change(state.carts[tenantId] ?? EMPTY_CART) } }));

      return {
        carts: {},
        add: (tenantId, productId, options, qty = 1) =>
          update(tenantId, (cart) => {
            const id = lineId(productId, options);
            const existing = cart.lines.find((line) => line.id === id);
            const lines = existing
              ? cart.lines.map((line) => (line.id === id ? { ...line, qty: clampQty(line.qty + qty) } : line))
              : [...cart.lines, { id, productId, options, qty: clampQty(qty) }];
            return { ...cart, lines };
          }),
        setQty: (tenantId, id, qty) =>
          update(tenantId, (cart) => ({
            ...cart,
            lines: cart.lines
              .map((line) => (line.id === id ? { ...line, qty: clampQty(qty) } : line))
              .filter((line) => line.qty > 0),
          })),
        clear: (tenantId) => update(tenantId, (cart) => ({ ...cart, lines: [] })),
        setMethod: (tenantId, method) => update(tenantId, (cart) => ({ ...cart, method })),
      };
    },
    {
      // Kept on the device so a refresh or a dropped connection doesn't lose the order.
      name: "payspace-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated after mount (see PosScreen) so the server render and first client render match.
      skipHydration: true,
    },
  ),
);
