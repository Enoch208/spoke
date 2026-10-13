"use client";

import { Share08Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { homeCopy } from "../copy/home";
import type { LinkRow } from "../shared/campaigns";
import { LinkStateChip, linkStatus, shareBlockedReason } from "../shared/link-status";
import { Section } from "../shared/section";
import { useManyQueries } from "../shared/use-many";

const copy = homeCopy.links;

export function ActiveLinks({ links }: { links: readonly LinkRow[] }) {
  const open = useUiStore((state) => state.open);
  const shown = links.slice(0, 5);
  const stats = useManyQueries(
    "links.stats",
    shown.map((link) => ({ nodeId: link.nodeId })),
  );
  return (
    <Section
      title={copy.title}
      padding="none"
      actions={
        <Link href={routes.earn.links} className="text-ink text-sm underline underline-offset-2">
          {copy.all}
        </Link>
      }
    >
      <ul className="divide-hairline divide-y px-2 pb-2">
        {shown.map((link, index) => {
          const status = linkStatus(link);
          const blocked = shareBlockedReason(status);
          const row = stats[index];
          const share = (
            <IconButton
              icon={Share08Icon}
              label={copy.share}
              size="sm"
              disabled={blocked !== null}
              onClick={() => open("M-13", { nodeId: link.nodeId })}
            />
          );
          return (
            <li key={link.nodeId} className="flex items-center gap-3 px-3 py-3">
              <Link href={routeTo.link(link.nodeId)} className="group grid min-w-0 flex-1 gap-1">
                <span className="text-ink group-hover:text-body line-clamp-2 font-medium transition-colors duration-[423ms]">
                  {link.campaign.product.title}
                </span>
                <span className="text-subtle truncate text-sm">
                  {link.campaign.merchant.name} ·{" "}
                  {fill(copy.visits, { n: formatCount(link.visitsEstimate) })}
                  {row
                    ? ` · ${fill(copy.sales, {
                        settled: formatCount(row.sales.finalized),
                        pending: formatCount(row.sales.pending),
                      })}`
                    : ""}
                </span>
              </Link>
              <LinkStateChip status={status} />
              {blocked ? (
                <Tooltip content={blocked}>
                  <span tabIndex={0} className="inline-flex rounded-full">
                    {share}
                  </span>
                </Tooltip>
              ) : (
                share
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
