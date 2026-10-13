"use client";

import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { fill, txOverallStatus } from "@/lib/copy";
import { useModeStore } from "@/lib/stores/mode";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive, overallStatus } from "@/lib/tx/records";
import { linksPageCopy as copy } from "../copy/links-page";

const recent = 10 * 60 * 1000;

export function PendingLinks({ now }: { now: number }) {
  const mode = useModeStore((state) => state.mode);
  const open = useUiStore((state) => state.open);
  const records = useTxStore((state) => state.records);
  const rows = records.filter(
    (record) =>
      record.kind === "createNode" &&
      record.mode === mode &&
      (isActive(record) || (overallStatus(record) === "failed" && now - record.updatedAt < recent)),
  );
  if (rows.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {rows.map((record) => {
        if (record.kind !== "createNode") return null;
        const status = overallStatus(record);
        const failed = status === "failed";
        const reason = record.steps.find((step) => step.error)?.error?.message ?? "";
        return (
          <li
            key={record.id}
            className="border-hairline bg-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div className="grid gap-1">
              <p className="text-ink font-medium">{record.params.campaignName}</p>
              <p className="text-subtle text-sm">
                {failed ? fill(copy.failed, { reason }) : copy.creating}
              </p>
            </div>
            {failed ? (
              <div className="flex items-center gap-2">
                <StatusChip label={txOverallStatus[status]} icon={Alert02Icon} tone="pink" />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    open("M-12", {
                      campaignId: record.params.campaignId,
                      parentNodeId: record.params.parentNodeId,
                    })
                  }
                >
                  {copy.tryAgain}
                </Button>
              </div>
            ) : (
              <StatusChip label={txOverallStatus[status]} icon={RefreshIcon} tone="sky" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
