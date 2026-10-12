"use client";

import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio";
import { fill } from "@/lib/copy";
import { pluralize } from "@/lib/format";
import { exploreCopy, filterGroups, sortLabels } from "../copy/explore";
import { filterKeys, type ExploreFilters, type FilterKey } from "./filters";

export function FilterPanel({
  filters,
  includeSort,
  total,
  onChange,
  onClear,
  onDone,
}: {
  filters: ExploreFilters;
  includeSort: boolean;
  total: number;
  onChange: (key: FilterKey | "sort", value: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 px-4 py-4">
        {includeSort ? (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-ink mb-2.5 text-sm font-medium">{exploreCopy.sort}</legend>
            <RadioGroup
              label={exploreCopy.sort}
              value={filters.sort}
              onValueChange={(value) => {
                onChange("sort", value);
              }}
              options={Object.entries(sortLabels).map(([value, label]) => ({ value, label }))}
            />
          </fieldset>
        ) : null}
        {filterKeys.map((key) => (
          <fieldset key={key} className="flex flex-col">
            <legend className="text-ink mb-2.5 text-sm font-medium">
              {filterGroups[key].label}
            </legend>
            <RadioGroup
              label={filterGroups[key].label}
              value={filters[key]}
              onValueChange={(value) => {
                onChange(key, value);
              }}
              options={filterGroups[key].options}
              orientation="horizontal"
            />
          </fieldset>
        ))}
      </div>
      <div className="border-hairline bg-surface sticky bottom-0 flex items-center max-sm:-bottom-6 justify-between gap-2 border-t px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onClear}>
          {exploreCopy.clear}
        </Button>
        <Button size="sm" onClick={onDone}>
          {fill(exploreCopy.showResults, { count: pluralize(total, "campaign") })}
        </Button>
      </div>
    </div>
  );
}
