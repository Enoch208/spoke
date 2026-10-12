import { DAY, HOUR, demoId } from "./ids";
import {
  caseOf,
  latest,
  merchantActor,
  namedActor,
  pathOwners,
  settledIn,
  type CaseContext,
} from "./seed-growth-core-cases";
import type { Dispute } from "./world";

const PATH_APPEAL =
  "My link should have been on this sale's path. The buyer told me they found the pack through my newsletter.";
const MODERATION_NOTE =
  "Hidden from Explore while we review reports that the product page overstates what's included.";
const MODERATION_APPEAL =
  "The page lists exactly what the kit contains. We've added file previews so buyers can check before they pay.";

const pathAppeal = (context: CaseContext): Dispute[] => {
  const { core } = context;
  const sale = settledIn(context, 1, core.anchor - 2 * DAY);
  if (!sale) return [];
  const onPath = pathOwners(sale);
  const appellant = core.people.find(
    (person) =>
      person.isDistributor &&
      person.visibility === "public" &&
      person.id !== core.personas.distributor &&
      !person.addresses.some((address) => onPath.has(address.toLowerCase())),
  );
  const address = appellant?.addresses[0];
  if (!appellant || !address) return [];
  const from = {
    address,
    handle: appellant.handle,
    displayName: appellant.displayName,
    visibility: "public" as const,
  };
  const at = Math.min((sale.finalizedAt ?? sale.unlockAt) + 3 * HOUR, core.anchor - HOUR);
  return [
    caseOf({
      key: "appeal-path",
      sale,
      kind: "attribution_appeal",
      status: "open",
      reason: "Missing from the paid path",
      message: PATH_APPEAL,
      events: [[at, from, "appealOpened", PATH_APPEAL]],
    }),
  ];
};

const moderationAppeal = (context: CaseContext): Dispute[] => {
  const { core, merchant } = context;
  const sale = latest(core.sales.filter((candidate) => candidate.campaignId === demoId("c", 2)));
  if (!sale) return [];
  return [
    caseOf({
      key: "appeal-moderation",
      sale,
      kind: "moderation_appeal",
      status: "appealed",
      reason: "Hidden from Explore",
      message: MODERATION_APPEAL,
      events: [
        [
          core.anchor - 2 * DAY,
          namedActor("Spoke moderation"),
          "moderationActioned",
          MODERATION_NOTE,
        ],
        [core.anchor - DAY, merchantActor(merchant), "appealed", MODERATION_APPEAL],
      ],
    }),
  ];
};

export const seedAppeals = (context: CaseContext): Dispute[] => [
  ...pathAppeal(context),
  ...moderationAppeal(context),
];
