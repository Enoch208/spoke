import { z } from "zod";
import { proofEvent } from "@spoke/protocol";
import { actorView, eventTx, type ChainEvent } from "./evidence.js";
import type { Store } from "../db/store.js";

export const proofView = async (store: Store, chainId: number, event: ChainEvent) => {
  const actorAddress =
    event.payload.creator ??
    event.payload.owner ??
    event.payload.recipient ??
    event.payload.merchant;
  const actor =
    typeof actorAddress === "string" && /^0x[\da-fA-F]{40}$/.test(actorAddress)
      ? await actorView(store, actorAddress)
      : null;
  const args: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(event.payload)) {
    if (key === "buyer") continue;
    if (typeof value === "string" && /^0x[\da-fA-F]{40}$/.test(value)) {
      const visible = await actorView(store, value);
      if (visible.address) args[key] = visible.address;
    } else if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isInteger(value))
    )
      args[key] = value;
    else if (
      Array.isArray(value) &&
      value.every((item): item is string => typeof item === "string")
    )
      args[key] = (
        await Promise.all(
          value.map(async (item) =>
            /^0x[\da-fA-F]{40}$/.test(item) ? (await actorView(store, item)).address : item,
          ),
        )
      ).filter((item): item is string => item !== null);
  }
  return proofEvent.parse({
    name: event.name,
    tx: eventTx(chainId, event),
    logIndex: event.logIndex,
    at: event.at.toISOString(),
    actor,
    args: z
      .record(z.string(), z.union([z.string(), z.number().int(), z.boolean(), z.array(z.string())]))
      .parse(args),
  });
};
