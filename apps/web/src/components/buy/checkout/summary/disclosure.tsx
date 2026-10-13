"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function Disclosure({
  title,
  summary,
  collapsible,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  collapsible: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  if (!collapsible)
    return (
      <section className="bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-4 sm:p-5">
        <h2 className="text-ink font-medium">{title}</h2>
        {children}
      </section>
    );
  return (
    <section className="bg-surface border-hairline rounded-2xl border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex min-h-12 w-full items-center gap-3 p-4 text-left sm:px-5"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-ink font-medium">{title}</span>
          {summary && !open ? <span className="text-subtle text-sm">{summary}</span> : null}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className={cx(
            "text-subtle ease-spring shrink-0 transition-transform duration-[423ms]",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={bodyId} hidden={!open} className="px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </section>
  );
}
