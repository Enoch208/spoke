import { hashPolicy, type CommissionPolicy } from "@spoke/protocol";
import { zeroHash } from "viem";
import { tokens, units } from "./catalog";
import { DAY, HOUR, demoId, sampleHash } from "./ids";
import type { DemoCampaign, DemoPolicyVersion, TokenKey } from "./types";

interface Terms {
  commissionBps: number;
  weightsBps: number[];
  holdSeconds: number;
  perSaleCap: bigint;
  liabilityCap: bigint;
  shortPathMode?: CommissionPolicy["shortPathMode"];
  inviteOnly?: boolean;
}

const policyOf = (
  token: TokenKey,
  endsAt: number,
  terms: Terms,
  campaignKey: string,
): CommissionPolicy => ({
  rewardToken: tokens[token].address,
  commissionBps: terms.commissionBps,
  perSaleCap: terms.perSaleCap.toString(),
  campaignLiabilityCap: terms.liabilityCap.toString(),
  maxRewardedAncestors: terms.weightsBps.length,
  weightsBps: terms.weightsBps,
  shortPathMode: terms.shortPathMode ?? "RENORMALIZE_EXISTING",
  holdSeconds: terms.holdSeconds,
  expiry: String(Math.floor(endsAt / 1000)),
  eligibilityHash: terms.inviteOnly ? sampleHash(`eligibility:${campaignKey}`) : zeroHash,
});

export const versionOf = (
  version: number,
  publishedAt: number,
  effectiveAt: number,
  policy: CommissionPolicy,
): DemoPolicyVersion => ({ version, publishedAt, effectiveAt, policy, hash: hashPolicy(policy) });

interface Row {
  n: number;
  merchant: number;
  product: number;
  token: TokenKey;
  createdDaysAgo: number;
  endsInDays: number;
  status: DemoCampaign["status"];
  kind?: DemoCampaign["kind"];
  trustMode?: DemoCampaign["trustMode"];
  terms: Terms;
  next?: { terms: Terms; publishedDaysAgo: number; effectiveInDays: number };
  drill?: boolean;
}

const four = [5000, 2500, 1500, 1000];

const rows: readonly Row[] = [
  {
    n: 1,
    merchant: 1,
    product: 1,
    token: "sdusd",
    createdDaysAgo: 88,
    endsInDays: 60,
    status: "active",
    terms: {
      commissionBps: 2000,
      weightsBps: four,
      holdSeconds: 3 * 86_400,
      perSaleCap: units(20),
      liabilityCap: units(2500),
    },
    next: {
      terms: {
        commissionBps: 2500,
        weightsBps: four,
        holdSeconds: 86_400,
        perSaleCap: units(20),
        liabilityCap: units(2500),
      },
      publishedDaysAgo: 23,
      effectiveInDays: -21,
    },
  },
  {
    n: 2,
    merchant: 1,
    product: 2,
    token: "sdusd",
    createdDaysAgo: 70,
    endsInDays: 20,
    status: "paused",
    terms: {
      commissionBps: 1500,
      weightsBps: [6000, 2500, 1500],
      holdSeconds: 3 * 86_400,
      perSaleCap: units(15),
      liabilityCap: units(400),
    },
  },
  {
    n: 3,
    merchant: 1,
    product: 3,
    token: "sdusd",
    createdDaysAgo: 90,
    endsInDays: -10,
    status: "ended",
    drill: true,
    terms: {
      commissionBps: 2000,
      weightsBps: four,
      holdSeconds: 7 * 86_400,
      perSaleCap: units(10),
      liabilityCap: units(600),
    },
  },
  {
    n: 4,
    merchant: 2,
    product: 7,
    token: "sdusd",
    createdDaysAgo: 60,
    endsInDays: 30,
    status: "active",
    terms: {
      commissionBps: 3000,
      weightsBps: [7000, 3000],
      holdSeconds: 86_400,
      perSaleCap: units(10),
      liabilityCap: units(160),
    },
  },
  {
    n: 5,
    merchant: 2,
    product: 8,
    token: "sdusd",
    createdDaysAgo: 45,
    endsInDays: 45,
    status: "active",
    terms: {
      commissionBps: 2000,
      weightsBps: [5000, 3000, 2000],
      holdSeconds: 3 * 86_400,
      perSaleCap: units(12),
      liabilityCap: units(400),
      inviteOnly: true,
    },
  },
  {
    n: 6,
    merchant: 3,
    product: 9,
    token: "sdeur",
    createdDaysAgo: 50,
    endsInDays: 40,
    status: "active",
    terms: {
      commissionBps: 2000,
      weightsBps: [6000, 3000, 1000],
      holdSeconds: 3600,
      perSaleCap: units(8),
      liabilityCap: units(500),
      shortPathMode: "RETURN_UNUSED",
    },
    next: {
      terms: {
        commissionBps: 1500,
        weightsBps: [6000, 3000, 1000],
        holdSeconds: 3600,
        perSaleCap: units(8),
        liabilityCap: units(500),
        shortPathMode: "RETURN_UNUSED",
      },
      publishedDaysAgo: 1,
      effectiveInDays: 2,
    },
  },
  {
    n: 7,
    merchant: 4,
    product: 10,
    token: "sdusd",
    createdDaysAgo: 2,
    endsInDays: 30,
    status: "unfunded",
    terms: {
      commissionBps: 2000,
      weightsBps: four,
      holdSeconds: 600,
      perSaleCap: units(15),
      liabilityCap: units(300),
    },
  },
  {
    n: 8,
    merchant: 5,
    product: 11,
    token: "sdusd",
    createdDaysAgo: 80,
    endsInDays: 90,
    status: "active",
    kind: "subscription",
    terms: {
      commissionBps: 1000,
      weightsBps: [8000, 2000],
      holdSeconds: 7 * 86_400,
      perSaleCap: units(1),
      liabilityCap: units(100),
    },
  },
  {
    n: 9,
    merchant: 6,
    product: 12,
    token: "sdusd",
    createdDaysAgo: 85,
    endsInDays: -5,
    status: "active",
    kind: "external",
    trustMode: "MERCHANT_ATTESTED",
    terms: {
      commissionBps: 1000,
      weightsBps: [10_000],
      holdSeconds: 14 * 86_400,
      perSaleCap: units(3),
      liabilityCap: units(100),
    },
  },
];

const historyOf = (
  status: DemoCampaign["status"],
  createdAt: number,
  endsAt: number,
  anchor: number,
): DemoCampaign["history"] => {
  if (status === "unfunded") return [];
  const activated = { kind: "activated" as const, at: createdAt + HOUR };
  if (status === "paused") return [activated, { kind: "paused", at: anchor - 3 * DAY }];
  if (status === "ended") return [activated, { kind: "ended", at: endsAt }];
  return [activated];
};

export const campaigns = (anchor: number): DemoCampaign[] =>
  rows.map((row) => {
    const key = `c-${String(row.n)}`;
    const createdAt = anchor - row.createdDaysAgo * DAY;
    const endsAt = anchor + row.endsInDays * DAY;
    const policies = [
      versionOf(1, createdAt, createdAt, policyOf(row.token, endsAt, row.terms, key)),
    ];
    if (row.next) {
      const effectiveAt = anchor + row.next.effectiveInDays * DAY + HOUR;
      policies.push(
        versionOf(
          2,
          anchor - row.next.publishedDaysAgo * DAY,
          effectiveAt,
          policyOf(row.token, endsAt, row.next.terms, key),
        ),
      );
    }
    return {
      id: demoId("c", row.n),
      merchantId: demoId("m", row.merchant),
      productId: demoId("p", row.product),
      token: row.token,
      createdAt,
      endsAt,
      status: row.status,
      inviteOnly: row.terms.inviteOnly ?? false,
      trustMode: row.trustMode ?? "NATIVE_ONCHAIN",
      kind: row.kind ?? "standard",
      policies,
      budgetAlertSales: 5,
      hidden: false,
      drill: row.drill ?? false,
      history: historyOf(row.status, createdAt, endsAt, anchor),
    };
  });
