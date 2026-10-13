"use client";

import type { CampaignDetail, ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { CampaignArt } from "@/components/product/campaign-art";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatBps, pluralize } from "@/lib/format";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { routes, routeTo } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { AboutSection } from "../campaign/about-section";
import { ActionCard } from "../campaign/action-card";
import { availabilityKey, type AvailabilityKey } from "../campaign/availability";
import { PhoneActionBar } from "../campaign/phone-bar";
import { TermsSection } from "../campaign/terms-section";
import { useCampaignActions } from "../campaign/use-campaign-actions";
import { useCampaignViewer } from "../campaign/use-campaign-viewer";
import { campaignCopy } from "../copy/campaign";
import { disclosureCopy } from "../copy/disclosures";
import { proofCopy } from "../copy/proof";
import { referralCopy } from "../copy/referral";
import { reportCopy } from "../copy/report";
import { actorName } from "../shared/actor";
import { Disclosures } from "../shared/disclosures";
import { ProofSection } from "../shared/proof-section";
import { ReportButton } from "../shared/report-button";
import { PassItOn, RewardGoes } from "./reward-goes";
import { SharerStrip } from "./sharer-strip";

type Resolution = ClientOutput<"links.resolveCode">;

const stateBodyFor = (key: AvailabilityKey) =>
  key === "paused"
    ? referralCopy.pausedState
    : key === "ended" || key === "expired"
      ? referralCopy.endedState
      : null;

function useRecordOpen(code: string, skip: boolean) {
  const { mutate } = useClientMutation("links.recordOpen", []);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || skip) return;
    sent.current = true;
    mutate({ code });
  }, [code, skip, mutate]);
}

export function ReferralView({
  code,
  resolution,
  campaign,
  policy,
}: {
  code: string;
  resolution: Resolution;
  campaign: CampaignDetail;
  policy: {
    data: ClientOutput<"campaigns.policy"> | undefined;
    failed: boolean;
    retry: () => void;
  };
}) {
  const now = useNow();
  const referral = { code, nodeId: resolution.nodeId, ownerAddress: resolution.owner.address };
  const viewer = useCampaignViewer(campaign, referral);
  useRecordOpen(code, viewer.ownLink);
  const terms = policy.data?.current ?? campaign.policy;
  const availability = availabilityKey(campaign, terms, now);
  const { acts, notes } = useCampaignActions({
    campaign,
    availability,
    referral,
    viewer,
    termsReady: !policy.failed,
  });
  const link = useClientQuery("links.get", { nodeId: resolution.nodeId });
  const sharer = viewer.ownLink
    ? referralCopy.you
    : actorName(resolution.owner, { self: viewer.self, fallback: referralCopy.fallbackSharer });
  const price = BigInt(campaign.price);
  const image = campaign.product.media.find((asset) => asset.kind === "image")?.url;
  const canCreate = acts.some((act) => act.id === "create");
  const helper = canCreate ? [fill(referralCopy.createHelper, { sharer })] : [];
  const disclosureLines = [
    fill(disclosureCopy.affiliateReferral, {
      sharer,
      merchant: campaign.merchant.name,
      rate: formatBps(terms.commissionBps),
      people: pluralize(terms.maxRewardedAncestors, "person", "people"),
    }),
    disclosureCopy.testnet,
    disclosureCopy.attribution,
    disclosureCopy.sharingRules,
  ];
  return (
    <ProductPage
      title={campaign.product.title}
      description={campaign.product.summary}
      breadcrumbs={[{ label: campaignCopy.explore, href: routes.explore }]}
    >
      <SharerStrip owner={resolution.owner} sharer={sharer} ownLink={viewer.ownLink} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="bg-pill rounded-3xl p-2">
            <CampaignArt
              seed={campaign.campaignId}
              imageUrl={image}
              title={campaign.product.title}
              className="aspect-[16/9] rounded-[20px] sm:aspect-[4/3]"
            />
          </div>
        </div>
        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-5 lg:row-span-2">
          <ActionCard
            campaign={campaign}
            policy={policy.data}
            availability={availability}
            viewer={viewer}
            acts={acts}
            notes={[...helper, ...notes]}
            now={now}
            code={code}
            termsFailed={policy.failed}
            retryTerms={policy.retry}
            stateBody={stateBodyFor(availability)}
            inStrip
          />
          <RewardGoes
            price={price}
            policy={terms}
            token={campaign.token}
            merchant={campaign.merchant.name}
            path={resolution.eligiblePath}
            self={viewer.self}
          />
          {canCreate ? (
            <PassItOn
              price={price}
              policy={terms}
              token={campaign.token}
              path={resolution.eligiblePath}
              self={viewer.self}
            />
          ) : null}
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <AboutSection campaign={campaign} />
          {policy.data ? <TermsSection campaign={campaign} policy={policy.data} /> : null}
          <ProofSection
            chainId={campaign.chainId}
            rows={[
              {
                key: "campaign",
                label: proofCopy.campaignId,
                kind: "text",
                value: campaign.campaignId,
              },
              { key: "node", label: proofCopy.linkNode, kind: "text", value: resolution.nodeId },
              {
                key: "parent",
                label: proofCopy.parentNode,
                kind: "text",
                value: resolution.parentNodeId,
              },
              {
                key: "created",
                label: proofCopy.linkCreation,
                kind: "tx",
                value: link.data?.createdTxHash ?? null,
              },
              { key: "policy", label: proofCopy.policyHash, kind: "hash", value: terms.policyHash },
              {
                key: "contract",
                label: proofCopy.contract,
                kind: "address",
                value: campaign.contractAddress,
              },
            ]}
          />
          <Disclosures lines={disclosureLines} />
          <div className="border-hairline flex flex-wrap items-center gap-2 border-t pt-4">
            <Button asChild variant="secondary" size="sm">
              <Link
                href={`${routeTo.campaign(campaign.campaignId)}?ref=${encodeURIComponent(code)}`}
              >
                {referralCopy.seeDetails}
              </Link>
            </Button>
            <ReportButton
              label={reportCopy.link}
              target={{ kind: "link", id: resolution.nodeId, name: campaign.product.title }}
              context={{ code }}
            />
          </div>
        </div>
      </div>
      <PhoneActionBar acts={acts} campaignId={campaign.campaignId} code={code} />
    </ProductPage>
  );
}
