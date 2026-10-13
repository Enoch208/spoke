"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import type { TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { CommissionStudio } from "./commission-studio";
import { studioPageCopy } from "./copy-page";
import { CrossCheckNote } from "./cross-check-note";
import { EditorHeader } from "./editor-header";
import { templatePolicy } from "./policy";
import { SaveTemplateDialog } from "./save-template-dialog";
import { SplitPreviews } from "./split-previews";
import type { LibraryTemplate } from "./starting-points";
import { TemplateDetails } from "./template-details";
import { TemplateLibrary, type Category } from "./template-library";
import { defaultTerms } from "./terms";
import { samplePriceMinor, useStudioActions } from "./use-studio-actions";
import { checkTerms } from "./validate";

const copy = studioPageCopy;

export type StudioToken = TokenLike & { readonly address: string };

export function StudioWorkspace({
  selected,
  spoke,
  mine,
  categories,
  token,
  minePending,
  mineFailed,
  onRetry,
  onChoose,
}: {
  selected: LibraryTemplate | null;
  spoke: readonly LibraryTemplate[];
  mine: readonly LibraryTemplate[];
  categories: readonly Category[];
  token: StudioToken;
  minePending: boolean;
  mineFailed: boolean;
  onRetry: () => void;
  onChoose: (id: string | null) => void;
}) {
  const open = useUiStore((state) => state.open);
  const baseline = selected?.terms ?? defaultTerms;
  const [terms, setTerms] = useState(baseline);
  const [showErrors, setShowErrors] = useState(false);
  const dirty = JSON.stringify(terms) !== JSON.stringify(baseline);
  const check = checkTerms(terms, { priceMinor: samplePriceMinor, token, variant: "template" });
  const policy = check.resolved ? templatePolicy(check.resolved, terms.shortPathMode, token) : null;
  const actions = useStudioActions({ selected, mine, terms, policy });
  const guard = (run: () => void) => {
    if (dirty) open("M-43", { subject: copy.leaveSubject, onContinue: run });
    else run();
  };
  const ready = (run: () => void) => {
    setShowErrors(true);
    if (policy) run();
  };
  return (
    <ProductPage
      title={copy.title}
      description={copy.description}
      actions={
        <>
          <Button
            variant="secondary"
            icon={Add01Icon}
            onClick={() => {
              guard(() => {
                onChoose(null);
              });
            }}
          >
            {copy.newTemplate}
          </Button>
          <Button
            onClick={() => {
              ready(() => void actions.startCampaign());
            }}
          >
            {copy.useInCampaign}
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_320px]">
        <aside className="min-w-0 lg:sticky lg:top-24">
          <TemplateLibrary
            spoke={spoke}
            mine={mine}
            categories={categories}
            selectedId={selected?.id ?? null}
            minePending={minePending}
            mineFailed={mineFailed}
            onRetry={onRetry}
            onSelect={(template) => {
              guard(() => {
                onChoose(template.id);
              });
            }}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <EditorHeader
            selected={selected}
            dirty={dirty}
            saving={actions.saving}
            onSaveNew={() => {
              ready(() => {
                actions.openDialog(selected?.source === "mine" ? "" : (selected?.name ?? ""));
              });
            }}
            onSaveVersion={() => {
              ready(() => {
                void actions.saveVersion().then((id) => {
                  if (id) onChoose(id);
                });
              });
            }}
            onDuplicate={() => {
              ready(() => {
                actions.openDialog(selected ? `${selected.name} (copy)` : "");
              });
            }}
          />
          <CommissionStudio
            terms={terms}
            onChange={setTerms}
            check={check}
            policy={policy}
            showErrors={showErrors}
            priceMinor={samplePriceMinor}
            token={token}
            variant="template"
          />
          <CrossCheckNote result={actions.checkResult} />
          {selected ? <TemplateDetails template={selected} token={token} /> : null}
        </div>
        <aside className="min-w-0 lg:col-start-2 xl:sticky xl:top-24 xl:col-start-auto">
          <SplitPreviews policy={policy} defaultPriceMinor={samplePriceMinor} token={token} />
        </aside>
      </div>
      {actions.dialogName !== null ? (
        <SaveTemplateDialog
          initialName={actions.dialogName}
          existing={actions.names}
          onClose={actions.closeDialog}
          onSave={async (name) => {
            const id = await actions.persist(name);
            if (id) onChoose(id);
            return id !== null;
          }}
        />
      ) : null}
    </ProductPage>
  );
}
