import type { ClientOutput } from "@spoke/protocol";
import { getAddress, type Address } from "viem";
import { iso, sampleHash } from "../../../../demo/world/ids";
import type { DemoPerson, TokenKey } from "../../../../demo/world/types";
import type { DemoBalance, DemoWorld } from "../../../../demo/world/world";

export type TokenInfo = ClientOutput<"campaigns.get">["token"];
export type PublicActor = ClientOutput<"campaigns.activity">["items"][number]["actor"];
export type TxRef = ClientOutput<"campaigns.get">["creationTx"];

export const DEMO_CHAIN_ID = 10143;
export const DEMO_PROTOCOL_ADDRESS = getAddress(sampleHash("protocol").slice(0, 42));

export const tokenInfo = (world: DemoWorld, key: TokenKey): TokenInfo => {
  const token = world.tokens[key];
  return {
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    name: token.name,
    testnet: true,
  };
};

export const tokenKeyOf = (world: DemoWorld, address: string | undefined): TokenKey | null => {
  if (address === undefined) return null;
  const match = Object.values(world.tokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
  return match ? match.key : null;
};

export const personByAddress = (world: DemoWorld, address: string): DemoPerson | undefined =>
  world.people.find((person) =>
    person.addresses.some((candidate) => candidate.toLowerCase() === address.toLowerCase()),
  );

export const personById = (world: DemoWorld, id: string): DemoPerson | undefined =>
  world.people.find((person) => person.id === id);

export const addressesOf = (world: DemoWorld, personId: string): Address[] =>
  personById(world, personId)?.addresses ?? [];

export const ownsAddress = (world: DemoWorld, personId: string, address: string): boolean =>
  addressesOf(world, personId).some(
    (candidate) => candidate.toLowerCase() === address.toLowerCase(),
  );

export const actor = (world: DemoWorld, address: string, reveal = false): PublicActor => {
  const person = personByAddress(world, address);
  const checksummed = getAddress(address);
  if (!person)
    return {
      address: reveal ? checksummed : null,
      handle: null,
      displayName: null,
      visibility: "private",
    };
  if (reveal || person.visibility === "public")
    return {
      address: checksummed,
      handle: person.handle,
      displayName: person.displayName,
      visibility: person.visibility,
    };
  if (person.visibility === "pseudonymous")
    return { address: null, handle: person.handle, displayName: null, visibility: "pseudonymous" };
  return { address: null, handle: null, displayName: null, visibility: "private" };
};

export const blockAt = (ms: number): string =>
  String(Math.max(1, Math.floor(ms / 1000) - 1_760_000_000));

export const demoTx = (label: string, at: number): TxRef => ({
  hash: sampleHash(`tx:${label}`),
  blockNumber: blockAt(at),
  explorerUrl: null,
  at: iso(at),
});

export const sum = (values: Iterable<bigint>): bigint => {
  let total = 0n;
  for (const value of values) total += value;
  return total;
};

export const page = <T>(
  items: readonly T[],
  input: { cursor?: string | undefined; limit?: number | undefined },
) => {
  const start = input.cursor ? Number(input.cursor) || 0 : 0;
  const limit = input.limit ?? 25;
  const slice = items.slice(start, start + limit);
  return { items: slice, nextCursor: start + limit < items.length ? String(start + limit) : null };
};

export const balanceOf = (world: DemoWorld, address: string): DemoBalance | undefined =>
  Object.entries(world.balances).find(([key]) => key.toLowerCase() === address.toLowerCase())?.[1];
