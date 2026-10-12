import { inArray } from "drizzle-orm";
import { z } from "zod";
import { aggregateParticipants, saleSchema } from "./aggregates.js";
import { records } from "../../db/schema.js";
import type { Store } from "../../db/store.js";
import type { Projection } from "./projections.js";
import type { SourceEvent } from "./source.js";

const merge = (rows: Projection[], changes: Projection[], kind: string) => {
  const values = new Map(rows.filter((row) => row.kind === kind).map((row) => [row.id, row]));
  for (const row of changes.filter((row) => row.kind === kind)) values.set(row.id, row);
  return [...values.values()];
};
export const deriveBatch = async (
  store: Store,
  batch: SourceEvent[],
  projected: Projection[],
  at: Date,
) => {
  const existing = await store.db
    .select()
    .from(records)
    .where(inArray(records.kind, ["node", "campaign", "receipt", "invitation"]));
  const nodes = merge(existing, projected, "node");
  const campaigns = merge(existing, projected, "campaign");
  const receipts = merge(existing, projected, "receipt");
  const additions: Projection[] = [];
  const notify = async (
    event: SourceEvent,
    address: string,
    kind: string,
    workspace: "earn" | "sell" | "account",
    title: string,
    body: string,
    href: string,
    amount?: string,
  ) => {
    const owner = (await store.identity("wallet", address.toLowerCase())) ?? address.toLowerCase();
    additions.push({
      kind: "notification",
      id: `${event.id}:${kind}:${workspace}:${address.toLowerCase()}`,
      owner,
      payload: {
        kind,
        category:
          workspace === "sell" ? "Campaigns" : workspace === "account" ? "Purchases" : "Earnings",
        workspace,
        title,
        body,
        href,
        ...(amount === undefined ? {} : { amount }),
        readAt: null,
        createdAt: event.at.toISOString(),
        source: "chain",
        chainId: event.chainId,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
      },
    });
  };
  for (const event of batch) {
    const campaignId =
      typeof event.payload.campaignId === "string" ? event.payload.campaignId : null;
    const campaign = campaigns.find((row) => row.id === campaignId);
    const sale = receipts.find((row) => row.id === event.payload.saleId);
    const merchant = typeof campaign?.owner === "string" ? campaign.owner : null;
    const linkOwners = new Set(
      nodes
        .filter(
          (row) =>
            row.payload.campaignId === campaignId &&
            (typeof row.payload.createdAt !== "string" ||
              BigInt(row.payload.createdAt) * 1000n <= BigInt(event.at.getTime())),
        )
        .map((row) => row.owner),
    );
    if (
      event.name === "PolicyVersionRegistered" &&
      z.coerce.number().int().parse(event.payload.version) > 1
    ) {
      for (const invitation of existing.filter(
        (row) =>
          row.kind === "invitation" &&
          row.payload.campaignId === campaignId &&
          ["pending", "accepted"].includes(String(row.payload.status)),
      )) {
        if (typeof invitation.payload.distributor === "string")
          linkOwners.add(invitation.payload.distributor.toLowerCase());
      }
      const effectiveAt = new Date(
        Number(z.string().parse(event.payload.effectiveAt)) * 1000,
      ).toISOString();
      for (const owner of linkOwners)
        await notify(
          event,
          owner,
          "campaign.termsChanging",
          "earn",
          `Campaign #${campaignId ?? ""}'s terms are changing`,
          `New terms apply from ${effectiveAt}. Sales before then keep today's terms.`,
          `/earn/links?campaignId=${campaignId ?? ""}`,
        );
    }
    if (event.name === "CampaignStatusChanged") {
      const kind =
        event.payload.ended === true
          ? "ended"
          : event.payload.paused === true
            ? "paused"
            : "resumed";
      for (const owner of linkOwners)
        await notify(
          event,
          owner,
          `campaign.${kind}`,
          "earn",
          `Campaign #${campaignId ?? ""} ${kind}`,
          kind === "paused"
            ? "New orders are paused. Existing balances and claims remain available."
            : kind === "ended"
              ? "No new purchases. Earnings from past sales still settle."
              : "New purchases through your link can earn again.",
          `/earn/links?campaignId=${campaignId ?? ""}`,
        );
      if (
        merchant &&
        event.payload.active === true &&
        event.payload.paused === false &&
        event.payload.ended === false
      )
        await notify(
          event,
          merchant,
          "campaign.live",
          "sell",
          "Campaign is live",
          `Campaign #${campaignId ?? ""} is live. Anyone can now create a link.`,
          `/sell/campaigns/${campaignId ?? ""}`,
        );
    }
    if (event.name === "RewardReserved" && typeof event.payload.recipient === "string")
      await notify(
        event,
        event.payload.recipient,
        "sale.reserved",
        "earn",
        "New sale through your link",
        "A sale reserved a commission for you. It remains refundable during the hold.",
        "/earn/earnings",
        z.string().parse(event.payload.amount),
      );
    if (event.name === "NativePurchaseAccepted" && sale) {
      await notify(
        event,
        sale.owner,
        "purchase.confirmed",
        "account",
        "Purchase confirmed",
        "Your purchase is confirmed onchain. Your access is ready.",
        `/purchases/${sale.id}`,
        z.string().parse(sale.payload.price),
      );
      if (merchant)
        await notify(
          event,
          merchant,
          "sale.new",
          "sell",
          "New sale",
          "Sale proceeds are held until the refund window ends.",
          `/sell/orders/${sale.id}`,
          z.string().parse(sale.payload.price),
        );
    }
    if (["SaleFinalized", "SaleRefunded"].includes(event.name) && sale) {
      const data = saleSchema.parse(sale.payload);
      const refunded = event.name === "SaleRefunded";
      for (const allocation of data.allocations)
        await notify(
          event,
          allocation.recipient,
          refunded ? "sale.refunded" : "sale.finalized",
          "earn",
          refunded ? "Sale refunded" : "Earnings settled",
          refunded
            ? "The sale was refunded. Its pending commissions were cancelled."
            : "Commission is settled and ready to claim. View the proof.",
          "/earn/earnings",
          allocation.amount,
        );
      await notify(
        event,
        data.buyer,
        refunded ? "purchase.refunded" : "purchase.final",
        "account",
        refunded ? "Refund issued" : "Purchase settled",
        refunded
          ? "The merchant refunded this purchase onchain."
          : "The refund window for this purchase has closed.",
        `/purchases/${sale.id}`,
        data.price,
      );
      if (merchant && !refunded)
        await notify(
          event,
          merchant,
          "sale.finalized",
          "sell",
          "Proceeds ready",
          "Finalized sale proceeds are ready to claim.",
          "/sell/vault",
          data.price,
        );
    }
    if (["RewardClaimed", "MerchantProceedsClaimed"].includes(event.name))
      await notify(
        event,
        z.string().parse(event.payload.recipient ?? event.payload.merchant),
        "claim.confirmed",
        event.name === "RewardClaimed" ? "earn" : "sell",
        "Claim confirmed",
        "The claimed tokens are in your wallet.",
        "/account/balances",
        z.string().parse(event.payload.amount),
      );
    if (
      [
        "CampaignFunded",
        "RewardReserved",
        "SaleRefunded",
        "SaleFinalized",
        "RewardClaimed",
        "MerchantProceedsClaimed",
        "SurplusReturned",
      ].includes(event.name)
    )
      additions.push({
        kind: "vault-movement",
        id: event.id,
        owner: merchant ?? "system",
        payload: {
          ...event.payload,
          kind: event.name,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          at: event.at.toISOString(),
        },
      });
  }
  return [...additions, ...aggregateParticipants(receipts, campaigns, batch, at)];
};
