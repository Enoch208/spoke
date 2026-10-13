"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { demoToken } from "@spoke/protocol";
import { PageSkeleton } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { findTemplate, myTemplates } from "../studio/library";
import { Composer } from "./composer";
import { entryCopy } from "./copy-entry";
import type { ComposerToken } from "./derive";
import { createFields, createStep, isReady, libraryFor, productLite } from "./setup-create";

export function CreateEntry() {
  const search = useSearchParams();
  const draftParam = search.get("draft");
  const fromParam = search.get("from");
  const templateParam = search.get("template");
  const appMode = useModeStore((state) => state.mode);
  const [freshId] = useState(() => crypto.randomUUID());
  const draftId = draftParam ?? freshId;
  const loadDraft = draftParam !== null && draftParam !== freshId;
  const merchant = useClientQuery("merchants.me", {});
  const products = useClientQuery("products.list", { billing: "oneTime", limit: 100 });
  const tokens = useClientQuery("tokens.list", {});
  const templates = useClientQuery("studio.templates", {});
  const categories = useClientQuery("products.categories", {});
  const draft = useClientQuery("campaigns.getDraft", { id: draftId }, { enabled: loadDraft });
  const fromPolicy = useClientQuery(
    "campaigns.policy",
    { campaignId: fromParam ?? "0" },
    { enabled: Boolean(fromParam) },
  );
  const fromCampaign = useClientQuery(
    "campaigns.get",
    { campaignId: fromParam ?? "0" },
    { enabled: Boolean(fromParam) },
  );
  if (loadDraft && draft.error)
    return (
      <ErrorState
        title={entryCopy.draftFailed}
        body={draft.error.message}
        details={{ code: draft.error.code, requestId: draft.error.requestId ?? undefined }}
        actions={
          <>
            <Button variant="secondary" onClick={() => void draft.refetch()}>
              {entryCopy.retry}
            </Button>
            <Button asChild>
              <Link href={routes.sell.newCampaign}>{entryCopy.startNew}</Link>
            </Button>
          </>
        }
      />
    );
  const loading =
    merchant.isPending ||
    products.isPending ||
    tokens.isPending ||
    templates.isPending ||
    categories.isPending ||
    (loadDraft && draft.isPending) ||
    (Boolean(fromParam) && (fromPolicy.isPending || fromCampaign.isPending));
  if (loading || !merchant.data || !products.data) {
    const failure = merchant.error ?? products.error;
    if (failure)
      return (
        <ErrorState
          title={entryCopy.loadFailed}
          body={failure.message}
          actions={
            <Button variant="secondary" onClick={() => void products.refetch()}>
              {entryCopy.retry}
            </Button>
          }
        />
      );
    return <PageSkeleton />;
  }
  const items = products.data.items;
  const tokenInfo =
    items[0]?.token ?? tokens.data?.find((token) => token.role !== "payment") ?? null;
  const token: ComposerToken = {
    address: tokenInfo?.address ?? "0x0000000000000000000000000000000000000000",
    symbol: tokenInfo?.symbol ?? demoToken.symbol,
    decimals: tokenInfo?.decimals ?? demoToken.decimals,
  };
  const ready = items.filter(isReady).map((item) => productLite(item, categories.data));
  const library = libraryFor(templates.data, token);
  const template = templateParam
    ? findTemplate(templateParam, myTemplates(templates.data ?? [], token))
    : null;
  const draftData = loadDraft ? (draft.data ?? null) : null;
  const setup = {
    mode: "create" as const,
    draftId,
    initialDraft: draftData,
    initialFields: createFields({
      scope: `${appMode}:create`,
      draftId,
      draft: draftData,
      products: ready,
      token,
      alertDefault: merchant.data.budgetAlertSales,
      productParam: search.get("product"),
      template,
      from:
        fromPolicy.data && fromCampaign.data
          ? { policy: fromPolicy.data.current, productId: fromCampaign.data.product.id }
          : null,
    }),
    initialStep: createStep(search.get("step"), draftData),
    products: ready,
    token,
    alertDefault: merchant.data.budgetAlertSales,
    contact: merchant.data.supportEmail,
    target: null,
    templates: library,
  };
  return <Composer key={draftId} setup={setup} />;
}
