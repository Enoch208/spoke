"use client";

import { Blockchain01Icon, SignatureIcon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/ui/cx";
import { formatPerson } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { growthCopy } from "./copy";
import { SampleChip } from "./not-live";

export type PersonLike = {
  address: string | null;
  handle: string | null;
  displayName?: string | null;
  visibility?: "public" | "pseudonymous" | "private";
};

export const personName = (person: PersonLike) =>
  formatPerson({ handle: person.handle, address: person.address });

export function PersonLabel({
  person,
  size = "sm",
  sample = true,
  className,
}: {
  person: PersonLike;
  size?: "xs" | "sm" | "md" | "lg";
  sample?: boolean;
  className?: string | undefined;
}) {
  const showAvatar = person.visibility !== "pseudonymous" && person.visibility !== "private";
  return (
    <span className={cx("flex min-w-0 items-center gap-2.5", className)}>
      {showAvatar ? (
        <Avatar
          seed={person.address ?? person.handle ?? "someone"}
          name={person.displayName ?? person.handle}
          size={size}
        />
      ) : null}
      <span className="min-w-0">
        <span className="text-ink block truncate font-medium">{personName(person)}</span>
        {showAvatar && person.displayName ? (
          <span className="text-subtle block truncate text-xs">{person.displayName}</span>
        ) : null}
      </span>
      {sample ? <SampleChip /> : null}
    </span>
  );
}

export function TrustBadge({ mode }: { mode: "native" | "attested" }) {
  return (
    <Badge tone="ink" icon={mode === "native" ? Blockchain01Icon : SignatureIcon}>
      {mode === "native" ? growthCopy.trust.native : growthCopy.trust.attested}
    </Badge>
  );
}

export const trustOf = (value: string): "native" | "attested" =>
  value.toLowerCase().includes("attest") ? "attested" : "native";

export const toast = (
  id: `T-${string}`,
  message: string,
  tone: "success" | "info" | "error" = "success",
) => {
  useUiStore.getState().pushToast({ id, subject: message, tone, message, durationMs: 4000 });
};
