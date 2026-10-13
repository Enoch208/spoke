"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (updates: Readonly<Record<string, string | null>>, push = false) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };
  return {
    get: (key: string) => params.get(key),
    getAll: (key: string) => params.getAll(key),
    set,
  };
}

export const pickValue = <Value extends string>(
  raw: string | null,
  values: readonly Value[],
  fallback: Value,
): Value => values.find((value) => value === raw) ?? fallback;

export function useKept<Data>(data: Data | undefined) {
  const [kept, setKept] = useState(data);
  if (data !== undefined && data !== kept) setKept(data);
  return data ?? kept;
}
