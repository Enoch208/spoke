"use client";

import Link from "next/link";
import { QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { privacyCopy as copy } from "../copy/privacy";
import { SettingsCard } from "./settings-card";

export function PrivacySettings() {
  const profile = useClientQuery("reputation.mine", {});
  const open = useUiStore((state) => state.open);
  return (
    <QueryState
      pending={profile.isPending}
      error={profile.error}
      retry={() => void profile.refetch()}
    >
      <div className="grid gap-5">
        <SettingsCard title={copy.title} description={copy.body}>
          <p className="text-ink text-sm">
            Current visibility:{" "}
            {profile.data?.visibility === "public"
              ? "Public"
              : profile.data?.visibility === "pseudonymous"
                ? "Pseudonymous"
                : "Private"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                open("M-36", {});
              }}
            >
              {copy.change}
            </Button>
            {profile.data?.handle && profile.data.visibility !== "private" ? (
              <Button asChild variant="ghost">
                <Link target="_blank" href={`/u/${encodeURIComponent(profile.data.handle)}`}>
                  {copy.preview}
                </Link>
              </Button>
            ) : null}
          </div>
        </SettingsCard>
        <SettingsCard title={copy.chainTitle} description={copy.chain} />
        <SettingsCard title={copy.dataTitle}>
          <div className="grid gap-2">
            <h3 className="text-ink font-medium">{copy.export}</h3>
            <p className="text-body text-sm">{copy.exportBody}</p>
            <Button
              className="mt-1 w-fit"
              variant="secondary"
              onClick={() => {
                open("M-38", { mode: "export" });
              }}
            >
              {copy.export}
            </Button>
          </div>
          <div className="border-hairline mt-2 grid gap-2 border-t pt-5">
            <h3 className="text-ink font-medium">{copy.delete}</h3>
            <p className="text-body text-sm">{copy.deleteBody}</p>
            <Button
              className="mt-1 w-fit"
              variant="danger"
              onClick={() => {
                open("M-38", { mode: "delete" });
              }}
            >
              {copy.delete}
            </Button>
          </div>
        </SettingsCard>
      </div>
    </QueryState>
  );
}
