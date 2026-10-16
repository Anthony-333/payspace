import { describe, expect, it } from "vitest";
import { scrubAnalyticsEvent, scrubUrlText } from "./analytics-scrub";

describe("scrubUrlText", () => {
  it("hides public receipt tokens", () => {
    expect(scrubUrlText("https://payspace.shop/r/abc123XYZ?print=1")).toBe("https://payspace.shop/r/:token?print=1");
    expect(scrubUrlText("/r/abc123XYZ")).toBe("/r/:token");
  });

  it("hides one-time tokens in the query string", () => {
    expect(scrubUrlText("https://payspace.shop/reset-password?token=s3cr3t&x=1")).toBe(
      "https://payspace.shop/reset-password?token=redacted&x=1",
    );
    expect(scrubUrlText("/sign-in?next=%2F&token=s3cr3t")).toBe("/sign-in?next=%2F&token=redacted");
  });

  it("hides the loyalty customer's username but keeps the shop", () => {
    expect(scrubUrlText("https://payspace.shop/loyalty/kape-ni-juan/maria.santos")).toBe(
      "https://payspace.shop/loyalty/kape-ni-juan/:username",
    );
    expect(scrubUrlText("/loyalty/kape-ni-juan")).toBe("/loyalty/kape-ni-juan");
  });

  it("leaves ordinary shop URLs alone", () => {
    expect(scrubUrlText("https://payspace.shop/kape-ni-juan/receipts/k57abc")).toBe(
      "https://payspace.shop/kape-ni-juan/receipts/k57abc",
    );
  });
});

describe("scrubAnalyticsEvent", () => {
  it("scrubs properties, $set and $set_once and keeps other values", () => {
    const result = scrubAnalyticsEvent({
      uuid: "u",
      event: "$pageview",
      properties: { $current_url: "https://payspace.shop/r/tok", $pathname: "/r/tok", item_count: 3 },
      $set: { $current_url: "https://payspace.shop/r/tok" },
      $set_once: { $initial_pathname: "/reset-password?token=t" },
    });
    expect(result).toEqual({
      uuid: "u",
      event: "$pageview",
      properties: { $current_url: "https://payspace.shop/r/:token", $pathname: "/r/:token", item_count: 3 },
      $set: { $current_url: "https://payspace.shop/r/:token" },
      $set_once: { $initial_pathname: "/reset-password?token=redacted" },
    });
  });
});
