"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPage } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useClientMutation } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useSessionStore } from "@/lib/stores/session";

export function WelcomePage() {
  const [intent, setIntent] = useState<"buy" | "earn" | "sell">("earn");
  const [handle, setHandle] = useState("");
  const update = useClientMutation("account.updateProfile", ["account.me"]);
  const kind = useSessionStore((state) => state.accountKind);
  const router = useRouter();
  const finish = async () => {
    const result = await update
      .mutateAsync({ intent, ...(handle ? { handle } : {}), onboardingCompleted: true })
      .catch(() => null);
    if (result)
      router.push(
        intent === "buy" ? "/explore" : intent === "sell" ? "/sell/setup" : "/earn/opportunities",
      );
  };
  return (
    <ProductPage
      title="Welcome to Spoke"
      description="Buy products, share campaigns and build an inspectable record of settled sales."
    >
      <Card className="max-w-2xl space-y-5">
        <Field label="What brings you here?">
          <select
            value={intent}
            onChange={(event) => {
              setIntent(
                event.target.value === "sell"
                  ? "sell"
                  : event.target.value === "buy"
                    ? "buy"
                    : "earn",
              );
            }}
            className="border-line bg-surface h-10 rounded-xl border px-3"
          >
            <option value="buy">Buy a product</option>
            <option value="earn">Share and earn</option>
            <option value="sell">Launch a campaign</option>
          </select>
        </Field>
        <Field label="Handle" optional helper="You can choose a handle later.">
          <Input
            value={handle}
            onChange={(event) => {
              setHandle(event.target.value);
            }}
          />
        </Field>
        {kind === "passkey" ? (
          <div className="bg-lilac-soft rounded-xl p-4">
            <h2 className="font-medium">Back up before your account holds anything</h2>
            <p className="text-body mt-2 text-sm">
              Your recovery phrase is the way back if you lose the passkey.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() =>
                useUiStore.getState().open("M-04", { mode: "backup", origin: "onboarding" })
              }
            >
              Back up recovery phrase
            </Button>
          </div>
        ) : null}
        {update.error ? (
          <p role="alert" className="text-pink-ink">
            {update.error.message}
          </p>
        ) : null}
        <Button loading={update.isPending} onClick={() => void finish()}>
          Done
        </Button>
      </Card>
    </ProductPage>
  );
}
