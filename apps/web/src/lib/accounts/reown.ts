import { createAppKit } from "@reown/appkit/react";
import { reownAdapter, activeChain } from "../wagmi";
import { publicEnv } from "../public-env";
import { monadTestnet, localChain } from "@spoke/protocol";

let appkit: ReturnType<typeof createAppKit> | null = null;

export const openWalletConnection = async () => {
  const projectId = publicEnv.NEXT_PUBLIC_REOWN_PROJECT_ID;
  if (!projectId || !reownAdapter)
    throw new Error("WalletConnect is not configured. Use an installed browser wallet.");
  appkit ??= createAppKit({
    adapters: [reownAdapter as NonNullable<Parameters<typeof createAppKit>[0]["adapters"]>[number]],
    projectId,
    networks: [monadTestnet, localChain],
    defaultNetwork: activeChain,
    metadata: {
      name: "Spoke",
      description: "The distribution graph",
      url: location.origin,
      icons: [`${location.origin}/icon.png`],
    },
    features: { analytics: false, email: false, socials: [], swaps: false, onramp: false },
  });
  await appkit.open({ view: "Connect" });
};
