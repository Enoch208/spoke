"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductPage, PageSkeleton, QueryState } from "@/components/product/page";
import { InvitationList } from "@/components/earn/invitations/invitation-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { shortAddress } from "@/lib/format";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { usePublicViewer } from "@/components/public/shared/viewer";

function JoinedPartners() {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const partners = useClientQuery(
    "partners.list",
    { limit: 12, ...(cursor ? { cursor } : {}) },
    { staleTime: 0, refetchInterval: 15_000 },
  );
  return (
    <QueryState
      pending={partners.isPending}
      error={partners.error}
      retry={() => void partners.refetch()}
      loading="rows"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {partners.data?.items.map((person) => (
          <Card key={person.address ?? person.handle} className="min-w-0 space-y-3 wrap-anywhere">
            <h2 className="font-display text-h4">
              {person.displayName ??
                person.handle ??
                (person.address ? shortAddress(person.address) : "Distributor")}
            </h2>
            <p className="text-body text-sm">
              {person.linkCount} campaign links · {person.settledConversions ?? "Not shared"}{" "}
              settled sales
            </p>
            <p className="text-subtle text-xs">
              Joined through a confirmed campaign link. Pending and refunded sales do not count as
              settled sales.
            </p>
            {person.address ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  useUiStore.getState().open("M-28", { address: person.address ?? "" })
                }
              >
                Invite to another campaign
              </Button>
            ) : null}
            {person.handle || person.address ? (
              <Link
                className="block text-sm underline"
                href={routeTo.profile(person.handle ?? person.address ?? "")}
              >
                View public profile
              </Link>
            ) : null}
          </Card>
        ))}
      </div>
      {!partners.data?.items.length ? (
        <p className="text-subtle py-8">
          No distributors have created a link in your campaigns yet. Accepted invitations appear
          here after a link is confirmed and indexed.
        </p>
      ) : null}
      <div className="flex gap-3 pt-4">
        {cursors.length ? (
          <Button
            variant="secondary"
            onClick={() => {
              setCursors((values) => values.slice(0, -1));
            }}
          >
            Previous page
          </Button>
        ) : null}
        {partners.data?.nextCursor ? (
          <Button
            variant="secondary"
            onClick={() => {
              const next = partners.data.nextCursor;
              if (next) setCursors((values) => [...values, next]);
            }}
          >
            Next page
          </Button>
        ) : null}
      </div>
    </QueryState>
  );
}

function Content() {
  const params = useSearchParams();
  const tab = params.get("tab") === "invitations" ? "invitations" : "partners";
  const { me } = usePublicViewer();
  return (
    <ProductPage
      title="Partners"
      description="Find distributors, invite them to a campaign and follow their confirmed participation."
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={routes.distributors}>Find distributors</Link>
          </Button>
          <Button onClick={() => useUiStore.getState().open("M-28", { address: "" })}>
            Invite distributor
          </Button>
        </>
      }
    >
      <nav aria-label="Partners views" className="flex flex-wrap gap-2">
        <Button asChild variant={tab === "partners" ? "primary" : "secondary"}>
          <Link href="/sell/partners">Joined distributors</Link>
        </Button>
        <Button asChild variant={tab === "invitations" ? "primary" : "secondary"}>
          <Link href="/sell/partners?tab=invitations">Sent invitations</Link>
        </Button>
      </nav>
      {me?.isMerchant ? (
        tab === "invitations" ? (
          <InvitationList sent />
        ) : (
          <JoinedPartners />
        )
      ) : (
        <PageSkeleton shape="rows" />
      )}
    </ProductPage>
  );
}

export function PartnersPage() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <Content />
    </Suspense>
  );
}
