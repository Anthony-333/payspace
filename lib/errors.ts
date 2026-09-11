import { ConvexError } from "convex/values";

/** User-facing text for a failed Convex call. Server errors thrown as ConvexError(string) are shown as-is. */
export function errorMessage(err: unknown) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "Something went wrong. Try again.";
}
