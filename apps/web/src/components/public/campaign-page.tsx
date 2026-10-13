"use client";

import type { CampaignDetail, ClientOutput } from "@spoke/protocol";
import { Suspense, useEffect, useRef } from "react";
import { CampaignArt } from "@/components/product/campaign-art";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { fill } from "@/lib/copy";
import { formatBps, pluralize } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { AboutSection } from "./campaign/about-section";
import { ActionCard } from "./campaign/action-card";
import { availabilityKey } from "./campaign/availability";
import { BudgetSection } from "./campaign/budget-section";
import { CampaignProof } from "./campaign/campaign-proof";
import { CampaignNotFound } from "./campaign/campaign-states";
import { CampaignFooterLinks } from "./campaign/footer-links";
import { MerchantSection } from "./campaign/merchant-section";
import { NetworkSection } from "./campaign/network-section";
import { PhoneActionBar } from "./campaign/phone-bar";
import { ReferralNotice, useCampaignReferral } from "./campaign/referral-strip";
import { RewardSplit } from "./campaign/reward-split";
import { TermsSection } from "./campaign/terms-section";
import { useCampaignActions } from "./campaign/use-campaign-actions";
import { useCampaignViewer } from "./campaign/use-campaign-viewer";
import { campaignCopy } from "./copy/campaign";
import { disclosureCopy } from "./copy/disclosures";
import { DemoLinkInLive, LiveLinkInDemo, useIdentifierMatch } from "./shared/demo-link";
import { Disclosures } from "./shared/disclosures";
import { rewardAtPrice } from "./shared/policy-math";
import { useUrlParams } from "./shared/use-url-params";

type PolicyQuery = {
  data: ClientOutput<"campaigns.policy"> | undefined;
  failed: boolean;
  retry: () => void;
};

function useCategoryName(id: string) {
  const categories = useClientQuery("products.categories", {});
  return categories.data?.find((category) => category.id === id)?.name ?? id;
}

function CampaignView({ campaign, policy }: { campaign: CampaignDetail; policy: PolicyQuery }) {
  const now = useNow();
  const { params, set } = useUrlParams();
  const referralState = useCampaignReferral(campaign.campaignId);
  const referral = referralState.referral;
  const viewer = useCampaignViewer(campaign, referral);
  const terms = policy.data?.current ?? campaign.policy;
  const availability = availabilityKey(campaign, terms, now);
  const { acts, notes } = useCampaignActions({
    campaign,
    availability,
    referral,
    viewer,
    termsReady: !policy.failed,
  });
  const category = useCategoryName(campaign.product.category);
  const wantsJoin = params.get("intent") === "join" && viewer.known;
  const createAct = acts.find((act) => act.id === "create");
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !wantsJoin) return;
    if (!createAct || createAct.kind !== "button" || !createAct.onClick) return;
    resumed.current = true;
    set({ intent: null }, "replace");
    createAct.onClick();
  }, [wantsJoin, createAct, set]);
  const code = referral?.code ?? null;
  const image = campaign.product.media.find((asset) => asset.kind === "image")?.url;
  const disclosureLines = [
    fill(disclosureCopy.affiliateCampaign, {
      merchant: campaign.merchant.name,
      rate: formatBps(terms.commissionBps),
      people: pluralize(terms.maxRewardedAncestors, "person", "people"),
    }),
    disclosureCopy.testnet,
    disclosureCopy.attribution,
    disclosureCopy.earnings,
  ];
  return (
    <ProductPage
      title={campaign.product.title}
      description={campaign.product.summary}
      breadcrumbs={[
        { label: campaignCopy.explore, href: routes.explore },
        {
          label: category,
          href: `${routes.explore}?category=${encodeURIComponent(campaign.product.category)}`,
        },
      ]}
    >
      <ReferralNotice state={referralState} self={viewer.self} />
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
        <aside className="lg:col-span-5 lg:row-span-2">
          <div className="lg:sticky lg:top-24">
            <ActionCard
              campaign={campaign}
              policy={policy.data}
              availability={availability}
              viewer={viewer}
              acts={acts}
              notes={notes}
              now={now}
              code={code}
              termsFailed={policy.failed}
              retryTerms={policy.retry}
            />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <RewardSplit
            price={BigInt(campaign.price)}
            policy={terms}
            token={campaign.token}
            merchant={campaign.merchant.name}
          />
          <BudgetSection
            campaign={campaign}
            reward={rewardAtPrice(BigInt(campaign.price), terms)}
          />
          <AboutSection campaign={campaign} />
          <MerchantSection slug={campaign.merchant.slug} campaignId={campaign.campaignId} />
          <NetworkSection campaignId={campaign.campaignId} self={viewer.self} />
          {policy.data ? <TermsSection campaign={campaign} policy={policy.data} /> : null}
          <CampaignProof campaign={campaign} policy={policy.data} />
          <Disclosures lines={disclosureLines} />
          <CampaignFooterLinks
            campaignId={campaign.campaignId}
            title={campaign.product.title}
            linkNodeId={viewer.linkNodeId}
          />
        </div>
      </div>
      <PhoneActionBar acts={acts} campaignId={campaign.campaignId} code={code} />
    </ProductPage>
  );
}

function CampaignLoader({ campaignId }: { campaignId: string }) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const policy = useClientQuery("campaigns.policy", { campaignId });
  const code = campaign.error?.code;
  if (code === "NOT_FOUND" || code === "VALIDATION_FAILED") return <CampaignNotFound />;
  return (
    <QueryState
      pending={campaign.isPending}
      error={campaign.error}
      retry={() => void campaign.refetch()}
    >
      {campaign.data ? (
        <CampaignView
          campaign={campaign.data}
          policy={{
            data: policy.data,
            failed: policy.isError,
            retry: () => void policy.refetch(),
          }}
        />
      ) : null}
    </QueryState>
  );
}

function CampaignRoute({ campaignId }: { campaignId: string }) {
  const match = useIdentifierMatch(campaignId);
  if (match === "pending") return <PageSkeleton />;
  if (match === "demoInLive") return <DemoLinkInLive />;
  if (match === "liveInDemo")
    return <LiveLinkInDemo title={campaignCopy.notFound.title} body={campaignCopy.notFound.body} />;
  return <CampaignLoader campaignId={campaignId} />;
}

export function CampaignPage({ campaignId }: { campaignId: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CampaignRoute campaignId={campaignId} />
    </Suspense>
  );
}
