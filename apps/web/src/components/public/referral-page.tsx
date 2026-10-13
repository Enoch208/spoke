"use client";

import { Suspense } from "react";
import { PageSkeleton, QueryState } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { CampaignNotFound } from "./campaign/campaign-states";
import { referralCopy } from "./copy/referral";
import { DemoLinkInLive, LiveLinkInDemo, useIdentifierMatch } from "./shared/demo-link";
import { DeadReferral } from "./referral/referral-states";
import { ReferralView } from "./referral/referral-view";

function ReferralLoader({ code }: { code: string }) {
  const resolution = useClientQuery("links.resolveCode", { code });
  const data = resolution.data;
  const live = data?.status === "ok";
  const campaignId = live ? data.campaignId : "0";
  const campaign = useClientQuery("campaigns.get", { campaignId }, { enabled: live });
  const policy = useClientQuery("campaigns.policy", { campaignId }, { enabled: live });
  if (data && data.status !== "ok") return <DeadReferral status={data.status} />;
  if (campaign.error?.code === "NOT_FOUND") return <CampaignNotFound />;
  return (
    <QueryState
      pending={resolution.isPending || (live && campaign.isPending)}
      error={resolution.error ?? campaign.error}
      retry={() => {
        void resolution.refetch();
        void campaign.refetch();
      }}
    >
      {data && campaign.data ? (
        <ReferralView
          code={code}
          resolution={data}
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

function ReferralRoute({ code }: { code: string }) {
  const match = useIdentifierMatch(code);
  if (match === "pending") return <PageSkeleton />;
  if (match === "demoInLive") return <DemoLinkInLive />;
  if (match === "liveInDemo")
    return <LiveLinkInDemo title={referralCopy.unknownTitle} body={referralCopy.unknownBody} />;
  return <ReferralLoader code={code} />;
}

export function ReferralPage({ code }: { code: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReferralRoute code={code} />
    </Suspense>
  );
}
