"use client";

import { useRef, useState } from "react";
import { formatUnits } from "viem";
import type { ClientOutput } from "@spoke/protocol";
import { useRouter } from "next/navigation";
import { useClientMutation } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fundingInput } from "./aurora-model";

export function AuroraForm({
  config,
  address,
}: {
  config: ClientOutput<"funding.auroraConfig">;
  address: string;
}) {
  const router = useRouter();
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState("");
  const [refund, setRefund] = useState(address);
  const [slippage, setSlippage] = useState("50");
  const [accepted, setAccepted] = useState(false);
  const requestId = useRef<string | null>(null);
  const preview = useClientMutation("funding.auroraPreview", []);
  const create = useClientMutation("funding.auroraCreateDeposit", []);
  const defaultAsset =
    config.sources.find((asset) => asset.blockchain === "base" && asset.symbol === "USDC") ??
    config.sources[0];
  const source = config.sources.find((asset) => asset.assetId === assetId) ?? defaultAsset;
  const input = fundingInput(
    source,
    config.destinations[0]?.assetId,
    amount,
    refund,
    parseInt(slippage, 10),
  );
  const quote =
    input && JSON.stringify(input) === JSON.stringify(preview.variables) ? preview.data : undefined;
  const change = (update: () => void) => {
    update();
    preview.reset();
    create.reset();
    requestId.current = null;
    setAccepted(false);
  };
  const prepare = () => {
    if (!input || !accepted || !quote) return;
    requestId.current ??= crypto.randomUUID();
    create.mutate(
      {
        ...input,
        requestId: requestId.current,
        acknowledgeMainnet: true,
        expectedRecipient: quote.recipient,
      },
      {
        onSuccess: (deposit) => {
          if (useSessionStore.getState().address?.toLowerCase() === address.toLowerCase())
            router.replace(`/wallet/fund?deposit=${encodeURIComponent(deposit.id)}`);
        },
      },
    );
  };
  const error = create.error ?? preview.error;
  return (
    <Card className="max-w-2xl space-y-5">
      <Field label="Send from" helper="Choose an asset on one of Aurora's supported EVM mainnets.">
        <Select
          value={source?.assetId}
          disabled={create.isPending}
          onValueChange={(value) => {
            change(() => {
              setAssetId(value);
            });
          }}
          options={config.sources.map((asset) => ({
            value: asset.assetId,
            label: `${asset.symbol} · ${asset.networkName}`,
          }))}
        />
      </Field>
      <Field label={`Amount${source ? ` · ${source.symbol}` : ""}`}>
        <Input
          value={amount}
          disabled={create.isPending}
          maxLength={116}
          onChange={(event) => {
            change(() => {
              setAmount(event.target.value);
            });
          }}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
        />
      </Field>
      <Field
        label="Refund address"
        helper={`Your ${source?.networkName ?? "source network"} address receives any eligible refund.`}
      >
        <Input
          value={refund}
          disabled={create.isPending}
          onChange={(event) => {
            change(() => {
              setRefund(event.target.value);
            });
          }}
          mono
          autoComplete="off"
        />
      </Field>
      <Field label="Maximum slippage">
        <Select
          value={slippage}
          disabled={create.isPending}
          onValueChange={(value) => {
            change(() => {
              setSlippage(value);
            });
          }}
          options={[
            { value: "50", label: "0.5%" },
            { value: "100", label: "1%" },
            { value: "200", label: "2%" },
          ]}
        />
      </Field>
      <div className="bg-soft rounded-xl p-4 text-sm">
        <p>
          Receive <strong>USDC on Monad Mainnet</strong>
        </p>
        {quote ? <p className="font-mono mt-2 break-all">{quote.recipient}</p> : null}
        <p className="text-subtle mt-2">
          The quote shows your authenticated destination wallet. Check its full address before
          continuing. Mainnet funding requires an external wallet; passkey signing currently
          supports testnet.
        </p>
      </div>
      <Button
        disabled={!input || create.isPending}
        loading={preview.isPending}
        onClick={() => {
          if (input) preview.mutate(input);
        }}
      >
        Preview quote
      </Button>
      {quote ? (
        <div className="space-y-4 border-t border-line pt-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-subtle">Expected output · fees included</dt>
              <dd className="font-mono mt-1">{formatUnits(BigInt(quote.amountOut), 6)} USDC</dd>
            </div>
            <div>
              <dt className="text-subtle">Minimum output</dt>
              <dd className="font-mono mt-1">{formatUnits(BigInt(quote.minAmountOut), 6)} USDC</dd>
            </div>
            <div>
              <dt className="text-subtle">Estimated processing</dt>
              <dd className="mt-1">{quote.timeEstimateSeconds} seconds after deposit</dd>
            </div>
            <div>
              <dt className="text-subtle">Refund fee</dt>
              <dd className="mt-1">
                {quote.refundFee === null
                  ? "Not supplied by Aurora"
                  : `${formatUnits(BigInt(quote.refundFee), quote.source.decimals)} ${quote.source.symbol}`}
              </dd>
            </div>
          </dl>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
              }}
              className="mt-1 size-4"
            />
            <span>
              I understand this uses real assets on mainnet. It does not fund Spoke's testnet
              checkout or campaigns.
            </span>
          </label>
          <Button
            disabled={!accepted || preview.isPending}
            loading={create.isPending}
            onClick={prepare}
          >
            Get deposit instructions
          </Button>
          <p className="text-subtle text-sm">
            Review the final quote and deadline before making a transfer. Your source wallet may
            charge a network fee.
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-body">
          {error.message}
        </p>
      ) : null}
      <p className="text-subtle text-sm">
        Funding provided by Aurora Intents. Funds travel to your wallet; they never enter Spoke's
        testnet settlement contract.
      </p>
      <p className="text-subtle text-sm">
        Aurora receives your destination and refund addresses to quote and process this funding.
      </p>
    </Card>
  );
}
