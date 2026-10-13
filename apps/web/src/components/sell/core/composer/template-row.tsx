"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatBps, formatDuration, formatSplit } from "@/lib/format";
import { parsePercent, parsedBps, holdSecondsOf } from "../studio/terms";
import type { LibraryTemplate } from "../studio/starting-points";
import { composerCopy } from "./copy";
import type { TemplateNote } from "./fields";

const copy = composerCopy.rewards;

const chips = (template: LibraryTemplate) => {
  const rate = parsePercent(template.terms.rate);
  const weights = parsedBps(template.terms.weights);
  const hold = holdSecondsOf(template.terms.hold);
  return [
    rate.ok ? formatBps(rate.value) : null,
    weights ? formatSplit(weights) : null,
    hold === null ? null : formatDuration(hold),
  ]
    .filter((item) => item !== null)
    .join(" · ");
};

export function TemplateRow({
  templates,
  note,
  onApply,
  action,
}: {
  templates: readonly LibraryTemplate[];
  note: TemplateNote | null;
  onApply: (template: LibraryTemplate) => void;
  action: ReactNode;
}) {
  if (templates.length === 0) return null;
  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
            {copy.templates}
          </h2>
          <p className="text-subtle mt-1 text-sm">{copy.templatesHelper}</p>
        </div>
        {action}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {templates.map((template) => {
          const active = note?.name === template.name;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onApply(template);
              }}
              className={cx(
                "ease-spring flex w-48 shrink-0 flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors duration-[423ms]",
                active ? "border-ink bg-surface" : "border-hairline bg-soft hover:border-pill-edge",
              )}
            >
              <span className="text-ink truncate text-sm font-medium">{template.name}</span>
              <span className="text-subtle truncate font-mono text-xs tabular-nums">
                {chips(template)}
              </span>
            </button>
          );
        })}
      </div>
      {note ? (
        <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          {fill(copy.fromTemplate, { template: note.name, version: String(note.version) })}
        </p>
      ) : null}
    </Card>
  );
}
