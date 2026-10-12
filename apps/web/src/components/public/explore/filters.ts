import type { ClientInput } from "@spoke/protocol";
import { filterGroups, sortLabels } from "../copy/explore";

type Options<G extends keyof typeof filterGroups> =
  (typeof filterGroups)[G]["options"][number]["value"];

export type ExploreFilters = {
  q: string;
  category: string | null;
  rate: Options<"rate">;
  levels: Options<"levels">;
  hold: Options<"hold">;
  access: Options<"access">;
  status: Options<"status">;
  sort: keyof typeof sortLabels;
};

export type FilterKey = "rate" | "levels" | "hold" | "access" | "status";

export const filterKeys = [
  "rate",
  "levels",
  "hold",
  "access",
  "status",
] as const satisfies readonly FilterKey[];

export const defaultFilters: ExploreFilters = {
  q: "",
  category: null,
  rate: "any",
  levels: "any",
  hold: "any",
  access: "any",
  status: "open",
  sort: "balanced",
};

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.find((candidate) => candidate === value) ?? fallback;

const keysOf = <G extends FilterKey>(group: G): readonly Options<G>[] =>
  filterGroups[group].options.map((option) => option.value);

const sorts = Object.keys(sortLabels).filter(
  (key): key is ExploreFilters["sort"] => key in sortLabels,
);

export const parseFilters = (params: URLSearchParams): ExploreFilters => ({
  q: params.get("q") ?? "",
  category: params.get("category"),
  rate: pick(params.get("rate"), keysOf("rate"), "any"),
  levels: pick(params.get("levels"), keysOf("levels"), "any"),
  hold: pick(params.get("hold"), keysOf("hold"), "any"),
  access: pick(params.get("access"), keysOf("access"), "any"),
  status: pick(params.get("status"), keysOf("status"), "open"),
  sort: pick(params.get("sort"), sorts, "balanced"),
});

export const filtersToParams = (filters: ExploreFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  for (const key of filterKeys)
    if (filters[key] !== defaultFilters[key]) params.set(key, filters[key]);
  if (filters.sort !== defaultFilters.sort) params.set("sort", filters.sort);
  return params;
};

export const activeFilterCount = (filters: ExploreFilters) =>
  filterKeys.filter((key) => filters[key] !== defaultFilters[key]).length;

const rateRange = {
  any: {},
  upTo5: { rateMax: 500 },
  from5: { rateMin: 500, rateMax: 1000 },
  from10: { rateMin: 1000, rateMax: 2000 },
  over20: { rateMin: 2001 },
} as const satisfies Record<ExploreFilters["rate"], { rateMin?: number; rateMax?: number }>;

const holdMax = { any: undefined, hour: 3599, day: 86_399, week: 604_799 } as const;

export type CampaignStatusFilter = "active" | "paused" | "ended" | "expired";

export const closedStatuses = [
  "paused",
  "ended",
  "expired",
] as const satisfies readonly CampaignStatusFilter[];

export const listInput = (
  filters: ExploreFilters,
  status: CampaignStatusFilter,
  limit: number,
): ClientInput<"campaigns.list"> => ({
  status,
  limit,
  sort: filters.sort,
  ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
  ...(filters.category ? { category: filters.category } : {}),
  ...rateRange[filters.rate],
  ...(filters.levels === "any" ? {} : { levels: Number(filters.levels) }),
  ...(holdMax[filters.hold] === undefined ? {} : { holdMax: holdMax[filters.hold] }),
  ...(filters.access === "invite" ? { invitationOnly: true } : {}),
});

export const isNarrowed = (filters: ExploreFilters) =>
  Boolean(filters.q.trim()) ||
  filters.category !== null ||
  filterKeys.some((key) => key !== "status" && filters[key] !== defaultFilters[key]);
