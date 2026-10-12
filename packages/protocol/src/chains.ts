import { defineChain } from "viem";
import { foundry, monadTestnet as viemMonadTestnet } from "viem/chains";

export const monadTestnet = defineChain({
  ...viemMonadTestnet,
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
});

export const localChain = foundry;

export const supportedChains = [monadTestnet, localChain] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const isSupportedChainId = (chainId: number): chainId is SupportedChainId =>
  supportedChains.some((chain) => chain.id === chainId);

export const chainById = (chainId: SupportedChainId) => {
  const chain = supportedChains.find((candidate) => candidate.id === chainId);
  if (!chain) throw new RangeError(`Unsupported chain ${String(chainId)}`);
  return chain;
};

export const explorerTxUrl = (chainId: SupportedChainId, txHash: string): string | null => {
  const explorer = chainById(chainId).blockExplorers?.default.url;
  return explorer ? `${explorer}/tx/${txHash}` : null;
};

export const explorerAddressUrl = (chainId: SupportedChainId, address: string): string | null => {
  const explorer = chainById(chainId).blockExplorers?.default.url;
  return explorer ? `${explorer}/address/${address}` : null;
};
