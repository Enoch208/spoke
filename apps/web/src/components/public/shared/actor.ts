import type { ClientOutput } from "@spoke/protocol";
import { formatHandle } from "@/lib/format";

export type PublicActor = ClientOutput<"links.resolveCode">["owner"];

export const isSelfActor = (actor: PublicActor, self: string | null | undefined) =>
  Boolean(self && actor.address && actor.address.toLowerCase() === self.toLowerCase());

export const actorName = (
  actor: PublicActor,
  options: { self?: string | null | undefined; fallback?: string } = {},
) => {
  if (isSelfActor(actor, options.self)) return "You";
  const fallback = options.fallback ?? "Someone";
  if (actor.visibility === "private") return fallback;
  if (actor.visibility === "public" && actor.displayName) return actor.displayName;
  return actor.handle ? formatHandle(actor.handle) : fallback;
};

export const actorProfileHandle = (actor: PublicActor) =>
  actor.visibility === "private" ? null : actor.handle;
