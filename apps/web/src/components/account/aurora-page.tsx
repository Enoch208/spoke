"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import { z } from "zod";
import type { ClientOutput } from "@spoke/protocol";
import { ProductPage, PageLink } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { AuroraForm } from "./aurora-form";
import { AuroraDeposit } from "./aurora-deposit";
import { fundingPollInterval } from "./aurora-model";

function FundingBody({ address }: { address: string }) {
  const { client } = useClientContext();
  const params = useSearchParams();
  const parsedId = z.uuid().safeParse(params.get("deposit"));
  const id = parsedId.success ? parsedId.data : null;
  const config = useClientQuery("funding.auroraConfig", {}, { staleTime: 300_000 });
  const deposit = useQuery<ClientOutput<"funding.auroraDeposit">>({
    queryKey: ["live", "funding", "auroraDeposit", address, id],
    queryFn: () => {
      if (!client || !id) throw new Error("Sign in to restore this deposit.");
      return client.call("funding.auroraDeposit", { id });
    },
    enabled: client !== null && id !== null,
    retry: false,
    refetchInterval: (query) => fundingPollInterval(query.state.data, Date.now()),
  });
  if (id)
    return deposit.data ? (
      <>
        <AuroraDeposit
          deposit={deposit.data}
          refreshing={deposit.isFetching}
          statusUnavailable={deposit.error !== null}
          refresh={() => {
            void deposit.refetch();
          }}
        />
        {deposit.error ? <p role="alert">{deposit.error.message}</p> : null}
      </>
    ) : (
      <Card>
        <p role={deposit.error ? "alert" : "status"}>
          {deposit.error?.message ?? "Restoring your deposit…"}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            void deposit.refetch();
          }}
        >
          Try again
        </Button>
      </Card>
    );
  if (params.has("deposit"))
    return (
      <Card>
        <p role="alert">This deposit reference is invalid.</p>
        <PageLink href="/wallet/fund">Start a funding request</PageLink>
      </Card>
    );
  if (config.isPending)
    return (
      <Card>
        <p role="status">Loading supported funding routes…</p>
      </Card>
    );
  if (config.error)
    return (
      <Card>
        <p role="alert">{config.error.message}</p>
        <Button
          variant="secondary"
          onClick={() => {
            void config.refetch();
          }}
        >
          Try again
        </Button>
      </Card>
    );
  if (!config.data.configured)
    return (
      <Card>
        <p>Mainnet wallet funding is not configured yet.</p>
      </Card>
    );
  return <AuroraForm config={config.data} address={address} />;
}

export function AuroraFundingPage() {
  const { mode } = useClientContext();
  const params = useSearchParams();
  const saved = z.uuid().safeParse(params.get("deposit"));
  const returnTo = saved.success
    ? `/wallet/fund?deposit=${encodeURIComponent(saved.data)}`
    : "/wallet/fund";
  const address = useSessionStore((state) => state.address);
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const connection = useConnection();
  const externalWalletReady =
    connection.status === "connected" &&
    connection.connector.type !== "AUTH" &&
    connection.address.toLowerCase() === address?.toLowerCase();
  return (
    <ProductPage
      title="Fund your wallet"
      description="Receive USDC on Monad Mainnet from another network."
      actions={<PageLink href="/wallet">Your testnet wallet</PageLink>}
    >
      <Card className="bg-soft">
        <p className="text-ink font-medium">Monad Mainnet · Real assets</p>
        <p className="text-body mt-2 text-sm">
          Funds arrive in your wallet on mainnet. Spoke checkout, campaigns and earnings currently
          use SDUSD on Monad Testnet, so this funding stays separate.
        </p>
        <p className="text-body mt-2 text-sm">
          Use an external wallet you control. If you signed in with email or a passkey, sign out and
          choose Connect wallet. You will need MON on Monad Mainnet to send or spend your USDC.
        </p>
      </Card>
      {mode !== "live" ? (
        <Card>
          <p>
            Real wallet funding is available in Live mode. Demo cannot create deposit instructions.
          </p>
          <PageLink href="/demo/exit">Leave Demo</PageLink>
        </Card>
      ) : !signedIn || !address ? (
        <Card>
          <p>Sign in to choose your destination wallet.</p>
          <Button onClick={() => useUiStore.getState().open("M-01", { reason: "open", returnTo })}>
            Sign in
          </Button>
        </Card>
      ) : !saved.success && !externalWalletReady ? (
        <Card>
          <p>
            Connect the external wallet for your signed-in account before creating a mainnet funding
            request.
          </p>
          <p className="text-subtle mt-2 text-sm">
            Email and passkey signing in Spoke currently use testnet. To fund an external wallet,
            sign out and sign in with that wallet.
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              useUiStore
                .getState()
                .open("M-01", { reason: "open", returnTo, expectedAddress: address })
            }
          >
            Connect your wallet
          </Button>
        </Card>
      ) : (
        <FundingBody key={address} address={address} />
      )}
    </ProductPage>
  );
}
