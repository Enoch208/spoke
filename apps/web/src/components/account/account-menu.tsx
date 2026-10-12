"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSpokeClient } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { endPasskeySession } from "@/lib/accounts/passkey";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { useModeStore } from "@/lib/stores/mode";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function AccountMenu({ close }: ModalComponentProps<"M-07">) {
  const client = useSpokeClient();
  const mode = useModeStore((state) => state.mode);
  const { exitDemo } = useDemoMode();
  const router = useRouter();
  const signOut = async () => {
    await client?.call("auth.signOut", {});
    endPasskeySession();
    useSessionStore.getState().signOut();
    close();
    router.push("/");
  };
  return (
    <div className="grid gap-1">
      {[
        ["Wallet", "/wallet"],
        ["Purchases", "/purchases"],
        ["Account settings", "/settings/profile"],
        ["Security", "/settings/security"],
        ["Explore demo", "/demo"],
      ].map(([label, href]) =>
        href ? (
          <Link
            key={href}
            href={href}
            onClick={close}
            className="hover:bg-pill rounded-xl px-3 py-2"
          >
            {label}
          </Link>
        ) : null,
      )}
      {mode === "demo" ? (
        <Button
          variant="ghost"
          onClick={() => {
            exitDemo();
            close();
          }}
        >
          Exit demo
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      )}
    </div>
  );
}
