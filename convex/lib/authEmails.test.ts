import { describe, expect, test } from "vitest";
import { resetPassword, verifyEmail, welcomeEmail } from "./authEmails";

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

  test("welcome email greets by first name and links to sign-in", () => {
    const email = welcomeEmail("Maria Clara", "https://www.payspace.shop/sign-in");
    expect(email.subject).toBe("Welcome to Payspace");
    expect(email.text).toContain("Hi Maria,");
    expect(email.text).toContain("https://www.payspace.shop/sign-in");
    expect(email.html).toContain('href="https://www.payspace.shop/sign-in"');
    expect(email.html).toContain("Open Payspace");
  });

  test("welcome email escapes the name", () => {
    const email = welcomeEmail("<b>Ana</b>", "https://example.com/sign-in");
    expect(email.html).not.toContain("<b>Ana");
    expect(email.html).toContain("&lt;b&gt;Ana");
  });
});
