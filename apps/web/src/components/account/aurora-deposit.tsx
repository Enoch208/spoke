"use client";

import { formatUnits } from "viem";
import type { ClientOutput } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { PageLink } from "@/components/product/page";
import { useNow } from "@/lib/use-now";
import { fundingStates } from "./aurora-model";

export function AuroraDeposit({
  deposit,
  refreshing,
  refresh,
  statusUnavailable = false,
}: {
  deposit: ClientOutput<"funding.auroraDeposit">;
  refreshing: boolean;
  refresh: () => void;
  statusUnavailable?: boolean;
}) {
  const now = useNow();
  const expired = Date.parse(deposit.deadline) <= now;
  const waiting = deposit.state === "PENDING_DEPOSIT";
  const verified = deposit.confirmation.state === "verified";
  return (
    <Card className="space-y-5">
      <div role="status" aria-live="polite">
        <h2 className="font-display text-h4 text-ink">
          {verified
            ? "USDC received · verified on Monad"
            : waiting && expired
              ? "Deposit instructions expired"
              : fundingStates[deposit.state]}
        </h2>
        <p className="text-subtle mt-2 text-sm">
          Aurora provides the funding status. Spoke verifies the USDC transfer on Monad Mainnet
          before showing it as received.
        </p>
      </div>
      {statusUnavailable || !deposit.statusAvailable ? (
        <p role="alert">
          Current provider status is unavailable. Your saved details are below. Refresh before
          sending funds.
        </p>
      ) : null}
      {waiting && !expired && deposit.statusAvailable && !statusUnavailable ? (
        <div className="space-y-3">
          <p>
            Send exactly{" "}
            <strong>
              {formatUnits(BigInt(deposit.amountIn), deposit.source.decimals)}{" "}
              {deposit.source.symbol}
            </strong>{" "}
            on <strong>{deposit.source.networkName}</strong> to this deposit address:
          </p>
          <CopyField
            value={deposit.depositAddress}
            label="Copy deposit address"
            copiedMessage="Deposit address copied"
          />
          <p className="text-subtle text-sm">
            Use your source wallet to make the transfer. This page never signs or sends it for you.
          </p>
          {deposit.source.contractAddress ? (
            <p className="text-subtle text-sm break-all">
              Source token contract: {deposit.source.contractAddress}
            </p>
          ) : null}
        </div>
      ) : null}
      {expired && waiting ? (
        <p>
          These instructions are past their deadline. Do not send funds to this address. If you
          already sent funds, keep this page open while Aurora reconciles the transfer.
        </p>
      ) : null}
      {deposit.state === "INCOMPLETE_DEPOSIT" || deposit.state === "FAILED" ? (
        <p>Check the existing deposit and its refund status before creating another transfer.</p>
      ) : null}
      {deposit.state === "SUCCESS" && !verified ? (
        <p>
          The provider reports success. Chain verification is{" "}
          {deposit.confirmation.state === "unavailable" ? "temporarily unavailable" : "pending"};
          the funding has not been marked as received.
        </p>
      ) : null}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-subtle">Receive at least</dt>
          <dd className="font-mono mt-1">
            {formatUnits(BigInt(deposit.minAmountOut), 6)} USDC · Monad Mainnet
          </dd>
        </div>
        <div>
          <dt className="text-subtle">Destination wallet</dt>
          <dd className="font-mono mt-1 break-all">{deposit.recipient}</dd>
        </div>
        <div>
          <dt className="text-subtle">Refund address · {deposit.source.networkName}</dt>
          <dd className="font-mono mt-1 break-all">{deposit.refundAddress}</dd>
        </div>
        <div>
          <dt className="text-subtle">Deposit deadline</dt>
          <dd className="mt-1">
            <time dateTime={deposit.deadline}>{new Date(deposit.deadline).toLocaleString()}</time>
          </dd>
        </div>
        <div>
          <dt className="text-subtle">Network and provider fees</dt>
          <dd className="mt-1">
            Included in the quoted output. Your source wallet may charge an additional network fee.
          </dd>
        </div>
        <div>
          <dt className="text-subtle">Refund fee</dt>
          <dd className="mt-1">
            {deposit.refundFee === null
              ? "Not supplied by Aurora"
              : `${formatUnits(BigInt(deposit.refundFee), deposit.source.decimals)} ${deposit.source.symbol}`}
          </dd>
        </div>
      </dl>
      {deposit.confirmation.txHash ? (
        <a
          className="text-ink underline"
          href={`https://monadvision.com/tx/${deposit.confirmation.txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View verified transfer
        </a>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={refresh} loading={refreshing}>
          Refresh status
        </Button>
        <PageLink href="/wallet/fund">Start another funding request</PageLink>
      </div>
      <p className="text-subtle text-xs break-all">
        Saved deposit reference: {deposit.id}. This page URL restores the record after a reload.
      </p>
    </Card>
  );
}
