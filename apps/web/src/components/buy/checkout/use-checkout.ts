"use client";

import { useState } from "react";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { useCheckoutStore } from "@/lib/stores/checkout";
import { useSessionStore } from "@/lib/stores/session";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { lockedOrder, selectBlocked, selectPhase } from "./model";
import { splitMatches } from "./split";
import { useCheckoutActions } from "./use-checkout-actions";
import { useCheckoutEffects } from "./use-checkout-effects";
import { usePurchaseRecord } from "./use-purchase-record";
import { useReferralSource } from "./use-referral";

export type CheckoutSource = { campaignId: string; code: string | null; nodeId?: string };

export function useCheckout(source: CheckoutSource) {
  const { campaignId } = source;
  const { mode } = useClientContext();
  const now = useNow();
  const address = useSessionStore((state) => state.address);
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const draft = useCheckoutStore((state) => state.drafts[campaignId]);
  const [direct, setDirect] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { record, view } = usePurchaseRecord({
    campaignId,
    orderKey: activeKey ?? draft?.orderKey ?? null,
    mode,
    account: signedIn ? address : null,
  });
  const referral = useReferralSource({
    campaignId,
    code: source.code,
    nodeId: source.nodeId,
    draft,
    direct,
    lockedNodeId: record && lockedOrder(view) ? record.params.nodeId : null,
  });
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const buyer = signedIn && address ? { buyer: address } : {};
  const preview = useClientQuery(
    "checkout.preview",
    { campaignId, node: referral.nodeId, ...buyer },
    {
      enabled: Boolean(campaign.data) && !referral.resolving,
      staleTime: 0,
      refetchInterval: started && signedIn && view.kind === "none" ? 5_000 : false,
    },
  );
  const funding = useClientQuery(
    "funding.status",
    {},
    { enabled: signedIn, refetchInterval: started ? 5_000 : false },
  );
  const ancestry = useClientQuery(
    "graph.ancestry",
    { nodeId: referral.nodeId, chainId: activeChain.id },
    { enabled: referral.nodeId !== "0" && referral.check === "ok" },
  );
  const intent = useClientQuery(
    "checkout.getIntent",
    { id: draft?.intentId ?? "" },
    {
      enabled: signedIn && Boolean(draft?.intentId) && view.kind === "none",
      staleTime: 0,
    },
  );
  const data = campaign.data;
  const quote = preview.data;
  const price = data ? BigInt(data.price) : 0n;
  const tokenBalance = quote?.buyer ? BigInt(quote.buyer.tokenBalance) : null;
  const monWei = funding.data
    ? BigInt(funding.data.monWei)
    : quote?.buyer
      ? BigInt(quote.buyer.monWei)
      : null;
  const tokenReady = tokenBalance !== null && tokenBalance >= price;
  const monReady = funding.data?.covers ? funding.data.covers.purchase : (monWei ?? 0n) > 0n;
  const fundsReady = tokenReady && monReady;
  const resumedSale = view.kind === "none" ? (intent.data?.saleId ?? null) : null;
  const effectiveView = resumedSale
    ? { kind: "done" as const, saleId: resumedSale, indexed: true }
    : view;
  const blocked = data
    ? selectBlocked({
        campaign: data,
        preview: quote,
        referral: referral.check,
        splitMatches: quote ? splitMatches(quote, data.policy) : true,
        now,
      })
    : null;
  const phase = selectPhase({ started, signedIn, fundsReady, record: effectiveView });
  const actions = useCheckoutActions({
    campaignId,
    nodeId: referral.nodeId,
    record,
    view: effectiveView,
    reviewed: quote,
    product: data ? { title: data.product.title, merchant: data.merchant.name } : null,
    signedIn,
    fundsReady,
    onStart: setStarted,
    onKey: setActiveKey,
    onDirect: () => {
      setDirect(true);
    },
    refetchPreview: () => preview.refetch(),
  });
  useCheckoutEffects({ campaignId, view: effectiveView, mode });
  return {
    mode,
    now,
    signedIn,
    address,
    campaign,
    preview,
    funding,
    referral,
    ancestry: ancestry.data,
    draft,
    record,
    view: effectiveView,
    resumed: resumedSale !== null,
    blocked: effectiveView.kind === "none" || effectiveView.kind === "stopped" ? blocked : null,
    phase,
    price,
    tokenBalance,
    monWei,
    tokenReady,
    monReady,
    ...actions,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
