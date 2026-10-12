import type { TokenKey } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { PartialHandlers } from "../handler";
import { tokenInfo } from "../views/basics";
import { designedEndpoints, runPlayground } from "./platform-endpoints";
import { protocolEvents } from "./platform-events";
import { demoHealth, demoStatus } from "./platform-health";

const roleOf = (world: DemoWorld, key: TokenKey) => {
  const payment = world.products.some((product) => product.token === key);
  const reward = world.campaigns.some((campaign) => campaign.token === key);
  if (payment && reward) return "both";
  return payment ? "payment" : "reward";
};

export const systemReads = {
  "system.health": (_input, runtime) => demoHealth(runtime),
  "system.status": (_input, runtime) => demoStatus(runtime),
  "system.contracts": () => ({ contracts: [] }),
  "system.endpoints": () => designedEndpoints(),
  "system.events": (input, runtime) =>
    protocolEvents(runtime.world, runtime.now(), input.name, input.limit ?? 25),
} satisfies PartialHandlers<"system">;

export const systemWrites = {} satisfies PartialHandlers<"system">;

export const playgroundReads = {
  "playground.run": (input, runtime) => runPlayground(input.path, runtime),
} satisfies PartialHandlers<"playground">;

export const playgroundWrites = {} satisfies PartialHandlers<"playground">;

export const clientsReads = {
  "clients.list": (_input, runtime) =>
    runtime.world.clients.map((client) => ({ ...client, uses: [...client.uses] })),
} satisfies PartialHandlers<"clients">;

export const clientsWrites = {} satisfies PartialHandlers<"clients">;

export const networksReads = {
  "networks.list": (_input, runtime) =>
    runtime.world.networks.map((network) => ({
      ...network,
      allowedTokens: [...network.allowedTokens],
    })),
} satisfies PartialHandlers<"networks">;

export const networksWrites = {} satisfies PartialHandlers<"networks">;

export const tokensReads = {
  "tokens.list": (_input, runtime) => {
    const { world } = runtime;
    return Object.values(world.tokens).map((token) => ({
      ...tokenInfo(world, token.key),
      role: roleOf(world, token.key),
      label: token.label,
    }));
  },
} satisfies PartialHandlers<"tokens">;

export const tokensWrites = {} satisfies PartialHandlers<"tokens">;
