import { demoId, iso } from "../../../../demo/world/ids";
import { policyAt } from "../../../../demo/world/sale-math";
import type { DemoWorld, Invitation } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { addressesOf, ownsAddress, page } from "../views/basics";
import { isLive } from "../views/catalog";
import { merchantFor, ownCampaign } from "./growth-scope";

const NOT_TAKING_LINKS = "This campaign isn't taking new links right now.";

const present = (invitation: Invitation, now: number, world: DemoWorld): Invitation => ({
  ...invitation,
  status:
    invitation.status === "pending" && now >= Date.parse(invitation.expiresAt)
      ? "expired"
      : invitation.status,
  joinedNodeId:
    world.nodes.find(
      (node) =>
        node.campaignId === invitation.campaignId &&
        node.owner.toLowerCase() === invitation.distributor.toLowerCase(),
    )?.id ?? null,
});

const newestFirst = (a: Invitation, b: Invitation) => b.createdAt.localeCompare(a.createdAt);

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const replace = (world: DemoWorld, next: Invitation): Invitation => {
  world.invitations = world.invitations.map((invitation) =>
    invitation.id === next.id ? next : invitation,
  );
  return next;
};

const unanswerable = (invitation: Invitation): string | null => {
  if (invitation.status === "expired") return "This invitation has expired.";
  if (invitation.status === "withdrawn") return "The merchant withdrew this invitation.";
  if (invitation.status !== "pending") return "You already answered this invitation.";
  return null;
};

export const invitationsReads = {
  "invitations.get": (input, runtime) => {
    const mine = addressesOf(runtime.world, runtime.personaId());
    return present(
      found(
        runtime.world.invitations.find(
          (item) =>
            item.id === input.id && mine.some((address) => sameAddress(address, item.distributor)),
        ),
        "That invitation",
      ),
      runtime.now(),
      runtime.world,
    );
  },
  "invitations.mine": (input, runtime) => {
    const mine = addressesOf(runtime.world, runtime.personaId());
    const items = runtime.world.invitations
      .filter((invitation) => mine.some((address) => sameAddress(address, invitation.distributor)))
      .map((invitation) => present(invitation, runtime.now(), runtime.world))
      .filter((invitation) => input.status === undefined || invitation.status === input.status)
      .reverse()
      .sort(newestFirst);
    return page(items, input);
  },
  "invitations.sent": (input, runtime) => {
    const merchant = merchantFor(runtime);
    const items = runtime.world.invitations
      .filter((invitation) => invitation.merchantId === merchant.id)
      .filter(
        (invitation) =>
          input.distributor === undefined || sameAddress(invitation.distributor, input.distributor),
      )
      .map((invitation) => present(invitation, runtime.now(), runtime.world))
      .reverse()
      .sort(newestFirst);
    return page(items, input);
  },
} satisfies PartialHandlers<"invitations">;

export const invitationsWrites = {
  "invitations.send": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = merchantFor(runtime);
    const campaign = ownCampaign(world, merchant, input.campaignId);
    if (!isLive(campaign, now)) return fail("CAMPAIGN_NOT_ACTIVE", NOT_TAKING_LINKS);
    const expiresAt = Date.parse(input.expiresAt);
    if (expiresAt <= now) return fail("VALIDATION_FAILED", "Choose an expiry date in the future.");
    if (
      ownsAddress(world, runtime.personaId(), input.distributor) ||
      sameAddress(merchant.address, input.distributor)
    )
      return fail("VALIDATION_FAILED", "You can't invite your own account.");
    const open = world.invitations.some(
      (invitation) =>
        invitation.campaignId === campaign.id &&
        sameAddress(invitation.distributor, input.distributor) &&
        ["pending", "accepted"].includes(present(invitation, now, world).status),
    );
    if (open)
      return fail("CONFLICT", "This person already has a pending invitation to this campaign.");
    const invitation: Invitation = {
      id: demoId("invitation", runtime.nextId("invitation")),
      distributor: input.distributor,
      campaignId: campaign.id,
      merchantId: merchant.id,
      message: input.message,
      terms: input.terms,
      parentNodeId: null,
      policyHash: policyAt(campaign, now).hash,
      status: "pending",
      expiresAt: iso(expiresAt),
      withdrawnAt: null,
      createdAt: iso(now),
    };
    world.invitations.push(invitation);
    return invitation;
  },
  "invitations.respond": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const mine = addressesOf(world, runtime.personaId());
    const stored = found(
      world.invitations.find(
        (invitation) =>
          invitation.id === input.id &&
          mine.some((address) => sameAddress(address, invitation.distributor)),
      ),
      "That invitation",
    );
    const invitation = present(stored, now, world);
    const status = input.response === "accept" ? "accepted" : "declined";
    if (invitation.status === status) return invitation;
    const problem = unanswerable(invitation);
    if (problem !== null) return fail("VALIDATION_FAILED", problem);
    const campaign = world.campaigns.find((candidate) => candidate.id === invitation.campaignId);
    if (input.response === "accept" && (!campaign || !isLive(campaign, now)))
      return fail("CAMPAIGN_NOT_ACTIVE", NOT_TAKING_LINKS);
    return replace(world, {
      ...invitation,
      status: input.response === "accept" ? "accepted" : "declined",
    });
  },
  "invitations.withdraw": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = merchantFor(runtime);
    const stored = found(
      world.invitations.find(
        (invitation) => invitation.id === input.id && invitation.merchantId === merchant.id,
      ),
      "That invitation",
    );
    if (stored.status === "withdrawn") return present(stored, now, world);
    if (present(stored, now, world).status !== "pending")
      return fail("VALIDATION_FAILED", "Only a pending invitation can be withdrawn.");
    return replace(world, { ...stored, status: "withdrawn", withdrawnAt: iso(now) });
  },
} satisfies PartialHandlers<"invitations">;
