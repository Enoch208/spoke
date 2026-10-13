"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { composerCopy } from "./copy";
import { ComposerAside, SummaryHandle } from "./composer-aside";
import { ComposerStep } from "./composer-step";
import { StepFooter } from "./footer";
import { launchCopy } from "./copy-launch";
import { launchStateOf, useLaunchRecord } from "./launch-state";
import { PhoneProgress, StepRail } from "./rail";
import { SaveIndicator } from "./save-indicator";
import { useComposer, type ComposerSetup } from "./use-composer";
import { useComposerUrl, useLaunchedRedirect } from "./use-composer-effects";
import { useLaunch } from "./use-launch";
import { useSimulate } from "./use-simulate";
import { useStepFlow } from "./use-step-flow";
import { useVersionPublish } from "./use-version-publish";
import { effectiveError, versionChanges } from "./version-diff";
import { Badge } from "@/components/ui/badge";
import { newTermsCopy } from "./copy-launch";

export function Composer({ setup }: { setup: ComposerSetup }) {
  const router = useRouter();
  const open = useUiStore((state) => state.open);
  const model = useComposer(setup);
  const flow = useStepFlow(model);
  const simulate = useSimulate(model);
  const launchState = launchStateOf(useLaunchRecord(setup.draftId));
  const launch = useLaunch({
    draftId: setup.draftId,
    saveNow: model.save.saveNow,
    prepared: flow.prepared,
    product: model.product,
    depositMinor: model.derived.depositMinor,
    token: setup.token,
    onReview: () => {
      flow.goTo("review");
    },
  });
  const target = setup.target;
  const changes = target ? versionChanges(target.current, model.derived.policy, setup.token) : [];
  const effective = target
    ? effectiveError(model.fields.effectiveAt, target.endsAt, model.now)
    : undefined;
  const versionBlocked =
    changes.length === 0 || effective !== undefined || flow.rail.some((item) => item.errors > 0);
  const publish = useVersionPublish(model, flow, versionBlocked);
  const version = target
    ? { changes, effective, issue: publish.issue, endsAt: target.endsAt }
    : null;
  useComposerUrl(model, launchState.kind !== "done");
  useLaunchedRedirect(setup, model.fields.alertSales, launchState);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (setup.initialStep === "review") void flow.prepare();
  }, [setup.initialStep, flow]);

  const exit = () => {
    const leave = () => {
      router.push(routes.sell.campaigns);
    };
    if (model.save.isDirty() || model.save.status === "failed")
      open("M-43", { subject: composerCopy.leaveSubject, onContinue: leave });
    else leave();
  };
  const launching = launchState.kind !== "none";
  const deposit =
    model.derived.depositMinor === null
      ? "—"
      : formatAmount(model.derived.depositMinor, setup.token);
  const primary =
    target && model.step === "review" ? (
      <Button
        loading={publish.busy}
        disabled={!publish.deployed}
        {...(publish.deployed ? {} : { disabledReason: launchCopy.notDeployed })}
        onClick={() => void publish.publish()}
      >
        {newTermsCopy.publish}
      </Button>
    ) : model.step === "launch" ? (
      <Button
        loading={launch.busy}
        disabled={!launch.deployed || launchState.kind !== "none"}
        {...(launch.deployed ? {} : { disabledReason: launchCopy.notDeployed })}
        onClick={() => void launch.launch()}
      >
        {fill(launchCopy.button, { deposit })}
      </Button>
    ) : (
      <Button
        loading={flow.checking}
        loadingLabel={composerCopy.footer.checking}
        onClick={() => void flow.next()}
      >
        {model.step === "review" ? composerCopy.footer.review : composerCopy.footer.continue}
      </Button>
    );
  const blocked = model.canSave ? null : model.fields.productId ? "needsFix" : "needsProduct";
  return (
    <ProductPage
      title={target ? fill(newTermsCopy.title, { campaign: target.name }) : composerCopy.title}
      breadcrumbs={[{ label: composerCopy.crumbs.campaigns, href: routes.sell.campaigns }]}
      actions={
        <>
          {target ? (
            <Badge tone="lilac">
              {fill(newTermsCopy.today, { version: String(target.version) })}
            </Badge>
          ) : null}
          <SaveIndicator
            status={model.save.status}
            savedAt={model.save.savedAt}
            blocked={blocked}
          />
          <Button variant="secondary" onClick={exit}>
            {composerCopy.exit}
          </Button>
        </>
      }
    >
      {model.save.status === "conflict" ? (
        <div
          role="alert"
          className="bg-amber-soft text-amber-ink flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          {composerCopy.save.conflict}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            {composerCopy.save.reload}
          </Button>
        </div>
      ) : null}
      <PhoneProgress steps={flow.rail} />
      <div className="grid items-start gap-6 lg:grid-cols-[176px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_304px]">
        <StepRail steps={flow.rail} onSelect={launching ? () => undefined : flow.select} />
        <div
          className={
            model.step === "product"
              ? "min-w-0 lg:max-w-[960px] xl:col-span-2"
              : "min-w-0 lg:max-w-[720px]"
          }
        >
          <ComposerStep
            model={model}
            flow={flow}
            launchState={launchState}
            launchIssue={launch.issue}
            version={version}
          />
          <StepFooter
            onBack={launching ? null : flow.back}
            primary={primary}
            note={
              model.step === "product" ? null : (
                <SummaryHandle model={model} onEdit={flow.select} onSimulate={simulate} />
              )
            }
          />
        </div>
        <ComposerAside model={model} onEdit={flow.select} onSimulate={simulate} />
      </div>
    </ProductPage>
  );
}
