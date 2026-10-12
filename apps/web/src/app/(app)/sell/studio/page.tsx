import { ComposerPage } from "@/components/sell/core/composer-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <ComposerPage />
    </Suspense>
  );
}
