"use client";

import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { explorerAddressUrl, explorerTxUrl, type SupportedChainId } from "@spoke/protocol";
import { common, fill, globalStates, toasts } from "@/lib/copy";
import { checksumAddress, formatPerson, shortAddress, shortHash } from "@/lib/format";
import { Badge } from "./badge";
import { CopyButton } from "./copy-field";
import { cx } from "./cx";

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="text-subtle hover:text-ink inline-flex size-8 shrink-0 items-center justify-center rounded-full"
    >
      <HugeiconsIcon icon={LinkSquare02Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
    </a>
  );
}

export function Address({
  address,
  chainId,
  handle,
  isSelf = false,
  showAddress = false,
  copy = true,
  explorer = true,
  demo = false,
  sample = false,
  className,
}: {
  address: string;
  chainId: SupportedChainId;
  handle?: string | null;
  isSelf?: boolean;
  showAddress?: boolean;
  copy?: boolean;
  explorer?: boolean;
  demo?: boolean;
  sample?: boolean;
  className?: string | undefined;
}) {
  const full = checksumAddress(address);
  const short = shortAddress(address);
  const person = formatPerson({ handle: handle ?? null, address, isSelf });
  const href = explorer && !demo ? explorerAddressUrl(chainId, full) : null;
  return (
    <span className={cx("font-ui inline-flex min-w-0 items-center gap-1", className)}>
      <span className="text-ink min-w-0 truncate" title={full}>
        {person}
        {showAddress && person !== short ? (
          <span className="text-subtle font-mono tabular-nums"> · {short}</span>
        ) : null}
      </span>
      {sample ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
      {copy ? (
        <CopyButton
          value={full}
          label={common.copyAddress}
          copiedMessage={toasts["T-01"].copy.address}
        />
      ) : null}
      {href ? (
        <ExplorerLink href={href} label={fill(common.addressOnExplorer, { shortAddress: short })} />
      ) : null}
    </span>
  );
}

export function TxHash({
  hash,
  chainId,
  demo = false,
  className,
}: {
  hash: string | null;
  chainId: SupportedChainId;
  demo?: boolean;
  className?: string | undefined;
}) {
  if (demo || !hash) {
    return <span className={cx("font-ui text-subtle text-sm", className)}>{common.simulated}</span>;
  }
  const short = shortHash(hash);
  const href = explorerTxUrl(chainId, hash);
  return (
    <span className={cx("font-ui inline-flex items-center gap-1", className)}>
      <span className="text-ink font-mono text-sm tabular-nums" title={hash.toLowerCase()}>
        {short}
      </span>
      <CopyButton
        value={hash.toLowerCase()}
        label={common.copyHash}
        copiedMessage={toasts["T-01"].copy.hash}
      />
      {href ? (
        <ExplorerLink
          href={href}
          label={fill(common.transactionOnExplorer, { shortHash: short })}
        />
      ) : null}
    </span>
  );
}
