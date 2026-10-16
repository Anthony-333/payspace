"use client";

import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { stepsFor } from "@/components/tour/steps";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { api } from "@/convex/_generated/api";

type Tour = { start: () => void };
const TourContext = createContext<Tour | null>(null);

/** Starts the welcome tour again, e.g. from the profile menu. */
export function useTour() {
  const tour = useContext(TourContext);
  if (!tour) throw new Error("useTour must be used inside TourProvider");
  return tour;
}

/**
 * The welcome tour opens by itself the first time someone uses a shop, and is remembered per
 * member on the server (members.tourCompletedAt), so it doesn't come back on a new tablet.
 * Skipping counts as done.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const shop = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const steps = stepsFor(shop.role);
  const status = useQuery(api.members.tour, { tenantId: shop.tenantId });
  const completeTour = useMutation(api.members.completeTour);

  // `open: null` follows the server until the user acts, so nothing is set from an effect.
  const [state, setState] = useState<{ open: boolean | null; index: number }>({ open: null, index: 0 });
  const open = state.open ?? (status !== undefined && !status.completed);
  const index = Math.min(state.index, steps.length - 1);
  const step = steps[index]!;
  const base = `/${shop.slug}`;
  const routeReady = !step.route || pathname === base + step.route;

  useEffect(() => {
    if (open && !routeReady) router.push(base + step.route);
  }, [open, routeReady, router, base, step.route]);

  function finish() {
    setState({ open: false, index: 0 });
    completeTour({ tenantId: shop.tenantId }).catch((error) => {
      console.error("Couldn't save that the tour was done", error);
    });
  }

  return (
    <TourContext.Provider value={{ start: () => setState({ open: true, index: 0 }) }}>
      {children}
      {open && (
        <TourOverlay
          step={step}
          index={index}
          total={steps.length}
          routeReady={routeReady}
          onNext={() => (index === steps.length - 1 ? finish() : setState({ open: true, index: index + 1 }))}
          onPrevious={() => setState({ open: true, index: Math.max(0, index - 1) })}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}
