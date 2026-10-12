"use client";

import { useViewer } from "@/components/app/shell/use-area";
import { useClientQuery } from "@/lib/query/use-client";

export function usePublicViewer() {
  const viewer = useViewer();
  const known = viewer === "signedIn" || viewer === "demo";
  const me = useClientQuery("account.me", {}, { enabled: known });
  return {
    viewer,
    known,
    me: known ? (me.data ?? null) : null,
    resolving: viewer === "loading" || (known && me.isPending),
  };
}

export function usePersonalMarks(enabled: boolean) {
  const links = useClientQuery("links.mine", { limit: 100 }, { enabled });
  const purchases = useClientQuery("receipts.forBuyer", { limit: 100 }, { enabled });
  return {
    linkFor: (campaignId: string) =>
      links.data?.items.find((link) => link.campaign.campaignId === campaignId) ?? null,
    purchased: (campaignId: string) =>
      purchases.data?.items.some((row) => row.campaignId === campaignId) ?? false,
  };
}

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const runsMerchant = (
  me: { address: string; workspaces: readonly { slug: string; businessWallet: string }[] } | null,
  merchant: { slug: string; address: string },
) =>
  me !== null &&
  (sameAddress(me.address, merchant.address) ||
    me.workspaces.some(
      (workspace) =>
        workspace.slug === merchant.slug || sameAddress(workspace.businessWallet, merchant.address),
    ));
