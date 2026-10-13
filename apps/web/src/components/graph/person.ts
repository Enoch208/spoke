import { fill } from "@/lib/copy";
import { formatHandle } from "@/lib/format";
import { graphCopy } from "./copy";

export type Actor = {
  readonly address: string | null;
  readonly handle: string | null;
  readonly displayName: string | null;
  readonly visibility: "public" | "pseudonymous" | "private";
};

export type PersonOptions = {
  self?: boolean;
  nodeId?: string;
  hidden?: boolean;
};

export const personLabel = (actor: Actor, options: PersonOptions = {}) => {
  if (options.self) return graphCopy.you;
  if (options.hidden) return graphCopy.hidden;
  if (actor.visibility !== "private" && actor.handle) return formatHandle(actor.handle);
  if (actor.visibility === "public" && actor.displayName) return actor.displayName;
  return options.nodeId
    ? fill(graphCopy.someoneNode, { nodeId: options.nodeId })
    : graphCopy.someone;
};

export const personInitials = (actor: Actor, options: PersonOptions = {}) => {
  if (options.self) return "You";
  if (options.hidden || actor.visibility === "private") return "";
  const source = (actor.handle ?? actor.displayName ?? "").replace(/^@/, "").replace(/^demo-/, "");
  return source.slice(0, 2).toUpperCase();
};

export const profileHandle = (actor: Actor) =>
  actor.visibility !== "private" && actor.handle ? actor.handle : null;
