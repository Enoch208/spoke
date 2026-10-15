"use client";

import Link from "next/link";
import { ProductPage, QueryState } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import { useClientContext } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { formatDateTime } from "@/lib/format";
import { routeTo, routes } from "@/lib/routes";

export function PrivateWorkspacePage() {
  const { mode } = useClientContext();
  const session = useSessionStore();
  const eligible =
    mode === "live" && session.status === "signedIn" && session.accountKind === "passkey";
  const query = useClientQuery("workspace.list", {}, { enabled: eligible, staleTime: 0 });
  return (
    <ProductPage
      title="Private workspace"
      description="Your partnership plans, protected by your Spoke passkey."
    >
      <Card className="space-y-3">
        <h2 className="font-display text-h4">One passkey, two separate jobs</h2>
        <p className="text-body max-w-[75ch] text-sm">
          Your passkey signs account actions and derives a different key for your private campaign
          notes. Only encrypted notes sync to Spoke. Merchants and other distributors cannot read
          them.
        </p>
        <p className="text-subtle max-w-[75ch] text-sm">
          Open a campaign’s private notebook to plan outreach, record partnership terms or prepare
          follow-ups. You choose when to sync. Wallet recovery does not recover note encryption
          keys; keep the original passkey and an encrypted backup.
        </p>
        <Button asChild variant="secondary">
          <Link href={routes.earn.opportunities}>Find a campaign</Link>
        </Button>
      </Card>
      {!eligible ? (
        <Card className="space-y-3">
          <p>
            {mode === "demo"
              ? "Private notes are available with a live passkey account. Demo does not store private notes."
              : "Sign in with your Spoke passkey to open your private workspace. Email and connected-wallet accounts have a separate sign-in method."}
          </p>
          <Button asChild variant="secondary">
            <Link href="/login?next=%2Fearn%2Fworkspace">Sign in with passkey</Link>
          </Button>
        </Card>
      ) : (
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        >
          <Card className="space-y-4">
            <h2 className="font-display text-h4">Synced notebooks</h2>
            {query.data?.items.length ? (
              <ul className="divide-hairline divide-y">
                {query.data.items.map((item) => (
                  <li
                    key={`${String(item.chainId)}:${item.campaignId}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium">Campaign #{item.campaignId}</p>
                      <p className="text-subtle text-xs">
                        {item.chainId === 10143 ? "Monad Testnet" : `Chain ${String(item.chainId)}`}{" "}
                        · synced {formatDateTime(new Date(item.updatedAt))}
                      </p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`${routeTo.campaign(item.campaignId)}#private-notebook`}>
                        Open notebook
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-sm">
                Your first notebook starts on a campaign page. Existing notes saved only in another
                browser stay there until you open that browser and choose Encrypt & sync.
              </p>
            )}
            <p className="text-subtle text-xs">
              Up to 100 notebooks per account. Text stays locked until the original passkey
              confirms. Cross-device access requires that same passkey to be available through your
              provider with PRF support; it is not guaranteed for every browser or device.
            </p>
          </Card>
        </QueryState>
      )}
    </ProductPage>
  );
}
