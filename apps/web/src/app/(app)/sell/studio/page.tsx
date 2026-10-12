import { PageSkeleton } from "@/components/product/page";
import { ComposerPage } from "@/components/sell/core/composer-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ComposerPage />
    </Suspense>
  );
}
