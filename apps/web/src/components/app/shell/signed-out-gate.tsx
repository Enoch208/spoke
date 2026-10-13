"use client";

import { FingerPrintIcon, LockKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fill, globalStates, shellCopy } from "@/lib/copy";
import { authHref, routes } from "@/lib/routes";
import { signedOutThingFor } from "./use-area";

export function SignedOutGate() {
  const pathname = usePathname();
  const params = useSearchParams();
  const next = params.size ? `${pathname}?${params.toString()}` : pathname;
  const copy = globalStates.signedOut;
  return (
    <EmptyState
      variant="gate"
      icon={LockKeyIcon}
      title={fill(copy.title, { thing: signedOutThingFor(pathname) })}
      body={copy.body}
      actions={
        <>
          <Button asChild>
            <Link href={authHref("signup", { next })}>
              <HugeiconsIcon
                icon={FingerPrintIcon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {shellCopy.createAccount}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={authHref("login", { next })}>{shellCopy.signIn}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`${routes.demo}?next=${encodeURIComponent(next)}`}>
              {shellCopy.discover.demo}
            </Link>
          </Button>
        </>
      }
    />
  );
}
