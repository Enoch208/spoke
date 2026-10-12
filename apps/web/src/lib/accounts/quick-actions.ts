import { z } from "zod";
import { needsPasskeyPrompt, purchaseAmountOf } from "../tx/actions";
import type { AnyTxRecord } from "../tx/types";
import { useUiStore } from "../stores/ui";
import { unlockPasskey, passkeySessionActive, endPasskeySession } from "./passkey";

const preference = z.object({
  choice: z.enum(["allow", "ask"]),
  capMinor: z.string().regex(/^\d+$/),
});
const key = "spoke-quick-actions";
let decision: ((choice: "allow" | "ask") => void) | null = null;

export const readQuickActions = () => {
  try {
    const parsed = preference.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const chooseQuickActions = (choice: "allow" | "ask", capMinor = "100000000") => {
  localStorage.setItem(key, JSON.stringify(preference.parse({ choice, capMinor })));
  decision?.(choice);
  decision = null;
  if (choice === "ask") endPasskeySession();
};

export const preparePasskeySigning = async (record: AnyTxRecord) => {
  if (!readQuickActions()) {
    const promise = new Promise<"allow" | "ask">((resolve) => {
      decision = resolve;
    });
    useUiStore.getState().open("M-09", { origin: "engine" });
    await promise;
  }
  const choice = readQuickActions();
  if (
    needsPasskeyPrompt(
      record.kind,
      choice?.choice === "allow" && passkeySessionActive(),
      purchaseAmountOf(record),
      BigInt(choice?.capMinor ?? "100000000"),
    )
  ) {
    const { account } = await unlockPasskey();
    if (account.address.toLowerCase() !== record.account.toLowerCase()) {
      endPasskeySession();
      throw new Error(
        "This passkey opens a different account. Choose the passkey for this account.",
      );
    }
  }
};

export const afterPasskeySigning = () => {
  if (readQuickActions()?.choice !== "allow") endPasskeySession();
};
