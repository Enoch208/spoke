import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { explorerAddressUrl } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-field";
import { formatHandle, shortAddress } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { fill } from "@/lib/copy";
import { recoverCopy } from "../copy/recover";
import { sharedCopy } from "../copy/shared";
import { formatDay } from "../shared/dates";
import { PieceAvatar } from "../shared/piece-avatar";

export function AddressCard({
  address,
  demo,
  profile,
  note,
}: {
  address: string;
  demo: boolean;
  profile: { handle: string | null; avatarSeed: string; createdAt: string } | null;
  note?: ReactNode;
}) {
  const explorer = demo ? null : explorerAddressUrl(activeChain.id, address);
  return (
    <div className="bg-surface border-hairline flex flex-col gap-4 rounded-2xl border p-5">
      {profile ? (
        <div className="flex items-center gap-3">
          <PieceAvatar seed={profile.avatarSeed} size="lg" />
          <div className="min-w-0">
            <p className="text-ink font-medium">
              {profile.handle ? formatHandle(profile.handle) : shortAddress(address)}
            </p>
            <p className="text-subtle text-sm">
              {fill(recoverCopy.confirm.memberSince, {
                date: formatDay(new Date(profile.createdAt)),
              })}
            </p>
          </div>
          {demo ? <Badge tone="lilac">{sharedCopy.sample}</Badge> : null}
        </div>
      ) : null}
      <div className="bg-soft flex items-start gap-2 rounded-xl px-4 py-3">
        <p className="text-ink min-w-0 flex-1 font-mono text-base break-all tabular-nums sm:text-lead">
          {address}
        </p>
        <CopyButton
          value={address}
          label={sharedCopy.copyAddress}
          copiedMessage={sharedCopy.addressCopied}
        />
        {explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            aria-label={recoverCopy.confirm.explorer}
            className="text-subtle hover:text-ink inline-flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <HugeiconsIcon icon={LinkSquare02Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      {note ? <p className="text-subtle text-sm">{note}</p> : null}
    </div>
  );
}
