"use client";

import { LayoutGridIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { studioPageCopy } from "./copy-page";
import { fitsCategory, type LibraryTemplate } from "./starting-points";
import { TemplateCard } from "./template-card";

const copy = studioPageCopy.library;
type Scope = "spoke" | "mine";
const scopes: readonly Scope[] = ["spoke", "mine"];
export type Category = { readonly id: string; readonly name: string };

function Chip({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cx(
        "ease-spring h-8 shrink-0 rounded-full border px-3 text-sm transition-colors duration-[423ms]",
        active ? "bg-ink text-page border-ink" : "border-line text-ink hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

export function TemplateLibrary({
  spoke,
  mine,
  categories,
  selectedId,
  onSelect,
  minePending,
  mineFailed,
  onRetry,
}: {
  spoke: readonly LibraryTemplate[];
  mine: readonly LibraryTemplate[];
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (template: LibraryTemplate) => void;
  minePending: boolean;
  mineFailed: boolean;
  onRetry: () => void;
}) {
  const [scope, setScope] = useState<Scope>(() =>
    mine.some((template) => template.id === selectedId) ? "mine" : "spoke",
  );
  const [category, setCategory] = useState<string | null>(null);
  const labelOf = (template: LibraryTemplate) =>
    template.categories
      .map((id) => categories.find((item) => item.id === id)?.name)
      .find((name) => name !== undefined) ?? copy.anyCategory;
  const list = (scope === "spoke" ? spoke : mine).filter((template) =>
    scope === "mine" ? true : fitsCategory(template, category),
  );
  const categoryName = categories.find((item) => item.id === category)?.name ?? "";
  const all = [...spoke, ...mine];
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="lg:hidden">
        <Field label={copy.choose}>
          <Select
            value={selectedId ?? undefined}
            placeholder={copy.choose}
            onValueChange={(id) => {
              const found = all.find((template) => template.id === id);
              if (found) onSelect(found);
            }}
            options={all.map((template) => ({ value: template.id, label: template.name }))}
          />
        </Field>
      </div>
      <div className="hidden flex-col gap-3 lg:flex">
        <div
          role="group"
          aria-label={copy.label}
          className="bg-pill grid grid-cols-2 gap-1 rounded-2xl p-1"
        >
          {scopes.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => {
                setScope(value);
              }}
              className={cx(
                "ease-spring rounded-xl px-2 py-2 text-sm leading-tight font-medium transition-colors duration-[423ms]",
                scope === value
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-subtle hover:text-ink",
              )}
            >
              {value === "spoke" ? copy.spoke : copy.mine}
              {value === "mine" ? (
                <span className="text-subtle ml-1 font-mono">{mine.length}</span>
              ) : null}
            </button>
          ))}
        </div>
        {scope === "spoke" ? (
          <div className="flex flex-col gap-3">
            <p className="text-subtle text-sm">{copy.note}</p>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label={copy.categories}>
              <Chip
                active={category === null}
                onSelect={() => {
                  setCategory(null);
                }}
              >
                {copy.all}
              </Chip>
              {categories.map((item) => (
                <Chip
                  key={item.id}
                  active={category === item.id}
                  onSelect={() => {
                    setCategory(item.id);
                  }}
                >
                  {item.name}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {scope === "mine" && minePending ? (
          <div className="flex flex-col gap-2">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
          </div>
        ) : scope === "mine" && mineFailed ? (
          <div className="bg-pink-soft text-pink-ink flex flex-col gap-2 rounded-2xl p-3 text-sm">
            {copy.loadFailed}
            <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
              {copy.retry}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={LayoutGridIcon}
            title={
              scope === "mine" ? copy.emptyTitle : fill(copy.filtered, { category: categoryName })
            }
            body={scope === "mine" ? copy.emptyBody : undefined}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={template.id === selectedId}
                categoryLabel={labelOf(template)}
                onSelect={() => {
                  onSelect(template);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
