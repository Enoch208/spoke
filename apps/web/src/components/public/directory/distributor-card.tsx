"use client";

import { SparklesIcon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill, globalStates } from "@/lib/copy";
import { formatCount, formatHandle, formatRelative, pluralize } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { directoryCopy } from "../copy/directory";

export type DistributorCardData = ClientOutput<"distributors.search">["items"][number];

export function DistributorCard({
  card,
  sample,
  canInvite,
  categoryName,
}: {
  card: DistributorCardData;
  sample: boolean;
  canInvite: boolean;
  categoryName: (id: string) => string;
}) {
  const open = useUiStore((state) => state.open);
  const handle = card.handle ? formatHandle(card.handle) : null;
  const name = card.displayName ?? handle ?? "";
  const stats = [
    card.settledConversions === null
      ? null
      : fill(directoryCopy.settledLine, { settled: formatCount(card.settledConversions) }),
    card.merchantCount === null
      ? null
      : fill(directoryCopy.merchantsLine, { merchants: formatCount(card.merchantCount) }),
  ].filter((line): line is string => line !== null);
  const address = card.address;
  return (
    <Card className="group has-[a:focus-visible]:outline-ink ease-spring relative flex h-full flex-col gap-4 outline-offset-2 transition-[box-shadow,border-color] duration-[423ms] hover:border-line hover:shadow-[0_12px_32px_-16px_rgba(26,26,26,0.18)] has-[a:focus-visible]:outline-2">
      <div className="flex items-start gap-3">
        <Avatar seed={card.handle ?? name} name={name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {card.handle ? (
              <Link
                href={routeTo.profile(card.handle)}
                className="font-display text-ink truncate text-[20px] leading-tight font-medium outline-none after:absolute after:inset-0"
              >
                {name}
              </Link>
            ) : (
              <span className="font-display text-ink truncate text-[20px] font-medium">{name}</span>
            )}
            {sample ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
          </div>
          {card.displayName && handle ? (
            <p className="text-subtle truncate text-sm">{handle}</p>
          ) : null}
        </div>
        {card.slot === "new" ? (
          <Badge tone="sky" icon={SparklesIcon}>
            {directoryCopy.newChip}
          </Badge>
        ) : null}
      </div>
      {card.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {card.categories.slice(0, 3).map((category) => (
            <Badge key={category} tone="ink">
              {categoryName(category)}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="border-hairline mt-auto flex flex-col gap-1 border-t pt-3 text-sm">
        {stats.length > 0 ? <p className="text-ink font-medium">{stats.join(" · ")}</p> : null}
        <p className="text-subtle">
          {card.lastSettledAt
            ? fill(directoryCopy.active, { relative: formatRelative(new Date(card.lastSettledAt)) })
            : null}
          {card.settledConversions !== null && card.lastSettledAt ? " · " : null}
          {card.settledConversions !== null
            ? fill(directoryCopy.basedOn, {
                count: pluralize(card.settledConversions, "settled sale"),
              })
            : null}
        </p>
      </div>
      {canInvite && address ? (
        <div className="relative z-10">
          <Button
            size="sm"
            variant="secondary"
            icon={UserAdd01Icon}
            onClick={() => {
              open("M-28", { address });
            }}
          >
            {directoryCopy.invite}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
