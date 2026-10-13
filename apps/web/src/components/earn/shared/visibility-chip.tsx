import { StatusChip } from "@/components/ui/status-chip";
import { visibilityCopy } from "@/lib/copy";

export function VisibilityChip({ level }: { level: keyof typeof visibilityCopy }) {
  const copy = visibilityCopy[level];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} />;
}
