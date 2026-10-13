"use client";

import { Flag01Icon } from "@hugeicons/core-free-icons";
import type { ClientInput } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";

type TargetKind = NonNullable<ClientInput<"support.report">["target"]>["kind"];

export function ReportButton({
  label,
  target,
  context,
}: {
  label: string;
  target: { kind: TargetKind; id: string; name: string };
  context?: Readonly<Record<string, string>>;
}) {
  const open = useUiStore((state) => state.open);
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={Flag01Icon}
      onClick={() => {
        open("M-41", { target, ...(context ? { context } : {}) });
      }}
    >
      {label}
    </Button>
  );
}
