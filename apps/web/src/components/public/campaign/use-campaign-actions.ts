"use client";

import type { CampaignDetail } from "@spoke/protocol";
import { usePathname } from "next/navigation";
import { zeroHash } from "viem";
import { fill } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { routes, routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { useChainAction } from "@/lib/tx/use-action";
import { actionCopy } from "../copy/availability";
import { hasModal } from "../shared/modals-ready";
import { actionPlan, type AvailabilityKey } from "./availability";
import { checkoutHref } from "./buttons";
import type { CampaignViewer, Referral } from "./use-campaign-viewer";

type Variant = "primary" | "secondary";

export type CampaignAct =
  | { id: string; kind: "buy"; label: string; nodeId: string | null; variant: Variant }
  | { id: string; kind: "href"; label: string; href: string; variant: Variant }
  | {
      id: string;
      kind: "button";
      label: string;
      variant: Variant;
      onClick?: () => void;
      disabled?: boolean;
      busy?: boolean;
    };

const disabledAct = (id: string, label: string, variant: Variant): CampaignAct => ({
  id,
  kind: "button",
  label,
  variant,
  disabled: true,
});

export function useCampaignActions({
  campaign,
  availability,
  referral,
  viewer,
  termsReady,
}: {
  campaign: CampaignDetail;
  availability: AvailabilityKey;
  referral: Referral | null;
  viewer: CampaignViewer;
  termsReady: boolean;
}) {
  const open = useUiStore((state) => state.open);
  const start = useChainAction();
  const pathname = usePathname();
  const campaignId = campaign.campaignId;
  const price = formatAmount(BigInt(campaign.price), campaign.token);
  const buyLabel = fill(actionCopy.buy, { price });
  const viaLink = referral !== null && !viewer.ownLink;
  const plan = actionPlan(availability, viaLink);
  const acts: CampaignAct[] = [];
  const notes: string[] = [];
  if (viewer.isMerchant) return { acts, notes };
  if (!termsReady) {
    acts.push(
      disabledAct("buy", buyLabel, "primary"),
      disabledAct("create", actionCopy.createLink, "secondary"),
    );
    return { acts, notes };
  }
  const direct = (label: string): CampaignAct => ({
    id: "direct",
    kind: "buy",
    label,
    nodeId: null,
    variant: "secondary",
  });
  if (viewer.purchase) {
    acts.push({
      id: "purchase",
      kind: "href",
      label: actionCopy.viewPurchase,
      href: routeTo.purchase(viewer.purchase.saleId),
      variant: "primary",
    });
    notes.push(
      fill(actionCopy.boughtAgo, {
        relative: formatRelative(new Date(viewer.purchase.purchasedAt)),
      }),
    );
  } else if (viewer.purchaseInProgress) {
    acts.push({
      id: "continue",
      kind: "href",
      label: actionCopy.continuePurchase,
      href: checkoutHref(campaignId, referral && !viewer.ownLink ? referral.code : null),
      variant: "primary",
    });
  } else if (plan.buy !== "hidden") {
    if (viewer.ownLink) {
      acts.push(direct(actionCopy.buyDirectly));
      notes.push(actionCopy.noCommission);
    } else if (viewer.selfReferral) {
      acts.push(disabledAct("buy", buyLabel, "primary"));
      if (viewer.directAvailable) {
        acts.push(direct(actionCopy.buyDirectly));
        notes.push(actionCopy.noCommission);
      }
    } else if (plan.buyWithoutRewards) {
      acts.push(disabledAct("buy", actionCopy.rewardsUsedUp, "primary"));
      acts.push(direct(actionCopy.buyWithoutRewards));
      notes.push(actionCopy.noCommission);
    } else if (plan.buy === "disabled") {
      acts.push(disabledAct("buy", actionCopy[plan.buyLabel], "primary"));
    } else {
      acts.push({
        id: "buy",
        kind: "buy",
        label: buyLabel,
        nodeId: referral ? referral.nodeId : null,
        variant: "primary",
      });
    }
  }
  if (plan.create === "hidden") return { acts, notes };
  if (viewer.linkNodeId) {
    const nodeId = viewer.linkNodeId;
    if (hasModal("M-13"))
      acts.push({
        id: "share",
        kind: "button",
        label: actionCopy.shareLink,
        variant: "secondary",
        onClick: () => {
          open("M-13", { nodeId });
        },
      });
    acts.push({
      id: "view",
      kind: "href",
      label: viewer.ownLink ? actionCopy.viewLinkStats : actionCopy.viewLink,
      href: routeTo.link(nodeId),
      variant: "secondary",
    });
    if (referral && !viewer.ownLink) notes.push(actionCopy.ownLinkSecond);
    return { acts, notes };
  }
  if (viewer.creatingTxId) {
    const txId = viewer.creatingTxId;
    acts.push({
      id: "creating",
      kind: "button",
      label: actionCopy.creatingLink,
      variant: "secondary",
      busy: true,
      onClick: () => {
        open("M-11", { txId });
      },
    });
    return { acts, notes };
  }
  if (plan.create === "disabled") {
    acts.push(disabledAct("create", actionCopy[plan.createLabel], "secondary"));
    return { acts, notes };
  }
  if (campaign.inviteOnly && viewer.invitationId) {
    const invitationId = viewer.invitationId;
    acts.push(
      hasModal("M-46")
        ? {
            id: "accept",
            kind: "button",
            label: actionCopy.acceptInvitation,
            variant: "secondary",
            onClick: () => {
              open("M-46", { invitationId });
            },
          }
        : {
            id: "accept",
            kind: "href",
            label: actionCopy.acceptInvitation,
            href: routes.earn.invitations,
            variant: "secondary",
          },
    );
    return { acts, notes };
  }
  if (viewer.joinEligibility === "invitation_required") {
    acts.push(disabledAct("create", actionCopy.invitationOnly, "secondary"));
    notes.push(fill(actionCopy.notInvitedHelper, { merchant: campaign.merchant.name }));
    return { acts, notes };
  }
  const parentNodeId = referral?.nodeId ?? "0";
  acts.push({
    id: "create",
    kind: "button",
    label: actionCopy.createLink,
    variant: "secondary",
    onClick: () => {
      if (!viewer.known) {
        open("M-01", { reason: "share", returnTo: `${pathname}?intent=join` });
        return;
      }
      if (hasModal("M-12")) {
        open("M-12", referral ? { campaignId, parentNodeId, code: referral.code } : { campaignId });
        return;
      }
      start("createNode", {
        campaignId,
        campaignName: campaign.product.title,
        parentNodeId,
        metadataHash: zeroHash,
      });
    },
  });
  if (availability === "exhausted") notes.push(actionCopy.exhaustedCreateNote);
  return { acts, notes };
}
