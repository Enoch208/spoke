import type { Placed } from "./model";
import type { Bounds } from "./use-pan-zoom";

export const boundsOf = (nodes: readonly Placed[]): Bounds => {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const xs = nodes.map((node) => node.y);
  const ys = nodes.map((node) => node.x);
  return {
    minX: Math.min(...xs) - 40,
    maxX: Math.max(...xs) + 160,
    minY: Math.min(...ys) - 50,
    maxY: Math.max(...ys) + 50,
  };
};
