"use client";

import type { ReactNode } from "react";
import { CampaignArt } from "@/components/product/campaign-art";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatDateTime } from "@/lib/format";
import { holdWords } from "./plain-terms";
import { composerCopy } from "./copy";
import type { ComposerToken, Derived, ProductLite } from "./derive";
import type { ComposerFields, ComposerMode, StepKey } from "./fields";

const copy = composerCopy.summary;

function Row({
  label,
  step,
  onEdit,
  children,
}: {
  label: string;
  step: StepKey;
  onEdit: (step: StepKey) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onEdit(step);
      }}
      aria-label={fill(copy.edit, { thing: label.toLowerCase() })}
      className="hover:bg-soft ease-spring -mx-2 flex w-[calc(100%+16px)] items-start justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-[423ms]"
    >
      <span className="text-subtle shrink-0 text-sm">{label}</span>
      <span className="text-ink min-w-0 text-right text-sm">{children}</span>
    </button>
  );
}

export function CampaignSummary({
  fields,
  derived,
  product,
  token,
  mode,
  onEdit,
}: {
  fields: ComposerFields;
  derived: Derived;
  product: ProductLite | null;
  token: ComposerToken;
  mode: ComposerMode;
  onEdit: (step: StepKey) => void;
}) {
  const reward = derived.check.pricing?.rewardMinor ?? null;
  const weights = derived.check.resolved?.weightsBps ?? null;
  const covers =
    reward && reward > 0n && derived.depositMinor !== null ? derived.depositMinor / reward : null;
  const hold = derived.check.resolved?.holdSeconds ?? null;
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <h2 className="font-display text-h4 text-ink mb-2 font-medium tracking-[-0.01em]">
        {copy.title}
      </h2>
      {product ? (
        <div className="mb-2 flex items-center gap-3">
          <CampaignArt
            seed={product.id}
            imageUrl={product.imageUrl}
            title={product.title}
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-medium">{product.title}</p>
            <p className="text-subtle font-mono text-sm tabular-nums">
              {formatAmount(product.priceMinor, token)}
            </p>
          </div>
        </div>
      ) : null}
      <Row label={copy.reward} step="rewards" onEdit={onEdit}>
        <span className="font-mono tabular-nums">
          {reward === null ? copy.empty : formatAmount(reward, token)}
        </span>
      </Row>
      <Row label={copy.split} step="rewards" onEdit={onEdit}>
        {weights ? (
          <span className="flex flex-wrap justify-end gap-1">
            {weights.map((weight, index) => (
              <span
                key={String(index)}
                className="bg-pill rounded-full px-2 py-0.5 font-mono text-xs tabular-nums"
              >
                {formatBps(weight)}
              </span>
            ))}
          </span>
        ) : (
          copy.empty
        )}
      </Row>
      <Row label={copy.shortPath} step="rewards" onEdit={onEdit}>
        {fields.terms.shortPathMode === "RENORMALIZE_EXISTING"
          ? copy.renormalize
          : copy.returnUnused}
      </Row>
      {mode === "create" ? (
        <Row label={copy.deposit} step="budget" onEdit={onEdit}>
          {derived.depositMinor === null ? (
            copy.empty
          ) : (
            <span className="flex flex-col items-end">
              <span className="font-mono tabular-nums">
                {formatAmount(derived.depositMinor, token)}
              </span>
              {covers !== null ? (
                <span className="text-subtle text-xs">
                  {fill(copy.covers, { count: covers.toString() })}
                </span>
              ) : null}
            </span>
          )}
        </Row>
      ) : null}
      <Row label={copy.hold} step="rules" onEdit={onEdit}>
        {hold === null ? copy.empty : holdWords(hold)}
      </Row>
      <Row label={copy.ends} step="rules" onEdit={onEdit}>
        {fields.end.kind === "preset" && mode === "create"
          ? fill(copy.endsIn, { days: String(fields.end.days) })
          : derived.endsAt === null
            ? copy.empty
            : formatDateTime(new Date(derived.endsAt))}
      </Row>
      <Row label={copy.access} step="rules" onEdit={onEdit}>
        {fields.inviteOnly ? copy.inviteOnly : copy.open}
      </Row>
    </Card>
  );
}
