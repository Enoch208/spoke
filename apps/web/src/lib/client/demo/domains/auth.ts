import { DAY, MINUTE, iso, sampleHash } from "../../../../demo/world/ids";
import { fail, type DemoInput, type PartialHandlers } from "../handler";
import { DEMO_CHAIN_ID } from "../views/basics";
import { accountOf, signerOf } from "./account-store";

type Challenge = DemoInput<"auth.challenge">;

export const CHALLENGE_TTL_MS = 5 * MINUTE;
export const SESSION_TTL_MS = 7 * DAY;

const statementOf = (input: Challenge, handle: string | null, nonce: string): string => {
  if (input.purpose === "link")
    return `Link this wallet to ${handle === null ? "your account" : `@${handle}`} on Spoke. This signature does not move funds or approve spending. Nonce ${nonce}.`;
  if (input.purpose === "confirm")
    return `Confirm ${input.action ?? "this change"} on Spoke. This proves it's you. It doesn't move any funds.`;
  return "Sign in to Spoke. This signature doesn't move funds or approve spending.";
};

const expiryOf = (message: string): number | null => {
  const line = message.split("\n").find((candidate) => candidate.startsWith("Expiration Time: "));
  if (line === undefined) return null;
  const at = Date.parse(line.slice("Expiration Time: ".length));
  return Number.isNaN(at) ? null : at;
};

export const authReads = {
  "auth.challenge": (input, runtime) => {
    const now = runtime.now();
    const nonce = sampleHash(`nonce:${input.address}:${input.purpose}:${String(now)}`).slice(2, 18);
    const expiresAt = iso(now + CHALLENGE_TTL_MS);
    const message = [
      `usespoke.xyz wants you to ${input.purpose === "signIn" ? "sign in" : "sign"} with your account:`,
      input.address,
      "",
      statementOf(input, accountOf(runtime).profile.handle, nonce),
      "",
      "URI: https://usespoke.xyz",
      "Version: 1",
      `Chain ID: ${String(input.chainId)}`,
      `Nonce: ${nonce}`,
      `Issued At: ${iso(now)}`,
      `Expiration Time: ${expiresAt}`,
      `Purpose: ${input.purpose}`,
    ].join("\n");
    return { message, nonce, expiresAt };
  },
  "auth.verify": (input, runtime) => {
    const now = runtime.now();
    const expiry = expiryOf(input.message);
    if (expiry !== null && now > expiry)
      fail("INVALID_SIGNATURE", "This request expired before it was signed. Try again.");
    if (input.message.includes("\nPurpose: confirm"))
      return {
        confirmationToken: sampleHash(`confirm:${input.message}`).slice(2),
        expiresAt: iso(now + CHALLENGE_TTL_MS),
      };
    return {
      address: signerOf(accountOf(runtime)).address,
      chainId: DEMO_CHAIN_ID,
      expiresAt: iso(now + SESSION_TTL_MS),
      isNewAccount: false,
      csrfToken: "demo",
    };
  },
  "auth.signOut": () => ({ ok: true }),
} satisfies PartialHandlers<"auth">;

export const authWrites = {} satisfies PartialHandlers<"auth">;
