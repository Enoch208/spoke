"use client";

import { FingerPrintIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAccountAuth } from "@/lib/accounts/use-account-auth";
import { authCopy } from "@/lib/copy";
import { passkeyHint } from "./copy/auth";
import { internalPath } from "@/lib/demo/landing";
import { afterAuthPath, authHref } from "@/lib/routes";

export default function SignInModal<K extends "M-01" | "M-02" | "M-03">({
  props,
  close,
}: ModalComponentProps<K>) {
  const router = useRouter();
  const next = internalPath(props.returnTo);
  const intent = props.reason === "sell" ? "sell" : null;
  const auth = useAccountAuth({
    expectedAddress: props.expectedAddress,
    onSignedIn: ({ isNewAccount }) => {
      close();
      if (props.reason !== "open") return;
      router.push(afterAuthPath({ isNewAccount, next, intent }));
    },
  });
  const busy = auth.busy !== null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
      title="Sign in to continue"
      subtitle="Use email, a passkey or a wallet. Spoke never holds your money."
      closeDisabled={busy}
      modal={auth.busy !== "email"}
      inert={auth.busy === "email"}
    >
      <div className="grid gap-3">
        {auth.emailAvailable ? (
          <>
            <Button
              block
              icon={Mail01Icon}
              loading={auth.busy === "email"}
              disabled={busy}
              onClick={() => void auth.email()}
            >
              {authCopy.email}
            </Button>
            <p className="text-subtle text-sm">{authCopy.emailHint}</p>
          </>
        ) : null}
        <Button
          block
          variant={auth.emailAvailable ? "secondary" : "primary"}
          icon={FingerPrintIcon}
          loading={auth.busy === "passkey"}
          disabled={busy}
          onClick={() => void auth.passkey(false)}
        >
          {authCopy.login.passkey}
        </Button>
        <Button
          block
          variant="secondary"
          loading={auth.busy === "create"}
          disabled={busy}
          onClick={() => void auth.passkey(true)}
        >
          {authCopy.signup.passkey}
        </Button>
        <p className="text-subtle text-sm">{passkeyHint}</p>
        <div className="border-hairline my-1 border-t" />
        {auth.connected ? (
          <Button
            block
            variant="secondary"
            loading={auth.busy === "wallet"}
            disabled={busy}
            onClick={() => void auth.wallet()}
          >
            {authCopy.connectedWallet}
          </Button>
        ) : (
          auth.browserWallets.map(({ connector, name }) => (
            <Button
              key={connector.uid}
              block
              variant="secondary"
              disabled={busy}
              onClick={() => void auth.wallet(connector)}
            >
              {name}
            </Button>
          ))
        )}
        <Button block variant="secondary" disabled={busy} onClick={auth.walletConnect}>
          {authCopy.walletConnect} · {authCopy.walletConnectHint}
        </Button>
        {auth.error ? (
          <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl p-3 text-sm">
            {auth.error}
          </p>
        ) : null}
        <Link
          href={authHref("login", { next: next ?? undefined })}
          onClick={close}
          className="text-body hover:text-ink text-center text-sm underline-offset-2 hover:underline"
        >
          Open the full sign-in page
        </Link>
      </div>
    </Dialog>
  );
}
