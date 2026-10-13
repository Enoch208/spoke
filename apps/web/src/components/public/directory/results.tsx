"use client";

import { Button } from "@/components/ui/button";
import { directoryCopy } from "../copy/directory";
import { hasModal } from "../shared/modals-ready";
import { comparisonLimit, distributorIdentity } from "./comparison-model";
import { DistributorCard, type DistributorCardData } from "./distributor-card";

export function DirectoryResults({
  rows,
  sample,
  merchant,
  selected,
  select,
  categoryName,
  more,
  loading,
  loadMore,
}: {
  rows: DistributorCardData[];
  sample: boolean;
  merchant: boolean;
  selected: readonly string[];
  select: (id: string) => void;
  categoryName: (id: string) => string;
  more: boolean;
  loading: boolean;
  loadMore: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((card) => (
          <DistributorCard
            key={card.handle ?? card.address}
            card={card}
            sample={sample}
            canInvite={merchant && hasModal("M-28")}
            categoryName={categoryName}
            comparison={
              merchant
                ? {
                    selected: selected.includes(distributorIdentity(card) ?? ""),
                    full: selected.length >= comparisonLimit,
                    toggle: () => {
                      const id = distributorIdentity(card);
                      if (id) select(id);
                    },
                  }
                : undefined
            }
          />
        ))}
      </div>
      <div className="flex justify-center pt-2">
        {more ? (
          <Button variant="secondary" loading={loading} onClick={loadMore}>
            {directoryCopy.showMore}
          </Button>
        ) : (
          <p className="text-subtle text-sm">{directoryCopy.endOfList}</p>
        )}
      </div>
    </div>
  );
}
