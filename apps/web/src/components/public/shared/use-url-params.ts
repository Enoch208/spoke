"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type UrlWrite = "push" | "replace";

export function useUrlParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const write = useCallback(
    (next: URLSearchParams, how: UrlWrite) => {
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (how === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router, pathname],
  );
  const set = useCallback(
    (patch: Readonly<Record<string, string | null>>, how: UrlWrite) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      write(next, how);
    },
    [params, write],
  );
  return { params, write, set };
}
