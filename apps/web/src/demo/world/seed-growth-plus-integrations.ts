import { units } from "./catalog";
import { DAY, MINUTE, iso } from "./ids";
import { personaMerchant, scopedId } from "./seed-growth-plus-scope";
import { seedAttestations, seedSigners, type Provider } from "./seed-growth-plus-signers";
import type { DemoCore } from "./types";
import type { Attestation, Integration, IntegrationStatus } from "./world";

export const totalsOf = (orders: readonly Attestation[], storeAdjustment: bigint) => {
  const signed = orders.reduce((total, order) => total + BigInt(order.amount), 0n);
  const accepted = orders
    .filter((order) => order.outcome === "accepted")
    .reduce((total, order) => total + BigInt(order.amount), 0n);
  return {
    pendingOrders: orders.filter((order) => order.outcome === "pending").length,
    sourceTotal: (signed + storeAdjustment).toString(),
    attestedTotal: signed.toString(),
    acceptedTotal: accepted.toString(),
  };
};

export const emptyStatus = (): IntegrationStatus => ({
  lastSyncAt: null,
  ...totalsOf([], 0n),
  mismatches: [],
});

export const seedIntegrations = (core: DemoCore) => {
  const scope = personaMerchant(core).id;
  const anchor = core.anchor;
  const { attestations, providerOf, refundSale, amountSale } = seedAttestations(core, scope);
  const integrationId = (provider: string) => scopedId(scope, "integration", provider);
  const status = (
    provider: Provider,
    lastSync: number,
    storeAdjustment: bigint,
    mismatches: IntegrationStatus["mismatches"],
  ): IntegrationStatus => ({
    lastSyncAt: iso(lastSync),
    ...totalsOf(
      attestations.filter((order) => providerOf.get(order.signerId) === provider),
      storeAdjustment,
    ),
    mismatches,
  });
  const integrations: Integration[] = [
    {
      id: integrationId("shopify"),
      provider: "shopify",
      status: "connected",
      connectedAt: iso(anchor - 60 * DAY),
      lastSyncAt: iso(anchor - 4 * MINUTE),
    },
    {
      id: integrationId("woocommerce"),
      provider: "woocommerce",
      status: "error",
      connectedAt: iso(anchor - 150 * DAY),
      lastSyncAt: iso(anchor - 12 * MINUTE),
    },
    {
      id: integrationId("stripe"),
      provider: "stripe",
      status: "disconnected",
      connectedAt: null,
      lastSyncAt: null,
    },
  ];
  return {
    integrations,
    integrationStatus: {
      [integrationId("shopify")]: status("shopify", anchor - 4 * MINUTE, 0n, []),
      [integrationId("woocommerce")]: status("woocommerce", anchor - 12 * MINUTE, units(2), [
        {
          id: scopedId(scope, "mismatch", 1),
          kind: "refundUnresolved",
          severity: "warning",
          sourceOrderId: "wc-1042",
          saleId: refundSale?.id ?? null,
          suggestedAction: "Refund the sale before its hold ends.",
        },
        {
          id: scopedId(scope, "mismatch", 2),
          kind: "amountMismatch",
          severity: "warning",
          sourceOrderId: "wc-1017",
          saleId: amountSale?.id ?? null,
          suggestedAction: "The signed amount doesn't match your store's record.",
        },
      ]),
      [integrationId("stripe")]: emptyStatus(),
    },
    signers: seedSigners(scope, anchor),
    attestations,
  };
};
