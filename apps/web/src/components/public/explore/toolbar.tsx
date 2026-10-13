"use client";

import {
  FilterHorizontalIcon,
  InformationCircleIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { usePhone } from "@/components/ui/use-phone";
import { useClientQuery } from "@/lib/query/use-client";
import { exploreCopy, sortLabels } from "../copy/explore";
import { FilterPanel } from "./filter-panel";
import { activeFilterCount, type ExploreFilters, type FilterKey } from "./filters";

const sortOptions = Object.entries(sortLabels).map(([value, label]) => ({ value, label }));

export function SearchField({
  value,
  label,
  onCommit,
}: {
  value: string;
  label: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const [sent, setSent] = useState<string | null>(null);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => {
      setSent(draft);
      onCommit(draft);
    }, 250);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, value, onCommit]);
  return (
    <Input
      type="search"
      aria-label={label}
      placeholder={label}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      prefix={<HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />}
    />
  );
}

export function CategoryChips({
  active,
  onPick,
}: {
  active: string | null;
  onPick: (category: string | null) => void;
}) {
  const categories = useClientQuery("products.categories", {});
  const items = [
    { id: null, name: exploreCopy.allCategories },
    ...(categories.data ?? []).map((item) => ({ id: item.id, name: item.name })),
  ];
  return (
    <div
      role="group"
      aria-label={exploreCopy.categories}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {items.map((item) => (
        <button
          key={item.id ?? "all"}
          type="button"
          aria-pressed={item.id === active}
          onClick={() => {
            onPick(item.id);
          }}
          className={cx(
            "font-ui ease-spring h-9 shrink-0 rounded-3xl border px-3.5 text-sm font-medium transition-colors duration-[423ms]",
            item.id === active
              ? "bg-ink text-page border-ink"
              : "bg-surface text-ink border-line hover:border-ink",
          )}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

export function OrderingNote({ lines }: { lines: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title={exploreCopy.howOrdered}
      showTitle
      width={360}
      trigger={
        <Button variant="ghost" size="sm" icon={InformationCircleIcon}>
          {exploreCopy.howOrdered}
        </Button>
      }
    >
      <div className="text-body flex flex-col gap-3 px-4 pt-2 pb-4 text-sm">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </Popover>
  );
}

export function ExploreToolbar({
  filters,
  total,
  onChange,
  onClear,
}: {
  filters: ExploreFilters;
  total: number;
  onChange: (key: FilterKey | "sort" | "q" | "category", value: string | null) => void;
  onClear: () => void;
}) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
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
          <SearchField value={filters.q} label={exploreCopy.search} onCommit={commitSearch} />
        </div>
        <Popover
          open={open}
          onOpenChange={setOpen}
          title={exploreCopy.filters}
          showTitle
          width={380}
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
          <FilterPanel
            filters={filters}
            includeSort={phone}
            total={total}
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
            options={sortOptions}
          />
        </Field>
        <OrderingNote lines={[exploreCopy.orderedBody, exploreCopy.orderedOther]} />
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
