import type { CommissionPolicy } from "@spoke/protocol";
import { zeroHash, type Address } from "viem";
import { units } from "./catalog";
import { DAY, HOUR, demoId, iso } from "./ids";
import type { DemoCampaign, DemoCore, DemoId } from "./types";
import type { PolicyTemplate } from "./world";

export type MerchantTemplate = PolicyTemplate & { merchantId: DemoId };

export interface TemplateTerms {
  commissionBps: number;
  weightsBps: readonly number[];
  holdSeconds: number;
  shortPathMode?: CommissionPolicy["shortPathMode"];
}

export const TEMPLATE_CAP = units(10_000);

export const templatePolicy = (rewardToken: Address, terms: TemplateTerms): CommissionPolicy => ({
  rewardToken,
  commissionBps: terms.commissionBps,
  perSaleCap: TEMPLATE_CAP.toString(),
  campaignLiabilityCap: TEMPLATE_CAP.toString(),
  maxRewardedAncestors: terms.weightsBps.length,
  weightsBps: [...terms.weightsBps],
  shortPathMode: terms.shortPathMode ?? "RENORMALIZE_EXISTING",
  holdSeconds: terms.holdSeconds,
  expiry: "0",
  eligibilityHash: zeroHash,
});

const policyOf = (campaign: DemoCampaign, version: number): CommissionPolicy => {
  const found = campaign.policies.find((candidate) => candidate.version === version);
  if (!found) throw new RangeError(`Campaign ${campaign.id} has no policy v${String(version)}.`);
  return found.policy;
};

const publishedAt = (campaign: DemoCampaign, version: number): number =>
  campaign.policies.find((candidate) => candidate.version === version)?.publishedAt ??
  campaign.createdAt;

const templateFamilies = (packs: DemoCampaign, brand: DemoCampaign, portal: DemoCampaign) => [
  {
    name: "Template packs · four levels",
    status: "active" as const,
    versions: [
      { key: "packs-v1", at: packs.createdAt - DAY, policy: policyOf(packs, 1) },
      { key: "packs-v2", at: publishedAt(packs, 2) - HOUR, policy: policyOf(packs, 2) },
    ],
  },
  {
    name: "Brand kits · nearest-heavy",
    status: "active" as const,
    versions: [
      {
        key: "brand-v1",
        at: brand.createdAt - 3 * DAY,
        policy: { ...policyOf(brand, 1), maxRewardedAncestors: 2, weightsBps: [7000, 3000] },
      },
      { key: "brand-v2", at: brand.createdAt - DAY, policy: policyOf(brand, 1) },
    ],
  },
  {
    name: "Notion portal · long hold",
    status: "archived" as const,
    versions: [
      {
        key: "portal-v1",
        at: portal.createdAt - 4 * DAY,
        policy: { ...policyOf(portal, 1), holdSeconds: 3 * 86_400 },
      },
      { key: "portal-v2", at: portal.createdAt - DAY, policy: policyOf(portal, 1) },
    ],
  },
];

export const seedTemplates = (core: DemoCore): MerchantTemplate[] => {
  const campaign = (n: number) =>
    core.campaigns.find((candidate) => candidate.id === demoId("c", n));
  const [packs, brand, portal] = [campaign(1), campaign(2), campaign(3)];
  if (!packs || !brand || !portal) return [];
  return templateFamilies(packs, brand, portal).flatMap((family) =>
    family.versions.map((version) => ({
      id: demoId("tpl", version.key),
      name: family.name,
      policy: version.policy,
      status: family.status,
      createdAt: iso(version.at),
      merchantId: packs.merchantId,
    })),
  );
};
