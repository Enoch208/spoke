import type { Address } from "viem";
import { units } from "./catalog";
import { DAY, demoId } from "./ids";
import type { Random } from "./random";
import { reservedOf } from "./sale-math";
import { budgetHeadroom, personaClaimDays, proceedsClaimDays, withdrawals } from "./sale-script";
import type {
  DemoCampaign,
  DemoClaim,
  DemoFunding,
  DemoMerchant,
  DemoSale,
  TokenKey,
} from "./types";

interface SettlementInput {
  anchor: number;
  campaigns: readonly DemoCampaign[];
  merchants: readonly DemoMerchant[];
  sales: DemoSale[];
  personaAddress: Address;
  random: Random;
}

const tokenOf = (campaigns: readonly DemoCampaign[], campaignId: string): TokenKey =>
  campaigns.find((campaign) => campaign.id === campaignId)?.token ?? "sdusd";

const rewardClaimTimes = (claimant: Address, input: SettlementInput): number[] =>
  claimant === input.personaAddress
    ? personaClaimDays.map((days) => input.anchor - days * DAY)
    : input.random.chance(0.7)
      ? [input.anchor - input.random.int(3, 50) * DAY].concat(
          input.random.chance(0.4) ? [input.anchor - input.random.int(51, 80) * DAY] : [],
        )
      : [];

const claimRewards = (input: SettlementInput, claims: DemoClaim[]) => {
  const claimants = [
    ...new Set(
      input.sales.flatMap((sale) => sale.allocations.map((allocation) => allocation.owner)),
    ),
  ];
  for (const claimant of claimants) {
    const times = rewardClaimTimes(claimant, input).sort((a, b) => a - b);
    for (const at of times) {
      for (const token of ["sdusd", "sdeur"] as const) {
        const due = input.sales.filter(
          (sale) =>
            sale.status === "FINALIZED" &&
            sale.finalizedAt !== null &&
            sale.finalizedAt < at &&
            tokenOf(input.campaigns, sale.campaignId) === token,
        );
        const owed = due.flatMap((sale) =>
          sale.allocations.filter(
            (allocation) => allocation.owner === claimant && allocation.claimId === null,
          ),
        );
        const amount = owed.reduce((sum, allocation) => sum + allocation.amount, 0n);
        if (amount === 0n) continue;
        const id = demoId("claim", claims.length + 1);
        for (const allocation of owed) allocation.claimId = id;
        claims.push({ id, claimant, token, amount, at, source: "REWARD", campaignId: null });
      }
    }
  }
};

const claimProceeds = (input: SettlementInput, claims: DemoClaim[]) => {
  for (const campaign of input.campaigns) {
    const number = Number(campaign.id.split("-").at(-1));
    const merchant = input.merchants.find((candidate) => candidate.id === campaign.merchantId);
    if (!merchant) continue;
    for (const days of proceedsClaimDays[number] ?? []) {
      const at = input.anchor - days * DAY;
      const due = input.sales.filter(
        (sale) =>
          sale.campaignId === campaign.id &&
          sale.status === "FINALIZED" &&
          sale.finalizedAt !== null &&
          sale.finalizedAt < at &&
          sale.proceedsClaimId === null,
      );
      const amount = due.reduce((sum, sale) => sum + sale.price, 0n);
      if (amount === 0n) continue;
      const id = demoId("claim", claims.length + 1);
      for (const sale of due) sale.proceedsClaimId = id;
      claims.push({
        id,
        claimant: merchant.address,
        token: campaign.token,
        amount,
        at,
        source: "SALE_PROCEEDS",
        campaignId: campaign.id,
      });
    }
  }
};

const fund = (input: SettlementInput): DemoFunding[] =>
  input.campaigns.flatMap((campaign) => {
    const number = Number(campaign.id.split("-").at(-1));
    const headroom = budgetHeadroom[number];
    if (campaign.status === "unfunded" || !headroom) return [];
    const committed = input.sales
      .filter((sale) => sale.campaignId === campaign.id && sale.status !== "REFUNDED")
      .reduce((sum, sale) => sum + reservedOf(sale), 0n);
    const withdrawal = withdrawals[number];
    const withdrawn = withdrawal ? units(withdrawal[0]) : 0n;
    const total = committed + units(headroom[0], headroom[1]) + withdrawn;
    const initial = (total * 6n) / 10n;
    const rows: DemoFunding[] = [
      {
        id: demoId("fund", `${String(number)}-1`),
        campaignId: campaign.id,
        kind: "deposited",
        amount: initial,
        at: campaign.createdAt + DAY / 24,
      },
      {
        id: demoId("fund", `${String(number)}-2`),
        campaignId: campaign.id,
        kind: "deposited",
        amount: total - initial,
        at: Math.round((campaign.createdAt + input.anchor) / 2),
      },
    ];
    if (withdrawal)
      rows.push({
        id: demoId("fund", `${String(number)}-w`),
        campaignId: campaign.id,
        kind: "withdrawn",
        amount: withdrawn,
        at: input.anchor - withdrawal[1] * DAY,
      });
    return rows;
  });

export const buildSettlement = (input: SettlementInput) => {
  const claims: DemoClaim[] = [];
  claimRewards(input, claims);
  claimProceeds(input, claims);
  return { claims: claims.sort((a, b) => a.at - b.at), fundings: fund(input) };
};
