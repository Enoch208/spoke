"use client";

import { useEffect, useState } from "react";
import { useClientQuery } from "@/lib/query/use-client";

export const handlePattern = /^[a-z][a-z0-9_]{2,19}$/;

export const normalizeHandle = (value: string) =>
  value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

export type HandleCheck =
  | { kind: "empty" }
  | { kind: "own" }
  | { kind: "invalid" }
  | { kind: "typing" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken"; suggestions: readonly string[] }
  | { kind: "reserved" }
  | { kind: "unknown" };

const useDebounced = (value: string, delay: number) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  return settled;
};

export function useHandleCheck(value: string, current: string | null): HandleCheck {
  const settled = useDebounced(value, 400);
  const valid = handlePattern.test(settled);
  const own = current !== null && settled === current;
  const query = useClientQuery(
    "account.handleAvailable",
    { handle: settled },
    { enabled: valid && !own && settled === value, staleTime: 30_000 },
  );
  if (!value) return { kind: "empty" };
  if (current !== null && value === current) return { kind: "own" };
  if (!handlePattern.test(value))
    return value === settled ? { kind: "invalid" } : { kind: "typing" };
  if (settled !== value) return { kind: "checking" };
  if (query.isError) return { kind: "unknown" };
  if (query.isPending) return { kind: "checking" };
  const result = query.data;
  if (result.available) return { kind: "available" };
  if (result.reason === "reserved") return { kind: "reserved" };
  if (result.reason === "invalid") return { kind: "invalid" };
  return { kind: "taken", suggestions: result.suggestions };
}

export const handleBlocks = (check: HandleCheck) =>
  check.kind === "invalid" ||
  check.kind === "typing" ||
  check.kind === "taken" ||
  check.kind === "reserved" ||
  check.kind === "checking";
