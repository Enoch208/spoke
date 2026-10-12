"use client";

import Link from "next/link";
import { createElement, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cx } from "@/components/ui/cx";
import { Popover } from "@/components/ui/popover";
import { formatPerson } from "@/lib/format";
import { shellCopy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { modalRegistry } from "../modal-registry";
import { SignInButton } from "./sign-in-button";
import { useViewer } from "./use-area";

export function AccountChip({ compact = false }: { compact?: boolean }) {
  const viewer = useViewer();
  if (viewer === "signedOut") return <SignInButton variant={compact ? "icon" : "sidebar"} />;
  if (viewer === "loading")
    return (
      <div
        aria-hidden="true"
        className={cx("flex h-12 items-center gap-3 px-2", compact && "w-12 justify-center px-0")}
      >
        <span className="bg-pill size-8 animate-pulse rounded-full" />
        {compact ? null : <span className="bg-pill h-3 w-24 animate-pulse rounded-full" />}
      </div>
    );
  return <AccountChipMenu compact={compact} />;
}

function AccountChipMenu({ compact }: { compact: boolean }) {
  const address = useSessionStore((state) => state.address);
  const mode = useModeStore((state) => state.mode);
  const persona = useModeStore((state) => state.persona);
  const [open, setOpen] = useState(false);
  const AccountMenu = modalRegistry["M-07"];
  const name = mode === "demo" ? persona : formatPerson({ address });
  const seed = mode === "demo" ? `demo-${persona}` : (address ?? "anonymous");
  const chip = (
    <button
      type="button"
      aria-label={shellCopy.accountMenu}
      className={cx(
        "font-ui hover:bg-pill flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm",
        compact && "w-12 justify-center px-0",
      )}
    >
      <Avatar seed={seed} name={name} size="sm" />
      {compact ? null : <span className="truncate font-medium">{name}</span>}
    </button>
  );

  if (!AccountMenu) {
    return (
      <Link
        href={routes.settings.profile}
        className={cx(
          "font-ui hover:bg-pill flex h-12 items-center gap-3 rounded-xl px-2 text-sm",
          compact && "w-12 justify-center px-0",
        )}
      >
        <Avatar seed={seed} name={name} size="sm" />
        {compact ? (
          <span className="sr-only">{name}</span>
        ) : (
          <span className="truncate font-medium">{name}</span>
        )}
      </Link>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={chip}
      title={shellCopy.accountMenu}
      width={320}
      align="start"
      side="top"
    >
      {createElement(AccountMenu, {
        props: {},
        modalKey: "M-07",
        isTop: true,
        close: () => {
          setOpen(false);
        },
      })}
    </Popover>
  );
}
