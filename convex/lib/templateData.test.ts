import { describe, expect, test } from "vitest";
import { localizeTemplate, TEMPLATES } from "./templateData";

describe("localizeTemplate", () => {
  test("a discount option stays a discount in any currency", () => {
    const cafe = TEMPLATES.cafe!;
    const withDiscount = {
      ...cafe,
      modifierGroups: [{ key: "cup", name: "Own cup", minSelect: 0, maxSelect: 1, options: [{ key: "own", name: "Own cup", priceDelta: -25 }] }],
    };
    // -$0.25 × 28 = -₱7, rounded to the ₱5 step; a tiny one still moves a whole step.
    expect(localizeTemplate(withDiscount, "PHP").modifierGroups[0].options[0].priceDelta).toBe(-500);
    withDiscount.modifierGroups[0].options[0].priceDelta = -1;
    expect(localizeTemplate(withDiscount, "PHP").modifierGroups[0].options[0].priceDelta).toBe(-500);
    expect(localizeTemplate(withDiscount, "USD").modifierGroups[0].options[0].priceDelta).toBe(-25);
  });
});
