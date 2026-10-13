"use client";

import { demoToken } from "@spoke/protocol";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageSkeleton } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { findTemplate, myTemplates } from "./library";
import { startingPoints } from "./starting-points";
import { StudioWorkspace, type StudioToken } from "./studio-workspace";

const zeroAddress = "0x0000000000000000000000000000000000000000";

export function StudioPage() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const templates = useClientQuery("studio.templates", {});
  const categories = useClientQuery("products.categories", {});
  const tokens = useClientQuery("tokens.list", {});
  const [selectedId, setSelectedId] = useState<string | null>(() => search.get("template"));
  const [generation, setGeneration] = useState(0);
  if (tokens.isPending) return <PageSkeleton />;
  const tokenInfo = tokens.data?.find((token) => token.role !== "payment") ?? null;
  const token: StudioToken = {
    address: tokenInfo?.address ?? zeroAddress,
    symbol: tokenInfo?.symbol ?? demoToken.symbol,
    decimals: tokenInfo?.decimals ?? demoToken.decimals,
  };
  const mine = myTemplates(templates.data ?? [], token);
  const selected = selectedId ? findTemplate(selectedId, mine) : null;
  const choose = (id: string | null) => {
    setSelectedId(id);
    setGeneration((current) => current + 1);
    router.replace(id ? `${pathname}?template=${encodeURIComponent(id)}` : pathname, {
      scroll: false,
    });
  };
  return (
    <StudioWorkspace
      key={`${selected?.id ?? "new"}:${String(generation)}`}
      selected={selected}
      spoke={startingPoints}
      mine={mine}
      categories={categories.data ?? []}
      token={token}
      minePending={templates.isPending}
      mineFailed={Boolean(templates.error)}
      onRetry={() => void templates.refetch()}
      onChoose={choose}
    />
  );
}
