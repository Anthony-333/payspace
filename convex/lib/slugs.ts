import { ConvexError } from "convex/values";

// Top-level app routes a shop slug must never shadow (app/[shop] sits next to them).
export const RESERVED_SLUGS = new Set([
  "_next", "admin", "api", "app", "auth", "dashboard", "help", "login", "logout",
  "onboarding", "r", "settings", "sign-in", "sign-out", "sign-up", "static", "support",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Throws a user-facing error if the slug can't be used. Returns the normalized slug. */
export function validateSlug(input: string) {
  const slug = normalizeSlug(input);
  if (!SLUG_PATTERN.test(slug)) {
    throw new ConvexError("Use 3 to 40 letters, numbers or dashes for the shop link.");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new ConvexError("That shop link is reserved. Try another one.");
  }
  return slug;
}
