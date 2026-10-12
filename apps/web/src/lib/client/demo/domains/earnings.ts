import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import { pathOf } from "../../../../demo/world/sale-math";
import type { DemoAllocation, DemoSale, TokenKey } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { type DemoInput, type PartialHandlers } from "../handler";
import { addressesOf, blockAt, demoTx, page, tokenInfo, tokenKeyOf } from "../views/basics";
import { campaignOf, productOf } from "../views/catalog";
import { nodeIndex } from "../views/graph";
import { claimTx, finalizeTx, purchaseTx, refundTx } from "../views/receipt";
import {
  addBucket,
  allocationState,
  bucketOf,
  bucketsWire,
  countsOf,
  emptyBuckets,
} from "../views/settlement";

type Conversion = ClientOutput<"earnings.byConversion">["items"][number];
type Missed = ClientOutput<"earnings.missed">["items"][number];
type Filter = DemoInput<"earnings.byConversion">;
interface Share {
  sale: DemoSale;
  allocation: DemoAllocation;
  token: TokenKey;
}

const sharesOf = (world: DemoWorld, personId: string): Share[] => {
  const mine = addressesOf(world, personId).map((address) => address.toLowerCase());
  return world.sales.flatMap((sale) => {
    const token = campaignOf(world, sale.campaignId)?.token ?? "sdusd";
    return sale.allocations
      .filter((allocation) => mine.includes(allocation.owner.toLowerCase()))
      .map((allocation) => ({ sale, allocation, token }));
  });
};

const inFilter = (share: Share, filter: Partial<Filter>, now: number) => {
  const range = filter.range;
  return [
    filter.campaignId === undefined || share.sale.campaignId === filter.campaignId,
    filter.campaignIds === undefined || filter.campaignIds.includes(share.sale.campaignId),
    filter.nodeId === undefined || share.allocation.nodeId === filter.nodeId,
    filter.state === undefined || allocationState(share.sale, share.allocation) === filter.state,
    filter.holdEnded === undefined || now >= share.sale.unlockAt === filter.holdEnded,
    range === undefined ||
      (share.sale.purchasedAt >= Date.parse(range.from) &&
        share.sale.purchasedAt <= Date.parse(range.to)),
  ].every(Boolean);
};

const conversion = (world: DemoWorld, share: Share): Conversion => {
  const { sale, allocation } = share;
  const evidence = [
    purchaseTx(sale),
    finalizeTx(sale),
    refundTx(sale),
    claimTx(world, allocation.claimId),
  ].filter((tx) => tx !== null);
  return {
    saleId: sale.id,
    campaignId: sale.campaignId,
    level: allocation.level,
    pathLength: sale.allocations.length,
    effectiveWeightBps: allocation.weightBps,
    amount: allocation.amount.toString(),
    state: allocationState(sale, allocation),
    unlockAt: iso(sale.unlockAt),
    finalizedAt: sale.finalizedAt === null ? null : iso(sale.finalizedAt),
    claimTxHash: claimTx(world, allocation.claimId)?.hash ?? null,
    evidence,
  };
};

const tokensIn = (world: DemoWorld, wanted: string | undefined): TokenKey[] => {
  const key = tokenKeyOf(world, wanted);
  return key ? [key] : ["sdusd", "sdeur"];
};

const missed = (runtime: DemoRuntime): Missed[] => {
  const world = runtime.world;
  const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
  const index = nodeIndex(world);
  const fromSales = world.sales.flatMap((sale): Missed[] => {
    const path = pathOf(index, sale.nodeId);
    const position = path.findIndex((node) => mine.includes(node.owner.toLowerCase()));
    const node = path[position];
    if (!node) return [];
    const campaign = campaignOf(world, sale.campaignId);
    const max =
      campaign?.policies.find((version) => version.version === sale.policyVersion)?.policy
        .maxRewardedAncestors ?? 1;
    const reason =
      position >= max
        ? "OUTSIDE_DEPTH"
        : sale.status === "REFUNDED"
          ? sale.reversed
            ? "REVERSED"
            : "REFUNDED"
          : null;
    if (reason === null) return [];
    const at =
      reason === "OUTSIDE_DEPTH" ? sale.purchasedAt : (sale.refundedAt ?? sale.purchasedAt);
    const evidence = [purchaseTx(sale), refundTx(sale)].filter((tx) => tx !== null);
    return [
      {
        kind: "sale",
        reason,
        campaignId: sale.campaignId,
        nodeId: node.id,
        saleId: sale.id,
        position: position + 1,
        maxRewardedAncestors: max,
        ruleLabel: null,
        at: iso(at),
        evidence,
      },
    ];
  });
  const blocked = world.blockedCheckouts
    .filter((attempt) =>
      world.nodes.some(
        (node) => node.id === attempt.nodeId && mine.includes(node.owner.toLowerCase()),
      ),
    )
    .map((attempt): Missed => ({
      kind: "blocked_checkout",
      reason: attempt.reason,
      campaignId: attempt.campaignId,
      nodeId: attempt.nodeId,
      at: iso(attempt.at),
      evidence: [demoTx(`blocked:${attempt.nodeId}:${String(attempt.at)}`, attempt.at)],
    }));
  return [...fromSales, ...blocked].sort((a, b) => b.at.localeCompare(a.at));
};

export const earningsReads = {
  "earnings.summary": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const shares = sharesOf(world, runtime.personaId());
    const atRisk = shares
      .filter((share) => bucketOf(share.sale, share.allocation, now) === "atRisk")
      .map((share) => share.sale.unlockAt);
    return {
      tokens: tokensIn(world, input.token)
        .filter(
          (token) =>
            input.token !== undefined ||
            token === "sdusd" ||
            shares.some((share) => share.token === token),
        )
        .map((token) => {
          const buckets = emptyBuckets();
          for (const share of shares.filter((candidate) => candidate.token === token))
            addBucket(buckets, share.sale, share.allocation, now);
          return { ...bucketsWire(buckets), token: tokenInfo(world, token) };
        }),
      nextUnlockAt: atRisk.length ? iso(Math.min(...atRisk)) : null,
      indexedBlock: blockAt(now),
      blockNumber: blockAt(now),
    };
  },
  "earnings.byCampaign": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const shares = sharesOf(world, runtime.personaId()).filter((share) =>
      inFilter(share, input, now),
    );
    const campaignIds = [...new Set(shares.map((share) => share.sale.campaignId))];
    return campaignIds.flatMap((campaignId) => {
      const campaign = campaignOf(world, campaignId);
      if (!campaign) return [];
      const own = shares.filter((share) => share.sale.campaignId === campaignId);
      const buckets = emptyBuckets();
      for (const share of own) addBucket(buckets, share.sale, share.allocation, now);
      return [
        {
          ...bucketsWire(buckets),
          campaignId,
          token: tokenInfo(world, campaign.token),
          productTitle: productOf(world, campaign.productId)?.title ?? "",
          sales: countsOf([...new Set(own.map((share) => share.sale))]),
        },
      ];
    });
  },
  "earnings.byConversion": (input, runtime) => {
    const now = runtime.now();
    const rows = sharesOf(runtime.world, runtime.personaId())
      .filter((share) => inFilter(share, input, now))
      .sort((a, b) => b.sale.purchasedAt - a.sale.purchasedAt)
      .map((share) => conversion(runtime.world, share));
    return page(rows, input);
  },
  "earnings.missed": (input, runtime) =>
    page(
      missed(runtime).filter(
        (row) =>
          (input.campaignId === undefined || row.campaignId === input.campaignId) &&
          (input.nodeId === undefined || row.nodeId === input.nodeId),
      ),
      input,
    ),
  "earnings.claimable": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const shares = sharesOf(world, runtime.personaId());
    const claimable = shares.filter(
      (share) => allocationState(share.sale, share.allocation) === "claimable",
    );
    return {
      tokens: tokensIn(world, input.token).map((token) => {
        const own = claimable.filter((share) => share.token === token);
        const campaignIds = [...new Set(own.map((share) => share.sale.campaignId))];
        const total = (rows: Share[]) =>
          rows.reduce((sum, share) => sum + share.allocation.amount, 0n).toString();
        return {
          token: tokenInfo(world, token),
          amount: total(own),
          campaigns: campaignIds.map((campaignId) => ({
            campaignId,
            amount: total(own.filter((share) => share.sale.campaignId === campaignId)),
          })),
        };
      }),
      blockNumber: blockAt(now),
      readyToFinalize: shares
        .filter((share) => bucketOf(share.sale, share.allocation, now) === "readyToFinalize")
        .map((share) => conversion(world, share)),
    };
  },
  "earnings.claims": (input, runtime) => {
    const world = runtime.world;
    const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
    const rows = world.claims
      .filter((claim) => claim.source === "REWARD" && mine.includes(claim.claimant.toLowerCase()))
      .sort((a, b) => b.at - a.at)
      .map((claim) => {
        const covered = world.sales.flatMap((sale) =>
          sale.allocations
            .filter((allocation) => allocation.claimId === claim.id)
            .map((allocation) => ({ sale, allocation })),
        );
        const largest = covered.sort((a, b) =>
          b.allocation.amount > a.allocation.amount ? 1 : -1,
        )[0];
        return {
          tx: demoTx(`claim:${claim.id}`, claim.at),
          amount: claim.amount.toString(),
          token: tokenInfo(world, claim.token),
          campaignId: largest?.sale.campaignId ?? "0",
          source: claim.source,
          at: iso(claim.at),
        };
      });
    return page(rows, input);
  },
} satisfies PartialHandlers<"earnings">;

export const earningsWrites = {} satisfies PartialHandlers<"earnings">;
