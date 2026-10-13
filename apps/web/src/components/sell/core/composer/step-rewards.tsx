"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { CommissionStudio } from "../studio/commission-studio";
import { CrossCheckNote } from "../studio/cross-check-note";
import type { CrossCheck } from "../studio/split";
import type { LibraryTemplate } from "../studio/starting-points";
import type { StudioTerms } from "../studio/terms";
import { composerCopy } from "./copy";
import type { ComposerToken, Derived } from "./derive";
import type { TemplateNote } from "./fields";
import { TemplateRow } from "./template-row";

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
