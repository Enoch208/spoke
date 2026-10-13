"use client";

import Link from "next/link";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Sheet } from "@/components/ui/sheet";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { checkoutCopy } from "../copy/checkout";
import { sheetCopy } from "../copy/modals";
import { CheckoutGate } from "./checkout-gate";
import { openDoneWhenConfirmed } from "./completion-watch";
import { CheckoutPanel } from "./panel/checkout-panel";
import { CheckoutPrimary } from "./panel/checkout-primary";
import { CheckoutSummary } from "./summary/checkout-summary";
import { useCheckout } from "./use-checkout";
import { useDirectChoice } from "./use-direct-choice";
import { useCloseOnNavigate } from "../use-close-on-navigate";

export default function CheckoutSheet({ props, close }: ModalComponentProps<"M-17">) {
  const checkout = useCheckout({
    campaignId: props.campaignId,
    code: null,
    ...(props.nodeId ? { nodeId: props.nodeId } : {}),
  });
  const link = useClientQuery(
    "links.get",
    { nodeId: props.nodeId ?? "0" },
    { enabled: Boolean(props.nodeId) && props.nodeId !== "0" },
  );
  const direct = useDirectChoice(checkout);
  const running = checkout.view.kind === "active" || checkout.view.kind === "confirming";
  const fullPage = `${routeTo.checkout(props.campaignId)}${
    link.data && checkout.referral.nodeId !== "0"
      ? `?ref=${encodeURIComponent(link.data.code)}`
      : ""
  }`;
  const dismiss = () => {
    if (running && checkout.record) openDoneWhenConfirmed(checkout.record.id);
    close();
  };
  useCloseOnNavigate(dismiss);
  return (
    <>
      <Sheet
        placement="checkout"
        open
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
        dismissible={!(running && checkout.view.kind === "active")}
        title={checkout.campaign.data?.product.title ?? checkoutCopy.pageLabel}
        badge={<ModeBadge mode={checkout.mode} />}
        subtitle={
          <Link
            href={fullPage}
            onClick={dismiss}
            className="text-ink font-medium underline underline-offset-2"
          >
            {sheetCopy.openFullPage}
          </Link>
        }
        footer={
          checkout.phase === "done" ? undefined : (
            <div className="w-full">
              <CheckoutPrimary checkout={checkout} caption={false} />
            </div>
          )
        }
      >
        <CheckoutGate checkout={checkout}>
          <div
            className={
              checkout.blocked || checkout.phase === "done"
                ? "flex flex-col-reverse gap-5"
                : "flex flex-col gap-5"
            }
          >
            <CheckoutSummary checkout={checkout} compact onNotThisPerson={direct.ask} />
            <CheckoutPanel checkout={checkout} onDirect={direct.ask} />
          </div>
        </CheckoutGate>
      </Sheet>
      {direct.dialog}
    </>
  );
}
