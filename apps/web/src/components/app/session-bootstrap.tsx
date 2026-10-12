"use client";

import { useEffect } from "react";
import { isAddress } from "viem";
import { useClientContext } from "@/lib/client/provider";
import { useAccountMe } from "@/lib/query/hooks";
import { readCsrfToken } from "@/lib/client/live/csrf";
import { useUiStore } from "@/lib/stores/ui";
import { useSessionStore } from "@/lib/stores/session";

export function SessionBootstrap() {
  const { mode } = useClientContext();
  const status = useSessionStore((state) => state.status);
  const me = useAccountMe({}, { enabled: mode === "demo" || status !== "signedIn" });

  useEffect(() => {
    const session = useSessionStore.getState();
    if (me.data) {
      const { address } = me.data;
      if (!isAddress(address, { strict: false })) return;
      session.signIn({
        address,
        accountKind: me.data.accountKind === "wallet" ? "wallet" : "passkey",
        sessionExpiresAt: null,
        isMerchant: me.data.isMerchant,
        isOperator: me.data.isOperator,
      });
      if (mode === "live" && !readCsrfToken()) {
        session.expire();
        useUiStore.getState().open("M-08", {
          expectedAddress: address,
          accountKind: me.data.accountKind === "wallet" ? "wallet" : "passkey",
        });
      }
      return;
    }
    if (me.isError) session.markBootstrapped();
  }, [mode, me.data, me.isError]);

  return null;
}
