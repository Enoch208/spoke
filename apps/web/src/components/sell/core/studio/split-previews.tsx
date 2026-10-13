"use client";

import { PlayIcon } from "@hugeicons/core-free-icons";
import { formatTokenAmount, type CommissionPolicy } from "@spoke/protocol";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { previewCopy } from "./copy-preview";
import { PreviewCard } from "./preview-card";
import { ReferenceChecks } from "./reference-checks";
import { previewLengths, splitPreview } from "./split";
import { parseAmount } from "./terms";

export function SplitPreviews({
  policy,
  defaultPriceMinor,
  token,
  onOpenSimulator,
  showChecks = true,
}: {
  policy: CommissionPolicy | null;
  defaultPriceMinor: bigint | null;
  token: TokenLike;
  onOpenSimulator?: (() => void) | undefined;
  showChecks?: boolean;
}) {
  const [sample, setSample] = useState(() =>
    defaultPriceMinor === null
      ? ""
      : formatTokenAmount(defaultPriceMinor, token.decimals).replaceAll(",", ""),
  );
  const parsed = parseAmount(sample, token.decimals);
  const price = parsed.ok && parsed.value > 0n ? parsed.value : null;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
        {fill(previewCopy.title, {
          price: price === null ? token.symbol : formatAmount(price, token),
        })}
      </h2>
      <Field label={previewCopy.samplePrice} helper={previewCopy.samplePriceHelper}>
        <Input
          mono
          inputMode="decimal"
          suffix={token.symbol}
          value={sample}
          onChange={(event) => {
            setSample(event.target.value);
          }}
        />
      </Field>
      {!policy || price === null ? (
        <p className="bg-soft text-subtle rounded-xl px-3 py-4 text-center text-sm">
          {price === null ? previewCopy.noPrice : previewCopy.dimmed}
        </p>
      ) : (
        previewLengths(policy.weightsBps.length).map((length) => (
          <PreviewCard
            key={length}
            preview={splitPreview(price, policy, length)}
            mode={policy.shortPathMode}
            fullWeights={policy.weightsBps}
            token={token}
          />
        ))
      )}
      {onOpenSimulator ? (
        <Button variant="secondary" icon={PlayIcon} onClick={onOpenSimulator}>
          {previewCopy.openSimulator}
        </Button>
      ) : null}
      {showChecks ? <ReferenceChecks /> : null}
    </div>
  );
}
