import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { ClientError } from "../../errors";
import { merchantWire } from "./catalog";

export type MerchantOrg = ClientOutput<"merchants.me">;

export const AGREEMENT_VERSION = "1.0";

export const merchantOrgWire = (
  world: DemoWorld,
  merchant: DemoMerchant,
  now: number,
): MerchantOrg => ({
  ...merchantWire(world, merchant, now),
  supportEmail: merchant.supportEmail,
  region: merchant.region,
  defaults: null,
  budgetAlertSales: merchant.budgetAlertSales,
  agreement: {
    version: AGREEMENT_VERSION,
    publishedAt: iso(world.anchor - 365 * 86_400_000),
    url: "https://usespoke.xyz/legal/merchant-agreement",
    acceptedAt: iso(merchant.joinedAt),
  },
  businessWallet: merchant.address,
});

export const merchantsOwnedBy = (world: DemoWorld, personId: string): DemoMerchant[] =>
  world.merchants.filter((merchant) => merchant.ownerId === personId && merchant.closedAt === null);

export const requireMerchant = (world: DemoWorld, personId: string): DemoMerchant => {
  const merchant = merchantsOwnedBy(world, personId)[0];
  if (!merchant) {
    throw new ClientError({
      code: "NOT_AUTHORIZED",
      message: "Set up a business first. This sample persona doesn't run one.",
      requestId: "demo",
    });
  }
  return merchant;
};
