import type { ClientInput } from "@spoke/protocol";
import { directoryFilterGroups, directorySorts } from "../copy/directory";

export type DirectoryKey = keyof typeof directoryFilterGroups;

type Values<K extends DirectoryKey> = (typeof directoryFilterGroups)[K]["options"][number]["value"];

export type DirectoryFilters = {
  q: string;
  category: string | null;
  sales: Values<"sales">;
  merchants: Values<"merchants">;
  active: Values<"active">;
  sort: (typeof directorySorts)[number]["value"];
};

export const directoryKeys = [
  "sales",
  "merchants",
  "active",
] as const satisfies readonly DirectoryKey[];

export const defaultDirectoryFilters: DirectoryFilters = {
  q: "",
  category: null,
  sales: "any",
  merchants: "any",
  active: "any",
  sort: "balanced",
};

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.find((candidate) => candidate === value) ?? fallback;

const valuesOf = <K extends DirectoryKey>(key: K): readonly Values<K>[] =>
  directoryFilterGroups[key].options.map((option) => option.value);

export const parseDirectory = (params: URLSearchParams): DirectoryFilters => ({
  q: params.get("q") ?? "",
  category: params.get("category"),
  sales: pick(params.get("sales"), valuesOf("sales"), "any"),
  merchants: pick(params.get("merchants"), valuesOf("merchants"), "any"),
  active: pick(params.get("active"), valuesOf("active"), "any"),
  sort: pick(
    params.get("sort"),
    directorySorts.map((sort) => sort.value),
    "balanced",
  ),
});

export const directoryParams = (filters: DirectoryFilters) => {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  for (const key of directoryKeys)
    if (filters[key] !== defaultDirectoryFilters[key]) params.set(key, filters[key]);
  if (filters.sort !== defaultDirectoryFilters.sort) params.set("sort", filters.sort);
  return params;
};

export const activeDirectoryCount = (filters: DirectoryFilters) =>
  directoryKeys.filter((key) => filters[key] !== defaultDirectoryFilters[key]).length;

export const isDirectoryNarrowed = (filters: DirectoryFilters) =>
  Boolean(filters.q.trim()) || filters.category !== null || activeDirectoryCount(filters) > 0;

const numberOr = (value: string) => (value === "any" ? undefined : Number(value));

export const searchInput = (
  filters: DirectoryFilters,
  limit: number,
): ClientInput<"distributors.search"> => {
  const minSettledSales = numberOr(filters.sales);
  const merchantDiversity = numberOr(filters.merchants);
  const recency = numberOr(filters.active);
  return {
    limit,
    sort: filters.sort,
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.category ? { categories: [filters.category] } : {}),
    ...(minSettledSales === undefined ? {} : { minSettledSales }),
    ...(merchantDiversity === undefined ? {} : { merchantDiversity }),
    ...(recency === undefined ? {} : { recency }),
  };
};

export const matchesQuery = (
  card: { handle: string | null; displayName: string | null },
  q: string,
) => {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  return [card.handle, card.displayName].some((text) => text?.toLowerCase().includes(needle));
};
