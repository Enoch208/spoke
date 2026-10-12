import { contractErrorCodes, type ContractErrorName } from "@spoke/protocol";
import type { Address } from "viem";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso, sampleHash } from "../../../../demo/world/ids";
import type { DemoCampaign, TokenKey } from "../../../../demo/world/types";
import type { DemoBalance } from "../../../../demo/world/world";
import { ClientError } from "../../errors";
import { addressesOf, balanceOf, blockAt } from "../views/basics";
import { campaignOf, merchantOf } from "../views/catalog";
import { merchantsOwnedBy } from "../views/merchant-org";
import type { DemoTxResult } from "./actions";

export const revert = (name: ContractErrorName, message: string): never => {
  throw new ClientError({
    code: contractErrorCodes[name],
    message,
    details: { contractError: name },
    requestId: "demo",
  });
};

export const signerOf = (runtime: DemoRuntime): Address => {
  const own = addressesOf(runtime.world, runtime.personaId());
  const business = merchantsOwnedBy(runtime.world, runtime.personaId())[0]?.address;
  const signer = own.find((address) => address === business) ?? own[0];
  return signer ?? revert("NotAuthorizedToRefund", "This sample persona has no wallet.");
};

export const walletOf = (runtime: DemoRuntime, address: Address): DemoBalance => {
  const existing = balanceOf(runtime.world, address);
  if (existing) return existing;
  const created: DemoBalance = { mon: 0n, sdusd: 0n, sdeur: 0n, allowance: 0n };
  runtime.world.balances[address] = created;
  return created;
};

export const campaignFor = (runtime: DemoRuntime, campaignId: string): DemoCampaign =>
  campaignOf(runtime.world, campaignId) ??
  revert("UnknownCampaign", "That campaign doesn't exist in the sample world.");

export const merchantSigner = (runtime: DemoRuntime, campaign: DemoCampaign): Address => {
  const merchant = merchantOf(runtime.world, campaign.merchantId);
  if (!merchant || merchant.ownerId !== runtime.personaId())
    return revert("NotMerchant", "Only the campaign's merchant can do this.");
  return merchant.address;
};

export const spend = (wallet: DemoBalance, token: TokenKey, amount: bigint) => {
  if (wallet[token] < amount)
    revert("ERC20InsufficientBalance", "Not enough tokens in this wallet.");
  if (token === "sdusd" && wallet.allowance < amount)
    revert("ERC20InsufficientAllowance", "Approve Spoke to spend this amount first.");
  wallet[token] -= amount;
  if (token === "sdusd") wallet.allowance -= amount;
};

export const receipt = (
  runtime: DemoRuntime,
  events: string[],
  objectId: string | null = null,
): DemoTxResult => {
  const now = runtime.now();
  const n = runtime.nextId("tx");
  runtime.world.lastChainActionAt = now;
  return {
    hash: sampleHash(`chain:${String(n)}`),
    blockNumber: blockAt(now),
    at: iso(now),
    events,
    objectId,
  };
};
