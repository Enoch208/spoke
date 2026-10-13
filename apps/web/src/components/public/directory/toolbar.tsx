"use client";

import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Popover } from "@/components/ui/popover";
import { RadioGroup } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { usePhone } from "@/components/ui/use-phone";
import { directoryCopy, directoryFilterGroups, directorySorts } from "../copy/directory";
import { exploreCopy } from "../copy/explore";
import { CategoryChips, OrderingNote, SearchField } from "../explore/toolbar";
import {
  activeDirectoryCount,
  directoryKeys,
  type DirectoryFilters,
  type DirectoryKey,
} from "./filters";

type Change = (key: DirectoryKey | "sort" | "q" | "category", value: string | null) => void;

function DirectoryFilterPanel({
  filters,
  includeSort,
  onChange,
  onClear,
  onDone,
}: {
  filters: DirectoryFilters;
  includeSort: boolean;
  onChange: Change;
  onClear: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 px-4 py-4">
        {includeSort ? (
          <fieldset>
            <legend className="text-ink mb-2.5 text-sm font-medium">{exploreCopy.sort}</legend>
            <RadioGroup
              label={exploreCopy.sort}
              value={filters.sort}
              onValueChange={(value) => {
                onChange("sort", value);
              }}
              options={directorySorts}
            />
          </fieldset>
        ) : null}
        {directoryKeys.map((key) => (
          <fieldset key={key}>
            <legend className="text-ink mb-2.5 text-sm font-medium">
              {directoryFilterGroups[key].label}
            </legend>
            <RadioGroup
              label={directoryFilterGroups[key].label}
              value={filters[key]}
              onValueChange={(value) => {
                onChange(key, value);
              }}
              options={directoryFilterGroups[key].options}
              orientation="horizontal"
            />
          </fieldset>
        ))}
      </div>
      <div className="border-hairline bg-surface sticky bottom-0 flex items-center justify-between gap-2 border-t px-4 py-3 max-sm:-bottom-6">
        <Button variant="ghost" size="sm" onClick={onClear}>
          {exploreCopy.clear}
        </Button>
        <Button size="sm" onClick={onDone}>
          {exploreCopy.filters}
        </Button>
      </div>
    </div>
  );
}

export function DirectoryToolbar({
  filters,
  onChange,
  onClear,
}: {
  filters: DirectoryFilters;
  onChange: Change;
  onClear: () => void;
}) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  const count = activeDirectoryCount(filters);
  const commitSearch = useCallback(
    (value: string) => {
      onChange("q", value);
    },
    [onChange],
  );
  return (
    <div className="bg-page/85 sticky top-16 z-20 -mx-4 flex flex-col gap-3 px-4 py-3 backdrop-blur-[30px] lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <SearchField value={filters.q} label={directoryCopy.search} onCommit={commitSearch} />
        </div>
        <Popover
          open={open}
          onOpenChange={setOpen}
          title={exploreCopy.filters}
          showTitle
          width={360}
          trigger={
            <Button variant="secondary" icon={FilterHorizontalIcon}>
              {exploreCopy.filters}
              {count > 0 ? (
                <span className="bg-ink text-page flex size-5 items-center justify-center rounded-full font-mono text-sm tabular-nums">
                  {count}
                </span>
              ) : null}
            </Button>
          }
        >
          <DirectoryFilterPanel
            filters={filters}
            includeSort={phone}
            onChange={onChange}
            onClear={onClear}
            onDone={() => {
              setOpen(false);
            }}
          />
        </Popover>
        <Field label={exploreCopy.sort} hideLabel className="hidden w-56 sm:flex">
          <Select
            value={filters.sort}
            onValueChange={(value) => {
              onChange("sort", value);
            }}
            options={directorySorts}
          />
        </Field>
        <OrderingNote lines={[directoryCopy.orderedBody, directoryCopy.orderedOther]} />
      </div>
      <CategoryChips
        active={filters.category}
        onPick={(category) => {
          onChange("category", category);
        }}
      />
    </div>
  );
}
