"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { CampaignCard } from "@/components/product/campaign-card";
import { ProductPage, QueryState } from "@/components/product/page";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useClientQuery } from "@/lib/query/use-client";

type Sort = "balanced" | "newest" | "reward" | "budget" | "hold";

const sortOptions: readonly { value: Sort; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "newest", label: "Newest" },
  { value: "reward", label: "Highest reward" },
  { value: "budget", label: "Most budget left" },
  { value: "hold", label: "Shortest hold" },
];

export function ExplorePage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("balanced");
  const campaigns = useClientQuery("campaigns.list", { q, sort });
  return (
    <ProductPage
      title="Explore campaigns"
      description="Real products, disclosed commission policies and a record of settled sales. Rewards come from each merchant’s separate budget."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
            className="text-subtle pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            aria-label="Search campaigns"
            placeholder="Search products or merchants"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
            className="pl-10"
          />
        </div>
        <div className="sm:w-56">
          <Select value={sort} onValueChange={setSort} options={sortOptions} />
        </div>
      </div>
      <QueryState
        pending={campaigns.isPending}
        error={campaigns.error}
        retry={() => void campaigns.refetch()}
        loading="cards"
      >
        {campaigns.data?.items.length === 0 ? (
          <EmptyState
            icon={Search01Icon}
            title={q ? "No campaigns match this search" : "No live campaigns yet"}
            body={
              q
                ? "Try another product or merchant name."
                : "Campaigns appear here once a merchant funds a reward budget on Monad Testnet."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.data?.items.map((campaign) => (
              <CampaignCard key={campaign.campaignId} campaign={campaign} />
            ))}
          </div>
        )}
      </QueryState>
    </ProductPage>
  );
}
