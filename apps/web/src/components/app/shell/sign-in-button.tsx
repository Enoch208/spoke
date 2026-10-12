"use client";

import { FingerPrintIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { shellCopy } from "@/lib/copy";
import { authHref } from "@/lib/routes";

export function SignInButton({ variant }: { variant: "sidebar" | "bar" | "icon" }) {
  const pathname = usePathname();
  const login = authHref("login", { next: pathname });
  const signup = authHref("signup", { next: pathname });
  if (variant === "icon")
    return (
      <Button asChild size="sm">
        <Link href={login}>{shellCopy.signIn}</Link>
      </Button>
    );
  if (variant === "bar")
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="md" variant="ghost">
          <Link href={login}>{shellCopy.signIn}</Link>
        </Button>
        <Button asChild size="md">
          <Link href={signup}>{shellCopy.createAccount}</Link>
        </Button>
      </div>
    );
  return (
    <div className="bg-surface border-line flex flex-col gap-3 rounded-2xl border p-3">
      <p className="text-body text-sm">{shellCopy.signInPrompt}</p>
      <Button asChild size="md" className="w-full">
        <Link href={signup}>
          <HugeiconsIcon icon={FingerPrintIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
          {shellCopy.createAccount}
        </Link>
      </Button>
      <Link
        href={login}
        className="text-body hover:text-ink text-center text-sm underline-offset-2 hover:underline"
      >
        {shellCopy.haveAccount}
      </Link>
    </div>
  );
}
