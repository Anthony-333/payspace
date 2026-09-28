import { describe, expect, test } from "vitest";
import { subscriptionArgs } from "../billing";
import { readSubscriptionEvent, signWebhook, verifyPolarWebhook, WebhookVerificationError } from "./polarWebhook";

// Random bytes, base64, in Polar's newer "whsec_" form.
const newSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const oldSecret = "polar-legacy-secret-please-ignore";
const payload = {
  type: "subscription.active",
  timestamp: "2026-09-28T15:43:51.158544Z",
  data: {
    id: "sub_1",
    status: "trialing",
    customer_id: "cus_1",
    metadata: { orgId: "shop_1" },
    current_period_end: "2026-10-12T15:43:51Z",
    trial_end: "2026-10-12T15:43:51Z",
    ends_at: null,
    cancel_at_period_end: false,
  },
};
const body = JSON.stringify(payload);
const utf8 = (s: string) => new TextEncoder().encode(s);
const decoded = (s: string) => Uint8Array.from(atob(s.slice(6)), (c) => c.charCodeAt(0));

async function headersFor(key: Uint8Array, timestamp = Math.floor(Date.now() / 1000)) {
  const ts = String(timestamp);
  return { "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": await signWebhook(key, "msg_1", ts, body) };
}

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

describe("Polar webhook signatures", () => {
  test("accepts a whsec_ secret signed with its decoded key", async () => {
    expect(await verifyPolarWebhook(body, await headersFor(decoded(newSecret)), newSecret)).toEqual(payload);
  });

  test("accepts a secret signed with its UTF-8 bytes", async () => {
    for (const secret of [oldSecret, newSecret]) {
      expect(await verifyPolarWebhook(body, await headersFor(utf8(secret)), secret)).toEqual(payload);
    }
  });

  test("rejects the wrong secret, a changed body and a stale timestamp", async () => {
    const headers = await headersFor(decoded(newSecret));
    expect(await failure(verifyPolarWebhook(body, headers, oldSecret))).toBeInstanceOf(WebhookVerificationError);
    expect(await failure(verifyPolarWebhook(`${body} `, headers, newSecret))).toBeInstanceOf(WebhookVerificationError);
    const stale = await headersFor(decoded(newSecret), Math.floor(Date.now() / 1000) - 600);
    expect(await failure(verifyPolarWebhook(body, stale, newSecret))).toBeInstanceOf(WebhookVerificationError);
    expect(await failure(verifyPolarWebhook(body, headers, ""))).toBeInstanceOf(WebhookVerificationError);
  });
});

describe("reading subscription events", () => {
  test("turns Polar's JSON into applySubscription's arguments", () => {
    const event = readSubscriptionEvent(payload);
    expect(event && subscriptionArgs(event)).toEqual({
      orgId: "shop_1",
      customerId: "cus_1",
      subscriptionId: "sub_1",
      status: "trialing",
      currentPeriodEnd: Date.parse("2026-10-12T15:43:51Z"),
      trialEnd: Date.parse("2026-10-12T15:43:51Z"),
      cancelAt: undefined,
      eventAt: Date.parse("2026-09-28T15:43:51.158Z"),
    });
  });

  test("ignores other events and incomplete subscriptions", () => {
    expect(readSubscriptionEvent({ ...payload, type: "order.paid" })).toBeNull();
    expect(readSubscriptionEvent({ ...payload, data: { ...payload.data, customer_id: undefined } })).toBeNull();
    expect(readSubscriptionEvent("nope")).toBeNull();
  });
});
