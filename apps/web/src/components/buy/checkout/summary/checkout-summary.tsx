"use client";

import { formatPerson } from "@/lib/format";
import { checkoutCopy } from "../../copy/checkout";
import type { Checkout } from "../use-checkout";
import { ProductCard, ProductRow } from "./product";
import { ReferralBlock } from "./referral";
import { ProofDetails, SettlementBlock } from "./terms";
import { WhoEarns } from "./who-earns";

export const referrerOf = (checkout: Checkout): string | null => {
  if (checkout.referral.nodeId === "0") return null;
  const owner = checkout.referral.owner ?? checkout.preview.data?.recipients[0]?.creator ?? null;
  return owner ? formatPerson(owner) : checkoutCopy.aLink;
};

export function CheckoutSummary({
  checkout,
  compact,
  onNotThisPerson,
}: {
  checkout: Checkout;
  compact: boolean;
  onNotThisPerson: () => void;
}) {
  const campaign = checkout.campaign.data;
  if (!campaign) return null;
  const demo = checkout.mode === "demo";
  const preview = checkout.preview.data;
  const referrer = referrerOf(checkout);
  const locked = checkout.view.kind === "active" || checkout.view.kind === "confirming";
  const canDrop =
    referrer !== null &&
    !locked &&
    checkout.phase !== "done" &&
    checkout.blocked !== "alreadyBought" &&
    checkout.blocked !== "merchant";
  return (
    <div className="flex flex-col gap-4">
      {compact ? (
        <div className="flex flex-col gap-2">
          <ProductRow campaign={campaign} demo={demo} />
          <p className="text-subtle text-sm">{checkoutCopy.demoToken}</p>
        </div>
      ) : (
        <ProductCard campaign={campaign} demo={demo} />
      )}
      <ReferralBlock
        referrer={referrer}
        seed={checkout.referral.owner?.address ?? checkout.referral.nodeId}
        rememberedAt={checkout.referral.rememberedAt}
        compact={compact}
        onNotThisPerson={canDrop ? onNotThisPerson : null}
      />
      {preview ? (
        <WhoEarns
          campaign={campaign}
          preview={preview}
          nodeId={checkout.referral.nodeId}
          chainLength={checkout.ancestry?.nodes.length ?? null}
          referrer={referrer}
          collapsible={compact}
        />
      ) : null}
      <SettlementBlock
        holdSeconds={preview?.holdSeconds ?? campaign.policy.holdSeconds}
        refundPolicy={preview?.refundPolicy ?? campaign.product.refundPolicy}
        collapsible={compact}
      />
      <ProofDetails
        campaign={campaign}
        preview={preview}
        nodeId={checkout.referral.nodeId}
        orderKey={checkout.record?.params.orderKey ?? checkout.draft?.orderKey ?? null}
        demo={demo}
      />
    </div>
  );
}
