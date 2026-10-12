import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import { scopedId } from "../../../../demo/world/seed-growth-plus-scope";
import { INVITE_VALID_MS } from "../../../../demo/world/seed-growth-plus-team";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { DemoWorld, TeamMember } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { addressesOf, page } from "../views/basics";
import { replaceIn } from "./plus-integrations";
import { freshId, mine, myMerchant, myRecord, newestFirst, recordAudit } from "./plus-merchant";

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const ownerRow = (world: DemoWorld, merchant: DemoMerchant): TeamMember => ({
  id: scopedId(merchant.id, "member", "owner"),
  address: addressesOf(world, merchant.ownerId)[0] ?? merchant.address,
  role: "owner",
  status: "active",
  joinedAt: iso(merchant.joinedAt),
});

const teamOf = (world: DemoWorld, merchant: DemoMerchant): TeamMember[] => {
  const members = mine(merchant, world.team).filter((member) => member.status !== "removed");
  return members.some((member) => member.role === "owner")
    ? members
    : [ownerRow(world, merchant), ...members];
};

export const inviteExpiresAt = (world: DemoWorld, member: TeamMember): number | null => {
  if (member.status !== "invited") return null;
  const invites = world.audit
    .filter((entry) => entry.action === "team.invite" && entry.resource === member.id)
    .map((entry) => Date.parse(entry.at));
  return invites.length ? Math.max(...invites) + INVITE_VALID_MS : null;
};

const editableMember = (runtime: DemoRuntime, merchant: DemoMerchant, id: string) => {
  const member = myRecord(merchant, runtime.world.team, id, "That teammate");
  if (member.status === "removed") fail("NOT_FOUND", "That teammate was already removed.");
  if (member.role === "owner")
    fail("VALIDATION_FAILED", "The owner's role can't change here. Transfer ownership instead.");
  return member;
};

export const teamReads = {
  "team.members": (_input, runtime) =>
    teamOf(runtime.world, myMerchant(runtime)).map((member) => ({ ...member })),
  "team.audit": (input, runtime) => {
    const entries = newestFirst(
      mine(myMerchant(runtime), runtime.world.audit),
      (entry) => entry.at,
    ).map((entry) => ({ ...entry }));
    return page(entries, input);
  },
} satisfies PartialHandlers<"team">;

export const teamWrites = {
  "team.invite": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const world = runtime.world;
    const own = [...addressesOf(world, runtime.personaId()), merchant.address];
    if (own.some((address) => sameAddress(address, input.address)))
      fail("VALIDATION_FAILED", "That's your own account.");
    const existing = mine(merchant, world.team).find((member) =>
      sameAddress(member.address, input.address),
    );
    if (existing?.status === "active")
      fail("TEAM_ALREADY_MEMBER", "That account is already on your team.");
    const invited: TeamMember = {
      id: existing?.id ?? freshId(runtime, merchant.id, "member"),
      address: existing?.address ?? input.address,
      role: input.role,
      status: "invited",
      joinedAt: null,
    };
    recordAudit(runtime, merchant, "team.invite", invited.id, existing ?? null, invited);
    return replaceIn(world.team, invited);
  },
  "team.updateRole": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const member = editableMember(runtime, merchant, input.id);
    const updated: TeamMember = { ...member, role: input.role };
    recordAudit(runtime, merchant, "team.updateRole", member.id, member, updated);
    return replaceIn(runtime.world.team, updated);
  },
  "team.remove": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const member = editableMember(runtime, merchant, input.id);
    const removed: TeamMember = { ...member, status: "removed" };
    replaceIn(runtime.world.team, removed);
    recordAudit(runtime, merchant, "team.remove", member.id, member, removed);
    return { ok: true as const };
  },
  "team.transferOwnership": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const world = runtime.world;
    const team = mine(merchant, world.team);
    const target = found(
      team.find(
        (member) => member.status === "active" && sameAddress(member.address, input.address),
      ),
      "An active teammate with that address",
    );
    if (target.role === "owner")
      fail("VALIDATION_FAILED", "That account already owns the business.");
    const owner = team.find((member) => member.role === "owner") ?? ownerRow(world, merchant);
    const formerOwner: TeamMember = { ...owner, role: "admin" };
    const newOwner: TeamMember = { ...target, role: "owner" };
    replaceIn(world.team, formerOwner);
    replaceIn(world.team, newOwner);
    recordAudit(runtime, merchant, "team.transferOwnership", newOwner.id, owner, newOwner);
    return { ok: true as const };
  },
} satisfies PartialHandlers<"team">;
