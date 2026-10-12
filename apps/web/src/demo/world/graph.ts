import type { Address } from "viem";
import { DAY, demoId } from "./ids";
import type { Random } from "./random";
import type { DemoNode, DemoPerson } from "./types";

type Owner = number | "7b" | "11b" | "buyer";
type Row = readonly [owner: Owner, parent: Owner | null, createdDaysAgo: number];

const hubChildren: readonly Row[] = Array.from({ length: 30 }, (_, index): Row => [
  index + 3,
  2,
  80 - index * 2,
]);

export const graphRows: Readonly<Record<number, readonly Row[]>> = {
  1: [
    [1, null, 86],
    [2, 1, 84],
    ...hubChildren,
    [33, 3, 60],
    [34, 33, 50],
    [35, 34, 40],
    [36, 35, 30],
    [37, 8, 55],
    [38, 8, 45],
    ["7b", 7, 35],
    ["11b", 37, 25],
    [39, null, 70],
    [40, 39, 60],
  ],
  2: [
    [1, null, 68],
    [14, 1, 60],
    [21, 14, 50],
    [9, null, 64],
    [22, 9, 40],
  ],
  3: [
    [1, null, 88],
    [16, 1, 80],
    [24, 16, 70],
    [12, null, 85],
    [28, 12, 60],
  ],
  4: [
    [15, null, 58],
    [25, 15, 50],
    [31, 25, 40],
    [1, null, 30],
    [21, null, 35],
  ],
  5: [
    [5, null, 44],
    [10, 5, 30],
    [20, 10, 20],
  ],
  6: [
    [1, null, 48],
    [17, 1, 45],
    [26, 17, 40],
    [30, null, 46],
    [34, 30, 30],
  ],
  8: [
    ["buyer", null, 35],
    [19, "buyer", 30],
    [23, null, 78],
    [29, 23, 60],
  ],
  9: [
    [18, null, 84],
    [1, 18, 80],
    [27, 18, 70],
    [13, null, 75],
  ],
};

export interface GraphPeople {
  distributors: DemoPerson[];
  buyer: DemoPerson;
}

const ownerAddress = (owner: Owner, people: GraphPeople): Address => {
  const n = owner === "buyer" ? 0 : owner === "7b" ? 7 : owner === "11b" ? 11 : owner;
  const person = owner === "buyer" ? people.buyer : people.distributors[n - 1];
  const address = owner === "7b" || owner === "11b" ? person?.addresses[1] : person?.addresses[0];
  if (!address) throw new RangeError(`No sample address for owner ${String(owner)}.`);
  return address;
};

const ownerSlug = (owner: Owner, people: GraphPeople): string => {
  if (owner === "buyer") return "sam";
  const n = owner === "7b" ? 7 : owner === "11b" ? 11 : owner;
  const handle = people.distributors[n - 1]?.handle ?? `p${String(n)}`;
  const base = handle.replace(/^demo-/, "");
  return owner === "7b" || owner === "11b" ? `${base}2` : base;
};

export const buildNodes = (anchor: number, people: GraphPeople, random: Random): DemoNode[] => {
  const nodes: DemoNode[] = [];
  for (const [campaignKey, rows] of Object.entries(graphRows)) {
    const campaign = Number(campaignKey);
    const byOwner = new Map<Owner, DemoNode>();
    for (const [owner, parent, daysAgo] of rows) {
      const slug = ownerSlug(owner, people);
      const node: DemoNode = {
        id: demoId("n", `${String(campaign)}-${slug}`),
        campaignId: demoId("c", campaign),
        parentId: parent === null ? null : (byOwner.get(parent)?.id ?? null),
        owner: ownerAddress(owner, people),
        createdAt: anchor - daysAgo * DAY,
        code: `demo-${slug}-${String(campaign)}`,
        moderation: campaign === 4 && owner === 1 ? "hidden" : "visible",
        moderationReason:
          campaign === 4 && owner === 1
            ? "Hidden by the merchant after a duplicate-post report."
            : null,
        visits: random.int(12, 420),
      };
      byOwner.set(owner, node);
      nodes.push(node);
    }
  }
  return nodes;
};
