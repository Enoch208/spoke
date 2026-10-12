import { Suspense } from "react";
import { WelcomePage } from "@/components/account/welcome-page";

export default function Page() {
  return (
    <Suspense>
      <WelcomePage />
    </Suspense>
  );
}
