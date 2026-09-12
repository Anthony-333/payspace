const BASE = "http://same-origin.invalid";

/** Only allow same-origin relative paths after sign-in, to prevent open redirects. */
export function safeNext(value: string | string[] | undefined, fallback = "/") {
  const next = Array.isArray(value) ? value[0] : value;
  // Browsers drop tabs and newlines and treat "\" as "/", so "/\t/evil.com" would become "//evil.com".
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  const url = new URL(next, BASE);
  if (url.origin !== BASE) return fallback;
  return url.pathname + url.search + url.hash;
}
