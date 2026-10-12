import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { DAY, iso } from "../../../../demo/world/ids";
import type { DemoCampaign, DemoMerchant } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found } from "../handler";
import { campaignOf } from "../views/catalog";
import { requireMerchant } from "../views/merchant-org";

export interface Period {
  from: number;
  to: number;
}

export const DEFAULT_RANGE_DAYS = 90;

export const periodOf = (range: { from: string; to: string } | undefined, now: number): Period => {
  if (range === undefined) return { from: now - DEFAULT_RANGE_DAYS * DAY, to: now };
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  if (from > to) return fail("VALIDATION_FAILED", "The date range ends before it starts.");
  return { from, to };
};

export const periodWire = (period: Period) => ({ from: iso(period.from), to: iso(period.to) });

export const merchantFor = (runtime: DemoRuntime): DemoMerchant =>
  requireMerchant(runtime.world, runtime.personaId());

export const campaignsOfMerchant = (world: DemoWorld, merchant: DemoMerchant): DemoCampaign[] =>
  world.campaigns.filter((campaign) => campaign.merchantId === merchant.id);

export const ownCampaign = (world: DemoWorld, merchant: DemoMerchant, id: string): DemoCampaign => {
  const campaign = found(campaignOf(world, id), "That campaign");
  if (campaign.merchantId !== merchant.id)
    return fail("NOT_AUTHORIZED", "That campaign belongs to another business.");
  return campaign;
};

export const selectCampaigns = (
  world: DemoWorld,
  merchant: DemoMerchant,
  ids: readonly string[] | undefined,
): DemoCampaign[] =>
  ids?.length
    ? [...new Set(ids)].map((id) => ownCampaign(world, merchant, id))
    : campaignsOfMerchant(world, merchant);
