"use client";

import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSearchParams } from "next/navigation";
import { ModeBadge } from "@/components/ui/mode-badge";
import { routes } from "@/lib/routes";
import { checkoutCopy } from "../copy/checkout";
import { CheckoutGate } from "./checkout-gate";
import { CheckoutPanel } from "./panel/checkout-panel";
import { AgreeLine, CheckoutPrimary } from "./panel/checkout-primary";
import { CheckoutSummary } from "./summary/checkout-summary";
import { useCheckout } from "./use-checkout";
import { useDirectChoice } from "./use-direct-choice";
import { useWide } from "./use-wide";

function HelpLink() {
  return (
    <a
      href={routes.support}
      target="_blank"
      rel="noreferrer"
      className="text-subtle hover:text-ink text-sm underline underline-offset-2 transition-colors"
    >
      {checkoutCopy.needHelp}
    </a>
  );
}

export function CheckoutPage({ campaignId }: { campaignId: string }) {
  const code = useSearchParams().get("ref");
  const checkout = useCheckout({ campaignId, code });
  const wide = useWide();
  const direct = useDirectChoice(checkout);
  return (
    <div className="flex flex-col gap-6 pb-40 lg:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="text-ink inline-flex items-center gap-2">
          <HugeiconsIcon icon={LockKeyIcon} size={20} strokeWidth={1.8} aria-hidden="true" />
          <h1 className="font-display text-h4 font-medium">{checkoutCopy.pageLabel}</h1>
        </div>
        <span className="text-subtle text-sm">{checkoutCopy.network}</span>
        <ModeBadge mode={checkout.mode} />
      </div>
      <CheckoutGate checkout={checkout}>
        {wide ? (
          <div className="grid grid-cols-12 items-start gap-8">
            <div className="col-span-7 min-w-0">
              <CheckoutSummary checkout={checkout} compact={false} onNotThisPerson={direct.ask} />
            </div>
            <aside className="bg-surface border-hairline sticky top-20 col-span-5 flex min-w-[400px] flex-col gap-5 rounded-2xl border p-6">
              <CheckoutPanel checkout={checkout} onDirect={direct.ask} />
              <CheckoutPrimary checkout={checkout} caption={false} />
              <div className="border-hairline border-t pt-4">
                <HelpLink />
              </div>
            </aside>
          </div>
        ) : (
          <>
            <div
              className={
                checkout.blocked || checkout.phase === "done"
                  ? "flex flex-col-reverse gap-6"
                  : "flex flex-col gap-6"
              }
            >
              <CheckoutSummary checkout={checkout} compact onNotThisPerson={direct.ask} />
              <section className="bg-surface border-hairline flex flex-col gap-5 rounded-2xl border p-4">
                <CheckoutPanel checkout={checkout} onDirect={direct.ask} />
              </section>
            </div>
            <AgreeLine />
            <HelpLink />
            {checkout.phase === "done" ||
            (checkout.blocked && checkout.view.kind === "none") ? null : (
              <div className="bg-surface border-hairline fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-[640px]">
                  <CheckoutPrimary checkout={checkout} caption />
                </div>
              </div>
            )}
          </>
        )}
      </CheckoutGate>
      {direct.dialog}
    </div>
  );
}
