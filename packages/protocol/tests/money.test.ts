import { describe, expect, it } from "vitest";
import { formatTokenAmount, fromMinorString, parseTokenAmount } from "../src/money.js";

describe("formatTokenAmount", () => {
  it("pads to two decimals and groups thousands", () => {
    expect(formatTokenAmount(100_000_000n, 6)).toBe("100.00");
    expect(formatTokenAmount(2_500_000n, 6)).toBe("2.50");
    expect(formatTokenAmount(1_234_567_891n, 6)).toBe("1,234.567891");
  });

  it("formats zero", () => {
    expect(formatTokenAmount(0n, 6)).toBe("0.00");
  });
});

describe("parseTokenAmount", () => {
  it("parses display amounts into base units without floats", () => {
    expect(parseTokenAmount("100", 6)).toBe(100_000_000n);
    expect(parseTokenAmount("1,234.5", 6)).toBe(1_234_500_000n);
  });

  it("rejects more precision than the token has", () => {
    expect(() => parseTokenAmount("0.0000001", 6)).toThrow(RangeError);
  });

  it("rejects non-numeric input", () => {
    expect(() => parseTokenAmount("1e6", 6)).toThrow(RangeError);
    expect(() => parseTokenAmount("-1", 6)).toThrow(RangeError);
  });
});

describe("fromMinorString", () => {
  it("round-trips wire strings to bigint", () => {
    expect(fromMinorString("100000000")).toBe(100_000_000n);
    expect(() => fromMinorString("1.5")).toThrow();
  });
});
