import { describe, expect, test } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  test.each(["/brewlab", "/brewlab/products?tab=archived", "/onboarding#top"])("keeps %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  test.each([
    undefined, "", "brewlab", "https://evil.example", "//evil.example", "/\\evil.example",
    "/\t/evil.example", "/\n/evil.example", "/\r\n/evil.example", "/\t\\evil.example", "\t//evil.example",
  ])("refuses %j", (value) => {
    expect(safeNext(value)).toBe("/");
  });

  test("uses the first value of a repeated parameter", () => {
    expect(safeNext(["/a", "//evil.example"])).toBe("/a");
  });
});
