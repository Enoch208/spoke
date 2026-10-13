"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/ui/use-copy";
import { fill, required } from "@/lib/copy";
import { formatAmount, formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { graphCopy, nodePanelCopy as copy, publicNetworkCopy } from "./copy";
import type { Graph } from "./model";
import { pathTo } from "./model";
import { PathBreadcrumb } from "./path-breadcrumb";
import { personInitials, personLabel, profileHandle } from "./person";

export function NodePanel({
  graph,
  nodeId,
  merchant,
  isSelf,
  onSelect,
  joinCampaign = null,
}: {
  graph: Graph;
  nodeId: string;
  merchant: string;
  isSelf: (nodeId: string) => boolean;
  onSelect: (nodeId: string) => void;
  joinCampaign?: string | null;
}) {
  const open = useUiStore((state) => state.open);
  const copyText = useCopy();
  const node = graph.nodes.get(nodeId);
  const mine = isSelf(nodeId);
  const stats = useClientQuery("links.stats", { nodeId }, { enabled: mine });
  const link = useClientQuery("links.get", { nodeId }, { enabled: mine });
  if (!node) return null;
  const hidden = node.moderationFlag && !mine;
  const label = personLabel(node.owner, {
    self: mine,
    hidden,
    ...(node.owner.visibility === "private" ? { nodeId } : {}),
  });
  const handle = profileHandle(node.owner);
  const crumbs = pathTo(graph, nodeId).map((id) => {
    const entry = graph.nodes.get(id);
    return {
      nodeId: id,
      owner: entry?.owner ?? node.owner,
      self: isSelf(id),
      hidden: Boolean(entry?.moderationFlag) && !isSelf(id),
    };
  });
  const token = link.data?.campaign.token;
  return (
    <div className="grid gap-5">
      <header className="flex items-center gap-3">
        <span className="bg-pill text-ink flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {personInitials(node.owner, { self: mine, hidden })}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-h4 text-ink truncate font-medium">{label}</h2>
          <p className="text-subtle text-sm">
            {fill(copy.level, { n: String(node.depth), merchant })}
          </p>
        </div>
      </header>
      {hidden ? (
        <p className="bg-pink-soft text-pink-ink rounded-xl px-4 py-3 text-sm">{copy.hidden}</p>
      ) : null}
      <section className="grid gap-2">
        <h3 className="text-ink text-sm font-medium">{copy.pathTitle}</h3>
        <PathBreadcrumb
          merchant={merchant}
          nodes={crumbs}
          onSelect={onSelect}
          label={copy.pathTitle}
        />
      </section>
      <div className="grid gap-2 text-sm">
        <p className="text-body">{fill(copy.under, { n: formatCount(node.childCount) })}</p>
        <p className="text-body">
          {fill(copy.sales, {
            settled: formatCount(node.counts.finalized),
            pending: formatCount(node.counts.pending),
            refunded: formatCount(node.counts.refunded),
          })}
        </p>
        {stats.data && token ? (
          <p className="text-body">
            {fill(copy.rewards, {
              settled: formatAmount(
                BigInt(stats.data.earned.claimable) + BigInt(stats.data.earned.claimed),
                token,
              ),
              pending: formatAmount(
                BigInt(stats.data.earned.atRisk) + BigInt(stats.data.earned.readyToFinalize),
                token,
              ),
            })}
          </p>
        ) : null}
      </div>
      <p className="text-subtle text-xs">
        {required.reputation} {graphCopy.buyersPrivate}
      </p>
      <div className="flex flex-wrap gap-2">
        {mine ? (
          <>
            <Button asChild size="sm">
              <Link href={routeTo.link(nodeId)}>{copy.openLink}</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => open("M-13", { nodeId })}>
              {copy.shareKit}
            </Button>
          </>
        ) : null}
        {joinCampaign && !hidden ? (
          <Button
            size="sm"
            onClick={() => open("M-12", { campaignId: joinCampaign, parentNodeId: nodeId })}
          >
            {publicNetworkCopy.createUnder}
          </Button>
        ) : null}
        {handle && !hidden ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={routeTo.profile(handle)}>{copy.profile}</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => void copyText(nodeId, copy.idCopied)}>
          {copy.copyId}
        </Button>
      </div>
    </div>
  );
}
