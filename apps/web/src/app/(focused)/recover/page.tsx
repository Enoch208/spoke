import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { RecoverPage } from "@/components/account/recover/recover-page";

export const metadata: Metadata = { title: "Recover your account · Spoke" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RecoverPage />
    </Suspense>
  );
}
