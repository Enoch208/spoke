"use client";

import { Button } from "@/components/ui/button";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import type { Highlight } from "./canvas-edges";
import { explorerCopy as copy, graphCopy } from "./copy";
import { Legend } from "./legend";
import type { Graph } from "./model";

export function ExplorerFooter({
  graph,
  highlight,
  trimmed,
  showLegend,
  onClear,
}: {
  graph: Graph;
  highlight: Highlight | null;
  trimmed: boolean;
  showLegend: boolean;
  onClear: () => void;
}) {
  const { mode } = useClientContext();
  return (
    <div className="border-hairline grid gap-3 border-t p-4">
      {trimmed ? <p className="text-amber-ink text-sm">{copy.trimmed}</p> : null}
      {highlight ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body max-w-[60ch] text-sm">{graphCopy.pathNote}</p>
          <Button size="sm" variant="secondary" onClick={onClear}>
            {copy.clear}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {showLegend ? <Legend className="min-w-0 flex-1" /> : <span />}
        <p className="text-subtle font-mono text-xs">
          {mode === "demo"
            ? copy.simulated
            : graph.indexedBlock
              ? fill(copy.indexed, { block: formatCount(BigInt(graph.indexedBlock)) })
              : null}
        </p>
      </div>
    </div>
  );
}
