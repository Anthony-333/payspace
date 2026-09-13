import { describe, expect, test } from "vitest";
import { CLIENT_IP_HEADER, CLIENT_IP_SIG_HEADER, CLIENT_IP_TS_HEADER, firstForwardedIp, signClientIp, verifyClientIp } from "./clientIp";

const secret = "test-secret-please-ignore";
const now = 1_789_000_000_000;

describe("signed client IP", () => {
  test("round-trips a signed IP", async () => {
    const headers = new Headers(await signClientIp("203.0.113.9", secret, now));
    expect(await verifyClientIp(headers, secret, now + 1000)).toBe("203.0.113.9");
    const v6 = new Headers(await signClientIp("2001:db8::1", secret, now));
    expect(await verifyClientIp(v6, secret, now)).toBe("2001:db8::1");
  });

  test("refuses a forged, altered, stale or unsigned IP", async () => {
    const signed = await signClientIp("203.0.113.9", secret, now);
    const altered = new Headers({ ...signed, [CLIENT_IP_HEADER]: "198.51.100.1" });
    expect(await verifyClientIp(altered, secret, now)).toBeNull();
    expect(await verifyClientIp(new Headers(await signClientIp("203.0.113.9", "other-secret", now)), secret, now)).toBeNull();
    expect(await verifyClientIp(new Headers(signed), secret, now + 6 * 60 * 1000)).toBeNull();
    expect(await verifyClientIp(new Headers({ [CLIENT_IP_HEADER]: "203.0.113.9" }), secret, now)).toBeNull();
    expect(await verifyClientIp(new Headers({ ...signed, [CLIENT_IP_TS_HEADER]: "abc" }), secret, now)).toBeNull();
    expect(await verifyClientIp(new Headers({ ...signed, [CLIENT_IP_SIG_HEADER]: "00" }), secret, now)).toBeNull();
    // No secret configured: never trust the header.
    expect(await verifyClientIp(new Headers(signed), undefined, now)).toBeNull();
  });

  test("reads the first forwarded address", () => {
    expect(firstForwardedIp("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
    expect(firstForwardedIp(" 2001:db8::1 ")).toBe("2001:db8::1");
    expect(firstForwardedIp("not-an-ip")).toBeNull();
    expect(firstForwardedIp(null)).toBeNull();
  });
});
