export const fundsFlow = {
  noGas: "You need a little testnet MON",
  noSdusd: "This needs {required} and you have {balance}. SDUSD is a free testnet demo token.",
  gasUnavailable:
    "We couldn’t add test MON to this account. You can get some from the Monad faucet.",
} as const satisfies Record<string, string>;
