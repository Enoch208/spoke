"use client";

import Link from "next/link";
import { banners, fill } from "@/lib/copy";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { useModeStore } from "@/lib/stores/mode";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { Button } from "../ui/button";

export function BannerStack({
  surface,
  mainnetFunding = false,
}: {
  surface: "app" | "public" | "marketing";
  mainnetFunding?: boolean;
}) {
  const mode = useModeStore((state) => state.mode);
  const persona = useModeStore((state) => state.persona);
  const { exitDemo } = useDemoMode();
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const me = useClientQuery("account.me", {}, { enabled: signedIn });
  const recovery =
    mode === "live" && me.data?.accountKind === "passkey" && !me.data.recovery.checkedAt;
  if (mode === "demo")
    return (
      <aside
        aria-label={banners.demo.regionLabel}
        className="bg-lilac-soft font-ui flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm"
      >
        <span>{fill(banners.demo.body, { persona })}</span>
        <Button size="sm" variant="ghost" asChild>
          <Link href="/demo">Switch persona</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            exitDemo();
          }}
        >
          Exit demo
        </Button>
      </aside>
    );
  if (surface === "marketing") return null;
  return (
    <>
      <aside
        aria-label={mainnetFunding ? "Mainnet funding notice" : banners.testnet.regionLabel}
        className="bg-lime-soft text-olive font-ui px-4 py-2 text-center text-sm"
      >
        {mainnetFunding
          ? "Mainnet wallet funding · Real assets. Spoke checkout remains on Monad Testnet."
          : `${banners.testnet.title} · ${banners.testnet.body}`}
      </aside>
      {recovery ? (
        <aside className="bg-amber-soft font-ui flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm">
          <span>Back up your recovery phrase before your account holds anything.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              useUiStore.getState().open("M-04", { mode: "backup", origin: "banner" });
            }}
          >
            Back up now
          </Button>
        </aside>
      ) : null}
    </>
  );
}
