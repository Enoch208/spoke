"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { useSpokeClient } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { endPasskeySession } from "@/lib/accounts/passkey";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { useModeStore } from "@/lib/stores/mode";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useUiStore } from "@/lib/stores/ui";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { PieceAvatar } from "./shared/piece-avatar";
import { errorText } from "./shared/error-text";

export default function AccountMenu({ close }: ModalComponentProps<"M-07">) {
  const client = useSpokeClient();
  const me = useClientQuery("account.me", {});
  const mode = useModeStore((state) => state.mode);
  const persona = useModeStore((state) => state.persona);
  const { exitDemo } = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const pending = useTxStore((state) =>
    state.records.some(
      (record) =>
        record.mode === mode &&
        record.account.toLowerCase() === me.data?.address.toLowerCase() &&
        ["wallet_confirmation", "submitted", "included", "confirmed", "unknown"].includes(
          overallStatus(record),
        ),
    ),
  );
  const signOut = async (confirmed = false) => {
    if (pending && !confirmed) {
      setConfirmExit(true);
      return;
    }
    setBusy(true);
    try {
      await client?.call("auth.signOut", {});
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      endPasskeySession();
      useSessionStore.getState().signOut();
      queryClient.clear();
      close();
      router.push("/");
    }
  };
  const items = [
    ["Wallet", "/wallet"],
    ["Purchases", "/purchases"],
    ["Account settings", "/settings/profile"],
    ["Security", "/settings/security"],
    ["Preferences", "/settings/preferences"],
    ...(mode === "demo" || me.data?.isOperator
      ? [[mode === "demo" ? "Ops console · demo" : "Ops console", "/ops"]]
      : []),
    ["Help and support", "/support"],
    ["System status", "/status"],
  ];
  if (confirmExit)
    return (
      <div className="grid gap-3 p-3">
        <h2 className="text-ink font-medium">A transaction is still running</h2>
        <p className="text-body text-sm">
          Signing out won't stop it, but you won't see its progress until you sign in again.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirmExit(false);
          }}
        >
          Stay signed in
        </Button>
        <Button variant="danger" loading={busy} onClick={() => void signOut(true)}>
          Sign out anyway
        </Button>
      </div>
    );
  return (
    <div className="grid gap-1">
      {me.data ? (
        <div className="border-hairline mb-2 grid gap-3 border-b px-3 pb-4">
          <div className="flex items-center gap-3">
            <PieceAvatar seed={me.data.avatarSeed} size="md" />
            <div className="min-w-0">
              <p className="text-ink truncate font-medium">
                {mode === "demo"
                  ? `Sample ${persona}`
                  : me.data.displayName || me.data.handle || "Unnamed account"}
              </p>
              <p className="text-subtle text-sm">
                {mode === "demo" ? "Demo" : me.data.accountKind === "wallet" ? "Wallet" : "Passkey"}
              </p>
            </div>
          </div>
          <CopyField
            value={me.data.address}
            label="Copy account address"
            copiedMessage="Address copied"
          />
        </div>
      ) : null}
      {mode !== "demo" && me.data && !me.data.onboarding.completedAt ? (
        <Link
          href="/welcome"
          onClick={close}
          className="bg-lime-soft rounded-xl px-3 py-2 text-sm font-medium"
        >
          Finish setting up
        </Link>
      ) : null}
      {me.data?.handle && me.data.visibility && me.data.visibility.level !== "private" ? (
        <Link
          href={`/u/${encodeURIComponent(me.data.handle)}`}
          onClick={close}
          className="hover:bg-pill rounded-xl px-3 py-2"
        >
          Public profile
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-2 px-3 py-2 lg:hidden">
        {(["earn", "sell"] as const).map((workspace) => (
          <Button
            key={workspace}
            variant="secondary"
            onClick={() => {
              useWorkspaceStore.getState().setWorkspace(workspace);
              close();
              router.push(
                workspace === "earn" ? "/earn" : me.data?.isMerchant ? "/sell" : "/sell/setup",
              );
            }}
          >
            {workspace === "earn" ? "Earn" : "Sell"}
          </Button>
        ))}
      </div>
      {items.map(([label, href]) =>
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
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => {
          close();
          useUiStore.getState().open("M-41", { context: { page: pathname } });
        }}
      >
        Report a problem
      </Button>
      {mode === "demo" ? (
        <>
          <Link href="/demo" onClick={close} className="hover:bg-pill rounded-xl px-3 py-2">
            Switch persona
          </Link>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              close();
              useUiStore.getState().open("M-42", { intent: "reset" });
            }}
          >
            Reset demo
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              exitDemo();
              close();
            }}
          >
            Exit demo
          </Button>
        </>
      ) : (
        <>
          <Link
            href={`/demo?next=${encodeURIComponent(pathname)}`}
            onClick={close}
            className="hover:bg-pill rounded-xl px-3 py-2"
          >
            Try the demo
          </Link>
          <Button
            variant="ghost"
            className="justify-start"
            loading={busy}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </>
      )}
      {error ? (
        <p role="alert" className="text-pink-ink px-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
