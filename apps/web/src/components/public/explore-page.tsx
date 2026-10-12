"use client";

import { Search01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { CampaignCard } from "@/components/product/campaign-card";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";
import { exploreCopy } from "./copy/explore";
import {
  defaultFilters,
  filtersToParams,
  isNarrowed,
  parseFilters,
  type ExploreFilters,
} from "./explore/filters";
import { ExploreToolbar } from "./explore/toolbar";
import { pageSize, useExploreCampaigns } from "./explore/use-explore";
import { DiscoverSwitch } from "./shared/discover-switch";
import { FreshnessLine } from "./shared/freshness";
import { useUrlParams } from "./shared/use-url-params";
import { usePersonalMarks, usePublicViewer } from "./shared/viewer";

function Empty({
  filters,
  closedTotal,
  onClear,
  onShowClosed,
}: {
  filters: ExploreFilters;
  closedTotal: number;
  onClear: () => void;
  onShowClosed: () => void;
}) {
  if (isNarrowed(filters))
    return (
      <EmptyState
        icon={Search01Icon}
        title={exploreCopy.emptyFilteredTitle}
        body={exploreCopy.emptyFilteredBody}
        actions={
          <Button variant="secondary" onClick={onClear}>
            {exploreCopy.clearFilters}
          </Button>
        }
      />
    );
  if (closedTotal > 0)
    return (
      <EmptyState
        icon={Store01Icon}
        title={fill(exploreCopy.nothingOpen, { count: pluralize(closedTotal, "is", "are") })}
        actions={
          <Button variant="secondary" onClick={onShowClosed}>
            {exploreCopy.showThem}
          </Button>
        }
      />
    );
  return (
    <EmptyState
      icon={Store01Icon}
      title={exploreCopy.emptyLiveTitle}
      body={exploreCopy.emptyLiveBody}
      actions={
        <>
          <Button asChild>
            <Link href={routes.launch}>{exploreCopy.launch}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={routes.demo}>{exploreCopy.exploreDemo}</Link>
          </Button>
        </>
      }
    />
  );
}

function ExploreContent() {
  const { params, write } = useUrlParams();
  const filters = parseFilters(params);
  const [limit, setLimit] = useState(pageSize);
  const campaigns = useExploreCampaigns(filters, limit);
  const { known } = usePublicViewer();
  const marks = usePersonalMarks(known);
  const update = useCallback(
    (patch: Partial<ExploreFilters>, how: "push" | "replace") => {
      setLimit(pageSize);
      write(filtersToParams({ ...parseFilters(params), ...patch }), how);
    },
    [params, write],
  );
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = filtersToParams(parseFilters(params));
      if (value) next.set(key, value);
      else next.delete(key);
      setLimit(pageSize);
      write(filtersToParams(parseFilters(next)), key === "q" ? "replace" : "push");
    },
    [params, write],
  );
  return (
    <ProductPage
      title={exploreCopy.title}
      description={exploreCopy.description}
      actions={<DiscoverSwitch active="campaigns" />}
    >
      <ExploreToolbar
        filters={filters}
        total={campaigns.total}
        onChange={setParam}
        onClear={() => {
          update({ ...defaultFilters, q: filters.q }, "push");
        }}
      />
      <QueryState
        pending={campaigns.pending}
        error={campaigns.error}
        retry={campaigns.refetch}
        loading="cards"
      >
        {campaigns.items.length === 0 ? (
          <Empty
            filters={filters}
            closedTotal={campaigns.closedTotal}
            onClear={() => {
              update(defaultFilters, "push");
            }}
            onShowClosed={() => {
              update({ status: "all" }, "push");
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p className="text-subtle text-sm">
                {fill(exploreCopy.summary, { count: pluralize(campaigns.total, "campaign") })}
              </p>
              <FreshnessLine />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.items.map((campaign) => (
                <CampaignCard
                  key={campaign.campaignId}
                  campaign={campaign}
                  hasLink={marks.linkFor(campaign.campaignId) !== null}
                  purchased={marks.purchased(campaign.campaignId)}
                />
              ))}
            </div>
            <div className="flex justify-center pt-2">
              {campaigns.hasMore && limit < 96 ? (
                <Button
                  variant="secondary"
                  loading={campaigns.fetching}
                  onClick={() => {
                    setLimit((current) => current + pageSize);
                  }}
                >
                  {exploreCopy.showMore}
                </Button>
              ) : (
                <p className="text-subtle text-sm">{exploreCopy.endOfList}</p>
              )}
            </div>
          </div>
        )}
      </QueryState>
      <div className="border-hairline flex flex-wrap items-center justify-center gap-3 border-t pt-8">
        <Button asChild variant="secondary">
          <Link href={routes.howItWorks}>{exploreCopy.howSpokeWorks}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={routes.launch}>{exploreCopy.launch}</Link>
        </Button>
      </div>
    </ProductPage>
  );
}

export function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton shape="cards" />}>
      <ExploreContent />
    </Suspense>
  );
}
