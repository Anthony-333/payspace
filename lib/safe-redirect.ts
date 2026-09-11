/** Only allow same-origin relative paths after sign-in, to prevent open redirects. */
export function safeNext(value: string | string[] | undefined, fallback = "/") {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
