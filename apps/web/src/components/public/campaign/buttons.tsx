"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { usePhone } from "@/components/ui/use-phone";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { hasModal } from "../shared/modals-ready";

export const checkoutHref = (campaignId: string, code: string | null) =>
  code
    ? `${routeTo.checkout(campaignId)}?ref=${encodeURIComponent(code)}`
    : routeTo.checkout(campaignId);

export function BuyButton({
  campaignId,
  nodeId,
  code,
  variant = "primary",
  children,
}: {
  campaignId: string;
  nodeId: string | null;
  code: string | null;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  const phone = usePhone();
  const open = useUiStore((state) => state.open);
  if (!phone && hasModal("M-17"))
    return (
      <Button
        block
        variant={variant}
        onClick={() => {
          open("M-17", nodeId && nodeId !== "0" ? { campaignId, nodeId } : { campaignId });
        }}
      >
        {children}
      </Button>
    );
  return (
    <Button block asChild variant={variant}>
      <Link href={checkoutHref(campaignId, nodeId && nodeId !== "0" ? code : null)}>
        {children}
      </Link>
    </Button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <Button block asChild variant={variant}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
