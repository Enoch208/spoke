"use client";

import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/lib/client/provider";
import { formatHandle } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { reputationCopy as copy } from "../copy/reputation";
import { VisibilityChip } from "../shared/visibility-chip";

export function HeaderCard({
  me,
  profile,
}: {
  me: ClientOutput<"account.me"> | undefined;
  profile: ClientOutput<"reputation.mine">;
}) {
  const { mode } = useClientContext();
  const open = useUiStore((state) => state.open);
  const handle = me?.handle ?? profile.handle;
  const listed = profile.visibility !== "private" && handle !== null;
  const initials = (handle ?? me?.displayName ?? "")
    .replace(/^demo-/, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="bg-surface border-hairline flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
      <span className="bg-lilac-soft text-ink flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
        {initials}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-display text-h4 text-ink truncate font-medium">
          {me?.displayName ?? ""}
        </p>
        <p className="text-subtle flex flex-wrap items-center gap-2 text-sm">
          {handle ? formatHandle(handle) : copy.header.noHandle}
          <VisibilityChip level={profile.visibility} />
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => open("M-36", {})}>
          {copy.header.change}
        </Button>
        {listed && handle ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={routeTo.profile(handle)}>{copy.header.viewProfile}</Link>
          </Button>
        ) : null}
        {listed && handle && mode === "live" && publicEnv.NEXT_PUBLIC_API_URL ? (
          <Button asChild size="sm" variant="ghost">
            <a
              href={`${publicEnv.NEXT_PUBLIC_API_URL}/v1/distributors/${encodeURIComponent(handle)}/profile`}
              target="_blank"
              rel="noreferrer"
            >
              {copy.header.json}
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
