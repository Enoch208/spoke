import type { ClientInput, ClientMethod } from "@spoke/protocol";
import type { Mode } from "@/lib/stores/mode";
import { splitMethod, type ClientDomain } from "@/lib/client/types";

export type InvalidationTarget = ClientDomain | ClientMethod;

export const domainKey = (mode: Mode, domain: ClientDomain) => [mode, domain] as const;

export const methodKey = (mode: Mode, method: ClientMethod) => {
  const { domain, verb } = splitMethod(method);
  return [mode, domain, verb] as const;
};

export const queryKey = <M extends ClientMethod>(mode: Mode, method: M, input: ClientInput<M>) => [
  ...methodKey(mode, method),
  input,
];

export const keyForTarget = (mode: Mode, target: InvalidationTarget) =>
  target.includes(".") ? methodKey(mode, target as ClientMethod) : ([mode, target] as const);

export const staleTimes = {
  list: 15_000,
  money: 5_000,
  profile: 60_000,
} as const;

const moneyMethods = new Set<ClientMethod>([
  "account.balances",
  "funding.status",
  "earnings.claimable",
  "earnings.summary",
  "vault.get",
  "checkout.preview",
]);

const profileMethods = new Set<ClientMethod>([
  "account.me",
  "account.preferences",
  "campaigns.policy",
  "merchants.get",
  "merchants.me",
  "reputation.get",
  "reputation.mine",
  "distributors.get",
  "products.categories",
  "networks.list",
  "tokens.list",
  "system.contracts",
  "system.endpoints",
]);

export const staleTimeFor = (method: ClientMethod) => {
  if (moneyMethods.has(method)) return staleTimes.money;
  if (profileMethods.has(method)) return staleTimes.profile;
  return staleTimes.list;
};

export const refetchOnFocusFor = (method: ClientMethod) =>
  moneyMethods.has(method) || method.startsWith("earnings.") || method.startsWith("vault.");
