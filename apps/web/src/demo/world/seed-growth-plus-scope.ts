import type { DemoCore, DemoMerchant, DemoPerson } from "./types";

export const scopedId = (scope: string, kind: string, n: number | string): string =>
  `${scope}-${kind}-${String(n)}`;

export const isScopedTo = (scope: string, id: string): boolean => id.startsWith(`${scope}-`);

export const personaMerchant = (core: DemoCore): DemoMerchant => {
  const merchant = core.merchants.find((candidate) => candidate.ownerId === core.personas.merchant);
  if (!merchant) throw new RangeError("The sample world needs the merchant persona's business.");
  return merchant;
};

export const personOf = (core: DemoCore, id: string): DemoPerson => {
  const person = core.people.find((candidate) => candidate.id === id);
  if (!person) throw new RangeError(`${id} isn't in the sample world.`);
  return person;
};

export const mainAddress = (person: DemoPerson) => {
  const address = person.addresses[0];
  if (!address) throw new RangeError(`${person.id} has no address.`);
  return address;
};
