import { DAY, HOUR } from "./ids";
import { businessNotices, partnerNotices, sell } from "./seed-accounts-business";
import {
  availableOf,
  payoutNotice,
  perSaleOf,
  productTitle,
  sdusdOnly,
  tokenText,
  when,
  type NoticeSpec,
} from "./seed-accounts-copy";
import type { DemoCampaign, DemoCore, DemoMerchant, DemoSale } from "./types";

const REFUND_REQUEST_NODES = ["demo-n-1-ines", "demo-n-1-daniel"];

const latest = (values: readonly number[], fallback: number): number =>
  values.length ? Math.max(...values) : fallback;

const budgetNotice = (
  core: DemoCore,
  campaign: DemoCampaign,
  lastSale: number,
): NoticeSpec | null => {
  const title = productTitle(core, campaign);
  const href = `/sell/vault?campaign=${campaign.id}`;
  const perSale = perSaleOf(core, campaign, core.anchor);
  if (perSale === 0n) return null;
  const available = availableOf(core, campaign);
  if (available < perSale)
    return sell(
      "campaign.exhausted",
      "Reward budget used up",
      `${title}: new referred sales are refused until you add budget. Direct sales still go through.`,
      href,
      lastSale,
    );
  const salesLeft = Number(available / perSale);
  if (salesLeft >= campaign.budgetAlertSales) return null;
  return sell(
    "campaign.budgetLow",
    "Reward budget low",
    `${title} has budget for about ${String(salesLeft)} more ${salesLeft === 1 ? "sale" : "sales"}.`,
    href,
    lastSale,
  );
};

const campaignNotices = (core: DemoCore, campaign: DemoCampaign, sales: readonly DemoSale[]) => {
  const title = productTitle(core, campaign);
  const live = campaign.history
    .filter((event) => event.kind === "activated")
    .map((event) =>
      sell(
        "campaign.live",
        "Campaign is live",
        `${title} is live. Anyone can now create a link.`,
        `/sell/campaigns/${campaign.id}`,
        event.at,
      ),
    );
  const open = campaign.status === "active" || campaign.status === "paused";
  if (!open || campaign.endsAt <= core.anchor) return live;
  const own = sales.filter((sale) => sale.campaignId === campaign.id);
  const budget = budgetNotice(
    core,
    campaign,
    latest(
      own.map((sale) => sale.purchasedAt),
      campaign.createdAt,
    ),
  );
  return budget ? [...live, budget] : live;
};

const salesNotices = (
  core: DemoCore,
  merchant: DemoMerchant,
  campaigns: readonly DemoCampaign[],
  sales: readonly DemoSale[],
): NoticeSpec[] => {
  const a = core.anchor;
  const withCampaign = sales.flatMap((sale) => {
    const campaign = campaigns.find((candidate) => candidate.id === sale.campaignId);
    return campaign ? [{ sale, campaign, title: productTitle(core, campaign) }] : [];
  });
  const fresh = withCampaign
    .filter(({ sale }) => sale.status !== "REFUNDED")
    .sort((x, y) => y.sale.purchasedAt - x.sale.purchasedAt)
    .slice(0, 2)
    .map(({ sale, campaign, title }) =>
      sell(
        "sale.new",
        "New sale",
        `${title} sold for ${tokenText(core, sale.price, campaign.token)}. Proceeds are held until ${when(sale.unlockAt)}.`,
        `/sell/sales/${sale.id}`,
        sale.purchasedAt,
        sdusdOnly(campaign.token, sale.price),
      ),
    );
  const ready = sales.filter((sale) => sale.status === "PENDING" && sale.unlockAt <= a);
  const readyNotice = ready.length
    ? [
        sell(
          "sale.readyToFinalize",
          `${String(ready.length)} sales ready to finalize`,
          "Their holds ended. Finalize to make proceeds and commissions claimable.",
          "/sell/sales?state=pending",
          latest(
            ready.map((sale) => sale.unlockAt),
            a,
          ),
        ),
      ]
    : [];
  const unclaimed = withCampaign.filter(
    ({ sale, campaign }) =>
      sale.status === "FINALIZED" && sale.proceedsClaimId === null && campaign.token === "sdusd",
  );
  const owed = unclaimed.reduce((total, { sale }) => total + sale.price, 0n);
  const proceeds =
    owed > 0n
      ? [
          sell(
            "sale.finalized",
            "Proceeds ready",
            `${tokenText(core, owed, "sdusd")} from finalized sales is ready to claim.`,
            "/sell/vault",
            latest(
              unclaimed.map(({ sale }) => sale.finalizedAt ?? a),
              a,
            ),
            { amount: owed },
          ),
        ]
      : [];
  const requests = withCampaign
    .filter(
      ({ sale }) => sale.status === "PENDING" && REFUND_REQUEST_NODES.includes(sale.nodeId ?? ""),
    )
    .map(({ sale, title }) =>
      sell(
        "refund.requested",
        "Refund requested",
        `A buyer asked for a refund on sale #${sale.id} (${title}). You can refund until ${when(sale.unlockAt)}.`,
        "/sell/disputes?tab=requests",
        sale.purchasedAt + 3 * HOUR,
      ),
    );
  const claims = core.claims
    .filter((claim) => claim.source === "SALE_PROCEEDS" && claim.claimant === merchant.address)
    .sort((x, y) => y.at - x.at)
    .slice(0, 1)
    .map((claim) =>
      sell(
        "claim.confirmed",
        "Claim confirmed",
        `You claimed ${tokenText(core, claim.amount, claim.token)}. It's in your wallet.`,
        `/wallet?address=${merchant.address}`,
        claim.at,
        sdusdOnly(claim.token, claim.amount),
      ),
    );
  return [...fresh, ...readyNotice, ...proceeds, ...requests, ...claims];
};

export const merchantNotices = (core: DemoCore, personId: string): NoticeSpec[] =>
  core.merchants
    .filter((merchant) => merchant.ownerId === personId && merchant.closedAt === null)
    .flatMap((merchant) => {
      const campaigns = core.campaigns.filter((campaign) => campaign.merchantId === merchant.id);
      const sales = core.sales.filter((sale) =>
        campaigns.some((campaign) => campaign.id === sale.campaignId),
      );
      return [
        ...campaigns.flatMap((campaign) => campaignNotices(core, campaign, sales)),
        ...salesNotices(core, merchant, campaigns, sales),
        ...partnerNotices(core, campaigns),
        ...businessNotices(core, merchant, campaigns),
        { ...payoutNotice(merchant.address), at: core.anchor - 58 * DAY },
      ];
    });
