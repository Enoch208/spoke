import { PageSkeleton } from "@/components/product/page";
import { StudioPage } from "@/components/sell/core/studio/studio-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudioPage />
    </Suspense>
  );
}
