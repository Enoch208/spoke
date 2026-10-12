import type { DemoPerson } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { personById, personByAddress } from "../views/basics";
import { profileOf } from "../views/reputation";

const personFor = (world: DemoWorld, key: string): DemoPerson | undefined => {
  const lowered = key.toLowerCase().replace(/^@/, "");
  if (lowered.startsWith("0x")) return personByAddress(world, lowered);
  return world.people.find(
    (person) =>
      person.handle !== null && (person.handle === lowered || person.handle === `demo-${lowered}`),
  );
};

export const reputationReads = {
  "reputation.get": (input, runtime) => {
    const world = runtime.world;
    const person = found(personFor(world, input.addressOrHandle), "Profile");
    if (person.visibility === "private" && person.id !== runtime.personaId())
      return { hidden: true as const };
    const base = profileOf(world, person, runtime.personaId(), runtime.now());
    if (person.id === runtime.personaId()) return base;
    const fields = world.accounts[person.id]?.profile.shownFields ?? [];
    const conversions = fields.includes("settledConversions");
    const pseudo = person.visibility === "pseudonymous";
    return {
      ...base,
      subject: pseudo ? null : base.subject,
      displayName: pseudo ? null : base.displayName,
      settledConversions: conversions ? base.settledConversions : null,
      directConversions: conversions ? base.directConversions : null,
      networkConversions: conversions ? base.networkConversions : null,
      netAttributedValue: fields.includes("netAttributedValue") ? base.netAttributedValue : null,
      settledCommission: null,
      median: fields.includes("netAttributedValue") ? base.median : null,
      merchantCount: fields.includes("merchantCount") ? base.merchantCount : null,
      campaignCount: fields.includes("campaignCount") ? base.campaignCount : null,
      refundAdjustment: fields.includes("refundAdjustment") ? base.refundAdjustment : null,
      pendingConversions: null,
      evidencePeriod: conversions ? base.evidencePeriod : { from: null, to: null },
      evidence: pseudo ? { items: [], nextCursor: null } : base.evidence,
      perMerchant: pseudo ? [] : base.perMerchant,
      perCampaign: pseudo ? [] : base.perCampaign,
      visibleFields: fields,
      indexing: pseudo ? ("noindex" as const) : ("index" as const),
    };
  },
  "reputation.mine": (_input, runtime) =>
    profileOf(
      runtime.world,
      found(personById(runtime.world, runtime.personaId()), "Profile"),
      runtime.personaId(),
      runtime.now(),
    ),
} satisfies PartialHandlers<"reputation">;

export const reputationWrites = {
  "reputation.updateVisibility": (input, runtime) => {
    const world = runtime.world;
    const person = found(personById(world, runtime.personaId()), "Profile");
    if (input.fields.length && !input.fields.includes("refundAdjustment"))
      return fail("VALIDATION_FAILED", "Performance stats always show the refund adjustment.");
    person.visibility = input.level;
    person.acceptsInvitations = input.acceptsInvitations;
    const account = world.accounts[person.id];
    if (account) account.profile.shownFields = [...input.fields];
    return {
      level: person.visibility,
      fields: input.fields,
      acceptsInvitations: person.acceptsInvitations,
    };
  },
} satisfies PartialHandlers<"reputation">;
