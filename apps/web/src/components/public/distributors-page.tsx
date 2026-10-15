"use client";

import { Search01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Suspense, useState } from "react";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { directoryCopy } from "./copy/directory";
import { WalletResearch } from "./directory/wallet-research";
import { DirectoryResults } from "./directory/results";
import { ComparisonSelection, DirectoryComparison } from "./directory/comparison";
import { uniqueDistributors } from "./directory/comparison-model";
import { useComparison } from "./directory/use-comparison";
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
  const { me } = usePublicViewer();
  const isMerchant = me?.isMerchant ?? false;
  const comparison = useComparison(isMerchant);
  const { selected, select, viewing: comparing } = comparison;
  const categoryName = useCategoryName();
  const people = useClientQuery("distributors.search", searchInput(filters, limit));
  const rows = uniqueDistributors([
    ...(people.data?.items ?? []),
    ...(people.data?.newDistributors ?? []),
  ]).filter((card) => matchesQuery(card, filters.q));
  const setParam = (key: string, value: string | null) => {
    const next = directoryParams(parseDirectory(params));
    if (value) next.set(key, value);
    else next.delete(key);
    setLimit(pageSize);
    const output = directoryParams(parseDirectory(next));
    if (selected.length) output.set("compare", selected.join(","));
    write(output, key === "q" ? "replace" : "push");
  };
  const clear = () => {
    setLimit(pageSize);
    const output = directoryParams(defaultDirectoryFilters);
    if (selected.length) output.set("compare", selected.join(","));
    write(output, "push");
  };
  return (
    <ProductPage
      title={directoryCopy.title}
      description={directoryCopy.description}
      actions={<DiscoverSwitch active="distributors" />}
    >
      {isMerchant ? <WalletResearch /> : null}
      {isMerchant ? (
        <ComparisonSelection
          selected={selected}
          viewing={comparing}
          view={comparison.view}
          clear={comparison.clear}
        />
      ) : null}
      {comparing ? (
        <DirectoryComparison selected={selected} sample={mode === "demo"} remove={select} />
      ) : (
        <>
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
              <DirectoryResults
                rows={rows}
                sample={mode === "demo"}
                merchant={isMerchant}
                selected={selected}
                select={select}
                categoryName={categoryName}
                more={Boolean(people.data?.nextCursor) && limit < 96}
                loading={people.isFetching}
                loadMore={() => {
                  setLimit((current) => current + pageSize);
                }}
              />
            )}
          </QueryState>
        </>
      )}
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
