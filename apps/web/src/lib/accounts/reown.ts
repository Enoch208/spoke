import { createAppKit } from "@reown/appkit/react";
import { reownAdapter, activeChain } from "../wagmi";
import { publicEnv } from "../public-env";
import { monadTestnet, localChain } from "@spoke/protocol";
import { getConnection, watchConnection } from "wagmi/actions";
import { getAddress, isAddress, type Address } from "viem";
import { wagmiConfig } from "../wagmi";

let appkit: ReturnType<typeof createAppKit> | null = null;

export const emailLoginAvailable = Boolean(publicEnv.NEXT_PUBLIC_REOWN_PROJECT_ID);

export const initializeWalletConnection = async () => {
  const projectId = publicEnv.NEXT_PUBLIC_REOWN_PROJECT_ID;
  if (!projectId || !reownAdapter)
    throw new Error("WalletConnect is not configured. Use an installed browser wallet.");
  appkit ??= createAppKit({
    adapters: [reownAdapter as NonNullable<Parameters<typeof createAppKit>[0]["adapters"]>[number]],
    projectId,
    networks: [monadTestnet, localChain],
    defaultNetwork: activeChain,
    defaultAccountTypes: { eip155: "eoa" },
    enableAuthLogger: false,
    metadata: {
      name: "Spoke",
      description: "The distribution graph",
      url: location.origin,
      icons: [`${location.origin}/icon.png`],
    },
    themeMode: "light",
    themeVariables: { "--w3m-accent": "#536d16", "--w3m-border-radius-master": "2px" },
    features: {
      analytics: false,
      email: true,
      emailShowWallets: false,
      connectMethodsOrder: ["email", "wallet"],
      socials: [],
      swaps: false,
      onramp: false,
    },
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      appkit.ready(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("The sign-in service did not load. Please refresh and try again."));
        }, 20_000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  return appkit;
};

export const openWalletConnection = async () => {
  const modal = await initializeWalletConnection();
  await modal.open({ view: "AllWallets" });
};

export const openEmailConnection = async (signal: AbortSignal): Promise<Address | null> => {
  const modal = await initializeWalletConnection();
  if (signal.aborted) return null;
  if (!modal.getRemoteFeatures()?.email)
    throw new Error("Email sign-in is temporarily unavailable. Try a passkey or wallet.");

  return new Promise((resolve, reject) => {
    let finished = false;
    let opened = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: (() => void)[] = [];
    const finish = (address: Address | null, error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(closeTimer);
      cleanups.forEach((cleanup) => {
        cleanup();
      });
      void modal.close().catch(() => undefined);
      if (error)
        reject(error instanceof Error ? error : new Error("Email sign-in couldn’t be opened."));
      else resolve(address);
    };
    const check = () => {
      const account = modal.getAccount("eip155");
      const connection = getConnection(wagmiConfig);
      if (
        account?.isConnected &&
        account.embeddedWalletInfo?.authProvider === "email" &&
        account.address &&
        isAddress(account.address, { strict: false }) &&
        connection.status === "connected" &&
        connection.address.toLowerCase() === account.address.toLowerCase()
      ) {
        finish(getAddress(account.address));
        return true;
      }
      return false;
    };
    const cancel = () => {
      finish(null);
    };
    signal.addEventListener("abort", cancel, { once: true });
    cleanups.push(() => {
      signal.removeEventListener("abort", cancel);
    });
    cleanups.push(modal.subscribeAccount(check, "eip155"));
    cleanups.push(watchConnection(wagmiConfig, { onChange: check }));
    cleanups.push(
      modal.subscribeState((state) => {
        if (state.open) opened = true;
        else if (opened && !finished) {
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            if (!check()) finish(null);
          }, 300);
        }
      }),
    );
    const timeout = setTimeout(() => {
      finish(null, new Error("Email sign-in timed out. Please try again."));
    }, 1_800_000);
    cleanups.push(() => {
      clearTimeout(timeout);
    });
    if (!check())
      void modal.open({ view: "Connect" }).catch((error: unknown) => {
        finish(null, error);
      });
  });
};

export const disconnectEmailWallet = async () => {
  if (appkit?.getAccount("eip155")?.embeddedWalletInfo) await appkit.disconnect("eip155");
};
