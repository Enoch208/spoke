"use client";

import { LockIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo, routes } from "@/lib/routes";
import { Composer } from "./composer";
import { composerCopy } from "./copy";
import { newTermsCopy } from "./copy-launch";
import {
  versionBlock,
  versionFields,
  versionStep,
  versionTarget,
  versionToken,
  type VersionBlock,
} from "./setup-version";

function Blocked({
  block,
  campaignId,
  scheduledAt,
}: {
  block: Exclude<VersionBlock, null>;
  campaignId: string;
  scheduledAt: string | null;
}) {
  const copy = newTermsCopy.blocked;
  const title =
    block === "scheduled"
      ? fill(copy.scheduled, {
          effectiveAt: scheduledAt ? formatDateTime(new Date(scheduledAt)) : "",
        })
      : copy[block];
  return (
    <ProductPage
      title={newTermsCopy.blockedTitle}
      breadcrumbs={[{ label: composerCopy.crumbs.campaigns, href: routes.sell.campaigns }]}
    >
      <Card>
        <EmptyState
          icon={LockIcon}
          title={title}
          actions={
            <Button asChild>
              <Link
                href={
                  block === "other"
                    ? routeTo.campaign(campaignId)
                    : routeTo.sellCampaign(campaignId, "policy")
                }
              >
                {copy.back}
              </Link>
            </Button>
          }
        />
      </Card>
    </ProductPage>
  );
}

export function VersionEntry({ campaignId }: { campaignId: string }) {
  const search = useSearchParams();
  const draftParam = search.get("draft");
  const [fresh] = useState(() => ({ id: crypto.randomUUID(), now: Date.now() }));
  const draftId = draftParam ?? fresh.id;
  const loadDraft = draftParam !== null && draftParam !== fresh.id;
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const policies = useClientQuery("campaigns.policy", { campaignId });
  const merchant = useClientQuery("merchants.me", {});
  const draft = useClientQuery("campaigns.getDraft", { id: draftId }, { enabled: loadDraft });
  const pending =
    campaign.isPending ||
    policies.isPending ||
    merchant.isPending ||
    (loadDraft && draft.isPending);
  const error =
    campaign.error ?? policies.error ?? merchant.error ?? (loadDraft ? draft.error : null);
  if (pending && !error) return <PageSkeleton />;
  if (error || !campaign.data || !policies.data || !merchant.data)
    return (
      <QueryState pending={false} error={error} retry={() => void campaign.refetch()}>
        {null}
      </QueryState>
    );
  const block = versionBlock(campaign.data, policies.data, merchant.data.address);
  if (block)
    return (
      <Blocked
        block={block}
        campaignId={campaignId}
        scheduledAt={policies.data.scheduled?.effectiveAt ?? null}
      />
    );
  const target = versionTarget(campaign.data, policies.data);
  const token = versionToken(campaign.data);
  const draftData = loadDraft ? (draft.data ?? null) : null;
  const setup = {
    mode: "newVersion" as const,
    draftId,
    initialDraft: draftData,
    initialFields: versionFields(target, token, draftData, fresh.now),
    initialStep: versionStep(search.get("step")),
    products: [],
    token,
    alertDefault: merchant.data.budgetAlertSales,
    contact: merchant.data.supportEmail,
    target,
    templates: [],
  };
  return <Composer key={draftId} setup={setup} />;
}
