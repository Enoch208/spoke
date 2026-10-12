"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/icon-button";
import { shellCopy } from "@/lib/copy";
import { routes } from "@/lib/routes";

export function FocusedClose() {
  const router = useRouter();
  return (
    <IconButton
      icon={Cancel01Icon}
      label={shellCopy.close}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(routes.explore);
      }}
    />
  );
}
