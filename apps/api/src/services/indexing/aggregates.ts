import { z } from "zod";
import type { Projection } from "./projections.js";
import type { SourceEvent } from "./source.js";

export const saleSchema = z.object({
  campaignId: z.string(),
  buyer: z.string(),
  nodeId: z.string(),
  price: z.string(),
  status: z.number().int(),
  purchasedAt: z.string(),
  unlockAt: z.string(),
  allocations: z.array(z.object({ recipient: z.string(), amount: z.string(), depth: z.number() })),
  allocationClaims: z.array(z.boolean()),
});

export const aggregateParticipants = (
  receipts: Projection[],
  campaigns: Projection[],
  batch: SourceEvent[],
  at: Date,
) => {
  const additions: Projection[] = [];
  const summaries = new Map<
    string,
    {
      owner: string;
      campaignId: string;
      settledSales: number;
      settledValue: bigint;
      commissionSettled: bigint;
      refundedSales: number;
      lastActiveAt: string | null;
    }
  >();
  for (const receipt of receipts) {
    const sale = saleSchema.parse(receipt.payload);
    if (![2, 3].includes(sale.status)) continue;
    for (const allocation of sale.allocations) {
      const owner = allocation.recipient.toLowerCase();
      const key = `${owner}_${sale.campaignId}`;
      const value = summaries.get(key) ?? {
        owner,
        campaignId: sale.campaignId,
        settledSales: 0,
        settledValue: 0n,
        commissionSettled: 0n,
        refundedSales: 0,
        lastActiveAt: null,
      };
      if (sale.status === 3) {
        value.settledSales++;
        value.settledValue += BigInt(sale.price);
        value.commissionSettled += BigInt(allocation.amount);
        const activeAt = new Date(Number(sale.purchasedAt) * 1000).toISOString();
        if (!value.lastActiveAt || activeAt > value.lastActiveAt) value.lastActiveAt = activeAt;
      } else value.refundedSales++;
      summaries.set(key, value);
    }
  }
  if (batch.some((event) => ["SaleFinalized", "SaleRefunded"].includes(event.name)))
    for (const [id, summary] of summaries)
      additions.push({
        kind: "participant-campaign-summary",
        id,
        owner: summary.owner,
        payload: {
          ...summary,
          settledValue: summary.settledValue.toString(),
          commissionSettled: summary.commissionSettled.toString(),
          updatedAt: at.toISOString(),
        },
      });
  if (batch.some((event) => ["SaleFinalized", "SaleRefunded"].includes(event.name))) {
    const owners = new Set([...summaries.values()].map((summary) => summary.owner));
    for (const owner of owners) {
      const rows = [...summaries.values()].filter((summary) => summary.owner === owner);
      const merchants = new Set(
        rows
          .map((summary) => campaigns.find((campaign) => campaign.id === summary.campaignId)?.owner)
          .filter((value) => value !== undefined),
      );
      additions.push({
        kind: "reputation-aggregate",
        id: owner,
        owner,
        payload: {
          settledSales: rows.reduce((total, row) => total + row.settledSales, 0),
          settledValue: rows.reduce((total, row) => total + row.settledValue, 0n).toString(),
          commissionSettled: rows
            .reduce((total, row) => total + row.commissionSettled, 0n)
            .toString(),
          refundedSales: rows.reduce((total, row) => total + row.refundedSales, 0),
          campaigns: rows.length,
          merchants: merchants.size,
          lastActiveAt:
            rows
              .map((row) => row.lastActiveAt)
              .filter((value) => value !== null)
              .sort()
              .at(-1) ?? null,
          updatedAt: at.toISOString(),
        },
      });
    }
  }
  return additions;
};
