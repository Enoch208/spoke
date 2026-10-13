"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/format";
import { checkoutCopy } from "../copy/checkout";
import { DirectDialog, type DirectReason } from "./direct-dialog";
import { referrerOf } from "./summary/checkout-summary";
import type { Checkout } from "./use-checkout";

const reasonFor = (checkout: Checkout): DirectReason | null => {
  const blocked = checkout.blocked;
  if (
    blocked === "exhausted" ||
    blocked === "zeroReward" ||
    blocked === "selfReferral" ||
    blocked === "invalidReferral" ||
    blocked === "otherCampaign"
  )
    return blocked;
  return null;
};

export function useDirectChoice(checkout: Checkout) {
  const [open, setOpen] = useState(false);
  const campaign = checkout.campaign.data;
  const dialog = campaign ? (
    <DirectDialog
      open={open}
      onOpenChange={setOpen}
      referrer={referrerOf(checkout) ?? checkoutCopy.aLink}
      price={formatAmount(checkout.price, campaign.token)}
      reason={reasonFor(checkout)}
      onConfirm={checkout.chooseDirect}
    />
  ) : null;
  return {
    dialog,
    ask: () => {
      setOpen(true);
    },
  };
}
