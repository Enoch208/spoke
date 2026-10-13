"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/copy";
import { formatDuration } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { opportunitiesCopy } from "../copy/opportunities";

const copy = opportunitiesCopy.filters;

export const rateOptions = ["any", "500", "1000", "2000"] as const;
export const levelOptions = ["any", "1", "2", "3", "4", "5"] as const;
export const holdOptions = ["any", "86400", "259200", "604800"] as const;
export const sourceOptions = ["any", "NATIVE_ONCHAIN", "MERCHANT_ATTESTED"] as const;

export type Filters = {
  q: string;
  category: string;
  rate: (typeof rateOptions)[number];
  levels: (typeof levelOptions)[number];
  hold: (typeof holdOptions)[number];
  source: (typeof sourceOptions)[number];
  hideJoined: boolean;
};

export const activeCount = (filters: Filters) =>
  [
    filters.category !== "any",
    filters.rate !== "any",
    filters.levels !== "any",
    filters.hold !== "any",
    filters.source !== "any",
    filters.hideJoined,
  ].filter(Boolean).length;

export function OpportunityFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const categories = useClientQuery("products.categories", {});
  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
      <label className="relative min-w-0 sm:flex-1 sm:basis-64">
        <span className="sr-only">{copy.search}</span>
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          value={filters.q}
          placeholder={copy.search}
          className="pl-10"
          onChange={(event) => {
            onChange({ q: event.target.value });
          }}
        />
      </label>
      <div className="sm:w-44">
        <Select
          value={filters.category}
          onValueChange={(category) => {
            onChange({ category });
          }}
          options={[
            { value: "any", label: copy.anyCategory },
            ...(categories.data ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
      </div>
      <div className="sm:w-44">
        <Select
          value={filters.rate}
          onValueChange={(rate) => {
            onChange({ rate });
          }}
          options={rateOptions.map((value) => ({
            value,
            label:
              value === "any"
                ? copy.anyRate
                : fill(copy.rateMin, { pct: `${String(Number(value) / 100)}%` }),
          }))}
        />
      </div>
      <div className="sm:w-36">
        <Select
          value={filters.levels}
          onValueChange={(levels) => {
            onChange({ levels });
          }}
          options={levelOptions.map((value) => ({
            value,
            label:
              value === "any"
                ? copy.anyLevels
                : value === "5"
                  ? copy.levelsMax
                  : fill(copy.levelsN, { n: value }),
          }))}
        />
      </div>
      <div className="sm:w-40">
        <Select
          value={filters.hold}
          onValueChange={(hold) => {
            onChange({ hold });
          }}
          options={holdOptions.map((value) => ({
            value,
            label:
              value === "any"
                ? copy.anyHold
                : fill(copy.holdMax, { hold: formatDuration(Number(value)) }),
          }))}
        />
      </div>
      <div className="sm:w-52">
        <Select
          value={filters.source}
          onValueChange={(source) => {
            onChange({ source });
          }}
          options={[
            { value: "any", label: copy.anySource },
            { value: "NATIVE_ONCHAIN", label: copy.onchain },
            { value: "MERCHANT_ATTESTED", label: copy.attested },
          ]}
        />
      </div>
      <Switch
        checked={filters.hideJoined}
        onCheckedChange={(hideJoined) => {
          onChange({ hideJoined });
        }}
        label={copy.hideJoined}
      />
    </div>
  );
}
