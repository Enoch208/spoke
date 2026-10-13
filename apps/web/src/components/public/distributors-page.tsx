"use client";

import { Search01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { directoryCopy } from "./copy/directory";
import { DistributorCard } from "./directory/distributor-card";
import {
  defaultDirectoryFilters,
  directoryParams,
  isDirectoryNarrowed,
  matchesQuery,
  parseDirectory,
  searchInput,
} from "./directory/filters";
import { DirectoryToolbar } from "./directory/toolbar";
import { DiscoverSwitch } from "./shared/discover-switch";
import { hasModal } from "./shared/modals-ready";
import { useUrlParams } from "./shared/use-url-params";
import { usePublicViewer } from "./shared/viewer";

const pageSize = 24;

function useCategoryName() {
  const categories = useClientQuery("products.categories", {});
  return (id: string) => categories.data?.find((category) => category.id === id)?.name ?? id;
}

function ClosingNote() {
  const { known } = usePublicViewer();
  const open = useUiStore((state) => state.open);
  return (
    <div className="border-hairline flex flex-col items-center gap-3 border-t pt-8 text-center">
      <p className="text-subtle max-w-[60ch] text-sm">{directoryCopy.notListed}</p>
      {known ? (
        <Button asChild variant="secondary">
          <Link href={routes.earn.reputation}>{directoryCopy.setUp}</Link>
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            open("M-01", { reason: "share", returnTo: routes.earn.reputation });
          }}
        >
          {directoryCopy.setUp}
        </Button>
      )}
    </div>
  );
}

function DirectoryContent() {
  const { params, write } = useUrlParams();
  const filters = parseDirectory(params);
  const [limit, setLimit] = useState(pageSize);
  const { mode } = useClientContext();
  const isMerchant = useSessionStore((state) => state.isMerchant);
  const categoryName = useCategoryName();
  const people = useClientQuery("distributors.search", searchInput(filters, limit));
  const rows = [...(people.data?.items ?? []), ...(people.data?.newDistributors ?? [])].filter(
    (card) => matchesQuery(card, filters.q),
  );
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = directoryParams(parseDirectory(params));
      if (value) next.set(key, value);
      else next.delete(key);
      setLimit(pageSize);
      write(directoryParams(parseDirectory(next)), key === "q" ? "replace" : "push");
    },
    [params, write],
  );
  const clear = () => {
    setLimit(pageSize);
    write(directoryParams(defaultDirectoryFilters), "push");
  };
  return (
    <ProductPage
      title={directoryCopy.title}
      description={directoryCopy.description}
      actions={<DiscoverSwitch active="distributors" />}
    >
      <DirectoryToolbar filters={filters} onChange={setParam} onClear={clear} />
      <QueryState
        pending={people.isPending}
        error={people.error}
        retry={() => void people.refetch()}
        loading="cards"
      >
        {rows.length === 0 ? (
          isDirectoryNarrowed(filters) ? (
            <EmptyState
              icon={Search01Icon}
              title={directoryCopy.filteredTitle}
              actions={
                <Button variant="secondary" onClick={clear}>
                  {directoryCopy.clearFilters}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UserGroupIcon}
              title={directoryCopy.emptyTitle}
              body={directoryCopy.emptyBody}
              actions={
                <>
                  <Button asChild>
                    <Link href={routes.explore}>{directoryCopy.exploreCampaigns}</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={routes.demo}>{directoryCopy.exploreDemo}</Link>
                  </Button>
                </>
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((card, index) => (
                <DistributorCard
                  key={card.handle ?? card.address ?? String(index)}
                  card={card}
                  sample={mode === "demo"}
                  canInvite={isMerchant && hasModal("M-28")}
                  categoryName={categoryName}
                />
              ))}
            </div>
            <div className="flex justify-center pt-2">
              {people.data?.nextCursor && limit < 96 ? (
                <Button
                  variant="secondary"
                  loading={people.isFetching}
                  onClick={() => {
                    setLimit((current) => current + pageSize);
                  }}
                >
                  {directoryCopy.showMore}
                </Button>
              ) : (
                <p className="text-subtle text-sm">{directoryCopy.endOfList}</p>
              )}
            </div>
          </div>
        )}
      </QueryState>
      <ClosingNote />
    </ProductPage>
  );
}

export function DistributorsPage() {
  return (
    <Suspense fallback={<PageSkeleton shape="cards" />}>
      <DirectoryContent />
    </Suspense>
  );
}
