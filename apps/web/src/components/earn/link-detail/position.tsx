"use client";

import { TxHash } from "@/components/ui/address";
import { PathBreadcrumb } from "@/components/graph/path-breadcrumb";
import { graphCopy } from "@/components/graph/copy";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { Skeleton } from "@/components/ui/skeleton";
import { linkDetailCopy } from "../copy/link-detail";
import type { LinkRow } from "../shared/campaigns";
import { Section } from "../shared/section";

const copy = linkDetailCopy.position;

export function Position({ link }: { link: LinkRow }) {
  const { mode } = useClientContext();
  const ancestry = useClientQuery("graph.ancestry", {
    nodeId: link.nodeId,
    chainId: activeChain.id,
  });
  const nodes = [...(ancestry.data?.nodes ?? [])].reverse().map((node) => ({
    nodeId: node.nodeId,
    owner: node.owner,
    self: node.nodeId === link.nodeId,
    hidden: node.moderationFlag && node.nodeId !== link.nodeId,
  }));
  return (
    <Section title={copy.title}>
      <div className="grid gap-3">
        {ancestry.data ? (
          <PathBreadcrumb
            merchant={link.campaign.merchant.name}
            nodes={nodes}
            label={graphCopy.pathLabel}
          />
        ) : (
          <Skeleton className="h-8 w-72 rounded-full" />
        )}
        <p className="text-body flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>{fill(copy.level, { n: String(link.levelFromMerchant) })}</span>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <span>{fill(copy.created, { date: formatDateTime(new Date(link.createdAt)) })}</span>
          <TxHash hash={link.createdTxHash} chainId={activeChain.id} demo={mode === "demo"} />
        </p>
        <p className="text-subtle text-sm">{copy.permanent}</p>
      </div>
    </Section>
  );
}
