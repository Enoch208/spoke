"use client";

import { useClientQuery } from "@/lib/query/use-client";
import type { ProductLite } from "./derive";
import type { OtherDraft } from "./step-product";

const empty: ReadonlySet<string> = new Set();

export function useProductSignals(
  enabled: boolean,
  products: readonly ProductLite[],
  productId: string | null,
  draftId: string,
) {
  const merchant = useClientQuery("merchants.me", {}, { enabled });
  const slug = merchant.data?.slug ?? "";
  const live = useClientQuery(
    "campaigns.list",
    { merchant: slug, status: "active", limit: 100 },
    { enabled: enabled && slug !== "" },
  );
  const mine = useClientQuery("campaigns.mine", { limit: 100 }, { enabled });
  const liveIds = live.data ? new Set(live.data.items.map((item) => item.product.id)) : empty;
  const title = products.find((product) => product.id === productId)?.title ?? null;
  const row = mine.data?.items.find(
    (item) => item.draftId !== null && item.draftId !== draftId && item.productTitle === title,
  );
  const otherDraft: OtherDraft | null = row?.draftId ? { draftId: row.draftId } : null;
  return { liveIds, otherDraft };
}
