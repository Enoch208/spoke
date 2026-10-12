import { getConnection, sendTransaction } from "wagmi/actions";
import type { Config } from "wagmi";
import type { SignerPort } from "./ports";
import type { Hex } from "./types";

export const walletSigner = (config: Config, account: Hex): SignerPort | null => {
  const connection = getConnection(config);
  if (connection.status !== "connected") return null;
  if (connection.address.toLowerCase() !== account.toLowerCase()) return null;
  return {
    address: connection.address,
    kind: "wallet",
    walletName: connection.connector.name,
    chainId: () => Promise.resolve(getConnection(config).chainId ?? connection.chainId),
    send: async (request) => ({
      hash: await sendTransaction(config, {
        account: connection.address,
        to: request.to,
        data: request.data,
        value: request.value,
        gas: request.gas,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
      }),
      nonce: null,
    }),
  };
};
