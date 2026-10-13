"use client";

import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import type { Actor } from "./person";

export function useSelf() {
  const status = useSessionStore((state) => state.status);
  const sessionAddress = useSessionStore((state) => state.address);
  const signedIn = status === "signedIn" && sessionAddress !== null;
  const links = useClientQuery("links.mine", { limit: 100 }, { enabled: signedIn });
  const nodeIds = new Set((links.data?.items ?? []).map((link) => link.nodeId));
  const address = sessionAddress?.toLowerCase() ?? null;
  return {
    signedIn,
    links: links.data?.items ?? [],
    nodeIds,
    isSelf: (nodeId: string, actor?: Actor) =>
      nodeIds.has(nodeId) || (address !== null && actor?.address?.toLowerCase() === address),
    isSelfActor: (actor: Actor) => address !== null && actor.address?.toLowerCase() === address,
  };
}
