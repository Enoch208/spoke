import { describe, expect, it } from "vitest";
import { qrGeometry } from "@/components/ui/qr-geometry";

describe("qrGeometry", () => {
  const geometry = qrGeometry("https://usespoke.xyz/r/abc123");

  it("adds a four-module quiet zone around the symbol", () => {
    expect(geometry.viewBox).toBe(`0 0 ${String(geometry.size + 8)} ${String(geometry.size + 8)}`);
  });

  it("produces a symbol at least version 1 in size", () => {
    expect(geometry.size).toBeGreaterThanOrEqual(21);
  });

  it("draws dark modules as horizontal runs only", () => {
    expect(geometry.path).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
  });

  it("encodes the same text to the same path", () => {
    expect(qrGeometry("https://usespoke.xyz/r/abc123").path).toBe(geometry.path);
  });

  it("encodes different text to a different path", () => {
    expect(qrGeometry("https://usespoke.xyz/r/xyz789").path).not.toBe(geometry.path);
  });
});
