import { describe, expect, test } from "vitest";
import { resetPassword, verifyEmail } from "./authEmails";

describe("auth emails", () => {
  test("verification email carries the link and greets by first name", () => {
    const email = verifyEmail("Maria Clara", "https://www.payspace.shop/api/auth/verify-email?token=abc&callbackURL=/sign-in");
    expect(email.subject).toMatch(/confirm/i);
    expect(email.text).toContain("Hi Maria,");
    expect(email.text).toContain("token=abc&callbackURL=/sign-in");
    expect(email.html).toContain('href="https://www.payspace.shop/api/auth/verify-email?token=abc&amp;callbackURL=/sign-in"');
  });

  test("user-supplied names are escaped in the HTML", () => {
    const email = resetPassword('<img src=x onerror="alert(1)">', "https://example.com/r");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
  });

  test("a blank name falls back to a plain greeting", () => {
    expect(resetPassword("   ", "https://example.com/r").text.startsWith("Hi,\n")).toBe(true);
  });
});
