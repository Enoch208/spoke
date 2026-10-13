"use client";

import { createElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { useSpokeClient } from "@/lib/client/provider";
import { formatAmount } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { asBytes32 } from "@/lib/tx/calls";
import { useChainAction } from "@/lib/tx/use-action";
import { stepErrors } from "./copy-errors";
import { launchCopy } from "./copy-launch";
import type { ComposerToken, ProductLite } from "./derive";
import type { LaunchIssue } from "./step-launch";
import type { Prepared } from "./step-review";
import type { Draft } from "./use-draft-save";

const copy = launchCopy;

const settle = <T>(promise: Promise<T>) =>
  promise
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => ({
      ok: false as const,
      message: error instanceof Error ? error.message : copy.preparing,
    }));

export const useDeployed = () => {
  const mode = useModeStore((state) => state.mode);
  return mode === "demo" || Boolean(publicEnv.NEXT_PUBLIC_PROTOCOL_ADDRESS);
};

export function useLaunch(input: {
  draftId: string;
  saveNow: () => Promise<Draft | null>;
  prepared: Prepared;
  product: ProductLite | null;
  depositMinor: bigint | null;
  token: ComposerToken;
  onReview: () => void;
}) {
  const client = useSpokeClient();
  const start = useChainAction();
  const deployed = useDeployed();
  const open = useUiStore((state) => state.open);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<LaunchIssue | null>(null);

  const button = (label: string, run: () => void) =>
    createElement(Button, { variant: "secondary", size: "sm", onClick: run }, label);
  const fundsIssue = (message: string): LaunchIssue => ({
    message,
    action: button(copy.getFunds, () => {
      open("M-06", { context: "composer", needSdusdMinor: (input.depositMinor ?? 0n).toString() });
    }),
  });
  const reviewIssue = (message: string): LaunchIssue => ({
    message,
    action: button(copy.reviewAgain, input.onReview),
  });

  const check = async (): Promise<LaunchIssue | null> => {
    const { product, depositMinor, token, prepared } = input;
    if (!deployed) return { message: copy.notDeployed, action: null };
    if (!product) return { message: stepErrors.product.missing, action: null };
    if (!client || depositMinor === null)
      return { message: stepErrors.budget.depositEmpty, action: null };
    const draft = await input.saveNow();
    if (!draft || prepared.status !== "ready") return reviewIssue(copy.termsChanged);
    const fresh = await settle(client.call("campaigns.prepareCreate", { id: input.draftId }));
    if (!fresh.ok) return { message: fill(copy.failed, { reason: fresh.message }), action: null };
    if (fresh.value.productVersion !== product.version) return reviewIssue(copy.productChanged);
    if (fresh.value.policyHash !== prepared.policyHash || !fresh.value.config)
      return reviewIssue(copy.termsChanged);
    const funding = await settle(client.call("funding.status", {}));
    if (funding.ok) {
      if (BigInt(funding.value.monWei) === 0n) return fundsIssue(copy.noMon);
      const balance = funding.value.sdusd === null ? null : BigInt(funding.value.sdusd);
      if (balance !== null && balance < depositMinor)
        return fundsIssue(
          fill(copy.noSdusd, { balance: formatAmount(balance, token), symbol: token.symbol }),
        );
    }
    start("createCampaign", {
      draftId: input.draftId,
      campaignName: product.title,
      metadataHash: asBytes32(fresh.value.metadataHash),
      skuHash: asBytes32(fresh.value.config.skuHash),
      skuPrice: fresh.value.config.skuPrice,
      policy: fresh.value.policy,
      deposit: depositMinor.toString(),
    });
    return null;
  };

  const launch = async () => {
    setBusy(true);
    setIssue(null);
    const result = await check();
    setIssue(result);
    setBusy(false);
  };

  return { launch, busy, issue, deployed };
}
