import { chainById, localChain, monadTestnet } from "@spoke/protocol";
import { cookieStorage, createConfig, createStorage, http, injected } from "wagmi";
import { publicEnv } from "./public-env";

export const activeChain = chainById(publicEnv.NEXT_PUBLIC_CHAIN_ID);

export const wagmiConfig = createConfig({
  chains: [monadTestnet, localChain],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
    [localChain.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
