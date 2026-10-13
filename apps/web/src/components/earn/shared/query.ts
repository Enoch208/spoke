"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return {
    get: (key: string) => params.get(key),
    set: (updates: Readonly<Record<string, string | null>>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
  };
}

export const oneOf = <Value extends string>(
  raw: string | null,
  values: readonly Value[],
  fallback: Value,
): Value => values.find((value) => value === raw) ?? fallback;
