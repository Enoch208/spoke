import { describe, expect, expectTypeOf, it } from "vitest";
import { fill, type Placeholder } from "../../src/lib/copy/fill";

describe("fill", () => {
  it("replaces every placeholder with its value", () => {
    expect(
      fill("Buy for {price} from {merchant}", { price: "40.00 SDUSD", merchant: "Northwind" }),
    ).toBe("Buy for 40.00 SDUSD from Northwind");
  });

  it("replaces a placeholder each time it appears", () => {
    expect(fill("{n} of {n}", { n: "3" })).toBe("3 of 3");
  });

  it("returns a template without placeholders unchanged", () => {
    expect(fill("Draft saved", {})).toBe("Draft saved");
  });

  it("reads placeholder names from the template type", () => {
    expectTypeOf<Placeholder<"Claim {amount} by {unlockAt}">>().toEqualTypeOf<
      "amount" | "unlockAt"
    >();
    expectTypeOf<Placeholder<"Draft saved">>().toEqualTypeOf<never>();
  });
});
