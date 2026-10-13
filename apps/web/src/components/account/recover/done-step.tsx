"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/key-value";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { shortAddress } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { recoverCopy } from "../copy/recover";
import { FlowFrame } from "../flow/flow-frame";
import { startPath } from "../shared/start-path";
import type { Frame } from "./frame";

export function DoneStep({
  frame,
  address,
  passkeyLabel,
  next,
}: {
  frame: Frame;
  address: string;
  passkeyLabel: string | null;
  next: string | null;
}) {
  const preferences = useClientQuery("account.preferences", {});
  const destination = next ?? startPath(preferences.data?.startWorkspace);
  return (
    <FlowFrame
      {...frame}
      title={recoverCopy.done.title}
      footer={
        <>
          <Button asChild variant="secondary" size="lg">
            <Link href={routes.settings.security}>{recoverCopy.done.review}</Link>
          </Button>
          <Button asChild size="lg">
            <Link href={destination}>{recoverCopy.done.continue}</Link>
          </Button>
        </>
      }
    >
      <div className="bg-surface border-hairline rounded-2xl border px-5 py-2">
        <KeyValue
          items={[
            {
              key: "address",
              label: recoverCopy.done.address,
              value: shortAddress(address),
              mono: true,
            },
            {
              key: "passkey",
              label: recoverCopy.done.passkey,
              value: passkeyLabel
                ? fill(recoverCopy.done.passkeyAdded, { label: passkeyLabel })
                : recoverCopy.done.passkeyNone,
            },
            {
              key: "recovery",
              label: recoverCopy.done.recovery,
              value: (
                <StatusChip
                  label={recoverCopy.done.backedUp}
                  icon={CheckmarkCircle02Icon}
                  tone="lime"
                />
              ),
            },
          ]}
        />
      </div>
    </FlowFrame>
  );
}
