"use client";

import { useClientQuery } from "@/lib/query/use-client";
import { isNarrowed, listInput, type ExploreFilters } from "./filters";

export const pageSize = 24;

export function useExploreCampaigns(filters: ExploreFilters, limit: number) {
  const includeClosed = filters.status === "all";
  const open = useClientQuery("campaigns.list", listInput(filters, "active", limit));
  const countClosed = !includeClosed && open.data?.total === 0 && !isNarrowed(filters);
  const closedOptions = { enabled: includeClosed || countClosed };
  const closedLimit = includeClosed ? limit : 1;
  const paused = useClientQuery(
    "campaigns.list",
    listInput(filters, "paused", closedLimit),
    closedOptions,
  );
  const ended = useClientQuery(
    "campaigns.list",
    listInput(filters, "ended", closedLimit),
    closedOptions,
  );
  const expired = useClientQuery(
    "campaigns.list",
    listInput(filters, "expired", closedLimit),
    closedOptions,
  );
  const closed = [paused, ended, expired];
  const shown = includeClosed ? [open, ...closed] : [open];
  const closedTotal = closed.reduce((sum, query) => sum + (query.data?.total ?? 0), 0);
  return {
    items: shown.flatMap((query) => query.data?.items ?? []),
    total: shown.reduce((sum, query) => sum + (query.data?.total ?? 0), 0),
    hasMore: shown.some((query) => query.data?.nextCursor),
    pending:
      shown.some((query) => query.isPending) ||
      (countClosed && closed.some((query) => query.isPending)),
    fetching: shown.some((query) => query.isFetching),
    error: shown.find((query) => query.error)?.error ?? null,
    closedTotal: countClosed ? closedTotal : 0,
    refetch: () => {
      for (const query of shown) void query.refetch();
    },
  };
}
