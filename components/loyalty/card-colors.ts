import type { LoyaltyColor } from "@/convex/lib/loyalty";

/** Card faces. White text passes AA (4.5:1 or better) on every background. */
export const CARD_COLORS: Record<LoyaltyColor, { label: string; bg: string; ink: string }> = {
  teal: { label: "Teal", bg: "#16625f", ink: "#0f4644" },
  navy: { label: "Navy", bg: "#1e2a4a", ink: "#1e2a4a" },
  coffee: { label: "Coffee", bg: "#5a3a26", ink: "#4a2f1e" },
  berry: { label: "Berry", bg: "#8a1f4d", ink: "#6e183d" },
  forest: { label: "Forest", bg: "#1f5a3a", ink: "#17452c" },
  sunset: { label: "Sunset", bg: "#a8420c", ink: "#8a3509" },
};

export function cardColor(color: string) {
  return CARD_COLORS[color as LoyaltyColor] ?? CARD_COLORS.teal;
}
