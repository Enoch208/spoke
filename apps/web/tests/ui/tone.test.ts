import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toneClasses, tones } from "../../src/components/ui/tone";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

const tokenHex = (token: string): string => {
  const match = new RegExp(`--color-${token}:\\s*(#[0-9a-f]{6});`).exec(css);
  if (!match?.[1]) throw new Error(`Missing colour token ${token}`);
  return match[1];
};

const channel = (value: number): number => {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((start) => channel(parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

describe("tone classes", () => {
  it("defines a fill and a text class for every tone", () => {
    for (const tone of tones) {
      expect(toneClasses[tone].fill).toMatch(/^bg-/);
      expect(toneClasses[tone].text).toMatch(/^text-/);
    }
  });

  it("keeps every tone's text at AA contrast on its fill", () => {
    for (const tone of tones) {
      const fill = tokenHex(toneClasses[tone].fill.replace(/^bg-/, ""));
      const text = tokenHex(toneClasses[tone].text.replace(/^text-/, ""));
      expect(contrast(text, fill), tone).toBeGreaterThanOrEqual(4.5);
    }
  });
});
