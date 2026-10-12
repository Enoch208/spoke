import { found, type PartialHandlers } from "../handler";
import { actor, addressesOf, blockAt, page } from "../views/basics";
import { campaignOf, isMerchantOfCampaign } from "../views/catalog";
import {
  finalizeTx,
  policyHashOf,
  purchaseTx,
  refundTx,
  saleOf,
  saleReceipt,
  claimTx,
} from "../views/receipt";
import { countsOf } from "../views/settlement";
import {
  campaignSaleRow,
  newestFirst,
  purchaseRow,
  saleMatches,
  saleRow,
} from "../views/sale-rows";
import { requireMerchant } from "../views/merchant-org";
import type { DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";

type ProofEvent = ClientOutput<"receipts.events">[number];

const events = (world: DemoWorld, sale: DemoSale): ProofEvent[] => {
  const campaign = found(campaignOf(world, sale.campaignId), "Campaign");
  const purchase = purchaseTx(sale);
  const rows: ProofEvent[] = [
    {
      name: "NativePurchaseAccepted",
      tx: purchase,
      logIndex: 0,
      at: iso(sale.purchasedAt),
      actor: null,
      args: {
        saleId: sale.id,
        campaignId: sale.campaignId,
        nodeId: sale.nodeId ?? "0",
        orderKey: sale.orderKey,
        price: sale.price.toString(),
        policyHash: policyHashOf(campaign, sale.policyVersion),
      },
    },
    ...sale.allocations.map((allocation, position) => ({
      name: "RewardReserved",
      tx: purchase,
      logIndex: position + 1,
      at: iso(sale.purchasedAt),
      actor: actor(world, allocation.owner),
      args: {
        saleId: sale.id,
        nodeId: allocation.nodeId,
        level: allocation.level,
        weightBps: allocation.weightBps,
        amount: allocation.amount.toString(),
      },
    })),
  ];
  const finalized = finalizeTx(sale);
  if (finalized && sale.finalizedAt !== null)
    rows.push({
      name: "SaleFinalized",
      tx: finalized,
      logIndex: 0,
      at: iso(sale.finalizedAt),
      actor: null,
      args: { saleId: sale.id },
    });
  const refunded = refundTx(sale);
  if (refunded && sale.refundedAt !== null)
    rows.push({
      name: "SaleRefunded",
      tx: refunded,
      logIndex: 0,
      at: iso(sale.refundedAt),
      actor: null,
      args: { saleId: sale.id, amount: sale.price.toString() },
    });
  for (const allocation of sale.allocations) {
    const claim = claimTx(world, allocation.claimId);
    if (claim?.at)
      rows.push({
        name: "RewardClaimed",
        tx: claim,
        logIndex: 0,
        at: claim.at,
        actor: actor(world, allocation.owner),
        args: { saleId: sale.id, amount: allocation.amount.toString() },
      });
  }
  return rows;
};

export const receiptsReads = {
  "receipts.get": (input, runtime) =>
    saleReceipt(
      runtime.world,
      found(saleOf(runtime.world, input.saleId), "Receipt"),
      runtime.personaId(),
      runtime.now(),
    ),
  "receipts.events": (input, runtime) =>
    events(runtime.world, found(saleOf(runtime.world, input.saleId), "Receipt")),
  "receipts.verify": (input, runtime) => {
    const world = runtime.world;
    const sale = found(saleOf(world, input.saleId), "Receipt");
    const campaign = found(campaignOf(world, sale.campaignId), "Campaign");
    const receipt = saleReceipt(world, sale, runtime.personaId(), runtime.now());
    return {
      sale: receipt,
      allocations: receipt.allocations,
      policyHash: receipt.policyHash,
      blockNumber: blockAt(runtime.now()),
      matchesIndex: !campaign.drill,
    };
  },
  "receipts.recent": (input, runtime) => {
    const world = runtime.world;
    const sales = world.sales.filter((sale) => saleMatches(world, sale, input)).sort(newestFirst);
    const shown = page(sales, input);
    return {
      items: shown.items.map((sale) =>
        saleReceipt(world, sale, runtime.personaId(), runtime.now()),
      ),
      nextCursor: shown.nextCursor,
    };
  },
  "receipts.forBuyer": (input, runtime) => {
    const world = runtime.world;
    const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
    const since = input.since === undefined ? 0 : Date.parse(input.since);
    const rows = world.sales
      .filter(
        (sale) =>
          mine.includes(sale.buyer.toLowerCase()) &&
          sale.purchasedAt >= since &&
          saleMatches(world, sale, input),
      )
      .sort(newestFirst)
      .map((sale) => purchaseRow(world, sale));
    return page(rows, input);
  },
  "receipts.forMerchant": (input, runtime) => {
    const world = runtime.world;
    const merchant = requireMerchant(world, runtime.personaId());
    const own = world.sales.filter(
      (sale) => campaignOf(world, sale.campaignId)?.merchantId === merchant.id,
    );
    const matched = own.filter((sale) => saleMatches(world, sale, input)).sort(newestFirst);
    return {
      ...page(
        matched.map((sale) => saleRow(world, sale)),
        input,
      ),
      countsByState: countsOf(
        own.filter((sale) => saleMatches(world, sale, { ...input, state: undefined })),
      ),
    };
  },
  "receipts.forCampaign": (input, runtime) => {
    const world = runtime.world;
    const campaign = found(campaignOf(world, input.campaignId ?? ""), "Campaign");
    const merchantView = isMerchantOfCampaign(world, runtime.personaId(), campaign);
    const rows = world.sales
      .filter(
        (sale) =>
          sale.campaignId === campaign.id &&
          saleMatches(world, sale, { ...input, campaignId: undefined }),
      )
      .sort(newestFirst)
      .map((sale) => {
        const row = campaignSaleRow(world, sale);
        return merchantView ? row : { ...row, refundRequestStatus: null };
      });
    return page(rows, input);
  },
} satisfies PartialHandlers<"receipts">;

export const receiptsWrites = {} satisfies PartialHandlers<"receipts">;
