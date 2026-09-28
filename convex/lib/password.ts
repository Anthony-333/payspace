// Passwords for loyalty cards, hashed with PBKDF2-SHA256 through Web Crypto (no dependency).
// The stored form names its own parameters, so the iteration count can rise later and old
// hashes still verify: "pbkdf2-sha256$<iterations>$<salt hex>$<hash hex>".

const ITERATIONS = 100_000;
const SCHEME = "pbkdf2-sha256";

function toHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${SCHEME}$${ITERATIONS}$${toHex(salt)}$${await derive(password, salt, ITERATIONS)}`;
}

/** Compares in constant time. A malformed stored hash never matches. */
export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== SCHEME || !salt || !hash || !(Number(iterations) > 0)) return false;
  const candidate = await derive(password, fromHex(salt), Number(iterations));
  let diff = candidate.length ^ hash.length;
  for (let i = 0; i < Math.min(candidate.length, hash.length); i++) diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/**
 * Spends the same time as a real check, for a username that doesn't exist, so the response
 * time doesn't reveal which usernames do.
 */
export async function burnPasswordCheck(password: string) {
  await derive(password, new Uint8Array(16), ITERATIONS);
}

export async function sha256Hex(text: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** 256 bits from the platform's CSPRNG, as hex. */
export function newSessionToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
