"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Address } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { setupCopy as copy } from "../copy/setup";
import { Callout } from "../shared/callout";
import type { SetupErrors, SetupForm, SlugCheck } from "./setup-form";

type Setter = <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => void;

export function StepBusiness({
  form,
  set,
  errors,
  check,
  checking,
  nameHint,
}: {
  form: SetupForm;
  set: Setter;
  errors: SetupErrors;
  check: SlugCheck | undefined;
  checking: boolean;
  nameHint: boolean;
}) {
  const slugHelper = checking
    ? copy.fields.slugChecking
    : check?.available && !errors.slug
      ? copy.fields.slugAvailable
      : undefined;
  return (
    <div className="space-y-5">
      <Field
        label={copy.fields.name}
        error={errors.name}
        helper={nameHint ? copy.fields.nameHint : undefined}
      >
        <Input
          value={form.name}
          maxLength={60}
          onChange={(event) => {
            set("name", event.target.value);
          }}
        />
      </Field>
      <Field label={copy.fields.slug} error={errors.slug} helper={slugHelper}>
        <div className="flex min-w-0 items-stretch">
          <span className="border-control-edge bg-soft text-subtle flex items-center rounded-l-xl border border-r-0 px-3 font-mono text-sm">
            {copy.fields.slugPrefix}
          </span>
          <div className="min-w-0 flex-1">
            <Input
              value={form.slug}
              mono
              maxLength={30}
              autoCapitalize="none"
              className="rounded-l-none"
              onChange={(event) => {
                set("slug", event.target.value.toLowerCase());
              }}
            />
          </div>
        </div>
      </Field>
      {check && !check.available && check.suggestion ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (check.suggestion) set("slug", check.suggestion);
          }}
        >
          {fill(copy.fields.useSuggestion, { suggestion: check.suggestion })}
        </Button>
      ) : null}
      <Field
        label={copy.fields.description}
        optional
        helper={copy.fields.descriptionHelper}
        error={errors.description}
      >
        <Textarea
          value={form.description}
          rows={3}
          onChange={(event) => {
            set("description", event.target.value);
          }}
        />
      </Field>
      <Field label={copy.fields.region} error={errors.region}>
        <Select
          value={form.region || undefined}
          placeholder={copy.fields.regionPlaceholder}
          onValueChange={(value) => {
            set("region", value);
          }}
          options={copy.regions.map((region) => ({ value: region, label: region }))}
        />
      </Field>
    </div>
  );
}

export function StepContact({
  form,
  set,
  errors,
  address,
  accountKind,
  needsBackup,
  demo,
}: {
  form: SetupForm;
  set: Setter;
  errors: SetupErrors;
  address: string | null;
  accountKind: "passkey" | "wallet" | null;
  needsBackup: boolean;
  demo: boolean;
}) {
  return (
    <div className="space-y-5">
      <Field label={copy.fields.email} helper={copy.fields.emailHelper} error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(event) => {
            set("email", event.target.value);
          }}
        />
      </Field>
      <Field label={copy.fields.website} optional error={errors.website}>
        <Input
          inputMode="url"
          placeholder="https://"
          value={form.website}
          onChange={(event) => {
            set("website", event.target.value);
          }}
        />
      </Field>
      <Card className="space-y-3">
        <h3 className="text-ink font-medium">{copy.payout.title}</h3>
        {address ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Address address={address} chainId={activeChain.id} showAddress demo={demo} />
            {accountKind ? (
              <span className="text-subtle">· {copy.payout.kind[accountKind]}</span>
            ) : null}
          </div>
        ) : null}
        <p className="text-body text-sm">{copy.payout.body}</p>
        <Checkbox
          checked={form.payout}
          onCheckedChange={(checked) => {
            set("payout", checked);
          }}
          label={copy.payout.confirm}
        />
        {errors.payout ? <p className="text-pink-ink text-sm">{errors.payout}</p> : null}
        {needsBackup ? (
          <Callout
            tone="caution"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  useUiStore.getState().open("M-04", { mode: "backup", origin: "settings" });
                }}
              >
                {copy.payout.backupNow}
              </Button>
            }
          >
            {copy.payout.backup}
          </Callout>
        ) : null}
      </Card>
    </div>
  );
}

export function StepAgreement({
  form,
  set,
  errors,
  version,
}: {
  form: SetupForm;
  set: Setter;
  errors: SetupErrors;
  version: string;
}) {
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h3 className="text-ink font-medium">{fill(copy.agreement.title, { version })}</h3>
        <ul className="space-y-2">
          {copy.agreement.bullets.map((bullet) => (
            <li key={bullet} className="text-body flex items-start gap-2 text-sm">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                className="text-lime-ink mt-0.5 shrink-0"
              />
              {bullet}
            </li>
          ))}
        </ul>
        <a
          href={routes.legal.merchantAgreement}
          target="_blank"
          rel="noreferrer"
          className="text-ink inline-block text-sm underline underline-offset-2"
        >
          {copy.agreement.read}
        </a>
        <Checkbox
          checked={form.agreement}
          onCheckedChange={(checked) => {
            set("agreement", checked);
          }}
          label={fill(copy.agreement.accept, { version })}
        />
        {errors.agreement ? <p className="text-pink-ink text-sm">{errors.agreement}</p> : null}
      </Card>
      <Card className="space-y-3">
        <h3 className="text-ink font-medium">{copy.verification.title}</h3>
        <ul className="space-y-2.5">
          {copy.verification.tiers.map((tier) => (
            <li key={tier.key} className="text-sm">
              <p className="text-ink font-medium">{tier.label}</p>
              <p className="text-subtle">{tier.body}</p>
            </li>
          ))}
        </ul>
        <p className="text-subtle text-xs">{copy.verification.footnote}</p>
        <p className="text-subtle text-xs">{copy.verification.later}</p>
      </Card>
    </div>
  );
}
