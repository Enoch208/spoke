import { z } from "zod";
import {
  campaignCard as cardSchema,
  product,
  campaignStats,
  simulatePolicy,
  commissionPolicy,
} from "@spoke/protocol";
import type { Store, StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { nativeToken, productView } from "./catalog.js";
import { allRecords, counts, relatedRecords, timestamp } from "./read-utils.js";
import { actorView } from "./evidence.js";

export const related = relatedRecords;
export const allocations = z.array(
  z.object({
    recipient: z.string(),
    amount: z.string(),
    depth: z.number().int(),
    effectiveWeightBps: z.number().int().min(0).max(10000),
  }),
);
export const saleState = (row: StoredRecord) =>
  ["NONE", "PENDING", "REFUNDED", "FINALIZED"][z.number().int().parse(row.payload.status)] ??
  "NONE";
export const publicNode = async (store: Store, row: StoredRecord) => {
  const actor = await actorView(store, z.string().parse(row.payload.creator));
  return {
    nodeId: row.id,
    creator: actor.address,
    displayName: actor.displayName,
    handle: actor.handle,
    visibility: actor.visibility,
  };
};
export const ancestry = async (store: Store, nodeId: string) => {
  const path: StoredRecord[] = [];
  const seen = new Set<string>();
  let current = nodeId;
  let campaignId: unknown;
  while (current !== "0" && path.length < 256) {
    if (seen.has(current))
      throw new ApiProblem(503, "INDEXER_LAGGING", "Indexed ancestry contains a cycle.");
    seen.add(current);
    const row = await store.require("node", current);
    if (campaignId !== undefined && campaignId !== row.payload.campaignId)
      throw new ApiProblem(503, "INDEXER_LAGGING", "Indexed ancestry crosses campaigns.");
    campaignId = row.payload.campaignId;
    path.push(row);
    current = z.string().parse(row.payload.parentId);
  }
  return { rows: path, truncated: current !== "0" };
};
export const campaignProduct = async (store: Store, row: StoredRecord) => {
  const metadata = await store.get("campaign-metadata", row.id);
  if (metadata) {
    const id = `${z.string().parse(metadata.payload.productId)}_${String(metadata.payload.productVersion)}`;
    const version = await store.get("product-version", id);
    if (version) return productView(version);
  }
  return product.parse({
    id: `onchain-${row.id}`,
    merchantId: row.owner,
    title: `Onchain campaign #${row.id}`,
    summary: "Product details have not been published.",
    outcome: "",
    description: "",
    media: [],
    priceBaseUnits: row.payload.skuPrice,
    token: nativeToken(z.object({ rewardToken: z.string() }).parse(row.payload.policy).rewardToken),
    category: "other",
    fulfillmentMode: "manual",
    version: 1,
    skuHash: row.payload.skuHash,
    refundPolicy: "Refundable onchain before the disclosed hold expires.",
    variants: [],
    billingPeriod: null,
  });
};
export const campaignState = (row: StoredRecord) =>
  row.payload.ended
    ? "ENDED"
    : row.payload.paused
      ? "PAUSED"
      : BigInt(z.string().parse(row.payload.endsAt)) * 1000n <= BigInt(Date.now())
        ? "EXPIRED"
        : !row.payload.active
          ? "CREATED_UNFUNDED"
          : "FUNDED_ACTIVE";
export const campaignCard = async (store: Store, row: StoredRecord) => {
  const [item, merchants, receipts] = await Promise.all([
    campaignProduct(store, row),
    allRecords(store, "merchant"),
    related(store, "receipt", "campaignId", row.id),
  ]);
  const merchant = merchants.find(
    (merchant) => z.string().parse(merchant.payload.address).toLowerCase() === row.owner,
  );
  const address = z.string().parse(row.payload.merchant);
  return cardSchema.parse({
    campaignId: row.id,
    chainId: row.payload.chainId,
    contractAddress: row.payload.contractAddress,
    state: campaignState(row),
    merchant: {
      address,
      name: merchant?.payload.name ?? address,
      slug: merchant?.payload.slug ?? address.toLowerCase(),
    },
    product: item,
    token: item.token,
    price: row.payload.skuPrice,
    policy: row.payload.policy,
    rewardAvailable: z.object({ available: z.string() }).parse(row.payload.rewardLedger).available,
    rewardTotal: z.object({ netDeposited: z.string() }).parse(row.payload.rewardLedger)
      .netDeposited,
    settledSales: receipts.filter((receipt) => receipt.payload.status === 3).length,
    onchainUrl:
      row.payload.chainId === 10143
        ? `https://testnet.monadvision.com/address/${z.string().parse(row.payload.contractAddress)}`
        : `https://usespoke.xyz/campaigns/${row.id}`,
    rankReasons: [],
  });
};
export const statsView = async (store: Store, id: string) => {
  const [nodes, receipts] = await Promise.all([
    related(store, "node", "campaignId", id),
    related(store, "receipt", "campaignId", id),
  ]);
  const levels = await Promise.all(
    nodes.map(async (row) => (await ancestry(store, row.id)).rows.length),
  );
  const depthMix = new Map<number, number>();
  for (const receipt of receipts.filter((row) => row.payload.status === 3)) {
    if (receipt.payload.nodeId === "0") continue;
    const depth =
      z.string().parse(receipt.payload.nodeId) === "0"
        ? 1
        : (await ancestry(store, z.string().parse(receipt.payload.nodeId))).rows.length;
    depthMix.set(depth, (depthMix.get(depth) ?? 0) + 1);
  }
  return campaignStats.parse({
    links: nodes.length,
    branches: new Set(nodes.map((row) => row.payload.parentId).filter((id) => id !== "0")).size,
    deepestLevel: Math.max(0, ...levels),
    sales: counts(receipts),
    settledValue: receipts
      .filter((row) => row.payload.status === 3)
      .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.price)), 0n)
      .toString(),
    reservedRewards: receipts
      .filter((row) => row.payload.status === 1)
      .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.rewardReserved)), 0n)
      .toString(),
    depthMix: [...depthMix].map(([level, sales]) => ({ level, sales })),
  });
};
export const campaignDraftRow = async (store: Store, row: StoredRecord) => {
  const item = await store.require(
    "product-version",
    `${z.string().parse(row.payload.productId)}_${String(row.payload.productVersion)}`,
    row.owner,
  );
  const policy = z.looseObject({ rewardToken: z.string() }).parse(row.payload.policy);
  return {
    campaignId: null,
    draftId: row.id,
    state: "DRAFT_OFFCHAIN",
    productTitle: item.payload.title,
    rewardPerSale: simulatePolicy(
      BigInt(z.string().parse(item.payload.priceBaseUnits)),
      commissionPolicy.parse(row.payload.policy),
      1,
    ).reserved.toString(),
    policy,
    source: "NATIVE_ONCHAIN",
    trustMode: "NATIVE_ONCHAIN",
    eligibility: "open",
    availableRewards: "0",
    pendingSales: 0,
    proceedsClaimable: "0",
    sales: counts([]),
    links: 0,
    budgetAlertSales: 5,
    endsAt: row.payload.endsAt,
    scheduledPolicyHash: null,
  };
};
export { timestamp };
