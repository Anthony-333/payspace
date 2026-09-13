// Passes the browser's IP from the Next.js auth proxy to Convex, for sign-in rate limiting.
//
// Convex's edge replaces x-forwarded-for with whoever called it, so behind the proxy every
// request would look like it came from the Next.js server, and one bucket would lock out every
// user. The proxy signs the client IP with a secret both sides share; Convex trusts the IP only
// when the signature checks out, and otherwise uses the address that called it.
// Uses Web Crypto only, so it runs in Next.js and in the Convex runtime.

export const CLIENT_IP_HEADER = "x-payspace-client-ip";
export const CLIENT_IP_TS_HEADER = "x-payspace-client-ip-ts";
export const CLIENT_IP_SIG_HEADER = "x-payspace-client-ip-sig";
/** The header Better Auth reads (`advanced.ipAddress.ipAddressHeaders`), set only by Convex. */
export const TRUSTED_IP_HEADER = "x-auth-client-ip";

const MAX_AGE_MS = 5 * 60 * 1000;
const IP_PATTERN = /^[0-9a-fA-F.:]{2,45}$/;

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Proxy side: the headers that carry a signed client IP. */
export async function signClientIp(ip: string, secret: string, now = Date.now()) {
  const ts = String(now);
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_TS_HEADER]: ts,
    [CLIENT_IP_SIG_HEADER]: await hmac(secret, `${ip}|${ts}`),
  };
}

/** Convex side: the client IP if the proxy's signature is valid and recent, else null. */
export async function verifyClientIp(headers: Headers, secret: string | undefined, now = Date.now()) {
  const ip = headers.get(CLIENT_IP_HEADER);
  const ts = headers.get(CLIENT_IP_TS_HEADER);
  const sig = headers.get(CLIENT_IP_SIG_HEADER);
  if (!secret || !ip || !ts || !sig || !IP_PATTERN.test(ip) || !/^\d{1,16}$/.test(ts)) return null;
  if (Math.abs(now - Number(ts)) > MAX_AGE_MS) return null;
  return timingSafeEqual(sig, await hmac(secret, `${ip}|${ts}`)) ? ip : null;
}

/** The first address in a forwarded-for style header, if it looks like an IP. */
export function firstForwardedIp(value: string | null) {
  const first = value?.split(",")[0]?.trim();
  return first && IP_PATTERN.test(first) ? first : null;
}
