"use client";

import {
  FilterHorizontalIcon,
  InformationCircleIcon,
  MailOpen01Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { ShowMore } from "@/components/ui/pagination";
import { usePhone } from "@/components/ui/use-phone";
import { LoadingSkeleton, ProductPage } from "@/components/product/page";
import { Segmented } from "@/components/graph/segmented";
import { useFeatureGate } from "@/components/app/feature-gate";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { opportunitiesCopy as copy } from "../copy/opportunities";
import { useMyLinks } from "../shared/campaigns";
import { DialogError } from "../shared/dialog-states";
import { oneOf, useQueryState } from "../shared/query";
import { EarnCampaignCard } from "./earn-campaign-card";
import { InvitationStrip } from "./invitation-strip";
import {
  activeCount,
  holdOptions,
  levelOptions,
  OpportunityFilters,
  rateOptions,
  sourceOptions,
  type Filters,
} from "./opportunity-filters";
import { useRecordCategories } from "./record-categories";

const tabs = ["all", "matches", "invites"] as const;
const sorts = ["balanced", "newest", "reward", "budget", "hold"] as const;
const pageSize = 24;

export function OpportunitiesPage() {
  const query = useQueryState();
  const phone = usePhone();
  const gate = useFeatureGate();
  const open = useUiStore((state) => state.open);
  const links = useMyLinks();
  const record = useRecordCategories();
  const [count, setCount] = useState(pageSize);
  const [sheet, setSheet] = useState(false);
  const [ranking, setRanking] = useState(false);
  const tab = oneOf(query.get("tab"), tabs, "all");
  const sort = oneOf(query.get("sort"), sorts, "balanced");
  const filters: Filters = {
    q: query.get("q") ?? "",
    category: query.get("category") ?? "any",
    rate: oneOf(query.get("rate"), rateOptions, "any"),
    levels: oneOf(query.get("levels"), levelOptions, "any"),
    hold: oneOf(query.get("hold"), holdOptions, "any"),
    source: oneOf(query.get("source"), sourceOptions, "any"),
    hideJoined: query.get("hideJoined") === "1",
  };
  const invitations = useClientQuery("invitations.mine", { status: "pending" });
  const list = useClientQuery("campaigns.list", {
    limit: tab === "matches" ? 100 : Math.min(100, count),
    sort,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.category !== "any" ? { category: filters.category } : {}),
    ...(filters.rate !== "any" ? { rateMin: Number(filters.rate) } : {}),
    ...(filters.levels !== "any" ? { levels: Number(filters.levels) } : {}),
    ...(filters.hold !== "any" ? { holdMax: Number(filters.hold) } : {}),
    ...(filters.source !== "any" ? { source: filters.source } : {}),
    ...(filters.hideJoined ? { excludeJoined: true } : {}),
    ...(tab === "invites" ? { invitationOnly: true } : {}),
  });
  const items = (list.data?.items ?? []).filter(
    (item) => tab !== "matches" || record.ids.has(item.product.category),
  );
  const invitedTo = new Set((invitations.data?.items ?? []).map((item) => item.campaignId));
  const filtered = activeCount(filters) > 0 || filters.q !== "";
  const change = (patch: Partial<Filters>) => {
    if (patch.source === "MERCHANT_ATTESTED") {
      gate("attestations", () => {
        query.set({ source: "MERCHANT_ATTESTED" });
      });
      return;
    }
    setCount(pageSize);
    query.set(
      Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [
          key,
          value === "any" || value === "" || value === false ? null : value === true ? "1" : value,
        ]),
      ),
    );
  };
  const clear = () => {
    query.set({
      q: null,
      category: null,
      rate: null,
      levels: null,
      hold: null,
      source: null,
      hideJoined: null,
    });
  };
  const tabControl = phone ? (
    <Select
      value={tab}
      onValueChange={(next) => {
        query.set({ tab: next });
      }}
      options={tabs.map((value) => ({ value, label: copy.tabs[value] }))}
    />
  ) : (
    <Segmented
      label={copy.tabsLabel}
      value={tab}
      onChange={(next) => {
        query.set({ tab: next });
      }}
      options={tabs.map((value) => ({ value, label: copy.tabs[value] }))}
    />
  );
  return (
    <ProductPage title={copy.title} description={copy.description}>
      <InvitationStrip invitations={invitations.data?.items ?? []} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabControl}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Select
              value={sort}
              onValueChange={(next) => {
                query.set({ sort: next === "balanced" ? null : next });
              }}
              options={sorts.map((value) => ({ value, label: copy.sort[value] }))}
            />
          </div>
          <Popover
            open={ranking}
            onOpenChange={setRanking}
            title={copy.ranking.button}
            showTitle
            trigger={
              phone ? (
                <IconButton
                  icon={InformationCircleIcon}
                  label={copy.ranking.button}
                  variant="pill"
                />
              ) : (
                <Button variant="ghost" size="sm" icon={InformationCircleIcon}>
                  {copy.ranking.button}
                </Button>
              )
            }
          >
            <p className="text-body px-4 pt-2 pb-4 text-sm">{copy.ranking.body}</p>
          </Popover>
        </div>
      </div>
      {phone ? (
        <>
          <Button
            variant="secondary"
            icon={FilterHorizontalIcon}
            onClick={() => {
              setSheet(true);
            }}
          >
            {activeCount(filters) > 0
              ? fill(copy.filters.count, { n: String(activeCount(filters)) })
              : copy.filters.title}
          </Button>
          <Dialog
            open={sheet}
            onOpenChange={setSheet}
            title={copy.filters.title}
            footer={
              <Button
                onClick={() => {
                  setSheet(false);
                }}
              >
                {copy.filters.done}
              </Button>
            }
          >
            <OpportunityFilters filters={filters} onChange={change} />
          </Dialog>
        </>
      ) : (
        <OpportunityFilters filters={filters} onChange={change} />
      )}
      {tab === "matches" && record.names.length > 0 ? (
        <p className="text-body text-sm">
          {fill(copy.matchesLine, { categories: record.names.join(" and ") })}
        </p>
      ) : null}
      {list.isPending ? <LoadingSkeleton shape="cards" /> : null}
      {list.error ? <DialogError error={list.error} retry={() => void list.refetch()} /> : null}
      {list.data && items.length === 0 ? (
        <EmptyState
          {...(tab === "invites" ? { icon: MailOpen01Icon } : {})}
          title={
            filtered
              ? copy.empty.filtered
              : tab === "matches"
                ? copy.empty.matches
                : tab === "invites"
                  ? copy.empty.invites
                  : copy.empty.none
          }
          actions={
            filtered ? (
              <Button variant="secondary" onClick={clear}>
                {copy.filters.clear}
              </Button>
            ) : tab === "matches" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  query.set({ tab: null });
                }}
              >
                {copy.empty.matchesAction}
              </Button>
            ) : tab === "invites" ? (
              <Button variant="secondary" onClick={() => open("M-36", {})}>
                {copy.empty.invitesAction}
              </Button>
            ) : undefined
          }
        />
      ) : null}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.slice(0, count).map((campaign) => (
          <li key={campaign.campaignId}>
            <EarnCampaignCard
              campaign={campaign}
              link={links.linkFor(campaign.campaignId)}
              invited={invitedTo.has(campaign.campaignId)}
            />
          </li>
        ))}
      </ul>
      {list.data && (list.data.nextCursor || items.length > count) && tab !== "matches" ? (
        <ShowMore
          label={copy.loadMore}
          onClick={() => {
            setCount(count + pageSize);
          }}
        />
      ) : null}
    </ProductPage>
  );
}
