import { modeBadgeCopy } from "@/lib/copy";
import type { Mode } from "@/lib/stores/mode";
import { StatusChip } from "./status-chip";

export function ModeBadge({ mode, className }: { mode: Mode; className?: string }) {
  return <StatusChip {...modeBadgeCopy[mode]} className={className} />;
}
