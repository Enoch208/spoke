import { LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { rulesCopy } from "./copy-rules";

export function LockedRow({ children }: { children: ReactNode }) {
  return (
    <li className="bg-soft flex items-start justify-between gap-3 rounded-xl px-3 py-2.5">
      <span className="text-ink flex items-start gap-2 text-sm">
        <HugeiconsIcon
          icon={LockIcon}
          size={16}
          strokeWidth={1.8}
          className="text-subtle mt-0.5 shrink-0"
          aria-hidden="true"
        />
        {children}
      </span>
      <span className="text-subtle shrink-0 text-xs">{rulesCopy.enforced}</span>
    </li>
  );
}

export function PreviewRow({ children }: { children: ReactNode }) {
  return (
    <li className="border-line flex items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5">
      <span className="text-subtle text-sm">{children}</span>
      <Badge tone="lilac">{rulesCopy.preview}</Badge>
    </li>
  );
}

export function RuleGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-hairline flex flex-col gap-3 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-ink text-base font-medium">{title}</h3>
      {children}
    </section>
  );
}
