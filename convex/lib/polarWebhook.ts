// Polar signs webhooks the Standard Webhooks way: HMAC-SHA256 over "id.timestamp.body". Older
// secrets are keyed by their UTF-8 bytes; newer "whsec_" secrets by the base64 after the prefix.
// The SDK bundled with @convex-dev/polar only knows the first and needs Node's Buffer, which the
// Convex runtime lacks, so we verify here and read the few fields we use from the JSON ourselves.

const TOLERANCE_SECONDS = 5 * 60;

export class WebhookVerificationError extends Error {
  name = "WebhookVerificationError";
}

function decodeBase64(value: string) {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function signingKeys(secret: string) {
  const keys = [new TextEncoder().encode(secret)];
  if (secret.startsWith("whsec_")) {
    const decoded = decodeBase64(secret.slice(6));
    if (decoded && decoded.byteLength > 0) keys.push(decoded);
  }
  return keys;
}

function hmacKey(bytes: Uint8Array, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", new Uint8Array(bytes), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signWebhook(key: Uint8Array, id: string, timestamp: string, body: string) {
  const content = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(key, "sign"), content));
  return `v1,${btoa(String.fromCharCode(...signature))}`;
}

/** Verifies a Polar webhook and returns its JSON body. Throws WebhookVerificationError. */
export async function verifyPolarWebhook(body: string, headers: Record<string, string>, secret: string, now = Date.now()) {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatures = headers["webhook-signature"];
  if (!secret || !id || !timestamp || !signatures) throw new WebhookVerificationError("Missing required headers");

  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(now / 1000 - sentAt) > TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Timestamp outside the tolerance window");
  }

  const content = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const sent = signatures
    .split(" ")
    .map((part) => part.split(",", 2))
    .flatMap(([version, signature]) => (version === "v1" && signature ? [decodeBase64(signature)] : []))
    .filter((signature) => signature !== null);

  for (const key of signingKeys(secret)) {
    const verifyKey = await hmacKey(key, "verify");
    for (const signature of sent) {
      // crypto.subtle.verify compares in constant time.
      if (await crypto.subtle.verify("HMAC", verifyKey, new Uint8Array(signature), content)) {
        return JSON.parse(body) as unknown;
      }
    }
  }
  throw new WebhookVerificationError("No matching signature found");
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
]);

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null;
const text = (value: unknown) => (typeof value === "string" ? value : undefined);
const date = (value: unknown) => {
  const at = typeof value === "string" ? new Date(value) : undefined;
  return at && !Number.isNaN(at.getTime()) ? at : null;
};

/**
 * A subscription event, in the shape billing.subscriptionArgs takes. Null for other events, or
 * when a field the plan depends on is missing.
 */
export function readSubscriptionEvent(payload: unknown) {
  if (!isObject(payload) || !SUBSCRIPTION_EVENTS.has(String(payload.type)) || !isObject(payload.data)) return null;
  const sub = payload.data;
  const timestamp = date(payload.timestamp);
  const id = text(sub.id);
  const status = text(sub.status);
  const customerId = text(sub.customer_id);
  if (!timestamp || !id || !status || !customerId) return null;
  return {
    timestamp,
    data: {
      id,
      status,
      customerId,
      metadata: isObject(sub.metadata) ? sub.metadata : {},
      currentPeriodEnd: date(sub.current_period_end),
      trialEnd: date(sub.trial_end),
      endsAt: date(sub.ends_at),
      cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    },
  };
}
