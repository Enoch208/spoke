"use client";

import { InformationCircleIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TabList, Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { useClientQuery } from "@/lib/query/use-client";
import { salesCopy as copy } from "../copy/sales";
import { periods, saleTabs, type Period, type SaleTab } from "./sales-query";

export function SalesFilters({
  tab,
  period,
  campaign,
  q,
  counts,
  fixedCampaign,
  onChange,
}: {
  tab: SaleTab;
  period: Period;
  campaign: string | undefined;
  q: string;
  counts: { pending: number; finalized: number; refunded: number } | undefined;
  fixedCampaign: boolean;
  onChange: (changes: Readonly<Record<string, string | null>>) => void;
}) {
  const mine = useClientQuery("campaigns.mine", {}, { enabled: !fixedCampaign });
  const [search, setSearch] = useState(q);
  const countFor = (value: SaleTab) => {
    if (!counts) return undefined;
    if (value === "all") return counts.pending + counts.finalized + counts.refunded;
    if (value === "pending") return counts.pending;
    if (value === "refunded") return counts.refunded;
    return undefined;
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Tabs
          value={tab}
          values={saleTabs}
          onValueChange={(value) => {
            onChange({ state: value === "all" ? null : value, maturing: null, matured: null });
          }}
          className="min-w-0"
        >
          <TabList
            label={copy.tabsLabel}
            value={tab}
            items={saleTabs.map((value) => ({
              value,
              label: copy.tabs[value],
              count: countFor(value),
            }))}
          />
        </Tabs>
        <Tooltip content={copy.tabsHelp}>
          <button
            type="button"
            aria-label={copy.tabsHelp}
            className="text-subtle hover:text-ink flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </Tooltip>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ q: search.trim() || null });
          }}
        >
          <Input
            aria-label={copy.searchLabel}
            value={search}
            placeholder={copy.search}
            prefix={
              <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
            }
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            onBlur={() => {
              if (search.trim() !== q) onChange({ q: search.trim() || null });
            }}
          />
        </form>
        {fixedCampaign ? null : (
          <Select
            value={campaign ?? "all"}
            onValueChange={(value) => {
              onChange({ campaign: value === "all" ? null : value });
            }}
            className="sm:w-56"
            options={[
              { value: "all", label: copy.allCampaigns },
              ...(mine.data?.items ?? []).flatMap((row) =>
                row.campaignId ? [{ value: row.campaignId, label: row.productTitle }] : [],
              ),
            ]}
          />
        )}
        <Select
          value={period}
          onValueChange={(value) => {
            onChange({ period: value === "all" ? null : value });
          }}
          className="sm:w-44"
          options={periods.map((value) => ({ value, label: copy.periods[value] }))}
        />
      </div>
    </div>
  );
}
