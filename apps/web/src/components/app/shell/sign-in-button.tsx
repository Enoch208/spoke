"use client";

import { FingerPrintIcon } from "@hugeicons/core-free-icons";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { shellCopy } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";

export function SignInButton({ variant }: { variant: "sidebar" | "bar" | "icon" }) {
  const pathname = usePathname();
  const open = useUiStore((state) => state.open);
  const signIn = () => {
    open("M-01", { reason: "open", returnTo: pathname });
  };
  if (variant === "icon")
    return (
      <Button size="sm" onClick={signIn}>
        {shellCopy.signIn}
      </Button>
    );
  if (variant === "bar")
    return (
      <Button size="md" icon={FingerPrintIcon} onClick={signIn}>
        {shellCopy.signIn}
      </Button>
    );
  return (
    <div className="bg-surface border-line flex flex-col gap-3 rounded-2xl border p-3">
      <p className="text-body text-sm">{shellCopy.signInPrompt}</p>
      <Button size="md" icon={FingerPrintIcon} onClick={signIn} className="w-full">
        {shellCopy.signIn}
      </Button>
    </div>
  );
}
