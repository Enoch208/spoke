"use client";

import Link from "next/link";
import { TxHash } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue } from "@/components/ui/key-value";
import { SaleStateChip } from "@/components/product/state-chips";
import { useClientContext } from "@/lib/client/provider";
import { computeReward } from "@spoke/protocol";
import { fill, required } from "@/lib/copy";
import { formatAmount, formatBps, formatDateTime, formatRelative, shortHash } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { DialogError, DialogSkeleton } from "@/components/earn/shared/dialog-states";
import { graphCopy, salePanelCopy } from "./copy";
import { SalePathTable } from "./sale-path-table";
import { useSelf } from "./use-self";

export function SalePanel({
  saleId,
  heading = true,
  showInNetwork = false,
  onNavigate,
}: {
  saleId: string;
  heading?: boolean;
  showInNetwork?: boolean;
  onNavigate?: () => void;
}) {
  const navigate = () => onNavigate?.();
  const { mode } = useClientContext();
  const now = useNow();
  const self = useSelf();
  const open = useUiStore((state) => state.open);
  const input = { saleId, chainId: activeChain.id };
  const receipt = useClientQuery("receipts.get", input);
  const path = useClientQuery("graph.salePath", input);
  const campaignId = receipt.data?.campaignId ?? "0";
  const ready = Boolean(receipt.data);
  const campaign = useClientQuery("campaigns.get", { campaignId }, { enabled: ready });
  const policies = useClientQuery("campaigns.policy", { campaignId }, { enabled: ready });
  if (receipt.isPending || path.isPending) return <DialogSkeleton />;
  const error = receipt.error ?? path.error;
  if (error)
    return (
      <DialogError
        error={error}
        retry={() => {
          void receipt.refetch();
          void path.refetch();
        }}
      />
    );
  const sale = receipt.data;
  const route = path.data;
  if (!sale || !route) return null;
  const version =
    policies.data?.history.find((item) => item.version === sale.policyVersion) ??
    policies.data?.current;
  const unlockAt = Date.parse(sale.unlockAt);
  const mature = sale.state === "PENDING" && now >= unlockAt;
  const mine = sale.allocations.find((allocation) => self.isSelfActor(allocation.recipient));
  const onPath = route.nodes.some((entry) => self.isSelf(entry.nodeId, entry.creator));
  const reward = version
    ? computeReward(BigInt(sale.price), version.commissionBps, BigInt(version.perSaleCap))
    : BigInt(sale.rewardReserved);
  const pct =
    version?.commissionBps ??
    (sale.price === "0" ? 0 : Number((reward * 10_000n) / BigInt(sale.price)));
  const message =
    sale.state === "PENDING"
      ? `${required.pendingSale} ${fill(required.pendingHold, { unlockAt: formatDateTime(new Date(unlockAt)) })}`
      : sale.state === "FINALIZED"
        ? required.finalized
        : required.refunded;
  const evidence = [
    { key: "purchase", label: salePanelCopy.purchaseTx, tx: sale.purchaseTx },
    { key: "finalize", label: salePanelCopy.finalizeTx, tx: sale.finalizeTx },
    { key: "refund", label: salePanelCopy.refundTx, tx: sale.refundTx },
  ].filter((item) => item.tx !== null);

  return (
    <div className="grid gap-5">
      {heading ? (
        <header className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-h4 text-ink font-medium">
              {fill(salePanelCopy.title, { saleId })}
            </h2>
            <SaleStateChip status={sale.state} unlockAt={sale.unlockAt} />
          </div>
          <p className="text-subtle text-sm">
            {campaign.data?.product.title ?? ""} ·{" "}
            {formatRelative(new Date(sale.purchasedAt), { now: new Date(now) })}
          </p>
        </header>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <SaleStateChip status={sale.state} unlockAt={sale.unlockAt} />
          <span className="text-subtle text-sm">
            {campaign.data?.product.title ?? ""} ·{" "}
            {formatRelative(new Date(sale.purchasedAt), { now: new Date(now) })}
          </span>
        </div>
      )}
      <p className="text-body font-mono text-sm tabular-nums">
        {fill(salePanelCopy.summary, {
          price: formatAmount(BigInt(sale.price), sale.token, { testnet: true }),
          reward: formatAmount(reward, sale.token),
          pct: formatBps(pct),
          version: String(sale.policyVersion),
        })}
      </p>
      <p className="bg-soft text-body rounded-xl px-4 py-3 text-sm">{message}</p>
      {!onPath && self.signedIn && self.nodeIds.size > 0 ? (
        <p className="text-subtle text-sm">{salePanelCopy.notOnPath}</p>
      ) : null}
      <SalePathTable
        saleId={saleId}
        entries={route.nodes}
        token={sale.token}
        reward={reward}
        maxLevels={version?.maxRewardedAncestors ?? route.nodes.length}
        shortPathMode={version?.shortPathMode ?? null}
        isSelf={(entry) => self.isSelf(entry.nodeId, entry.creator)}
      />
      <p className="text-subtle text-xs">{graphCopy.pathNote}</p>
      <KeyValue
        items={[
          {
            key: "hash",
            label: salePanelCopy.policyHash,
            value: shortHash(route.policyHash),
            mono: true,
            action: (
              <CopyButton
                value={route.policyHash}
                label={salePanelCopy.copyHash}
                copiedMessage={salePanelCopy.hashCopied}
              />
            ),
          },
          ...evidence.map((item) => ({
            key: item.key,
            label: item.label,
            value: (
              <TxHash
                hash={item.tx?.hash ?? null}
                chainId={activeChain.id}
                demo={mode === "demo"}
              />
            ),
          })),
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {mature ? (
          <Button size="sm" onClick={() => open("M-20", { saleIds: [saleId] })}>
            {salePanelCopy.finalize}
          </Button>
        ) : null}
        {mine?.state === "claimable" ? (
          <Button
            size="sm"
            onClick={() => open("M-21", { source: "REWARD", token: sale.token.address })}
          >
            {fill(salePanelCopy.claim, { amount: formatAmount(BigInt(mine.amount), sale.token) })}
          </Button>
        ) : null}
        <Button asChild size="sm" variant="secondary">
          <Link href={receiptHref(saleId, activeChain.id)} onClick={navigate}>
            {salePanelCopy.viewReceipt}
          </Link>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            open("M-45", { chainId: mode === "demo" ? "demo" : activeChain.id, saleId })
          }
        >
          {salePanelCopy.viewProof}
        </Button>
        {showInNetwork ? (
          <Button asChild size="sm" variant="secondary">
            <Link
              href={`${routes.earn.network}?campaign=${encodeURIComponent(sale.campaignId)}&sale=${encodeURIComponent(saleId)}`}
              onClick={navigate}
            >
              {salePanelCopy.showInNetwork}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
