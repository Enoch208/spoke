"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FreshnessLine } from "../shared/freshness";
import { ComparisonCandidate } from "./comparison-candidate";

export function ComparisonSelection({
  selected,
  viewing,
  view,
  clear,
}: {
  selected: readonly string[];
  viewing: boolean;
  view: (open: boolean) => void;
  clear: () => void;
}) {
  return (
    <Card className="bg-soft flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h2 className="font-medium">Find the right distribution partners</h2>
        <p className="text-subtle text-sm" role="status">
          {selected.length ? `${String(selected.length)} of 3 selected. ` : ""}
          Choose two or three distributors to compare their shared records.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {selected.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear selection
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={!viewing && selected.length < 2}
          onClick={() => {
            view(!viewing);
          }}
        >
          {viewing ? "Back to directory" : "Compare selected"}
        </Button>
      </div>
    </Card>
  );
}

export function DirectoryComparison({
  selected,
  sample,
  remove,
}: {
  selected: readonly string[];
  sample: boolean;
  remove: (id: string) => void;
}) {
  return (
    <section aria-labelledby="comparison-title" className="space-y-4">
      <div className="space-y-2">
        <h2 id="comparison-title" className="font-display text-h4">
          Compare distributors
        </h2>
        <p className="text-body max-w-[75ch] text-sm">
          Review all available settled contribution, merchant diversity and receipt evidence. Each
          person controls what they share. Wallet context is additional research and never changes
          sales performance or rewards.
        </p>
        <FreshnessLine />
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {selected.map((id) => (
          <ComparisonCandidate
            key={id}
            id={id}
            sample={sample}
            remove={() => {
              remove(id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
