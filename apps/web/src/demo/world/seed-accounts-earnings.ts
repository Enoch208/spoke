import type { Address } from "viem";
import { productTitle, sdusdOnly, tokenText, when, type NoticeSpec } from "./seed-accounts-copy";
import type { DemoAllocation, DemoCampaign, DemoCore, DemoSale } from "./types";

interface Share {
  sale: DemoSale;
  allocation: DemoAllocation;
  campaign: DemoCampaign;
}

export const campaignById = (core: DemoCore, id: string): DemoCampaign | undefined =>
  core.campaigns.find((campaign) => campaign.id === id);

const sharesOf = (core: DemoCore, address: Address): Share[] =>
  core.sales.flatMap((sale) => {
    const campaign = campaignById(core, sale.campaignId);
    if (!campaign) return [];
    return sale.allocations
      .filter((allocation) => allocation.owner === address)
      .map((allocation) => ({ sale, allocation, campaign }));
  });

export const newest = <T>(rows: readonly T[], at: (row: T) => number, count: number): T[] =>
  [...rows].sort((a, b) => at(b) - at(a)).slice(0, count);

const shareText = (core: DemoCore, share: Share) =>
  tokenText(core, share.allocation.amount, share.campaign.token);

const earningsSpec = (
  share: Share,
  at: number,
  title: string,
  body: string,
  href: string,
): NoticeSpec => ({
  kind: "sale.reserved",
  category: "earnings",
  workspace: "earn",
  title,
  body,
  href,
  at,
  ...sdusdOnly(share.campaign.token, share.allocation.amount),
});

export const earningsNotices = (core: DemoCore, address: Address): NoticeSpec[] => {
  const shares = sharesOf(core, address);
  const a = core.anchor;
  const pending = shares.filter((share) => share.sale.status === "PENDING");
  const reserved = newest(
    pending.filter((share) => share.sale.unlockAt > a),
    (share) => share.sale.purchasedAt,
    2,
  ).map((share) => ({
    ...earningsSpec(
      share,
      share.sale.purchasedAt,
      "New sale through your link",
      `${productTitle(core, share.campaign)} sold through your network. ${shareText(core, share)} is reserved for you, not yet withdrawable. Claimable after ${when(share.sale.unlockAt)} unless refunded.`,
      `/earn/earnings?campaign=${share.campaign.id}`,
    ),
  }));
  const ready = pending
    .filter((share) => share.sale.unlockAt <= a)
    .map((share) => ({
      ...earningsSpec(
        share,
        share.sale.unlockAt,
        "Ready to finalize",
        `The hold on a ${productTitle(core, share.campaign)} sale has ended. Finalizing it makes your ${shareText(core, share)} claimable.`,
        "/earn/payouts#finalize",
      ),
      kind: "sale.readyToFinalize" as const,
    }));
  const settled = newest(
    shares.filter((share) => share.sale.finalizedAt !== null),
    (share) => share.sale.finalizedAt ?? 0,
    2,
  ).map((share) => ({
    ...earningsSpec(
      share,
      share.sale.finalizedAt ?? a,
      "Earnings settled",
      `Commission is settled and ready to claim. ${shareText(core, share)} from ${productTitle(core, share.campaign)}. View the proof.`,
      "/earn/payouts#claim",
    ),
    kind: "sale.finalized" as const,
  }));
  const refunded = newest(
    shares.filter((share) => share.sale.status === "REFUNDED" && !share.sale.reversed),
    (share) => share.sale.refundedAt ?? 0,
    1,
  ).map((share) => {
    const merchant =
      core.merchants.find((candidate) => candidate.id === share.campaign.merchantId)?.name ??
      "The merchant";
    return {
      ...earningsSpec(
        share,
        share.sale.refundedAt ?? a,
        "Sale refunded",
        `${merchant} refunded a ${productTitle(core, share.campaign)} sale. Your ${shareText(core, share)} share was cancelled.`,
        `/earn/earnings?campaign=${share.campaign.id}`,
      ),
      kind: "sale.refunded" as const,
    };
  });
  const claims = newest(
    core.claims.filter((claim) => claim.claimant === address && claim.source === "REWARD"),
    (claim) => claim.at,
    2,
  ).map((claim): NoticeSpec => ({
    kind: "claim.confirmed",
    category: "earnings",
    workspace: "earn",
    title: "Claim confirmed",
    body: `You claimed ${tokenText(core, claim.amount, claim.token)}. It's in your wallet.`,
    href: "/wallet",
    at: claim.at,
    ...sdusdOnly(claim.token, claim.amount),
  }));
  return [...reserved, ...ready, ...settled, ...refunded, ...claims];
};
