"use client";

import { useSearchParams } from "next/navigation";
import { comparisonIds, toggleComparison } from "./comparison-model";

const commit = (patch: Record<string, string | null>, push = false) => {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
};

export function useComparison(merchant: boolean) {
  const params = useSearchParams();
  const selected = comparisonIds(params.get("compare"));
  return {
    selected,
    viewing: merchant && selected.length > 0 && params.get("view") === "compare",
    select: (id: string) => {
      const current = comparisonIds(new URL(window.location.href).searchParams.get("compare"));
      const next = toggleComparison(current, id);
      commit({ compare: next.join(","), ...(next.length ? {} : { view: null }) });
    },
    view: (open: boolean) => {
      commit({ view: open ? "compare" : null }, true);
    },
    clear: () => {
      commit({ compare: null, view: null });
    },
  };
}
