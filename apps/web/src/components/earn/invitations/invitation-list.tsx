"use client";

import { useState } from "react";
import { QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useClientQuery } from "@/lib/query/use-client";
import { InvitationCard } from "./invitation-card";
import { invitationLabels } from "./model";

export function InvitationList({ sent = false }: { sent?: boolean }) {
  const [status, setStatus] = useState(sent ? "all" : "pending");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const query = useClientQuery(
    sent ? "invitations.sent" : "invitations.mine",
    { limit: 12, ...(cursor ? { cursor } : {}), ...(status === "all" ? {} : { status }) },
    { staleTime: 0, refetchInterval: 10_000 },
  );
  return (
    <div className="space-y-5">
      {!sent ? (
        <div className="max-w-xs">
          <Field label="Status">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setCursors([]);
              }}
              options={[
                { value: "all", label: "All invitations" },
                ...Object.entries(invitationLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
          </Field>
        </div>
      ) : null}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        loading="rows"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data?.items.map((item) => (
            <InvitationCard key={item.id} invitation={item} sent={sent} />
          ))}
        </div>
        {query.data?.items.length === 0 ? (
          <p className="text-subtle py-8">
            {sent
              ? "No invitations sent yet. Find a distributor or invite someone by their registered wallet."
              : "No invitations match this status. You can allow invitations in your reputation settings."}
          </p>
        ) : null}
        <div className="flex gap-3">
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
          {query.data?.nextCursor ? (
            <Button
              variant="secondary"
              onClick={() => {
                const next = query.data.nextCursor;
                if (next) setCursors((values) => [...values, next]);
              }}
            >
              Next page
            </Button>
          ) : null}
        </div>
      </QueryState>
    </div>
  );
}
