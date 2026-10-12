import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso, sampleHash } from "../../../../demo/world/ids";
import { isScopedTo, scopedId } from "../../../../demo/world/seed-growth-plus-scope";
import { teamTitlesFor } from "../../../../demo/world/seed-growth-plus-team";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { AuditEntry } from "../../../../demo/world/world";
import { fail, found } from "../handler";
import { addressesOf } from "../views/basics";
import { merchantsOwnedBy } from "../views/merchant-org";

export const myMerchant = (runtime: DemoRuntime): DemoMerchant =>
  merchantsOwnedBy(runtime.world, runtime.personaId())[0] ??
  fail(
    "NOT_AUTHORIZED",
    "Set up a business first. This part of Sell belongs to a business account.",
  );

export const mine = <T extends { id: string }>(merchant: DemoMerchant, items: readonly T[]): T[] =>
  items.filter((item) => isScopedTo(merchant.id, item.id));

export const myRecord = <T extends { id: string }>(
  merchant: DemoMerchant,
  items: readonly T[],
  id: string,
  what: string,
): T =>
  found(
    mine(merchant, items).find((item) => item.id === id),
    what,
  );

export const freshId = (runtime: DemoRuntime, scope: string, kind: string): string =>
  scopedId(scope, kind, `n${String(runtime.nextId(`plus:${kind}`))}`);

export const stateHash = (state: unknown) =>
  state === null ? null : sampleHash(`state:${JSON.stringify(state)}`);

const roleTitle = (role: string) => `${role.charAt(0).toUpperCase()}${role.slice(1)}`;

const actorOf = (runtime: DemoRuntime, merchant: DemoMerchant) => {
  const addresses = addressesOf(runtime.world, runtime.personaId());
  const lowered = addresses.map((address) => address.toLowerCase());
  const member = mine(merchant, runtime.world.team).find(
    (candidate) =>
      candidate.status === "active" && lowered.includes(candidate.address.toLowerCase()),
  );
  const titles = teamTitlesFor(merchant.id);
  return {
    address: member?.address ?? addresses[0] ?? merchant.address,
    role: member ? (titles[member.id] ?? roleTitle(member.role)) : "Owner",
  };
};

export const recordAudit = (
  runtime: DemoRuntime,
  merchant: DemoMerchant,
  action: string,
  resource: string,
  before: unknown,
  after: unknown,
): AuditEntry => {
  const actor = actorOf(runtime, merchant);
  const entry: AuditEntry = {
    id: freshId(runtime, merchant.id, "audit"),
    actor: actor.address,
    role: actor.role,
    resource,
    action,
    beforeHash: stateHash(before),
    afterHash: stateHash(after),
    at: iso(runtime.now()),
  };
  runtime.world.audit.push(entry);
  return { ...entry };
};

export const newestFirst = <T>(items: readonly T[], timeOf: (item: T) => string): T[] =>
  [...items].reverse().sort((a, b) => Date.parse(timeOf(b)) - Date.parse(timeOf(a)));
