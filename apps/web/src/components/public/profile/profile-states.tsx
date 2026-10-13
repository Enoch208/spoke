import { SquareLock02Icon, UserIcon } from "@hugeicons/core-free-icons";
import { explorerAddressUrl, isSupportedChainId } from "@spoke/protocol";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { formatHandle } from "@/lib/format";
import { routes } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { profileCopy } from "../copy/profile";

const browse = (
  <Button asChild>
    <Link href={routes.distributors}>{profileCopy.browse}</Link>
  </Button>
);

export function PrivateProfile() {
  return (
    <EmptyState
      variant="page"
      icon={SquareLock02Icon}
      title={profileCopy.privateTitle}
      body={profileCopy.privateBody}
      actions={browse}
    />
  );
}

export function UnknownProfile({ handle }: { handle: string }) {
  if (handle.startsWith("0x")) {
    const href = isSupportedChainId(activeChain.id)
      ? explorerAddressUrl(activeChain.id, handle)
      : null;
    return (
      <EmptyState
        variant="page"
        icon={UserIcon}
        title={profileCopy.walletTitle}
        body={profileCopy.walletBody}
        actions={
          <>
            {href ? (
              <Button asChild variant="secondary">
                <a href={href} target="_blank" rel="noreferrer">
                  {profileCopy.openExplorer}
                </a>
              </Button>
            ) : null}
            {browse}
          </>
        }
      />
    );
  }
  return (
    <EmptyState
      variant="page"
      icon={UserIcon}
      title={fill(profileCopy.unknownTitle, { handle: formatHandle(handle) })}
      body={profileCopy.unknownBody}
      actions={browse}
    />
  );
}
