import { Clock01Icon } from "@hugeicons/core-free-icons";
import { StatusChip } from "@/components/ui/status-chip";
import { earningsBucketCopy } from "@/lib/copy";
import { allocationCopy } from "./copy";

type AllocationState = keyof typeof allocationCopy;

export function AllocationChip({ state }: { state: AllocationState }) {
  if (state === "reserved")
    return <StatusChip label={allocationCopy.reserved} icon={Clock01Icon} tone="amber" />;
  const bucket = earningsBucketCopy[state];
  return <StatusChip label={allocationCopy[state]} icon={bucket.icon} tone={bucket.tone} />;
}
