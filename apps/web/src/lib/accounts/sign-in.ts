import type { Address, Hex } from "viem";
import type { SpokeClient } from "../client/types";
import { activeChain } from "../wagmi";
import { useSessionStore } from "../stores/session";

export const signInAccount = async (
  client: SpokeClient,
  address: Address,
  method: "passkey" | "wallet",
  sign: (message: string) => Promise<Hex>,
) => {
  const session = useSessionStore.getState();
  session.setStatus("signing");
  const challenge = await client.call("auth.challenge", {
    address,
    chainId: activeChain.id,
    accountKind: method,
    purpose: "signIn",
  });
  const signature = await sign(challenge.message);
  const verified = await client.call("auth.verify", {
    message: challenge.message,
    signature,
    method,
  });
  if (!("csrfToken" in verified)) throw new Error("This sign-in did not open a session.");
  const me = await client.call("account.me", {});
  session.signIn({
    address,
    accountKind: method,
    sessionExpiresAt: verified.expiresAt,
    isMerchant: me.isMerchant,
    isOperator: me.isOperator,
  });
  return { verified, me };
};
