"use client";

import { useClientContext } from "@/lib/client/provider";
import { formatHoldPhrase } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSpokeClient } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { useCheckoutStore } from "@/lib/stores/checkout";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { formatAmount, formatBps, formatPerson } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { FundsPanel } from "./funds-panel";
import { BannerStack } from "../app/banners";

export function CheckoutPage({ campaignId }: { campaignId: string }) {
  const { mode } = useClientContext();
  const params = useSearchParams();
  const code = params.get("ref");
  const [direct, setDirect] = useState(false);
  const referral = useClientQuery(
    "links.resolveCode",
    { code: code ?? "" },
    { enabled: Boolean(code) && !direct },
  );
  const matchingReferral = referral.data?.campaignId === campaignId;
  const node = direct ? "0" : (referral.data?.nodeId ?? "0");
  const address = useSessionStore((state) => state.address);
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const preview = useClientQuery(
    "checkout.preview",
    { campaignId, node, ...(address ? { buyer: address } : {}) },
    {
      enabled: !code || direct || (referral.data?.status === "ok" && matchingReferral),
      staleTime: 0,
    },
  );
  const client = useSpokeClient();
  const start = useChainAction();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buy = async () => {
    if (!signedIn) {
      useUiStore.getState().open("M-01", {
        reason: "buy",
        returnTo: `/checkout/${campaignId}${code ? `?ref=${encodeURIComponent(code)}` : ""}`,
      });
      return;
    }
    if (!client || !campaign.data) return;
    setBusy(true);
    setError(null);
    try {
      if (code && !direct && !matchingReferral)
        throw new Error(
          "This referral belongs to another campaign. Open the shared link again or buy directly.",
        );
      const fresh = await client.call("checkout.preview", {
        campaignId,
        node,
        ...(address ? { buyer: address } : {}),
      });
      if (fresh.blocking) throw new Error(fresh.blocking.contractError ?? fresh.blocking.code);
      const draft = useCheckoutStore.getState().startDraft(campaignId, node);
      const intent = await client.call("checkout.createIntent", {
        campaignId,
        nodeId: node,
        orderKey: draft.orderKey,
        expectedPrice: fresh.price,
        expectedReward: fresh.rewardTotal,
        policyHash: fresh.policyHash,
        chainId: activeChain.id,
      });
      useCheckoutStore.getState().updateDraft(campaignId, { intentId: intent.id, step: "pay" });
      start("purchase", {
        campaignId,
        nodeId: node,
        orderKey: draft.orderKey,
        price: fresh.price,
        productTitle: campaign.data.product.title,
        merchantName: campaign.data.merchant.name,
        intentId: intent.id,
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Your purchase could not be prepared. No payment has been sent.",
      );
    } finally {
      setBusy(false);
    }
  };
  const data = campaign.data;
  const quote = preview.data;
  return (
    <>
      <BannerStack surface="public" />
      <ProductPage
        title="Checkout"
        description="Review your purchase and the people who earn from it."
        actions={<PageLink href={`/c/${campaignId}`}>Back to campaign</PageLink>}
      >
        <QueryState
          pending={campaign.isPending}
          error={campaign.error}
          retry={() => void campaign.refetch()}
        >
          {data ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="min-w-0 space-y-4">
                <Card>
                  <p className="text-subtle text-sm">{data.merchant.name}</p>
                  <h2 className="font-display text-h4 mt-2">{data.product.title}</h2>
                  <p className="text-body mt-3">{data.product.summary}</p>
                  <p className="text-subtle mt-3 text-sm">
                    What you get:{" "}
                    {data.product.fulfillmentMode === "download"
                      ? "Digital download"
                      : data.product.fulfillmentMode === "external"
                        ? "Access to the merchant’s product"
                        : "Delivery arranged by the merchant"}
                  </p>
                  <p className="text-subtle mt-5">You pay</p>
                  <p className="font-mono text-h3 break-words">
                    {formatAmount(BigInt(data.price), data.token, { testnet: true })}
                  </p>
                  <p className="text-subtle mt-2 text-sm">
                    Plus a network fee in testnet MON. Testnet demonstration token. No cash value
                    and no guarantee of redemption.
                  </p>
                </Card>
                <Card className="bg-lilac-soft">
                  <h2 className="font-medium">Who earns from this purchase</h2>
                  <p className="text-body mt-2 text-sm">
                    {node === "0"
                      ? "No referral. Nobody earns a reward from this purchase, and your price is the same either way."
                      : "The link owner may earn a reward if you buy. The merchant pays rewards from a separate budget; your price is the same with or without a referral."}
                  </p>
                  {quote?.recipients.map((recipient, index) => (
                    <div
                      key={recipient.nodeId}
                      className="border-hairline mt-3 flex flex-wrap justify-between gap-2 border-t pt-3 text-sm"
                    >
                      <span>
                        Level {index + 1} · {formatPerson(recipient.creator)}
                      </span>
                      <span className="font-mono">
                        {formatBps(recipient.effectiveWeightBps)} ·{" "}
                        {formatAmount(BigInt(recipient.amount), data.token)}
                      </span>
                    </div>
                  ))}
                  <p className="text-subtle mt-4 text-sm">
                    Attribution follows link ancestry. It isn’t a claim about who influenced you.
                  </p>
                  {node !== "0" ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDirect(true);
                      }}
                    >
                      Buy without a referral
                    </Button>
                  ) : null}
                </Card>
                <Card>
                  <h2 className="font-medium">Settlement and refunds</h2>
                  <p className="text-body mt-2 text-sm">
                    This purchase has{" "}
                    {formatHoldPhrase(quote?.holdSeconds ?? data.policy.holdSeconds)}. Until it
                    ends, the merchant can refund you in full. After that the sale is final and
                    can’t be refunded through Spoke. Refunds are sent by the merchant; Spoke can’t
                    send them for you.
                  </p>
                  <p className="text-body mt-3 text-sm">{data.product.refundPolicy}</p>
                  <p className="text-subtle mt-4 text-sm">
                    Your wallet address, this purchase and the paid path are public on Monad
                    Testnet. No name or email is recorded onchain.
                  </p>
                </Card>
              </div>
              <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
                {signedIn ? (
                  <FundsPanel />
                ) : (
                  <Card>
                    <h2 className="font-display text-h4">Sign in to pay</h2>
                    <p className="text-body mt-2">
                      Create an account with a passkey, or use a wallet you already have. Spoke
                      never holds your money; you sign every payment.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() =>
                        useUiStore.getState().open("M-01", {
                          reason: "buy",
                          returnTo: `/checkout/${campaignId}${code ? `?ref=${encodeURIComponent(code)}` : ""}`,
                        })
                      }
                    >
                      Continue with passkey or wallet
                    </Button>
                  </Card>
                )}
                <Card>
                  {code && (referral.data?.status !== "ok" || !matchingReferral) && !direct ? (
                    <p className="text-pink-ink mb-3">
                      {referral.error?.message ??
                        (referral.data && !matchingReferral
                          ? "This referral belongs to a different campaign."
                          : "Checking this referral link…")}
                    </p>
                  ) : null}
                  {quote?.blocking ? (
                    <div className="bg-amber-soft mb-4 rounded-xl p-3">
                      <p>{quote.blocking.contractError ?? quote.blocking.code}</p>
                      {quote.directPurchaseAvailable ? (
                        <Button
                          className="mt-3 h-auto! min-h-10 max-w-full py-2 whitespace-normal!"
                          variant="secondary"
                          onClick={() => {
                            setDirect(true);
                          }}
                        >
                          Buy directly · nobody earns commission
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {quote?.buyer?.alreadyPurchasedSaleId ? (
                    <PageLink href={`/purchases/${quote.buyer.alreadyPurchasedSaleId}`}>
                      View your existing purchase
                    </PageLink>
                  ) : (
                    <Button
                      block
                      loading={busy}
                      disabled={!quote || Boolean(quote.blocking)}
                      onClick={() => void buy()}
                    >
                      Buy for {formatAmount(BigInt(data.price), data.token)}
                    </Button>
                  )}
                  {error ? (
                    <p role="alert" className="text-pink-ink mt-3 text-sm">
                      {error}
                    </p>
                  ) : null}
                  {preview.error ? (
                    <p className="text-pink-ink mt-3 text-sm">{preview.error.message}</p>
                  ) : null}
                  <p className="text-subtle mt-4 text-xs">
                    By buying you agree to the merchant’s refund policy and Spoke’s{" "}
                    <Link href="/legal/disclosures" className="underline">
                      disclosures
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/terms" className="underline">
                      terms
                    </Link>
                    .
                  </p>
                  {quote && mode !== "demo" ? (
                    <p className="text-subtle mt-3 text-xs">
                      Preview read at block {quote.blockNumber} · Policy version{" "}
                      {quote.policyVersion}
                    </p>
                  ) : null}
                </Card>
              </div>
            </div>
          ) : null}
        </QueryState>
      </ProductPage>
    </>
  );
}
