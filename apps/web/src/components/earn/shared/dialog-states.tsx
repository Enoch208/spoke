"use client";

import type { ClientError } from "@/lib/client/errors";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { common } from "@/lib/copy";

export function DialogSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 py-2">
      <span className="sr-only">{common.loading}</span>
      <Skeleton className="h-10 w-48 rounded-xl" />
      <SkeletonText lines={3} />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

export function DialogError({ error, retry }: { error: ClientError; retry: () => void }) {
  return (
    <ErrorState
      variant="inline"
      title={error.message}
      details={{ code: error.code, requestId: error.requestId ?? undefined }}
      actions={
        <Button size="sm" variant="secondary" onClick={retry}>
          {common.tryAgain}
        </Button>
      }
    />
  );
}
