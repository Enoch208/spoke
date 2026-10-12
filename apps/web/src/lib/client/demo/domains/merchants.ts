import { sha256 } from "viem";
import { MINUTE, demoId, sampleAddress, sampleHash } from "../../../../demo/world/ids";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { blockAt, page, sum } from "../views/basics";
import { campaignCard, isLive, merchantWire } from "../views/catalog";
import { merchantOrgWire, merchantsOwnedBy, requireMerchant } from "../views/merchant-org";
import { countsOf, proceedsLedgerOf, rewardLedgerOf } from "../views/settlement";

const reservedSlugs = new Set([
  "admin",
  "spoke",
  "support",
  "help",
  "api",
  "demo",
  "sample",
  "official",
  "team",
  "sell",
]);
const slugPattern = /^[a-z][a-z0-9_]+$/;

const bySlug = (world: DemoWorld, slug: string) =>
  world.merchants.find((merchant) => merchant.slug === slug || merchant.slug === `demo-${slug}`);

const slugCheck = (world: DemoWorld, slug: string, self?: DemoMerchant) => {
  if (!slugPattern.test(slug) || slug.length < 3 || slug.length > 30)
    return { available: false, reason: "invalid" as const };
  if (reservedSlugs.has(slug)) return { available: false, reason: "reserved" as const };
  const owner = bySlug(world, slug);
  if (owner && owner !== self) return { available: false, reason: "taken" as const };
  return { available: true, reason: null };
};

const verifiedTier = (merchant: DemoMerchant, now: number): DemoMerchant["verificationTier"] =>
  merchant.verificationTier === "unverified" &&
  merchant.verification &&
  now >= merchant.verification.requestedAt + MINUTE
    ? "domain"
    : merchant.verificationTier;

const withTier = (merchant: DemoMerchant, now: number): DemoMerchant => ({
  ...merchant,
  verificationTier: verifiedTier(merchant, now),
});

const record = (world: DemoWorld, merchant: DemoMerchant, now: number) => {
  const campaigns = world.campaigns.filter((campaign) => campaign.merchantId === merchant.id);
  const sales = world.sales.filter((sale) =>
    campaigns.some((campaign) => campaign.id === sale.campaignId),
  );
  const counts = countsOf(sales);
  const refundTimes = sales
    .flatMap((sale) =>
      sale.refundedAt === null ? [] : [Math.round((sale.refundedAt - sale.purchasedAt) / 1000)],
    )
    .sort((a, b) => a - b);
  const ledgers = campaigns.map((campaign) => rewardLedgerOf(world, campaign));
  const decided = counts.finalized + counts.refunded;
  return {
    sales: counts,
    refundRateBps: decided ? Math.round((counts.refunded * 10_000) / decided) : 0,
    medianRefundSeconds: refundTimes.length
      ? (refundTimes[Math.floor(refundTimes.length / 2)] ?? null)
      : null,
    rewardsDeposited: sum(ledgers.map((ledger) => ledger.netDeposited)).toString(),
    rewardsEarned: sum(
      ledgers.map((ledger) => ledger.vestedUnclaimed + ledger.rewardsClaimed),
    ).toString(),
    rewardsWithdrawn: sum(ledgers.map((ledger) => ledger.surplusWithdrawn)).toString(),
    indexedBlock: blockAt(now),
  };
};

const closable = (world: DemoWorld, merchant: DemoMerchant, now: number) =>
  world.campaigns
    .filter((campaign) => campaign.merchantId === merchant.id)
    .every((campaign) => {
      const ledger = rewardLedgerOf(world, campaign);
      const proceeds = proceedsLedgerOf(world, campaign);
      const over =
        campaign.status === "ended" || campaign.status === "unfunded" || now >= campaign.endsAt;
      return (
        over &&
        proceeds.proceedsPending === 0n &&
        proceeds.proceedsClaimable === 0n &&
        ledger.available === 0n &&
        ledger.pendingReserved === 0n
      );
    });

const setup = (
  input: DemoInput<"merchants.setup">,
  world: DemoWorld,
  ownerId: DemoMerchant["ownerId"],
  now: number,
): DemoMerchant => {
  if (merchantsOwnedBy(world, ownerId).length)
    return fail("VALIDATION_FAILED", "This account already runs a business.");
  const check = slugCheck(world, input.slug);
  if (!check.available) return fail("SLUG_TAKEN", "That shop address is taken. Try another.");
  const n = world.merchants.length + 1;
  const merchant: DemoMerchant = {
    id: demoId("m", n),
    slug: `demo-${input.slug}`,
    name: input.name,
    ownerId,
    address: sampleAddress(`merchant:${String(n)}:business`),
    description: input.description,
    website: input.website,
    verificationTier: "unverified",
    joinedAt: now,
    region: input.region,
    supportEmail: input.supportEmail,
    budgetAlertSales: input.budgetAlertSales,
    closedAt: null,
    verification: null,
  };
  world.merchants.push(merchant);
  return merchant;
};

export const merchantsReads = {
  "merchants.get": (input, runtime) =>
    merchantWire(
      runtime.world,
      withTier(found(bySlug(runtime.world, input.slug), "Merchant"), runtime.now()),
      runtime.now(),
    ),
  "merchants.record": (input, runtime) =>
    record(runtime.world, found(bySlug(runtime.world, input.slug), "Merchant"), runtime.now()),
  "merchants.me": (_input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    return merchantOrgWire(runtime.world, withTier(merchant, runtime.now()), runtime.now());
  },
  "merchants.slugAvailable": (input, runtime) => {
    const self = merchantsOwnedBy(runtime.world, runtime.personaId())[0];
    const check = slugCheck(runtime.world, input.slug, self);
    const base = input.slug.toLowerCase().replace(/[^a-z0-9_]/g, "") || "shop";
    const suggestion = check.available
      ? null
      : ([
          `${base}_studio`,
          `${base}_shop`,
          `${base}_${String(runtime.world.merchants.length + 1)}`,
        ].find((candidate) => slugCheck(runtime.world, candidate).available) ?? null);
    return { ...check, suggestion };
  },
  "merchants.offers": (input, runtime) => {
    const merchant = found(bySlug(runtime.world, input.slug), "Merchant");
    const now = runtime.now();
    const cards = runtime.world.campaigns
      .filter(
        (campaign) =>
          campaign.merchantId === merchant.id && !campaign.hidden && isLive(campaign, now),
      )
      .map((campaign) => campaignCard(runtime.world, campaign, now));
    return page(cards, input);
  },
} satisfies PartialHandlers<"merchants">;

export const merchantsWrites = {
  "merchants.setup": (input, runtime) =>
    merchantOrgWire(
      runtime.world,
      setup(input, runtime.world, runtime.personaId(), runtime.now()),
      runtime.now(),
    ),
  "merchants.update": (input, runtime) => {
    const world = runtime.world;
    const merchant = requireMerchant(world, runtime.personaId());
    if (input.slug !== undefined && !slugCheck(world, input.slug, merchant).available)
      return fail("SLUG_TAKEN", "That shop address is taken. Try another.");
    if (input.name !== undefined) merchant.name = input.name;
    if (input.slug !== undefined) merchant.slug = `demo-${input.slug.replace(/^demo-/, "")}`;
    if (input.description !== undefined) merchant.description = input.description;
    if (input.website !== undefined) merchant.website = input.website;
    if (input.supportEmail !== undefined) merchant.supportEmail = input.supportEmail;
    if (input.region !== undefined) merchant.region = input.region;
    if (input.budgetAlertSales !== undefined) merchant.budgetAlertSales = input.budgetAlertSales;
    return merchantOrgWire(world, withTier(merchant, runtime.now()), runtime.now());
  },
  "merchants.uploadLogo": async (input) => {
    const hash = sha256(new Uint8Array(await input.file.arrayBuffer())).slice(2);
    return { url: `https://usespoke.xyz/demo/files/logo-${hash.slice(0, 16)}`, sha256: hash };
  },
  "merchants.requestVerification": (input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    const now = runtime.now();
    if (merchant.verification?.domain !== input.domain)
      merchant.verification = { domain: input.domain, requestedAt: now };
    return {
      status:
        verifiedTier(merchant, now) === "unverified" ? ("pending" as const) : ("verified" as const),
      record: {
        type: "TXT" as const,
        name: `_spoke.${input.domain}`,
        value: `spoke-verify=${sampleHash(`verify:${merchant.id}:${input.domain}`).slice(2, 34)}`,
      },
    };
  },
  "merchants.close": (_input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    const now = runtime.now();
    if (!closable(runtime.world, merchant, now))
      return fail(
        "BUSINESS_NOT_CLOSABLE",
        "End every campaign, settle pending sales and withdraw unused rewards before closing the business.",
      );
    merchant.closedAt = now;
    return { ok: true as const };
  },
} satisfies PartialHandlers<"merchants">;
