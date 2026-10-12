export const recoverFlow = {
  invalidPhrase: "These words don’t form a valid recovery phrase. Check the spelling and order.",
  noHistory:
    "This phrase opens an account with no Spoke activity. Make sure it’s the right phrase.",
  impossible:
    "Without your passkey or recovery phrase, Spoke can’t restore this account. We never hold your keys.",
} as const satisfies Record<string, string>;
