"use client";

import { useClientContext } from "@/lib/client/provider";
import { feeLine } from "../copy/settlement";

export function FeeLine() {
  const { mode } = useClientContext();
  return <p className="text-subtle text-sm">{mode === "demo" ? feeLine.demo : feeLine.live}</p>;
}
