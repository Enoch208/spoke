"use client";

import type { ModalComponentProps } from "@/components/app/modal-types";
import { ClaimProceeds } from "./claim-proceeds";
import { ClaimRewards } from "./claim-rewards";

export default function ClaimDialog({ props, isTop, close }: ModalComponentProps<"M-21">) {
  if (props.source === "REWARD")
    return <ClaimRewards token={props.token} isTop={isTop} close={close} />;
  return <ClaimProceeds campaignIds={props.campaignIds} isTop={isTop} close={close} />;
}
