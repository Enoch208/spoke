"use client";

import { useState } from "react";
import { ProductPage, QueryState, PageLink, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import { useClientQuery } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { formatAmount, formatDateTime } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { useSessionStore } from "@/lib/stores/session";
import { AccessPanel } from "./access-panel";

export function PurchasePage({ saleId, merchant = false }: { saleId: string; merchant?: boolean }) {
  const now = useNow();
  const receipt = useClientQuery(
    "receipts.get",
    { saleId, chainId: activeChain.id },
    { refetchInterval: 10_000 },
  );
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: receipt.data?.campaignId ?? "0" },
    { enabled: Boolean(receipt.data) },
  );
  const address = useSessionStore((state) => state.address);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const start = useChainAction();
  const data = receipt.data;
  const ready = data?.state === "PENDING" && now >= Date.parse(data.unlockAt);
  const canRefund =
    merchant &&
    address?.toLowerCase() === campaign.data?.merchant.address.toLowerCase() &&
    data?.state === "PENDING" &&
    !ready;
  return (
    <ProductPage
      title={campaign.data?.product.title ?? `Sale #${saleId}`}
      description={`Sale #${saleId} · ${campaign.data?.merchant.name ?? "Onchain purchase"}`}
      actions={
        <PageLink href={`/receipts/${String(activeChain.id)}/${saleId}`}>Public receipt</PageLink>
      }
    >
      <QueryState
        pending={receipt.isPending}
        error={receipt.error}
        retry={() => void receipt.refetch()}
      >
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Sale state" value={ready ? "Ready to finalize" : data.state} />
              <Stat label="Paid" value={formatAmount(BigInt(data.price), data.token)} />
              <Stat
                label="Hold ends"
                value={<span className="text-base">{formatDateTime(new Date(data.unlockAt))}</span>}
              />
            </div>
            <Card>
              <h2 className="font-display text-h4">Settlement</h2>
              <p className="text-body mt-3">
                {data.state === "REFUNDED"
                  ? "The merchant refunded this purchase. Reserved rewards returned to the campaign budget and product access is closed."
                  : data.state === "FINALIZED"
                    ? "This sale is finalized. The merchant’s proceeds and the paid path’s rewards became claimable."
                    : ready
                      ? "The hold has ended. Anyone can finalize this sale; finalization makes the merchant’s proceeds and distributor rewards claimable."
                      : "Purchase observed onchain. Rewards are reserved, not yet withdrawable. The merchant can refund this purchase until the hold ends."}
              </p>
              {ready ? (
                <Button
                  className="mt-4"
                  onClick={() => {
                    start("finalize", { saleId });
                  }}
                >
                  Finalize sale
                </Button>
              ) : null}
              {canRefund ? (
                <div className="mt-4">
                  {confirmRefund ? (
                    <div className="bg-pink-soft space-y-3 rounded-xl p-4">
                      <p>
                        Refund {formatAmount(BigInt(data.price), data.token)} in full? This returns
                        the buyer’s payment, releases the reserved reward and closes product access.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          onClick={() => {
                            start("refund", { saleId, price: data.price });
                            setConfirmRefund(false);
                          }}
                        >
                          Confirm full refund
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setConfirmRefund(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setConfirmRefund(true);
                      }}
                    >
                      Refund in full
                    </Button>
                  )}
                </div>
              ) : null}
            </Card>
            {!merchant ? <AccessPanel saleId={saleId} /> : null}
            {campaign.data && data.state !== "REFUNDED" ? (
              <Card>
                <h2 className="font-display text-h4">Share something you bought</h2>
                <p className="text-body mt-2">
                  Create your own link to this campaign. The merchant funds rewards from a separate
                  budget.
                </p>
                <div className="mt-4">
                  <PageLink href={`/c/${data.campaignId}`}>View sharing terms</PageLink>
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
