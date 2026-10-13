import { auroraConfig, addressString } from "@spoke/protocol";
import type { z } from "zod";
import { ApiProblem } from "../http/problem.js";
import { auroraNetworks, monadUsdc, type AuroraProvider } from "./aurora-provider.js";

export const createAuroraCatalog = (provider: AuroraProvider | null) => {
  let cached: { value: z.infer<typeof auroraConfig>; expiresAt: number } | undefined;
  let loading: Promise<z.infer<typeof auroraConfig>> | undefined;
  const load = async () => {
    if (!provider)
      return auroraConfig.parse({
        provider: "aurora",
        configured: false,
        destinationChainId: 143,
        destinationNetwork: "Monad Mainnet",
        sources: [],
        destinations: [],
      });
    const tokens = await provider.tokens();
    const assets = tokens.flatMap((token) => {
      if (!Object.hasOwn(auroraNetworks, token.blockchain)) return [];
      const network = auroraNetworks[token.blockchain as keyof typeof auroraNetworks];
      const parsed = addressString.nullable().safeParse(token.contractAddress);
      if (!parsed.success)
        throw new ApiProblem(
          503,
          "UPSTREAM_UNAVAILABLE",
          "Aurora returned an invalid token address.",
          true,
        );
      const contractAddress = parsed.data;
      return [{ ...token, ...network, contractAddress }];
    });
    const destinations = assets.filter(
      (asset) =>
        asset.chainId === 143 &&
        asset.symbol === "USDC" &&
        asset.decimals === 6 &&
        asset.contractAddress?.toLowerCase() === monadUsdc.toLowerCase(),
    );
    if (destinations.length !== 1)
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Aurora's Monad USDC route is unavailable.",
        true,
      );
    return auroraConfig.parse({
      provider: "aurora",
      configured: true,
      destinationChainId: 143,
      destinationNetwork: "Monad Mainnet",
      sources: assets.filter((asset) => asset.chainId !== 143),
      destinations,
    });
  };
  return async () => {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    loading ??= load();
    try {
      const value = await loading;
      cached = { value, expiresAt: Date.now() + 300_000 };
      return value;
    } finally {
      loading = undefined;
    }
  };
};
