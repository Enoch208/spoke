"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/ui/use-copy";
import { useFeatureGate } from "@/components/app/feature-gate";
import { featureStatus } from "@/lib/features";
import { shareKitCopy } from "../copy/links";

export function EmbedCard({
  url,
  product,
  merchant,
}: {
  url: string;
  product: string;
  merchant: string;
}) {
  const gate = useFeatureGate();
  const copy = useCopy();
  const snippet = `<a href="${url}" rel="sponsored">${product} · ${merchant}</a>`;
  return (
    <section className="border-hairline grid gap-3 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-ink text-sm font-medium">{shareKitCopy.embedTitle}</h3>
        {featureStatus("widgets") === "live" ? null : (
          <Badge tone="lilac">{shareKitCopy.demoTag}</Badge>
        )}
      </div>
      <p className="text-subtle text-sm">{shareKitCopy.embedBody}</p>
      <div className="bg-soft rounded-xl p-3">
        <p className="text-ink text-sm font-medium">{product}</p>
        <p className="text-subtle text-xs">{merchant}</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="justify-self-start"
        onClick={() => {
          gate("widgets", () => void copy(snippet, shareKitCopy.snippetCopied));
        }}
      >
        {shareKitCopy.embedAction}
      </Button>
    </section>
  );
}
