"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { formatDateTime, type TokenLike } from "@/lib/format";
import { studioPageCopy } from "./copy-page";
import { termsFromPolicy } from "./policy";
import type { LibraryTemplate } from "./starting-points";
import { termsChanges } from "./terms-text";

const copy = studioPageCopy.details;

export function TemplateDetails({
  template,
  token,
}: {
  template: LibraryTemplate;
  token: TokenLike;
}) {
  const versions = template.history.map((entry) => termsFromPolicy(entry.policy, token, null));
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">{copy.title}</h2>
      {template.source === "spoke" ? (
        <p className="text-body text-sm">{copy.spoke}</p>
      ) : (
        <ol className="flex flex-col">
          {[...template.history].reverse().map((entry, reversedIndex) => {
            const index = template.history.length - 1 - reversedIndex;
            const current = versions[index];
            const previous = index > 0 ? versions[index - 1] : undefined;
            const changes = current && previous ? termsChanges(previous, current) : [];
            return (
              <li
                key={entry.id}
                className="border-hairline flex gap-3 border-t py-3 first:border-t-0 first:pt-0"
              >
                <span className="bg-pill text-ink flex h-6 shrink-0 items-center rounded-full px-2 font-mono text-xs">
                  {`v${String(index + 1)}`}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-subtle text-sm">
                    {fill(copy.created, { date: formatDateTime(new Date(entry.createdAt)) })}
                    {index === template.history.length - 1 ? ` · ${copy.current}` : ""}
                  </span>
                  <span className="text-ink text-sm">
                    {index === 0
                      ? copy.first
                      : changes.length > 0
                        ? changes.join(" · ")
                        : copy.noChange}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          className="mt-0.5 shrink-0"
        />
        {copy.note}
      </p>
    </Card>
  );
}
