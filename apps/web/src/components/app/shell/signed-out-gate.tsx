"use client";

import { FingerPrintIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fill, globalStates } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { signedOutThingFor } from "./use-area";

export function SignedOutGate() {
  const pathname = usePathname();
  const open = useUiStore((state) => state.open);
  const copy = globalStates.signedOut;
  const [passkeyLabel, walletLabel] = copy.actions;
  return (
    <EmptyState
      variant="gate"
      title={fill(copy.title, { thing: signedOutThingFor(pathname) })}
      body={copy.body}
      actions={
        <>
          <Button
            icon={FingerPrintIcon}
            onClick={() => {
              open("M-01", { reason: "open", returnTo: pathname });
            }}
          >
            {passkeyLabel}
          </Button>
          <Button
            variant="secondary"
            icon={Wallet01Icon}
            onClick={() => {
              open("M-03", { reason: "open", returnTo: pathname });
            }}
          >
            {walletLabel}
          </Button>
        </>
      }
    />
  );
}
