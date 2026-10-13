"use client";

import { Alert01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { CommissionStudio } from "../studio/commission-studio";
import { crossCheckCopy } from "../studio/copy-errors";
import type { CrossCheck } from "../studio/split";
import type { LibraryTemplate } from "../studio/starting-points";
import type { StudioTerms } from "../studio/terms";
import { composerCopy } from "./copy";
import type { ComposerToken, Derived } from "./derive";
import type { TemplateNote } from "./fields";
import { TemplateRow } from "./template-row";

export function CrossCheckNote({ result }: { result: CrossCheck | null }) {
  const open = useUiStore((state) => state.open);
  if (!result || result.kind === "match") return null;
  if (result.kind === "unavailable")
    return (
      <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          className="mt-0.5 shrink-0"
        />
        {crossCheckCopy.unavailable}
      </p>
    );
  return (
    <div
      role="alert"
      className="bg-pink-soft text-pink-ink flex flex-col gap-2 rounded-xl px-3 py-2.5 text-sm"
    >
      <p className="flex items-start gap-2">
        <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        {crossCheckCopy.mismatch}
      </p>
      <Button
        variant="danger"
        size="sm"
        className="self-start"
        onClick={() => {
          open("M-41", { category: "product", context: { split: result.detail } });
        }}
      >
        {crossCheckCopy.report}
      </Button>
    </div>
  );
}

export function RewardsStep({
  terms,
  onTerms,
  derived,
  priceMinor,
  token,
  showErrors,
  templates,
  note,
  onTemplate,
  crossCheck,
}: {
  terms: StudioTerms;
  onTerms: (terms: StudioTerms) => void;
  derived: Derived;
  priceMinor: bigint | null;
  token: ComposerToken;
  showErrors: boolean;
  templates: readonly LibraryTemplate[];
  note: TemplateNote | null;
  onTemplate: ((template: LibraryTemplate) => void) | null;
  crossCheck: CrossCheck | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {onTemplate ? (
        <TemplateRow
          templates={templates}
          note={note}
          onApply={onTemplate}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.sell.studio}>{composerCopy.rewards.openStudio}</Link>
            </Button>
          }
        />
      ) : null}
      <CommissionStudio
        terms={terms}
        onChange={onTerms}
        check={derived.check}
        policy={derived.policy}
        showErrors={showErrors}
        priceMinor={priceMinor}
        token={token}
        variant="campaign"
      />
      <CrossCheckNote result={crossCheck} />
    </div>
  );
}
