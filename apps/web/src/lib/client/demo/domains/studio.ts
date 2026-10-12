import { allocatePolicyReward, computeReward, hashPolicy } from "@spoke/protocol";
import { DAY, demoId, iso } from "../../../../demo/world/ids";
import {
  templatePolicy,
  type MerchantTemplate,
  type TemplateTerms,
} from "../../../../demo/world/seed-growth-core-templates";
import type { DemoWorld, PolicyTemplate } from "../../../../demo/world/world";
import type { PartialHandlers } from "../handler";
import { merchantFor } from "./growth-scope";

const four = [5000, 2500, 1500, 1000];
const three = [6000, 2500, 1500];

const startingPoints: readonly (TemplateTerms & { slug: string; name: string })[] = [
  {
    slug: "developer-tools",
    name: "Developer tools",
    commissionBps: 1000,
    weightsBps: four,
    holdSeconds: 7 * 86_400,
  },
  {
    slug: "templates-and-kits",
    name: "Templates and kits",
    commissionBps: 1500,
    weightsBps: three,
    holdSeconds: 3 * 86_400,
  },
  {
    slug: "courses",
    name: "Courses",
    commissionBps: 1200,
    weightsBps: four,
    holdSeconds: 14 * 86_400,
  },
  {
    slug: "research-and-reports",
    name: "Research and reports",
    commissionBps: 1500,
    weightsBps: three,
    holdSeconds: 7 * 86_400,
    shortPathMode: "RETURN_UNUSED",
  },
  {
    slug: "design-assets",
    name: "Design assets",
    commissionBps: 1000,
    weightsBps: [7000, 3000],
    holdSeconds: 3 * 86_400,
  },
  {
    slug: "community-access",
    name: "Community access",
    commissionBps: 2000,
    weightsBps: [4000, 2500, 1500, 1200, 800],
    holdSeconds: 14 * 86_400,
    shortPathMode: "RETURN_UNUSED",
  },
  {
    slug: "testnet-quick-cycle",
    name: "Testnet quick cycle",
    commissionBps: 1000,
    weightsBps: four,
    holdSeconds: 600,
  },
];

const spokeTemplates = (world: DemoWorld): PolicyTemplate[] =>
  startingPoints.map((terms) => ({
    id: `spoke-${terms.slug}`,
    name: terms.name,
    policy: templatePolicy(world.tokens.sdusd.address, terms),
    status: "active",
    createdAt: iso(world.anchor - 180 * DAY),
  }));

const wire = (template: MerchantTemplate): PolicyTemplate => ({
  id: template.id,
  name: template.name,
  policy: template.policy,
  status: template.status,
  createdAt: template.createdAt,
});

export const studioReads = {
  "studio.templates": (_input, runtime) => {
    const merchant = merchantFor(runtime);
    const mine = runtime.world.templates
      .filter((template) => template.merchantId === merchant.id)
      .sort((a, b) => a.name.localeCompare(b.name) || a.createdAt.localeCompare(b.createdAt))
      .map(wire);
    return [...spokeTemplates(runtime.world), ...mine];
  },
  "studio.simulate": (input) => {
    const reward = computeReward(
      BigInt(input.price),
      input.policy.commissionBps,
      BigInt(input.policy.perSaleCap),
    );
    return {
      policyHash: hashPolicy(input.policy),
      simulations: input.pathLengths.map((pathLength) => {
        const split = allocatePolicyReward(reward, input.policy, pathLength);
        return {
          pathLength,
          weightsBps: split.weightsBps,
          amounts: split.amounts.map((amount) => amount.toString()),
          reserved: split.reserved.toString(),
          unallocated: split.unallocated.toString(),
        };
      }),
    };
  },
} satisfies PartialHandlers<"studio">;

export const studioWrites = {
  "studio.saveTemplate": (input, runtime) => {
    const merchant = merchantFor(runtime);
    const template: MerchantTemplate = {
      id: demoId("tpl", runtime.nextId("template")),
      name: input.name.trim(),
      policy: input.policy,
      status: "active",
      createdAt: iso(runtime.now()),
      merchantId: merchant.id,
    };
    runtime.world.templates.push(template);
    return wire(template);
  },
} satisfies PartialHandlers<"studio">;
