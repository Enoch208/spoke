"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { referralCopy } from "../copy/referral";
import { actorName } from "../shared/actor";
import { Callout } from "../shared/callout";
import { useUrlParams } from "../shared/use-url-params";
import type { Referral } from "./use-campaign-viewer";

export function useCampaignReferral(campaignId: string) {
  const { params, set } = useUrlParams();
  const code = params.get("ref");
  const resolution = useClientQuery(
    "links.resolveCode",
    { code: code ?? "" },
    { enabled: Boolean(code) },
  );
  const data = code ? resolution.data : undefined;
  const valid = data?.status === "ok" && data.campaignId === campaignId;
  const referral: Referral | null =
    valid && code ? { code, nodeId: data.nodeId, ownerAddress: data.owner.address } : null;
  return {
    code,
    data,
    referral,
    resolving: Boolean(code) && resolution.isPending,
    clear: () => {
      set({ ref: null }, "replace");
    },
  };
}

type ReferralState = ReturnType<typeof useCampaignReferral>;

function OtherCampaignNotice({ state }: { state: ReferralState }) {
  const other = useClientQuery(
    "campaigns.get",
    { campaignId: state.data?.campaignId ?? "0" },
    { enabled: Boolean(state.data) },
  );
  const product = other.data?.product.title ?? "";
  return (
    <Callout
      tone="info"
      actions={
        <>
          {state.code ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={routeTo.referral(state.code)}>
                {fill(referralCopy.openOther, { product })}
              </Link>
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={state.clear}>
            {referralCopy.stayHere}
          </Button>
        </>
      }
    >
      {fill(referralCopy.otherCampaign, { product })}
    </Callout>
  );
}

export function ReferralNotice({ state, self }: { state: ReferralState; self: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const data = state.data;
  if (!state.code || !data) return null;
  if (state.referral) {
    const sharer = actorName(data.owner, { self, fallback: referralCopy.fallbackSharer });
    return (
      <div className="bg-pill flex flex-col gap-3 rounded-3xl px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar seed={data.owner.handle ?? data.nodeId} name={sharer} size="sm" />
          <p className="text-body min-w-0 text-sm">
            <span className="text-ink font-medium">{fill(referralCopy.strip, { sharer })}</span>
            {" · "}
            {confirming
              ? fill(referralCopy.removeConfirm, { sharer })
              : fill(referralCopy.stripEarn, { sharer })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {confirming ? (
            <>
              <Button size="sm" variant="secondary" onClick={state.clear}>
                {referralCopy.remove}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {referralCopy.keep}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirming(true);
              }}
            >
              {referralCopy.change}
            </Button>
          )}
        </div>
      </div>
    );
  }
  if (data.status === "ok") return <OtherCampaignNotice state={state} />;
  return (
    <Callout
      tone="caution"
      actions={
        <Button size="sm" variant="ghost" onClick={state.clear}>
          {referralCopy.dismiss}
        </Button>
      }
    >
      {data.status === "unknown" ? referralCopy.invalid : referralCopy.expired}
    </Callout>
  );
}
