import { ConvexError } from "convex/values";

// Loyalty card rules shared by the staff forms, the customer sign-in and the server
// (convex/loyalty.ts), so both sides give the same answer.

export const LOYALTY_COLORS = ["teal", "navy", "coffee", "berry", "forest", "sunset"] as const;
export type LoyaltyColor = (typeof LOYALTY_COLORS)[number];

export const STAMPS_MIN = 3;
export const STAMPS_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const MAX_LOGIN_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
/** A sale older than this can't earn a stamp, so old receipts can't be stamped in bulk. */
export const STAMP_SALE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

export function usernameProblem(input: string): string | null {
  return USERNAME_PATTERN.test(normalizeUsername(input))
    ? null
    : "Use 3 to 30 letters, numbers, dots, dashes or underscores, starting and ending with a letter or number.";
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}

export function validateUsername(input: string) {
  const problem = usernameProblem(input);
  if (problem) throw new ConvexError(problem);
  return normalizeUsername(input);
}

export function validatePassword(password: string) {
  const problem = passwordProblem(password);
  if (problem) throw new ConvexError(problem);
}
