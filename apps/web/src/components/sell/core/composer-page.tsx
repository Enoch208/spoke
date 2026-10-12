"use client";

import { Select } from "@/components/ui/select";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits, formatUnits, zeroHash } from "viem";
import { commissionPolicy, type ClientOutput } from "@spoke/protocol";
import { ProductPage, PageLink, QueryState } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import { useSpokeClient } from "@/lib/client/provider";
import { useChainAction } from "@/lib/tx/use-action";
import { asBytes32 } from "@/lib/tx/calls";
import { formatAmount, formatDateTime, formatRelative } from "@/lib/format";
import { FundsPanel } from "@/components/buy/funds-panel";

const shortPathOptions = [
  { value: "RENORMALIZE_EXISTING", label: "Renormalize across existing contributors" },
  { value: "RETURN_UNUSED", label: "Return unused share to the reward budget" },
] as const;

const holdOptions = [
  { value: "60", label: "1 minute · testnet walkthrough" },
  { value: "600", label: "10 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "1 day" },
  { value: "259200", label: "3 days" },
  { value: "604800", label: "7 days" },
  { value: "1209600", label: "14 days" },
] as const;

export function ComposerPage() {
  const search = useSearchParams();
  const id = search.get("draft");
  const draft = useClientQuery("campaigns.getDraft", { id: id ?? "new" }, { enabled: Boolean(id) });
  if (id)
    return (
      <QueryState pending={draft.isPending} error={draft.error} retry={() => void draft.refetch()}>
        <ComposerEditor key={id} draft={draft.data} />
      </QueryState>
    );
  return <ComposerEditor />;
}

function ComposerEditor({ draft }: { draft?: ClientOutput<"campaigns.getDraft"> | undefined }) {
  const search = useSearchParams();
  const newVersion = draft?.mode === "newVersion" || search.get("mode") === "newVersion";
  const campaignId = draft?.campaignId ?? search.get("campaign") ?? "0";
  const current = useClientQuery("campaigns.get", { campaignId }, { enabled: newVersion });
  const policies = useClientQuery("campaigns.policy", { campaignId }, { enabled: newVersion });
  const products = useClientQuery("products.list", {});
  const tokens = useClientQuery("tokens.list", {});
  const client = useSpokeClient();
  const start = useChainAction();
  const [draftId] = useState(() => draft?.draftId ?? crypto.randomUUID());
  const [version, setVersion] = useState(draft?.version ?? 0);
  const [productId, setProductId] = useState(draft?.productId ?? "");
  const [rate, setRate] = useState(String((draft?.policy.commissionBps ?? 1000) / 100));
  const [weights, setWeights] = useState(
    draft?.policy.weightsBps.map((value) => String(value / 100)).join(",") ?? "50,25,15,10",
  );
  const [hold, setHold] = useState(String(draft?.policy.holdSeconds ?? 600));
  const [budget, setBudget] = useState("100");
  const [liability, setLiability] = useState(
    draft ? formatUnits(BigInt(draft.policy.campaignLiabilityCap), 6) : "100",
  );
  const [cap, setCap] = useState(draft ? formatUnits(BigInt(draft.policy.perSaleCap), 6) : "10");
  const [endsAt, setEndsAt] = useState(draft?.endsAt.slice(0, 16) ?? "");
  const [effectiveAt, setEffectiveAt] = useState(draft?.effectiveAt?.slice(0, 16) ?? "");
  const [shortPath, setShortPath] = useState<"RENORMALIZE_EXISTING" | "RETURN_UNUSED">(
    draft?.policy.shortPathMode ?? "RENORMALIZE_EXISTING",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(draft?.savedAt ?? null);
  const product =
    products.data?.items.find((item) => item.id === productId) ?? products.data?.items[0];
  const save = async (launch: boolean) => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const token = newVersion
        ? policies.data?.current.rewardToken
        : (product?.token.address ?? tokens.data?.[0]?.address);
      if (!token || (!newVersion && !product))
        throw new Error("Add a product before creating your campaign.");
      const end = endsAt ? new Date(endsAt) : new Date(Date.now() + 30 * 86_400_000);
      const bps = weights.split(",").map((value) => Number(value.trim()) * 100);
      const policy = commissionPolicy.parse({
        rewardToken: token,
        commissionBps: Number(rate) * 100,
        maxRewardedAncestors: bps.length,
        weightsBps: bps,
        perSaleCap: parseUnits(cap, 6).toString(),
        campaignLiabilityCap: parseUnits(liability, 6).toString(),
        shortPathMode: shortPath,
        holdSeconds: Number(hold),
        expiry: Math.floor(end.getTime() / 1000).toString(),
        eligibilityHash: zeroHash,
      });
      const effective = newVersion
        ? new Date(effectiveAt || Date.now() + 25 * 60 * 60_000).toISOString()
        : undefined;
      const draft = await client.call("campaigns.saveDraft", {
        id: draftId,
        draft: {
          mode: newVersion ? "newVersion" : "create",
          ...(newVersion
            ? { campaignId, effectiveAt: effective ?? "" }
            : product
              ? { productId: product.id, productVersion: product.version }
              : {}),
          policy,
          endsAt: end.toISOString(),
          stepReached: 5,
          version,
          inviteOnly: false,
        },
      });
      setVersion(draft.version);
      setSavedAt(draft.savedAt);
      if (!launch) return;
      const prepared = await client.call("campaigns.prepareCreate", { id: draft.draftId });
      if (newVersion) {
        start("registerPolicyVersion", {
          campaignId,
          campaignName: current.data?.product.title ?? "Campaign",
          policy: prepared.policy,
          policyHash: asBytes32(prepared.policyHash),
          effectiveAt: effective ?? "",
        });
      } else {
        if (!prepared.config || !product)
          throw new Error("The prepared campaign has no product configuration.");
        start("createCampaign", {
          draftId: draft.draftId,
          campaignName: product.title,
          metadataHash: asBytes32(prepared.metadataHash),
          skuHash: asBytes32(prepared.config.skuHash),
          skuPrice: prepared.config.skuPrice,
          policy: prepared.policy,
          deposit: parseUnits(budget, 6).toString(),
        });
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "This campaign could not be prepared.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ProductPage
      title={newVersion ? "New terms for future sales" : "Create a campaign"}
      description="Set a disclosed commission policy and fund its reward budget. Buyer payments never fund rewards."
      actions={<PageLink href="/sell/campaigns">Your campaigns</PageLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {!newVersion ? (
            <Card>
              <h2 className="font-display text-h4 mb-4">1. Product</h2>
              {products.data?.items.length === 0 ? (
                <PageLink href="/sell/products/new">Add your first product</PageLink>
              ) : (
                <Field label="Product">
                  <Select
                    value={productId || product?.id || undefined}
                    onValueChange={setProductId}
                    options={(products.data?.items ?? []).map((item) => ({
                      value: item.id,
                      label: `${item.title} · Version ${String(item.version)}`,
                    }))}
                  />
                </Field>
              )}
              {product ? (
                <p className="font-mono mt-3">
                  Buyer price: {formatAmount(BigInt(product.priceBaseUnits), product.token)}
                </p>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <h2 className="font-display text-h4 mb-4">{newVersion ? "1" : "2"}. Rewards</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commission rate (%)">
                <Input
                  value={rate}
                  inputMode="decimal"
                  onChange={(event) => {
                    setRate(event.target.value);
                  }}
                />
              </Field>
              <Field label="Maximum commission per sale (SDUSD)">
                <Input
                  value={cap}
                  inputMode="decimal"
                  onChange={(event) => {
                    setCap(event.target.value);
                  }}
                />
              </Field>
              <Field label="Campaign liability cap (SDUSD)">
                <Input
                  value={liability}
                  inputMode="decimal"
                  onChange={(event) => {
                    setLiability(event.target.value);
                  }}
                />
              </Field>
              <Field
                label="Split percentages · nearest first"
                helper="1–5 levels; percentages must sum to 100."
              >
                <Input
                  value={weights}
                  onChange={(event) => {
                    setWeights(event.target.value);
                  }}
                />
              </Field>
            </div>
            {Number(rate) > 50 ? (
              <p className="bg-amber-soft mt-4 rounded-xl p-3 text-sm">
                More than half the price goes to commission.
              </p>
            ) : null}
            <Field label="When the path has fewer contributors" className="mt-4">
              <Select value={shortPath} onValueChange={setShortPath} options={shortPathOptions} />
            </Field>
          </Card>
          <Card>
            <h2 className="font-display text-h4 mb-4">
              {newVersion ? "2" : "3"}. Rules and timing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Settlement hold">
                <Select value={hold} onValueChange={setHold} options={holdOptions} />
              </Field>
              <Field label="Campaign ends" helper="Default: 30 days. Maximum: 365 days.">
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => {
                    setEndsAt(event.target.value);
                  }}
                />
              </Field>
              {newVersion ? (
                <Field
                  label="New terms take effect"
                  helper="At least 24 hours after publishing. Default: 25 hours."
                >
                  <Input
                    type="datetime-local"
                    value={effectiveAt}
                    onChange={(event) => {
                      setEffectiveAt(event.target.value);
                    }}
                  />
                </Field>
              ) : (
                <Field label="Initial reward deposit (SDUSD)">
                  <Input
                    value={budget}
                    inputMode="decimal"
                    onChange={(event) => {
                      setBudget(event.target.value);
                    }}
                  />
                </Field>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <FundsPanel />
          <Card>
            <h2 className="font-display text-h4">Review before signing</h2>
            <p className="text-body mt-3 text-sm">
              Terms for a sale never change after it happens. You can publish new terms for future
              sales with at least 24 hours’ notice.
            </p>
            <p className="text-body mt-3 text-sm">
              {newVersion
                ? "Publishing a policy version prompts your passkey or wallet. Existing receipts keep their original policy hash."
                : "Launching creates the campaign, approves the exact deposit, funds the separate reward budget and opens it for sales. Each step is resumable."}
            </p>
            {policies.data?.scheduled && newVersion ? (
              <p className="bg-amber-soft mt-3 rounded-xl p-3 text-sm">
                New terms are already scheduled for{" "}
                {formatDateTime(new Date(policies.data.scheduled.effectiveAt))}. You can change
                terms again after they apply.
              </p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <Button
                loading={busy}
                disabled={newVersion && Boolean(policies.data?.scheduled)}
                onClick={() => void save(true)}
              >
                {newVersion ? "Publish future terms" : "Create, fund and launch"}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void save(false)}>
                Save draft
              </Button>
            </div>
            {savedAt ? (
              <p className="text-subtle mt-3 text-xs">
                Saved {formatRelative(new Date(savedAt))} · Version {version}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-pink-ink mt-4 text-sm">
                {error}
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </ProductPage>
  );
}
