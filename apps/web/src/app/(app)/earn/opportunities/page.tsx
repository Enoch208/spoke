import { Suspense } from "react";
import { OpportunitiesPage } from "@/components/earn/opportunities/opportunities-page";
import { PageSkeleton } from "@/components/product/page";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton shape="cards" />}>
      <OpportunitiesPage />
    </Suspense>
  );
}
