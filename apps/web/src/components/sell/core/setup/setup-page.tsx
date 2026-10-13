"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ClientError } from "@/lib/client/errors";
import { PageSkeleton } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stepper } from "@/components/ui/stepper";
import { toasts } from "@/lib/copy";
import { internalPath } from "@/lib/demo/landing";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { setupCopy as copy } from "../copy/setup";
import { Callout } from "../shared/callout";
import { useIsDemo } from "../shared/hooks";
import { MerchantPreview } from "./merchant-preview";
import { blankSetup, stepErrors, type SetupErrors, type SetupForm } from "./setup-form";
import { StepAgreement, StepBusiness, StepContact } from "./setup-steps";

const agreementVersion = "1.0";
const fieldOf: Record<string, keyof SetupForm> = {
  name: "name",
  slug: "slug",
  description: "description",
  region: "region",
  supportEmail: "email",
  website: "website",
};

const serverErrors = (error: ClientError | null): SetupErrors => {
  if (!error) return {};
  if (error.code === "SLUG_TAKEN") return { slug: copy.errors.takenPlain };
  if (error.code !== "VALIDATION_FAILED" || !error.details) return {};
  return Object.fromEntries(
    Object.entries(error.details).flatMap(([key, value]) => {
      const field = fieldOf[key];
      return field && typeof value === "string" ? [[field, value]] : [];
    }),
  );
};

export function MerchantSetupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = useIsDemo();
  const session = useSessionStore();
  const signedIn = session.status === "signedIn";
  const me = useClientQuery("merchants.me", {}, { enabled: signedIn });
  const account = useClientQuery("account.me", {}, { enabled: signedIn });
  const setup = useClientMutation("merchants.setup", ["merchants.me", "account.me"]);
  const [edits, setEdits] = useState<Partial<SetupForm>>({});
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [debounced, setDebounced] = useState("");
  const next = internalPath(params.get("next")) ?? "/sell";
  const form: SetupForm = { ...blankSetup, name: account.data?.displayName ?? "", ...edits };
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(form.slug);
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [form.slug]);
  useEffect(() => {
    if (me.data) router.replace(next);
  }, [me.data, next, router]);
  const slugCheck = useClientQuery(
    "merchants.slugAvailable",
    { slug: debounced },
    { enabled: signedIn && /^[a-z][a-z0-9_]{2,29}$/.test(debounced) },
  );
  const check = debounced === form.slug ? slugCheck.data : undefined;
  const errors = { ...(tried ? stepErrors(step, form, check) : {}), ...serverErrors(setup.error) };
  const set = <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => {
    setEdits((current) => ({ ...current, [key]: value }));
  };
  if (!signedIn)
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          title={copy.title}
          body={copy.intro}
          actions={
            <Button
              onClick={() => {
                useUiStore.getState().open("M-01", { reason: "sell", returnTo: "/sell/setup" });
              }}
            >
              {copy.signIn}
            </Button>
          }
        />
      </Card>
    );
  if (me.isPending || me.data || account.isPending) return <PageSkeleton />;
  const advance = () => {
    setTried(true);
    if (Object.keys(stepErrors(step, form, check)).length > 0) return;
    if (step < 2) {
      setTried(false);
      setStep(step + 1);
      return;
    }
    setup.mutate(
      {
        name: form.name.trim(),
        slug: form.slug,
        description: form.description.trim(),
        website: form.website.trim() || null,
        supportEmail: form.email.trim(),
        region: form.region,
        agreementVersion,
        budgetAlertSales: 5,
      },
      {
        onSuccess: () => {
          useSessionStore
            .getState()
            .updateRoles({ isMerchant: true, isOperator: useSessionStore.getState().isOperator });
          useWorkspaceStore.getState().setWorkspace("sell");
          useUiStore.getState().pushToast({
            id: "T-02",
            tone: "success",
            message: copy.created,
            durationMs: toasts["T-02"].duration,
          });
          router.replace(next);
        },
      },
    );
  };
  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-title text-ink font-medium tracking-[-0.02em]">
            {copy.title}
          </h1>
          <p className="text-body max-w-[60ch]">{copy.intro}</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            router.push("/earn");
          }}
        >
          {copy.saveExit}
        </Button>
      </div>
      <Stepper
        steps={copy.steps.map((label, index) => ({ key: String(index), label }))}
        current={step}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5 max-lg:order-2">
          {step === 0 ? (
            <StepBusiness
              form={form}
              set={set}
              errors={errors}
              check={check}
              checking={slugCheck.isFetching || debounced !== form.slug}
              nameHint={!edits.name && Boolean(account.data?.displayName)}
            />
          ) : step === 1 ? (
            <StepContact
              form={form}
              set={set}
              errors={errors}
              address={session.address}
              accountKind={session.accountKind}
              needsBackup={session.accountKind === "passkey" && !account.data?.recovery.checkedAt}
              demo={demo}
            />
          ) : (
            <StepAgreement form={form} set={set} errors={errors} version={agreementVersion} />
          )}
          {setup.error ? <Callout tone="danger">{copy.failed}</Callout> : null}
          <div className="bg-page/95 border-hairline fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {step > 0 ? (
              <Button
                variant="secondary"
                className="max-sm:flex-1"
                onClick={() => {
                  setTried(false);
                  setStep(step - 1);
                }}
              >
                {copy.back}
              </Button>
            ) : null}
            <Button
              className="max-sm:flex-1"
              loading={setup.isPending}
              loadingLabel={copy.creating}
              onClick={advance}
            >
              {step === 2 ? copy.create : copy.continue}
            </Button>
          </div>
        </div>
        <div className="max-lg:order-1 lg:sticky lg:top-20 lg:self-start">
          <MerchantPreview
            name={form.name}
            slug={form.slug}
            description={form.description}
            demo={demo}
          />
        </div>
      </div>
    </div>
  );
}
