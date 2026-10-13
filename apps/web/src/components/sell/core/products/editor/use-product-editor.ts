"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fill, toasts } from "@/lib/copy";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { internalPath } from "@/lib/demo/landing";
import { routeTo } from "@/lib/routes";
import { editorCopy as copy } from "../../copy/editor";
import {
  blankForm,
  deliverableOf,
  formFrom,
  isInputCategory,
  parsePrice,
  validate,
  type FormErrors,
  type ProductForm,
} from "./product-form";

export function useProductEditor(productId: string | undefined) {
  const router = useRouter();
  const search = useSearchParams();
  const returnTo = internalPath(search.get("returnTo"));
  const existing = useClientQuery(
    "products.get",
    { id: productId ?? "new" },
    { enabled: Boolean(productId) },
  );
  const tokens = useClientQuery("tokens.list", {});
  const save = useClientMutation("products.save", ["products"]);
  const [edits, setEdits] = useState<Partial<ProductForm>>({});
  const [tried, setTried] = useState(false);
  const base = existing.data ? formFrom(existing.data) : blankForm;
  const form: ProductForm = { ...base, ...edits };
  const token = existing.data?.token ?? tokens.data?.[0] ?? null;
  const decimals = token?.decimals ?? 6;
  const errors: FormErrors = validate(form, decimals);
  const dirty = Object.keys(edits).length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);
  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setEdits((current) => ({ ...current, [key]: value }));
  };
  const submit = () => {
    setTried(true);
    const price = parsePrice(form.price, decimals);
    if (
      !token ||
      Object.keys(errors).length > 0 ||
      typeof price === "string" ||
      !isInputCategory(form.category)
    )
      return;
    save.mutate(
      {
        id: productId ?? crypto.randomUUID(),
        product: {
          title: form.title.trim(),
          summary: form.summary.trim(),
          outcome: form.outcome.trim(),
          description: form.description.trim(),
          category: form.category,
          priceBaseUnits: price.toString(),
          token: token.address,
          images: (existing.data?.media ?? []).flatMap((asset) =>
            asset.kind === "image" && asset.url ? [asset.url] : [],
          ),
          fulfillmentMode: form.fulfillment,
          deliverable: deliverableOf(form),
          refundPolicy: form.refund.trim(),
        },
      },
      {
        onSuccess: (saved) => {
          setEdits({});
          setTried(false);
          useUiStore.getState().pushToast({
            id: "T-02",
            tone: "success",
            message: fill(copy.saved, { v: String(saved.version) }),
            durationMs: toasts["T-02"].duration,
            ...(returnTo
              ? {
                  action: {
                    label: copy.backToCampaign,
                    run: () => {
                      router.push(returnTo);
                    },
                  },
                }
              : {}),
          });
          if (!productId) router.replace(routeTo.product(saved.id));
        },
      },
    );
  };
  return {
    existing,
    form,
    set,
    errors: tried ? errors : {},
    submit,
    save,
    dirty,
    token,
    returnTo,
    onUploaded: () => void existing.refetch(),
  };
}
