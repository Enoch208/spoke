"use client";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Message01Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { reputationCopy as copy } from "../copy/reputation";
import { Section } from "../shared/section";

const statusChip = {
  open: { icon: Clock01Icon, tone: "amber" },
  answered: { icon: Message01Icon, tone: "sky" },
  resolved: { icon: CheckmarkCircle02Icon, tone: "lime" },
  declined: { icon: CancelCircleIcon, tone: "faint" },
} as const;

export function Portable() {
  const open = useUiStore((state) => state.open);
  return (
    <Section title={copy.portable.title}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => open("M-37", {})}>{copy.portable.export}</Button>
        <Button variant="secondary" onClick={() => open("M-38", { mode: "export" })}>
          {copy.portable.data}
        </Button>
      </div>
    </Section>
  );
}

export function Contests() {
  const open = useUiStore((state) => state.open);
  const support = useClientQuery("support.mine", {});
  const items = support.data ?? [];
  return (
    <Section
      title={copy.contest.title}
      description={copy.contest.body}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => open("M-41", { category: copy.contest.category })}
        >
          {copy.contest.action}
        </Button>
      }
    >
      <h3 className="text-ink mb-2 text-sm font-medium">{copy.contest.yours}</h3>
      {support.data && items.length === 0 ? (
        <p className="text-subtle text-sm">{copy.contest.empty}</p>
      ) : null}
      <ul className="divide-hairline divide-y">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
          >
            <span className="grid gap-0.5">
              <span className="text-ink font-medium">{item.subject}</span>
              <span className="text-subtle">
                {fill(copy.contest.opened, { date: formatDateTime(new Date(item.createdAt)) })} ·{" "}
                {fill(copy.contest.updated, { date: formatDateTime(new Date(item.updatedAt)) })}
              </span>
            </span>
            <StatusChip
              label={copy.contest.status[item.status]}
              icon={statusChip[item.status].icon}
              tone={statusChip[item.status].tone}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
