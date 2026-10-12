"use client";

import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { formText } from "@/lib/forms";
import { useState, type SubmitEvent } from "react";
import { PreferenceSettings } from "./preference-settings";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClientQuery, useClientMutation } from "@/lib/query/use-client";
import { chooseQuickActions } from "@/lib/accounts/quick-actions";
import { useUiStore } from "@/lib/stores/ui";

export function SettingsPage({ section = "profile" }: { section?: string }) {
  const me = useClientQuery("account.me", {});
  const record = useClientQuery("reputation.mine", {}, { enabled: section === "privacy" });
  const profile = useClientMutation("account.updateProfile", ["account.me", "reputation"]);
  const visibility = useClientMutation("reputation.updateVisibility", [
    "reputation",
    "distributors",
  ]);
  const wallets = useClientQuery("account.wallets", {}, { enabled: section === "wallets" });
  const passkeys = useClientQuery("account.passkeys", {}, { enabled: section === "security" });
  const [saved, setSaved] = useState(false);
  const [level, setLevel] = useState<"private" | "pseudonymous" | "public">("private");
  const [stats, setStats] = useState(false);
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    const values = new FormData(event.currentTarget);
    const result = await profile
      .mutateAsync({
        displayName: formText(values, "name"),
        ...(values.get("handle") ? { handle: formText(values, "handle") } : {}),
        bio: formText(values, "bio"),
        website: values.get("website") ? formText(values, "website") : null,
      })
      .catch(() => null);
    if (result) setSaved(true);
  };
  return (
    <ProductPage
      title={`Account ${section}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {["profile", "privacy", "security", "wallets", "notifications", "preferences"]
            .filter((item) => item !== section)
            .map((item) => (
              <PageLink key={item} href={`/settings/${item}`}>
                {item}
              </PageLink>
            ))}
        </div>
      }
    >
      <QueryState pending={me.isPending} error={me.error} retry={() => void me.refetch()}>
        {section === "profile" && me.data ? (
          <Card className="max-w-2xl">
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <Field label="Display name">
                <Input name="name" defaultValue={me.data.displayName} maxLength={80} />
              </Field>
              <Field
                label="Handle"
                optional
                helper="3–30 lowercase letters, numbers and underscores. Start with a letter."
              >
                <Input
                  name="handle"
                  defaultValue={me.data.handle ?? ""}
                  pattern="[a-z][a-z0-9_]{2,29}"
                />
              </Field>
              <Field label="Bio">
                <Textarea name="bio" defaultValue={me.data.bio} maxLength={500} />
              </Field>
              <Field label="Website" optional>
                <Input type="url" name="website" defaultValue={me.data.website ?? ""} />
              </Field>
              {profile.error ? (
                <p role="alert" className="text-pink-ink">
                  {profile.error.message}
                </p>
              ) : null}
              {saved ? <p role="status">Profile saved.</p> : null}
              <Button type="submit" loading={profile.isPending}>
                Save profile
              </Button>
            </form>
          </Card>
        ) : null}
        {section === "privacy" ? (
          <Card className="max-w-2xl">
            <h2 className="font-display text-h4">Choose what you publish</h2>
            <p className="text-body mt-3">
              Private profiles have no public page. Pseudonymous profiles share a handle and chosen
              stats, without a name, address or receipt links. Public profiles can include your name
              and receipt evidence.
            </p>
            <p className="text-subtle mt-3 text-sm">
              Current visibility: {record.data?.visibility ?? "Loading…"}. Saving replaces your
              published fields with the choices below.
            </p>
            <Field label="New profile visibility" className="mt-4">
              <Select
                value={level}
                onValueChange={setLevel}
                options={[
                  { value: "private", label: "Private · default" },
                  { value: "pseudonymous", label: "Pseudonymous" },
                  { value: "public", label: "Public" },
                ]}
              />
            </Field>
            <label className="my-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={stats}
                onChange={(event) => {
                  setStats(event.target.checked);
                }}
                className="mt-1"
              />
              <span>
                Share settled conversions, attributed value, merchant diversity and campaign count,
                including refund adjustment.
              </span>
            </label>
            <Button
              loading={visibility.isPending}
              onClick={() => {
                visibility.mutate({
                  level,
                  fields: stats
                    ? [
                        "settledConversions",
                        "netAttributedValue",
                        "merchantCount",
                        "campaignCount",
                        "refundAdjustment",
                      ]
                    : [],
                  acceptsInvitations: level !== "private",
                });
              }}
            >
              Save visibility
            </Button>
            {visibility.data ? (
              <p className="mt-3" role="status">
                Visibility saved: {visibility.data.level}.
              </p>
            ) : null}
            {visibility.error ? (
              <p className="text-pink-ink mt-3" role="alert">
                {visibility.error.message}
              </p>
            ) : null}
          </Card>
        ) : null}
        {section === "security" ? (
          <div className="space-y-4">
            <Card>
              <h2 className="font-display text-h4">Passkeys and recovery</h2>
              {passkeys.data?.map((passkey) => (
                <div key={passkey.credentialId} className="border-hairline mt-3 border-t pt-3">
                  <p className="text-ink font-medium">
                    {passkey.label} ·{" "}
                    {passkey.kind === "original" ? "Original passkey" : "Added passkey"}
                  </p>
                  <p className="text-subtle text-sm">
                    Added {formatDateTime(new Date(passkey.createdAt))}
                  </p>
                </div>
              ))}
              <Button
                disabled={me.data?.accountKind !== "passkey"}
                disabledReason="Use your wallet’s own recovery backup for a connected wallet."
                className="mt-4"
                onClick={() =>
                  useUiStore.getState().open("M-04", { mode: "backup", origin: "settings" })
                }
              >
                Back up recovery phrase
              </Button>
            </Card>
            <Card>
              <h2 className="font-display text-h4">Quick actions</h2>
              <p className="text-body mt-3">
                Signing sessions end on reload, sign-out, 15 minutes idle or after 24 hours.
                Deposits, refunds, withdrawals and security changes always prompt.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => useUiStore.getState().open("M-09", { origin: "settings" })}
                >
                  Change quick actions
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    chooseQuickActions("ask");
                  }}
                >
                  Ask every time
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
        {section === "notifications" || section === "preferences" ? (
          <PreferenceSettings notifications={section === "notifications"} />
        ) : null}
        {section === "wallets" ? (
          <Card>
            <h2 className="font-display text-h4">Linked addresses</h2>
            {wallets.data?.map((wallet) => (
              <div key={wallet.address} className="border-hairline mt-4 border-t pt-4">
                <p>{wallet.label || wallet.kind}</p>
                <p className="font-mono mt-1 break-all text-sm">{wallet.address}</p>
                <p className="text-subtle text-sm">
                  {wallet.isCurrentSigner ? "Current signer" : "Linked address"}
                </p>
              </div>
            ))}
          </Card>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
