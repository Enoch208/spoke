import { common } from "./common";

export type ProofFieldCopy = {
  readonly label: string;
  readonly value?: string;
  readonly values?: Readonly<Record<string, string>>;
  readonly demo?: string;
  readonly hiddenInDemo?: true;
};

export const proofFields = {
  network: {
    label: "Network",
    value: "Monad Testnet (chain 10143)",
    demo: common.simulated,
  },
  contract: { label: "Contract" },
  transaction: { label: "Transaction", demo: common.simulated },
  block: { label: "Block", value: "{block}", hiddenInDemo: true },
  recordedAt: { label: "Recorded by Spoke at block", value: "{block}", hiddenInDemo: true },
  policy: { label: "Policy hash", demo: "Sample policy" },
  policyVersion: { label: "Terms version", value: "Version {version} · effective {effectiveAt}" },
  orderKey: { label: "Order key", hiddenInDemo: true },
  events: { label: "Events", demo: "Simulated events" },
  source: {
    label: "Source",
    values: { onchain: "Onchain payment", merchantAttested: "Merchant-attested" },
  },
} as const satisfies Record<string, ProofFieldCopy>;
