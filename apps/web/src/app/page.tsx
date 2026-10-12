import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { activeChain } from "@/lib/wagmi";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-5xl font-semibold tracking-tight text-balance">
        Pay for revenue, not reach.
      </h1>
      <p className="text-muted max-w-xl text-lg">
        Merchants pre-fund a reward pool. People share a product through referral links. When a real
        sale settles, up to three people in the chain are paid exactly what the campaign promised.
      </p>
      <p className="text-muted flex items-center gap-2 text-sm">
        <HugeiconsIcon icon={InformationCircleIcon} size={16} aria-hidden="true" />
        Testnet demonstration on {activeChain.name}. Demo tokens are not redeemable currency.
      </p>
    </main>
  );
}
