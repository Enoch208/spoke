"use client";

import { useSearchParams } from "next/navigation";
import { CreateEntry } from "./composer/entry-create";
import { VersionEntry } from "./composer/entry-version";
import { LaunchedPanel } from "./composer/launched";

export function ComposerPage() {
  const search = useSearchParams();
  const campaign = search.get("campaign");
  if (campaign && search.get("step") === "launched") return <LaunchedPanel campaignId={campaign} />;
  if (campaign && search.get("mode") === "newVersion")
    return <VersionEntry campaignId={campaign} />;
  return <CreateEntry />;
}
