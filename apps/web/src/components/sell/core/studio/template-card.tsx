"use client";

import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { studioPageCopy } from "./copy-page";
import type { LibraryTemplate } from "./starting-points";
import { termsChips } from "./terms-text";

const copy = studioPageCopy.library;

export function TemplateCard({
  template,
  selected,
  categoryLabel,
  onSelect,
}: {
  template: LibraryTemplate;
  selected: boolean;
  categoryLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        "ease-spring flex w-full min-w-0 flex-col gap-2 rounded-2xl border p-3 text-left transition-colors duration-[423ms]",
        selected ? "border-ink bg-surface" : "border-hairline bg-surface hover:border-pill-edge",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-ink min-w-0 text-sm font-medium">{template.name}</span>
        {template.source === "mine" ? (
          <span className="text-subtle shrink-0 font-mono text-xs">
            {fill(copy.version, { version: String(template.version) })}
          </span>
        ) : null}
      </span>
      <span className="flex flex-wrap gap-1">
        {termsChips(template.terms).map((chip) => (
          <span key={chip} className="bg-soft text-body rounded-full px-2 py-0.5 font-mono text-xs">
            {chip}
          </span>
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-subtle text-xs">{categoryLabel}</span>
        {template.status === "archived" ? <Badge tone="faint">{copy.archived}</Badge> : null}
      </span>
    </button>
  );
}
