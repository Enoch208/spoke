import type { ClientOutput } from "@spoke/protocol";
import { holdChoiceOf, bpsText, type ShortPathMode, type StudioTerms } from "./terms";

type WireTemplate = ClientOutput<"studio.templates">[number];

export type LibraryTemplate = {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly source: "spoke" | "mine";
  readonly categories: readonly string[];
  readonly status: "active" | "archived";
  readonly createdAt: string | null;
  readonly terms: StudioTerms;
  readonly history: readonly WireTemplate[];
};

type Point = {
  slug: string;
  name: string;
  categories: readonly string[];
  rateBps: number;
  weightsBps: readonly number[];
  shortPathMode?: ShortPathMode;
  holdSeconds: number;
};

const day = 86_400;

const points: readonly Point[] = [
  {
    slug: "developer-tools",
    name: "Developer tools",
    categories: ["software", "dev tools"],
    rateBps: 1_000,
    weightsBps: [5_000, 2_500, 1_500, 1_000],
    holdSeconds: 7 * day,
  },
  {
    slug: "templates-and-kits",
    name: "Templates and kits",
    categories: ["digital", "templates"],
    rateBps: 1_500,
    weightsBps: [6_000, 2_500, 1_500],
    holdSeconds: 3 * day,
  },
  {
    slug: "courses",
    name: "Courses",
    categories: ["education", "courses"],
    rateBps: 1_200,
    weightsBps: [5_000, 2_500, 1_500, 1_000],
    holdSeconds: 14 * day,
  },
  {
    slug: "research-and-reports",
    name: "Research and reports",
    categories: ["digital", "research"],
    rateBps: 1_500,
    weightsBps: [6_000, 2_500, 1_500],
    shortPathMode: "RETURN_UNUSED",
    holdSeconds: 7 * day,
  },
  {
    slug: "design-assets",
    name: "Design assets",
    categories: ["design"],
    rateBps: 1_000,
    weightsBps: [7_000, 3_000],
    holdSeconds: 3 * day,
  },
  {
    slug: "community-access",
    name: "Community access",
    categories: ["other"],
    rateBps: 2_000,
    weightsBps: [4_000, 2_500, 1_500, 1_200, 800],
    shortPathMode: "RETURN_UNUSED",
    holdSeconds: 14 * day,
  },
  {
    slug: "testnet-quick-cycle",
    name: "Testnet quick cycle",
    categories: [],
    rateBps: 1_000,
    weightsBps: [5_000, 2_500, 1_500, 1_000],
    holdSeconds: 600,
  },
];

export const startingPoints: readonly LibraryTemplate[] = points.map((point) => ({
  id: `spoke-${point.slug}`,
  name: point.name,
  version: 1,
  source: "spoke",
  categories: point.categories,
  status: "active",
  createdAt: null,
  history: [],
  terms: {
    rate: bpsText(point.rateBps),
    cap: { mode: "formula" },
    weights: point.weightsBps.map(bpsText),
    keepTotal: true,
    shortPathMode: point.shortPathMode ?? "RENORMALIZE_EXISTING",
    hold: holdChoiceOf(point.holdSeconds),
  },
}));

export const fitsCategory = (template: LibraryTemplate, category: string | null) =>
  category === null || template.categories.length === 0 || template.categories.includes(category);
