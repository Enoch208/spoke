"use client";

import { formText } from "@/lib/forms";
import { useState, type SubmitEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductPage } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useClientMutation } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { internalPath } from "@/lib/demo/landing";

export function MerchantSetupPage() {
  const setup = useClientMutation("merchants.setup", ["merchants.me", "account.me"]);
  const router = useRouter();
  const params = useSearchParams();
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const [accepted, setAccepted] = useState(false);
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signedIn) {
      useUiStore.getState().open("M-01", { reason: "sell", returnTo: "/sell/setup" });
      return;
    }
    const form = new FormData(event.currentTarget);
    const merchant = await setup
      .mutateAsync({
        name: formText(form, "name"),
        slug: formText(form, "slug"),
        supportEmail: formText(form, "email"),
        region: formText(form, "region"),
        description: formText(form, "description"),
        website: null,
        agreementVersion: "1.0",
      })
      .catch(() => null);
    if (!merchant) return;
    useSessionStore
      .getState()
      .updateRoles({ isMerchant: true, isOperator: useSessionStore.getState().isOperator });
    router.replace(internalPath(params.get("next")) ?? "/sell");
  };
  return (
    <ProductPage
      title="Set up your business"
      description="Your business profile sits beside your products, policies and settled record."
    >
      <Card className="max-w-2xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <Field label="Business name">
            <Input name="name" required minLength={2} maxLength={100} />
          </Field>
          <Field
            label="Public handle"
            helper="3–30 lowercase letters, numbers and underscores. Start with a letter."
          >
            <Input name="slug" required pattern="[a-z][a-z0-9_]{2,29}" />
          </Field>
          <Field label="Support email">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Region">
            <Input name="region" required minLength={2} maxLength={80} />
          </Field>
          <Field label="About your business">
            <Textarea name="description" maxLength={2000} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
              }}
              className="mt-1"
            />
            <span>
              I accept the{" "}
              <a
                href="/legal/merchant-agreement"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                merchant agreement
              </a>
              . Rewards come from my separate funded budget. I am responsible for delivering my
              products and handling refunds during the hold.
            </span>
          </label>
          {setup.error ? (
            <p role="alert" className="text-pink-ink">
              {setup.error.message}
            </p>
          ) : null}
          <Button type="submit" loading={setup.isPending} disabled={!accepted}>
            {signedIn ? "Create business" : "Sign in to continue"}
          </Button>
        </form>
      </Card>
    </ProductPage>
  );
}
