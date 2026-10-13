"use client";

import { Link01Icon, RefreshIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { TxHash } from "@/components/ui/address";
import { PageSkeleton, ProductPage } from "@/components/product/page";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { useClientContext } from "@/lib/client/provider";
import { fill, txOverallStatus } from "@/lib/copy";
import { formatDateTime, shortHash } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo, routes } from "@/lib/routes";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive } from "@/lib/tx/records";
import { activeChain } from "@/lib/wagmi";
import { linkDetailCopy as copy } from "../copy/link-detail";
import type { ClientOutput } from "@spoke/protocol";
import type { LinkRow } from "../shared/campaigns";

type PublicLinkRow = ClientOutput<"links.get">;
import { DialogError } from "../shared/dialog-states";
import { TestnetFootnote } from "../shared/footnote";
import { linkStatus, type LinkStatus } from "../shared/link-status";
import { ProofFooter } from "../shared/proof-footer";
import { Branch } from "./branch";
import { LinkSales } from "./link-sales";
import { PaysYou } from "./pays-you";
import { Performance } from "./performance";
import { Position } from "./position";
import { CampaignRail } from "./rail";
import { SharePanel } from "./share-panel";

const isOwned = (row: LinkRow | PublicLinkRow): row is LinkRow => row.earned !== null;

function Banner({ link, status }: { link: LinkRow; status: LinkStatus }) {
  const open = useUiStore((state) => state.open);
  if (status === "active") return null;
  if (status === "hidden")
    return (
      <div className="bg-pink-soft text-pink-ink flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3 text-sm">
        <HugeiconsIcon
          icon={ViewOffIcon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="mt-0.5"
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <p>
            {fill(copy.banners.hidden, {
              reason: (link.moderation.reason ?? "").replace(/\.$/, ""),
            })}
          </p>
          {link.moderation.decidedAt ? (
            <p className="text-xs">
              {fill(copy.banners.decided, {
                date: formatDateTime(new Date(link.moderation.decidedAt)),
              })}
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            open("M-41", {
              category: copy.banners.appealCategory,
              context: { nodeId: link.nodeId, campaignId: link.campaign.campaignId },
            })
          }
        >
          {copy.banners.appeal}
        </Button>
      </div>
    );
  const text = copy.banners[status];
  return (
    <p className="bg-amber-soft text-amber-ink rounded-2xl px-4 py-3 text-sm" role="status">
      {text}
    </p>
  );
}

function Missing({ nodeId, campaignId }: { nodeId: string; campaignId: string | null }) {
  const creating = useTxStore((state) =>
    state.records.find((record) => record.kind === "createNode" && isActive(record)),
  );
  return (
    <ProductPage
      title={copy.notFound}
      breadcrumbs={[{ label: copy.crumb, href: routes.earn.links }]}
    >
      <EmptyState
        variant="page"
        icon={Link01Icon}
        title={campaignId ? copy.notMine : copy.notFound}
        body={creating ? copy.justCreated : `#${nodeId}`}
        chip={
          creating ? (
            <StatusChip label={txOverallStatus.syncing} icon={RefreshIcon} tone="sky" />
          ) : undefined
        }
        actions={
          campaignId ? (
            <Button asChild>
              <Link href={routeTo.campaignNetwork(campaignId)}>{copy.viewNetwork}</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href={routes.earn.links}>{copy.crumb}</Link>
            </Button>
          )
        }
      />
    </ProductPage>
  );
}

export function LinkDetailPage({ nodeId }: { nodeId: string }) {
  const { mode } = useClientContext();
  const creating = useTxStore((state) =>
    state.records.some((record) => record.kind === "createNode" && isActive(record)),
  );
  const link = useClientQuery(
    "links.get",
    { nodeId },
    { refetchInterval: creating ? 3_000 : 15_000 },
  );
  const owned = link.data && isOwned(link.data) ? link.data : null;
  const stats = useClientQuery("links.stats", { nodeId }, { enabled: owned !== null });
  const campaignId = link.data?.campaign.campaignId ?? "0";
  const policy = useClientQuery("campaigns.policy", { campaignId }, { enabled: owned !== null });
  if (link.isPending) return <PageSkeleton />;
  if (link.error && link.error.code !== "NOT_FOUND")
    return (
      <ProductPage
        title={copy.notFound}
        breadcrumbs={[{ label: copy.crumb, href: routes.earn.links }]}
      >
        <DialogError error={link.error} retry={() => void link.refetch()} />
      </ProductPage>
    );
  if (!link.data) return <Missing nodeId={nodeId} campaignId={null} />;
  if (!owned) return <Missing nodeId={nodeId} campaignId={link.data.campaign.campaignId} />;
  const status = linkStatus(owned);
  const campaign = owned.campaign;
  return (
    <ProductPage
      title={campaign.product.title}
      breadcrumbs={[{ label: copy.crumb, href: routes.earn.links }]}
      description={fill(copy.by, { merchant: campaign.merchant.name })}
      actions={<CampaignStateChip campaign={campaign} size="md" />}
    >
      <Banner link={owned} status={status} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 content-start gap-6">
          <SharePanel link={owned} status={status} />
          <Performance stats={stats.data} token={campaign.token} />
          <Position link={owned} />
          {policy.data ? (
            <PaysYou
              policy={policy.data}
              price={BigInt(campaign.price)}
              token={campaign.token}
              level={owned.levelFromMerchant}
              campaign={campaign.product.title}
            />
          ) : null}
          <Branch link={owned} stats={stats.data} />
          <LinkSales link={owned} />
          <ProofFooter
            extra={[
              { key: "node", label: copy.proof.node, value: owned.nodeId, mono: true },
              {
                key: "campaign",
                label: copy.proof.campaign,
                value: campaign.campaignId,
                mono: true,
              },
              { key: "parent", label: copy.proof.parent, value: owned.parentNodeId, mono: true },
              {
                key: "created",
                label: copy.proof.created,
                value: (
                  <TxHash
                    hash={owned.createdTxHash}
                    chainId={activeChain.id}
                    demo={mode === "demo"}
                  />
                ),
              },
              ...(policy.data
                ? [
                    {
                      key: "policy",
                      label: fill(copy.proof.policy, {
                        version: String(policy.data.current.version),
                      }),
                      value: shortHash(policy.data.current.policyHash),
                      mono: true,
                    },
                  ]
                : []),
            ]}
          />
          <TestnetFootnote />
        </div>
        <aside className="max-xl:hidden">
          <div className="sticky top-24">
            <CampaignRail campaign={campaign} />
          </div>
        </aside>
      </div>
    </ProductPage>
  );
}
