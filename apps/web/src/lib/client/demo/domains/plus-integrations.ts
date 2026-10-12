import type { ClientOutput } from "@spoke/protocol";
import { DAY, MINUTE, iso } from "../../../../demo/world/ids";
import { emptyStatus, totalsOf } from "../../../../demo/world/seed-growth-plus-integrations";
import { scopedId } from "../../../../demo/world/seed-growth-plus-scope";
import { providerScope } from "../../../../demo/world/seed-growth-plus-signers";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { DemoWorld, Integration, IntegrationStatus } from "../../../../demo/world/world";
import { found } from "../handler";
import { DEMO_CHAIN_ID, DEMO_PROTOCOL_ADDRESS } from "../views/basics";
import { mine } from "./plus-merchant";

export const SYNC_EVERY_MS = 15 * MINUTE;
export const STATUS_WINDOW_MS = 30 * DAY;

export const signingPolicy: ClientOutput<"signers.list">["policy"] = {
  domain: {
    name: "Spoke",
    version: "1",
    chainId: DEMO_CHAIN_ID,
    verifyingContract: DEMO_PROTOCOL_ADDRESS,
  },
  nonceRule:
    "Every order carries a unique 256-bit nonce. Spoke rejects a nonce the signer has used before.",
  maxValiditySeconds: 900,
};

export interface Window {
  from: number;
  to: number;
}

export const windowOf = (range: { from: string; to: string } | undefined, now: number): Window =>
  range
    ? { from: Date.parse(range.from), to: Date.parse(range.to) }
    : { from: now - STATUS_WINDOW_MS, to: now };

export const integrationIdOf = (merchant: DemoMerchant, provider: string) =>
  scopedId(merchant.id, "integration", provider);

export const integrationOf = (world: DemoWorld, merchant: DemoMerchant, provider: string) =>
  found(
    world.integrations.find(
      (integration) => integration.id === integrationIdOf(merchant, provider),
    ),
    `A ${provider} connection`,
  );

const isSyncing = (integration: Integration) =>
  integration.status === "connected" || integration.status === "error";

export const syncedAt = (
  integration: Integration,
  now: number,
  refresh: boolean,
): string | null => {
  if (integration.lastSyncAt === null || !isSyncing(integration)) return integration.lastSyncAt;
  const last = Date.parse(integration.lastSyncAt);
  const scheduled = last + Math.max(0, Math.floor((now - last) / SYNC_EVERY_MS)) * SYNC_EVERY_MS;
  const refreshed = refresh ? Math.floor(now / MINUTE) * MINUTE : scheduled;
  return iso(Math.max(scheduled, refreshed));
};

export const presentIntegration = (integration: Integration, now: number): Integration => ({
  ...integration,
  lastSyncAt: syncedAt(integration, now, false),
});

export const providerOrders = (
  world: DemoWorld,
  merchant: DemoMerchant,
  provider: string,
  window: Window,
  campaignIds?: readonly string[],
) => {
  const signers = new Set(
    mine(merchant, world.signers)
      .filter((signer) => signer.scopes.includes(providerScope(provider)))
      .map((signer) => signer.id),
  );
  return world.attestations
    .filter((order) => signers.has(order.signerId))
    .filter((order) => {
      const at = Date.parse(order.at);
      return at >= window.from && at <= window.to;
    })
    .filter((order) => !campaignIds?.length || campaignIds.includes(order.campaignId));
};

export const statusView = (
  world: DemoWorld,
  merchant: DemoMerchant,
  integration: Integration,
  options: { now: number; window: Window; refresh: boolean; campaignIds?: readonly string[] },
): IntegrationStatus => {
  const stored = world.integrationStatus[integration.id] ?? emptyStatus();
  const storeAdjustment = BigInt(stored.sourceTotal) - BigInt(stored.attestedTotal);
  const orders = providerOrders(
    world,
    merchant,
    integration.provider,
    options.window,
    options.campaignIds,
  );
  return {
    lastSyncAt: syncedAt(integration, options.now, options.refresh),
    ...totalsOf(orders, storeAdjustment),
    mismatches: stored.mismatches.map((mismatch) => ({ ...mismatch })),
  };
};

export const replaceIn = <T extends { id: string }>(items: T[], updated: T): T => {
  const index = items.findIndex((item) => item.id === updated.id);
  if (index === -1) items.push(updated);
  else items[index] = updated;
  return { ...updated };
};
