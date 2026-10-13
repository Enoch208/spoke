import {
  createPasskeyWithPrfOutput,
  decryptSecretVaultWithPasskey,
  getPasskeyPrfOutput,
  parseSecretVault,
} from "@category-labs/mera";
import { isClientError } from "../client/errors";
import type { SpokeClient } from "../client/types";
import { rememberPasskey, storedPasskey } from "./passkey-credential";

export const readPasskeyEntropy = async (client?: SpokeClient | null, create = false) => {
  const known = storedPasskey();
  if (!create && known?.kind === "added") {
    if (!client) throw new Error("Connect to Spoke to unlock this added passkey.");
    const vault = parseSecretVault(
      await client.call("account.passkeyVault", { credentialId: known.credentialId }),
    );
    const entropy = await decryptSecretVaultWithPasskey({ rpId: location.hostname, vault });
    return { entropy, credential: known };
  }
  const result = create
    ? await createPasskeyWithPrfOutput({
        rp: { id: location.hostname, name: "Spoke" },
        user: { name: `spoke-${crypto.randomUUID()}`, displayName: "Spoke account" },
      })
    : await getPasskeyPrfOutput({
        rpId: location.hostname,
        ...(known ? { credential: known } : {}),
      });
  try {
    if (
      !create &&
      client &&
      !(known?.kind === "original" && known.credentialId === result.credentialId)
    ) {
      const raw = await client
        .call("account.passkeyVault", { credentialId: result.credentialId })
        .catch((error: unknown) => {
          if (isClientError(error) && error.code === "NOT_FOUND") return null;
          throw error;
        });
      if (raw) {
        const vault = parseSecretVault(raw);
        const entropy = await decryptSecretVaultWithPasskey({ rpId: location.hostname, vault });
        return { entropy, credential: rememberPasskey({ ...result, kind: "added" }) };
      }
    }
    return {
      entropy: new Uint8Array(result.prfOutput),
      credential: rememberPasskey({ ...result, kind: "original" }),
    };
  } finally {
    result.prfOutput.fill(0);
  }
};
