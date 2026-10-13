"use client";

import type { ClientOutput } from "@spoke/protocol";
import { useClientQuery } from "@/lib/query/use-client";
import type { CheckoutDraft } from "@/lib/stores/checkout";
import type { ReferralCheck } from "./model";

type Actor = ClientOutput<"links.resolveCode">["owner"];

export type ReferralSource = {
  nodeId: string;
  check: ReferralCheck;
  owner: Actor | null;
  resolving: boolean;
  rememberedAt: number | null;
  otherCampaignId: string | null;
};

const directSource = (check: ReferralCheck): ReferralSource => ({
  nodeId: "0",
  check,
  owner: null,
  resolving: false,
  rememberedAt: null,
  otherCampaignId: null,
});

export function useReferralSource(input: {
  campaignId: string;
  code: string | null;
  nodeId: string | undefined;
  draft: CheckoutDraft | undefined;
  direct: boolean;
  lockedNodeId: string | null;
}): ReferralSource {
  const { campaignId, code, draft, direct, lockedNodeId } = input;
  const resolution = useClientQuery(
    "links.resolveCode",
    { code: code ?? "" },
    { enabled: Boolean(code) && !direct && lockedNodeId === null },
  );
  if (lockedNodeId !== null)
    return lockedNodeId === "0"
      ? directSource("none")
      : { ...directSource("ok"), nodeId: lockedNodeId };
  if (direct) return directSource("none");
  if (code) {
    if (resolution.isPending) return { ...directSource("none"), resolving: true };
    const data = resolution.data;
    if (!data || data.status !== "ok") return directSource("invalid");
    if (data.campaignId !== campaignId)
      return { ...directSource("otherCampaign"), otherCampaignId: data.campaignId };
    return { ...directSource("ok"), nodeId: data.nodeId, owner: data.owner };
  }
  if (input.nodeId && input.nodeId !== "0") return { ...directSource("ok"), nodeId: input.nodeId };
  if (draft?.nodeId)
    return { ...directSource("ok"), nodeId: draft.nodeId, rememberedAt: draft.createdAt };
  return directSource("none");
}
