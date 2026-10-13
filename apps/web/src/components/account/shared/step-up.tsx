"use client";

import { signMessage } from "wagmi/actions";
import { useConfig } from "wagmi";
import { getAddress } from "viem";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { signWithPasskey } from "./keys";
import { CeremonyError } from "./outcome";
import { useSimulatedPrompt, type PromptKind } from "./simulated-prompt";

const demoSignature = "0x00";

export function useStepUp() {
  const { client, mode } = useClientContext();
  const config = useConfig();
  const me = useClientQuery("account.me", {});
  const simulated = useSimulatedPrompt();
  const kind: PromptKind = me.data?.accountKind === "wallet" ? "wallet" : "passkey";

  const confirm = async (action: string): Promise<string> => {
    if (!client || !me.data) throw new CeremonyError("failed");
    const address = getAddress(me.data.address);
    if (mode === "demo") await simulated.ask(kind);
    const challenge = await client.call("auth.challenge", {
      address,
      chainId: activeChain.id,
      accountKind: kind,
      purpose: "confirm",
      action,
    });
    const signature =
      mode === "demo"
        ? demoSignature
        : kind === "wallet"
          ? await signMessage(config, { account: address, message: challenge.message })
          : (await signWithPasskey(challenge.message, client)).signature;
    const verified = await client.call("auth.verify", {
      message: challenge.message,
      signature,
      method: kind,
    });
    if (!("confirmationToken" in verified)) throw new CeremonyError("failed");
    return verified.confirmationToken;
  };

  return { confirm, kind, prompt: simulated.element, ask: simulated.ask };
}
