"use client";

import { Megaphone01Icon, PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TabList, Tabs } from "@/components/ui/tabs";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { campaignsCopy as copy } from "../copy/campaigns";
import { pick, useQueryParams } from "../shared/use-query-params";
import { CampaignCards, CampaignTable } from "./campaign-rows";
import {
  campaignSorts,
  campaignTabs,
  listTabOf,
  matchesSearch,
  sortRows,
  type CampaignListTab,
} from "./campaign-view";
import { DraftRows } from "./draft-rows";

const newCampaign = (
  <Button asChild>
    <Link href="/sell/campaigns/new">
      <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
      {copy.newCampaign}
    </Link>
  </Button>
);

export function CampaignsPage() {
  const params = useQueryParams();
  const mine = useClientQuery("campaigns.mine", {}, { refetchInterval: 20_000 });
  const tab = pick(params.get("tab"), campaignTabs, "all");
  const sort = pick(params.get("sort"), campaignSorts, "recent");
  const [q, setQ] = useState(params.get("q") ?? "");
  const all = mine.data?.items ?? [];
  const countOf = (value: CampaignListTab) =>
    value === "all" ? all.length : all.filter((row) => listTabOf(row) === value).length;
  const visible = sortRows(
    all.filter((row) => (tab === "all" || listTabOf(row) === tab) && matchesSearch(row, q)),
    sort,
  );
  const drafts = visible.flatMap((row) =>
    row.campaignId === null && row.draftId ? [{ ...row, draftId: row.draftId }] : [],
  );
  const launched = visible.flatMap((row) =>
    row.campaignId === null ? [] : [{ ...row, campaignId: row.campaignId }],
  );
  return (
    <ProductPage title={copy.title} description={copy.description} actions={newCampaign}>
      <QueryState
        pending={mine.isPending}
        error={mine.error}
        retry={() => void mine.refetch()}
        loading="rows"
      >
        {all.length === 0 ? (
          <Card>
            <EmptyState
              icon={Megaphone01Icon}
              title={copy.emptyTitle}
              body={copy.emptyBody}
              actions={newCampaign}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={tab}
              values={campaignTabs}
              onValueChange={(value) => {
                params.set({ tab: value === "all" ? null : value });
              }}
            >
              <TabList
                label={copy.tabsLabel}
                value={tab}
                items={campaignTabs.map((value) => ({
                  value,
                  label: copy.tabs[value],
                  count: countOf(value),
                }))}
              />
            </Tabs>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                aria-label={copy.search}
                value={q}
                placeholder={copy.search}
                prefix={
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                }
                onChange={(event) => {
                  setQ(event.target.value);
                }}
                onBlur={() => {
                  params.set({ q: q.trim() || null });
                }}
              />
              <Select
                value={sort}
                onValueChange={(value) => {
                  params.set({ sort: value === "recent" ? null : value });
                }}
                className="sm:w-52"
                options={campaignSorts.map((value) => ({ value, label: copy.sorts[value] }))}
              />
            </div>
            <Card padding="none" className="overflow-hidden">
              {visible.length === 0 ? (
                <EmptyState
                  variant="compact"
                  title={
                    tab === "drafts"
                      ? copy.draftsEmpty
                      : fill(copy.tabEmpty, {
                          tab: tab === "all" ? "matching" : copy.tabs[tab].toLowerCase(),
                        })
                  }
                />
              ) : (
                <>
                  {launched.length > 0 ? (
                    <>
                      <CampaignTable rows={launched} />
                      <CampaignCards rows={launched} />
                    </>
                  ) : null}
                  {drafts.length > 0 ? (
                    <div className={launched.length > 0 ? "border-line border-t" : undefined}>
                      <DraftRows rows={drafts} />
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          </div>
        )}
      </QueryState>
    </ProductPage>
  );
}
