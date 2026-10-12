import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import { communityInviteCode } from "../../../../demo/world/seed-growth-plus-network";
import type { Community, CommunityMember, DemoWorld } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { addressesOf, page } from "../views/basics";
import { campaignOf } from "../views/catalog";

const inviteCounter = (id: string) => `plus:invite:${id}`;

export const inviteCodeOf = (world: DemoWorld, id: string) =>
  communityInviteCode(id, world.counters[inviteCounter(id)] ?? 0);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const myAddresses = (runtime: DemoRuntime) => {
  const addresses = addressesOf(runtime.world, runtime.personaId());
  return addresses.length ? addresses : fail("NOT_AUTHORIZED", "Sign in to use communities.");
};

const membersOf = (world: DemoWorld, id: string): CommunityMember[] =>
  world.communityMembers[id] ?? [];

const includesAny = (addresses: readonly string[], address: string) =>
  addresses.some((candidate) => same(candidate, address));

const present = (world: DemoWorld, community: Community): Community => ({
  ...community,
  campaignIds: [...community.campaignIds],
  memberCount: membersOf(world, community.id).length,
});

const communityOf = (world: DemoWorld, id: string) =>
  found(
    world.communities.find((community) => community.id === id),
    "That community",
  );

const checkedName = (name: string) => {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80)
    fail("VALIDATION_FAILED", "Give the community a name between 2 and 80 characters.");
  return trimmed;
};

const checkedCampaigns = (runtime: DemoRuntime, campaignIds: readonly string[]) => {
  const addresses = myAddresses(runtime);
  for (const id of campaignIds) {
    const campaign = found(campaignOf(runtime.world, id), "That campaign");
    const linked = runtime.world.nodes.some(
      (node) => node.campaignId === campaign.id && includesAny(addresses, node.owner),
    );
    if (!linked) fail("VALIDATION_FAILED", `Create your link in ${campaign.id} first.`);
  }
  return [...new Set(campaignIds)];
};

const save = (world: DemoWorld, community: Community) => {
  world.communities = world.communities.map((candidate) =>
    candidate.id === community.id ? community : candidate,
  );
  return present(world, community);
};

export const communitiesReads = {
  "communities.list": (input, runtime) => {
    const world = runtime.world;
    const addresses = myAddresses(runtime);
    const joined = world.communities
      .filter((community) =>
        membersOf(world, community.id).some((member) => includesAny(addresses, member.address)),
      )
      .sort(
        (a, b) => Number(includesAny(addresses, b.owner)) - Number(includesAny(addresses, a.owner)),
      )
      .map((community) => present(world, community));
    return page(joined, input);
  },
  "communities.get": (input, runtime) =>
    present(runtime.world, communityOf(runtime.world, input.id)),
  "communities.members": (input, runtime) => {
    const world = runtime.world;
    const community = communityOf(world, input.id);
    const members = membersOf(world, community.id);
    if (!members.some((member) => includesAny(myAddresses(runtime), member.address)))
      fail("NOT_FOUND", "We couldn't find this community.");
    return page(
      members.map((member) => ({ ...member })),
      input,
    );
  },
} satisfies PartialHandlers<"communities">;

export const communitiesWrites = {
  "communities.create": (input, runtime) => {
    const world = runtime.world;
    const owner = myAddresses(runtime)[0] ?? fail("NOT_AUTHORIZED", "Sign in to use communities.");
    const now = iso(runtime.now());
    const community: Community = {
      id: `demo-community-n${String(runtime.nextId("plus:community"))}`,
      owner,
      name: checkedName(input.name),
      description: input.description.trim(),
      campaignIds: checkedCampaigns(runtime, input.campaignIds),
      memberCount: 1,
      createdAt: now,
    };
    world.communities.push(community);
    world.communityMembers[community.id] = [{ address: owner, role: "owner", joinedAt: now }];
    return present(world, community);
  },
  "communities.join": (input, runtime) => {
    const world = runtime.world;
    const community = communityOf(world, input.id);
    if (input.inviteCode.trim().toUpperCase() !== inviteCodeOf(world, community.id))
      fail("VALIDATION_FAILED", "This invite code isn't valid. Ask the owner for a new one.");
    const addresses = myAddresses(runtime);
    const members = membersOf(world, community.id);
    if (members.some((member) => includesAny(addresses, member.address)))
      fail("CONFLICT", "You're already in this community.");
    const address = addresses[0] ?? fail("NOT_AUTHORIZED", "Sign in to use communities.");
    const member: CommunityMember = { address, role: "member", joinedAt: iso(runtime.now()) };
    world.communityMembers[community.id] = [...members, member];
    return { ...member };
  },
  "communities.leave": (input, runtime) => {
    const world = runtime.world;
    const community = communityOf(world, input.id);
    const addresses = myAddresses(runtime);
    const members = membersOf(world, community.id);
    if (!members.some((member) => includesAny(addresses, member.address)))
      fail("NOT_FOUND", "You're not in this community.");
    if (includesAny(addresses, community.owner))
      fail("VALIDATION_FAILED", "You own this community, so you can't leave it.");
    world.communityMembers[community.id] = members.filter(
      (member) => !includesAny(addresses, member.address),
    );
    return { ok: true as const };
  },
  "communities.update": (input, runtime) => {
    const world = runtime.world;
    const community = communityOf(world, input.id);
    if (!includesAny(myAddresses(runtime), community.owner))
      fail("NOT_AUTHORIZED", "Only the community's owner can change it.");
    const removed = input.removeMember;
    if (removed !== undefined) {
      if (same(removed, community.owner)) fail("VALIDATION_FAILED", "The owner can't be removed.");
      const members = membersOf(world, community.id);
      if (!members.some((member) => same(member.address, removed)))
        fail("NOT_FOUND", "That person isn't in this community.");
      world.communityMembers[community.id] = members.filter(
        (member) => !same(member.address, removed),
      );
    }
    if (input.regenerateInvite) runtime.nextId(inviteCounter(community.id));
    return save(world, {
      ...community,
      name: input.name === undefined ? community.name : checkedName(input.name),
      description: input.description?.trim() ?? community.description,
      campaignIds: input.campaignIds
        ? checkedCampaigns(runtime, input.campaignIds)
        : community.campaignIds,
    });
  },
} satisfies PartialHandlers<"communities">;
