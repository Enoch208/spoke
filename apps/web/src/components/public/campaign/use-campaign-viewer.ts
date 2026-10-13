"use client";

import type { CampaignDetail } from "@spoke/protocol";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useTxStore } from "@/lib/stores/tx";
import { isActive } from "@/lib/tx/records";
import { runsMerchant, usePublicViewer } from "../shared/viewer";

export type Referral = {
  code: string;
  nodeId: string;
  ownerAddress: string | null;
};

export function useCampaignViewer(campaign: CampaignDetail, referral: Referral | null) {
  const { mode } = useClientContext();
  const { known, me } = usePublicViewer();
  const self = useSessionStore((state) => state.address);
  const campaignId = campaign.campaignId;
  const node = referral?.nodeId ?? "0";
  const join = useClientQuery("links.previewJoin", {
    campaignId,
    ...(referral ? { parent: referral.nodeId } : {}),
  });
  const preview = useClientQuery(
    "checkout.preview",
    { campaignId, node, ...(self ? { buyer: self } : {}) },
    { enabled: known && Boolean(self) },
  );
  const purchases = useClientQuery(
    "receipts.forBuyer",
    { campaignId, limit: 1 },
    { enabled: known },
  );
  const invitations = useClientQuery(
    "invitations.mine",
    { status: "pending" },
    { enabled: known && campaign.inviteOnly },
  );
  const funding = useClientQuery("funding.status", self ? { address: self } : {}, {
    enabled: known && Boolean(self),
  });
  const records = useTxStore((state) => state.records);
  const running = (kind: "createNode" | "purchase") =>
    records.find(
      (record) =>
        (record.kind === "createNode" || record.kind === "purchase") &&
        record.kind === kind &&
        record.mode === mode &&
        record.params.campaignId === campaignId &&
        isActive(record),
    ) ?? null;
  const creating = running("createNode");
  const purchase = purchases.data?.items[0] ?? null;
  const buyer = preview.data?.buyer;
  const linkNodeId = join.data?.eligibility === "already_joined" ? join.data.nodeId : null;
  const ownLink =
    referral !== null &&
    (linkNodeId === referral.nodeId ||
      (self !== null &&
        referral.ownerAddress !== null &&
        referral.ownerAddress.toLowerCase() === self.toLowerCase()));
  const balance = funding.data?.sdusd ? BigInt(funding.data.sdusd) : null;
  return {
    known,
    self,
    isMerchant: runsMerchant(me, campaign.merchant),
    ownLink,
    linkNodeId,
    joinEligibility: join.data?.eligibility ?? null,
    joinPreview: join.data ?? null,
    selfReferral:
      !ownLink &&
      referral !== null &&
      (buyer?.buyerOnPath === true || preview.data?.blocking?.code === "SELF_REFERRAL"),
    directAvailable: preview.data?.directPurchaseAvailable ?? true,
    purchase,
    purchaseInProgress: running("purchase") !== null,
    creatingTxId: creating?.id ?? null,
    invitationId:
      invitations.data?.items.find((invitation) => invitation.campaignId === campaignId)?.id ??
      null,
    balance,
  };
}

export type CampaignViewer = ReturnType<typeof useCampaignViewer>;
