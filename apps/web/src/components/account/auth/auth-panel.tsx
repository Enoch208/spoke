"use client";

import {
  ArrowRight01Icon,
  FingerPrintIcon,
  QrCodeIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useViewer } from "@/components/app/shell/use-area";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/spinner";
import { useAccountAuth } from "@/lib/accounts/use-account-auth";
import { authCopy } from "@/lib/copy";
import { internalPath } from "@/lib/demo/landing";
import { afterAuthPath, authHref, isAuthIntent, routes } from "@/lib/routes";

const optionClass =
  "border-line bg-surface hover:border-ink ease-spring flex h-12 w-full items-center gap-3 rounded-2xl border px-4 text-left text-[15px] font-medium transition-[border-color,background-color] duration-[423ms] disabled:hover:border-line";

export function AuthPanel({ kind }: { kind: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = internalPath(params.get("next"));
  const rawIntent = params.get("intent");
  const intent = isAuthIntent(rawIntent) ? rawIntent : null;
  const viewer = useViewer();
  const copy = authCopy[kind];
  const auth = useAccountAuth({
    onSignedIn: ({ isNewAccount }) => {
      router.replace(afterAuthPath({ isNewAccount, next, intent }));
    },
  });

  useEffect(() => {
    if (viewer === "signedIn" && auth.busy === null)
      router.replace(next ?? (intent === "sell" ? routes.sell.overview : routes.earn.home));
  }, [viewer, auth.busy, next, intent, router]);

  const busy = auth.busy !== null;
  const switchHref = authHref(kind === "login" ? "signup" : "login", {
    next: next ?? undefined,
    intent: intent ?? undefined,
  });

  return (
    <div className="animate-hero-in flex flex-col">
      <h1 className="font-display text-title text-ink font-medium tracking-[-0.02em]">
        {copy.title}
      </h1>
      <p className="text-body mt-2">{copy.subtitle}</p>

      <div className="mt-8 flex flex-col gap-3">
        <Button
          size="lg"
          block
          icon={FingerPrintIcon}
          loading={auth.busy === "passkey" || auth.busy === "create"}
          disabled={busy}
          onClick={() => void auth.passkey(kind === "signup")}
        >
          {copy.passkey}
        </Button>
        <p className="text-subtle text-sm">{authCopy.passkeyHint}</p>
      </div>

      <div className="text-faint my-7 flex items-center gap-3 text-sm">
        <span className="bg-line h-px flex-1" />
        {authCopy.divider}
        <span className="bg-line h-px flex-1" />
      </div>

      <div className="flex flex-col gap-2.5">
        {auth.connected ? (
          <button
            type="button"
            className={optionClass}
            disabled={busy}
            onClick={() => void auth.wallet()}
          >
            <HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="flex-1">{authCopy.connectedWallet}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : (
          auth.browserWallets.map(({ connector, name, icon }) => (
            <button
              key={connector.uid}
              type="button"
              className={optionClass}
              disabled={busy}
              onClick={() => void auth.wallet(connector)}
            >
              {icon ? (
                <img src={icon} alt="" className="size-5 rounded-md" />
              ) : (
                <HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
              )}
              <span className="flex-1">{name}</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          ))
        )}
        <button type="button" className={optionClass} disabled={busy} onClick={auth.walletConnect}>
          <HugeiconsIcon icon={QrCodeIcon} size={20} strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1">{authCopy.walletConnect}</span>
          <span className="text-subtle text-sm font-normal">{authCopy.walletConnectHint}</span>
        </button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-6">
        {auth.busy ? (
          <p className="text-subtle flex items-center gap-2 text-sm">
            <Spinner />
            {auth.busy === "wallet" ? authCopy.working.wallet : authCopy.working.passkey}
          </p>
        ) : auth.error ? (
          <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl px-3 py-2.5 text-sm">
            {auth.error}
          </p>
        ) : null}
      </div>

      <p className="text-body mt-4 text-sm">
        {copy.switchPrompt}{" "}
        <Link href={switchHref} className="text-ink font-medium underline-offset-2 hover:underline">
          {copy.switchAction}
        </Link>
      </p>
      {kind === "login" ? (
        <Link
          href={routes.recover}
          className="text-body hover:text-ink mt-2 w-fit text-sm underline-offset-2 hover:underline"
        >
          {authCopy.login.recover}
        </Link>
      ) : null}
      <Link
        href={routes.demo}
        className={cx(
          "border-hairline text-body hover:text-ink mt-8 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors",
        )}
      >
        {authCopy.demo}
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
      </Link>
      <p className="text-subtle mt-6 text-xs">
        {authCopy.legalLead}{" "}
        <Link href={routes.legal.terms} className="underline underline-offset-2">
          {authCopy.terms}
        </Link>{" "}
        {authCopy.legalJoin}{" "}
        <Link href={routes.legal.privacy} className="underline underline-offset-2">
          {authCopy.privacy}
        </Link>
        .
      </p>
    </div>
  );
}
