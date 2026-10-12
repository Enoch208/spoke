"use client";

import { useState } from "react";
import { CampaignCard } from "@/components/product/campaign-card";
import { ProductPage, QueryState } from "@/components/product/page";
import { Input } from "@/components/ui/input";
import { useClientQuery } from "@/lib/query/use-client";

export function ExplorePage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"balanced" | "newest" | "reward" | "budget" | "hold">(
    "balanced",
  );
  const campaigns = useClientQuery("campaigns.list", { q, sort });
  return (
    <ProductPage
      title="Find something worth sharing"
      description="Real products, disclosed commission policies and a record of settled sales. Rewards come from each merchant’s separate budget."
    >
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search campaigns"
          placeholder="Search products or merchants"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
          }}
          className="max-w-md"
        />
        <select
          aria-label="Sort campaigns"
          value={sort}
          onChange={(event) => {
            const value = event.target.value;
            if (
              value === "balanced" ||
              value === "newest" ||
              value === "reward" ||
              value === "budget" ||
              value === "hold"
            )
              setSort(value);
          }}
          className="border-hairline bg-surface rounded-xl border px-4"
        >
          <option value="balanced">Balanced</option>
          <option value="newest">Newest</option>
          <option value="reward">Reward</option>
          <option value="budget">Available budget</option>
          <option value="hold">Shortest hold</option>
        </select>
      </div>
      <QueryState
        pending={campaigns.isPending}
        error={campaigns.error}
        retry={() => void campaigns.refetch()}
      >
        {campaigns.data?.items.length === 0 ? (
          <p className="text-body rounded-2xl border border-hairline p-8">
            No campaigns match this search. Try another term or check back after a merchant
            launches.
          </p>
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
