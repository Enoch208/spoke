import { auroraQuoteInput, type ClientOutput } from "@spoke/protocol";
import { parseUnits } from "viem";

export const fundingInput = (
  source: ClientOutput<"funding.auroraConfig">["sources"][number] | undefined,
  destinationAsset: string | undefined,
  amount: string,
  refundAddress: string,
  slippageBps: number,
) => {
  if (
    amount.length > 116 ||
    !source ||
    !destinationAsset ||
    !/^\d+(\.\d+)?$/.test(amount) ||
    (amount.split(".")[1]?.length ?? 0) > source.decimals
  )
    return null;
  const parsed = auroraQuoteInput.safeParse({
    originAsset: source.assetId,
    destinationAsset,
    amount: parseUnits(amount, source.decimals).toString(),
    refundAddress,
    slippageBps,
  });
  return parsed.success ? parsed.data : null;
};

export const fundingStates = {
  PENDING_DEPOSIT: "Waiting for your deposit",
  KNOWN_DEPOSIT_TX: "Deposit detected; waiting for confirmation",
  INCOMPLETE_DEPOSIT: "Deposit below the quoted amount",
  PROCESSING: "Aurora is processing your deposit",
  SUCCESS: "Waiting for the Monad transfer to be verified",
  REFUNDED: "Aurora reports the deposit was refunded",
  FAILED: "Aurora reports a funding failure",
} as const;

export const fundingPollInterval = (
  value: ClientOutput<"funding.auroraDeposit"> | undefined,
  now: number,
) => {
  if (!value) return 5000;
  if (value.confirmation.state === "verified" || value.state === "REFUNDED") return false;
  if (Date.parse(value.deadline) <= now) return 30_000;
  return 5000;
};
