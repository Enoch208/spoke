"use client";

import { FingerPrintIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { checkoutCopy } from "../../copy/checkout";
import { stepCopy } from "../../copy/steps";
import { stepperIndex } from "../model";
import type { Checkout } from "../use-checkout";

const primaryClass = "bg-lime! text-ink! hover:bg-lime/80! h-12! w-full text-base";

function PrimaryButton({ checkout }: { checkout: Checkout }) {
  const passkey = useSessionStore((state) => state.accountKind === "passkey");
  const campaign = checkout.campaign.data;
  const { phase, view } = checkout;
  if (!campaign || checkout.preview.isPending)
    return (
      <Button className={primaryClass} disabled>
        {checkoutCopy.loading}
      </Button>
    );
  const label = fill(checkoutCopy.buyFor, { price: formatAmount(checkout.price, campaign.token) });
  if (phase === "account")
    return (
      <div className="flex flex-col gap-2">
        <Button
          className={primaryClass}
          icon={FingerPrintIcon}
          onClick={() => {
            checkout.signIn("M-01");
          }}
        >
          {stepCopy.account.passkey}
        </Button>
        <Button
          variant="secondary"
          block
          onClick={() => {
            checkout.signIn("M-03");
          }}
        >
          {stepCopy.account.wallet}
        </Button>
      </div>
    );
  if (view.kind === "stopped")
    return (
      <Button className={primaryClass} onClick={checkout.retry}>
        {stepCopy.pay.tryAgain}
      </Button>
    );
  if (view.kind === "confirming")
    return view.unknown ? (
      <div className="flex flex-col gap-2">
        <Button className={primaryClass} onClick={checkout.checkAgain}>
          {stepCopy.pay.checkAgain}
        </Button>
        <Button variant="secondary" block onClick={checkout.retry}>
          {stepCopy.pay.tryBuyingAgain}
        </Button>
      </div>
    ) : (
      <Button className={primaryClass} loading disabled loadingLabel={stepCopy.pay.paying}>
        {label}
      </Button>
    );
  if (view.kind === "active")
    return (
      <Button className={primaryClass} disabled>
        {passkey ? stepCopy.pay.confirmPasskey : stepCopy.pay.confirmWallet}
      </Button>
    );
  const blocked = checkout.blocked !== null;
  const fundsWait = phase === "funds";
  return (
    <Button
      className={primaryClass}
      loading={checkout.busy}
      disabled={blocked || fundsWait}
      onClick={phase === "pay" ? checkout.pay : checkout.buy}
    >
      {label}
    </Button>
  );
}

export function CheckoutPrimary({ checkout, caption }: { checkout: Checkout; caption: boolean }) {
  const campaign = checkout.campaign.data;
  if (checkout.phase === "done" || !campaign) return null;
  if (checkout.blocked && checkout.view.kind === "none") return caption ? null : <AgreeLine />;
  const index = stepperIndex[checkout.phase];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="text-body min-w-0 truncate">{campaign.product.title}</p>
        <p className="text-ink shrink-0 font-mono tabular-nums">
          {formatAmount(checkout.price, campaign.token)}
          <span className="text-subtle"> · testnet</span>
        </p>
      </div>
      <PrimaryButton checkout={checkout} />
      {caption ? (
        <p className="text-subtle text-center text-sm">
          {fill(checkoutCopy.stepCaption, {
            current: String(index + 1),
            label: checkoutCopy.steps[index],
          })}
        </p>
      ) : (
        <AgreeLine />
      )}
    </div>
  );
}

export function AgreeLine() {
  return (
    <p className="text-subtle text-sm">
      {checkoutCopy.agree}{" "}
      <Link href={routes.legal.disclosures} className="underline underline-offset-2">
        {checkoutCopy.disclosures}
      </Link>{" "}
      {checkoutCopy.and}{" "}
      <Link href={routes.legal.terms} className="underline underline-offset-2">
        {checkoutCopy.terms}
      </Link>
      .
    </p>
  );
}
