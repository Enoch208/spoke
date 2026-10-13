"use client";

import { disclosures } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { activeChain } from "@/lib/wagmi";
import { formatAmount } from "@/lib/format";
import { campaignTerms, rewardTerms } from "./plain-terms";
import { NewTermsStep } from "./step-new-terms";

export type VersionView = {
  readonly changes: readonly string[];
  readonly effective: string | undefined;
  readonly issue: string | null;
  readonly endsAt: number;
};
import type { LaunchState } from "./launch-state";
import { BudgetStep } from "./step-budget";
import { LaunchStep, type LaunchIssue } from "./step-launch";
import { ProductStep } from "./step-product";
import { ReviewStep } from "./step-review";
import { RewardsStep } from "./step-rewards";
import { RulesStep } from "./step-rules";
import type { ComposerModel } from "./use-composer";
import { useProductSignals } from "./use-product-signals";
import type { StepFlow } from "./use-step-flow";

export function ComposerStep({
  model,
  flow,
  launchState,
  launchIssue,
  version,
}: {
  model: ComposerModel;
  flow: StepFlow;
  launchState: LaunchState;
  launchIssue: LaunchIssue | null;
  version: VersionView | null;
}) {
  const { setup, fields, derived, patch } = model;
  const accountKind = useSessionStore((state) => state.accountKind);
  const me = useClientQuery("account.me", {}, { enabled: model.step === "review" });
  const signals = useProductSignals(
    setup.mode === "create" && model.step === "product",
    setup.products,
    fields.productId,
    setup.draftId,
  );
  const show = flow.showErrors(model.step);
  const termsInput = {
    product: model.product,
    token: setup.token,
    shortPathMode: fields.terms.shortPathMode,
    depositMinor: derived.depositMinor,
    limitMinor: derived.limitMinor,
    inviteOnly: fields.inviteOnly,
    endsAt: flow.preparedValue ? Number(flow.preparedValue.policy.expiry) * 1000 : derived.endsAt,
    disclosure: disclosures["D-02"].short,
    contact: setup.contact,
    chainId: activeChain.id,
  };
  switch (model.step) {
    case "product":
      return (
        <ProductStep
          products={setup.products}
          selectedId={fields.productId}
          liveIds={signals.liveIds}
          otherDraft={signals.otherDraft}
          error={show ? derived.productError : undefined}
          token={setup.token}
          onSelect={(productId) => {
            patch({ productId });
          }}
        />
      );
    case "rewards":
      return (
        <RewardsStep
          terms={fields.terms}
          onTerms={(terms) => {
            patch({ terms, template: null });
          }}
          derived={derived}
          priceMinor={model.product?.priceMinor ?? null}
          token={setup.token}
          showErrors={show}
          templates={setup.templates.filter(
            (template) =>
              template.categories.length === 0 ||
              template.categories.includes(model.product?.category ?? ""),
          )}
          note={fields.template}
          onTemplate={
            setup.mode === "create"
              ? (template) => {
                  patch({
                    terms: template.terms,
                    template: { name: template.name, version: template.version },
                  });
                }
              : null
          }
          crossCheck={flow.checkResult}
        />
      );
    case "budget":
      return (
        <BudgetStep
          fields={fields}
          onPatch={patch}
          derived={derived}
          token={setup.token}
          balances={model.balances}
          showErrors={show}
        />
      );
    case "rules":
      return (
        <RulesStep
          fields={fields}
          onPatch={patch}
          derived={derived}
          mode={setup.mode}
          showErrors={show}
          now={model.now}
        />
      );
    case "review":
      if (version && derived.check.resolved)
        return (
          <NewTermsStep
            changes={version.changes}
            terms={rewardTerms({ ...termsInput, resolved: derived.check.resolved })}
            effectiveAt={fields.effectiveAt}
            onEffective={(effectiveAt) => {
              patch({ effectiveAt });
            }}
            effectiveError={version.effective}
            unchanged={version.changes.length === 0}
            showErrors={show}
            prepared={flow.prepared}
            endsAt={version.endsAt}
            issue={version.issue}
            onEdit={flow.select}
            onRetry={() => {
              flow.goTo("review");
            }}
          />
        );
      return (
        <ReviewStep
          terms={
            derived.check.resolved
              ? campaignTerms({ ...termsInput, resolved: derived.check.resolved })
              : []
          }
          issues={flow.issues}
          prepared={flow.prepared}
          confirmed={flow.confirmed}
          onConfirm={flow.setConfirmed}
          showErrors={show}
          needsBackup={accountKind === "passkey" && me.data?.recovery.checkedAt === null}
          onEdit={flow.select}
          onRetry={() => {
            flow.goTo("review");
          }}
        />
      );
    case "launch":
      return (
        <LaunchStep
          deposit={
            derived.depositMinor === null ? "—" : formatAmount(derived.depositMinor, setup.token)
          }
          state={launchState}
          issue={launchIssue}
        />
      );
  }
}
