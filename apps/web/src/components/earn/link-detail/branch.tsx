"use client";

import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { graphCopy } from "@/components/graph/copy";
import { personLabel } from "@/components/graph/person";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { linkDetailCopy } from "../copy/link-detail";
import type { LinkRow } from "../shared/campaigns";
import { Section } from "../shared/section";
import { networkHref } from "../links/link-actions";

const copy = linkDetailCopy.branch;
const childLimit = 6;

export function Branch({
  link,
  stats,
}: {
  link: LinkRow;
  stats: ClientOutput<"links.stats"> | undefined;
}) {
  const slice = useClientQuery("graph.forCampaign", {
    campaignId: link.campaign.campaignId,
    rootNode: link.nodeId,
    depth: 3,
    childLimit: 12,
  });
  const nodes = slice.data?.nodes ?? [];
  const children = nodes.filter((node) => node.parentNodeId === link.nodeId);
  return (
    <Section
      title={copy.title}
      actions={
        <Button asChild size="sm" variant="secondary">
          <Link href={networkHref(link)}>{copy.open}</Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        {stats ? (
          <p className="text-body">
            {fill(copy.line, {
              links: formatCount(stats.descendants),
              levels: formatCount(stats.maxDepthBelow),
              sales: formatCount(
                stats.sales.pending + stats.sales.finalized + stats.sales.refunded,
              ),
            })}
          </p>
        ) : null}
        {slice.data && children.length === 0 ? (
          <p className="text-subtle text-sm">{copy.empty}</p>
        ) : null}
        {children.length > 0 ? (
          <div className="max-md:hidden">
            <div className="flex justify-center">
              <span className="bg-lime-soft ring-ink rounded-full px-3 py-1 text-sm font-medium ring-2">
                {graphCopy.you}
              </span>
            </div>
            <div aria-hidden="true" className="bg-line mx-auto h-4 w-px" />
            <ul className="border-line mx-auto flex w-fit max-w-full flex-wrap justify-center gap-2 border-t px-4 pt-4">
              {children.slice(0, childLimit).map((child) => (
                <li key={child.nodeId} className="grid justify-items-center gap-1">
                  <span className="bg-pill text-ink max-w-[140px] truncate rounded-full px-3 py-1 text-sm">
                    {personLabel(child.owner, { hidden: child.moderationFlag })}
                  </span>
                  <span className="text-subtle text-xs">
                    {child.childCount > 0 ? fill(copy.under, { n: String(child.childCount) }) : ""}
                  </span>
                </li>
              ))}
              {children.length > childLimit ? (
                <li className="bg-soft text-body rounded-full px-3 py-1 text-sm">
                  {fill(copy.more, { n: String(children.length - childLimit) })}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
