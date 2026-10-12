"use client";

import { useEffect } from "react";
import { CampaignPage } from "./campaign-page";
import { ProductPage, QueryState } from "@/components/product/page";
import { useClientQuery, useClientMutation } from "@/lib/query/use-client";

export function ReferralPage({ code }: { code: string }) {
  const referral = useClientQuery("links.resolveCode", { code });
  const { mutate } = useClientMutation("links.recordOpen", []);
  useEffect(() => {
    mutate({ code });
  }, [code, mutate]);
  if (referral.data?.status === "ok")
    return (
      <CampaignPage
        campaignId={referral.data.campaignId}
        parentNodeId={referral.data.nodeId}
        code={code}
      />
    );
  return (
    <ProductPage title="Shared campaign">
      <QueryState
        pending={referral.isPending}
        error={referral.error}
        retry={() => void referral.refetch()}
      >
        <p>
          This referral link is {referral.data?.status ?? "unavailable"}. Check the link with the
          person who shared it.
        </p>
      </QueryState>
    </ProductPage>
  );
}
