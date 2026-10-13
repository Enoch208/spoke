export const graphCopy = {
  pathNote:
    "Paths follow link ancestry under the campaign’s rules. Being on a path doesn’t mean someone caused the sale.",
  you: "You",
  someone: "Someone",
  someoneNode: "Someone · node {nodeId}",
  hidden: "Hidden by moderation",
  merchant: "{merchant} · merchant",
  buyer: "Buyer",
  buyerPrivate: "Buyer (private)",
  buyersPrivate: "Buyers stay private.",
  sample: "Sample",
  level: "Level {n}",
  nearest: "nearest to the buyer",
  levelFromMerchant: "Level {n} from the merchant",
  root: "Started a branch",
  notOnPath: "Not on this sale’s path",
} as const;

export const salePanelCopy = {
  title: "Sale #{saleId}",
  summary: "Sale {price} · Reward {reward} ({pct}) · Policy v{version}",
  policyHash: "Policy hash",
  copyHash: "Copy policy hash",
  hashCopied: "Policy hash copied",
  pathCaption: "Paid path for sale #{saleId}",
  columns: { person: "Person", level: "Level", share: "Share", amount: "Amount", state: "State" },
  total: "Total {reward}",
  totalNote: "Allocations add up to the reward exactly.",
  notPaid: "On the path, not paid",
  repeated: "Same wallet already paid nearer in the path",
  notOnPath:
    "This sale went through a different branch. Being in the same campaign doesn’t put you on its path.",
  viewReceipt: "View receipt",
  viewProof: "View proof",
  finalize: "Finalize sale",
  claim: "Claim {amount}",
  showInNetwork: "Show in network",
  highlight: "Highlight in graph",
  evidence: "Evidence",
  purchaseTx: "Purchase",
  finalizeTx: "Finalize",
  refundTx: "Refund",
  holdEnds: "Hold ends {time}",
  notFound: "This sale doesn’t exist on Monad Testnet.",
} as const;

export const allocationCopy = {
  reserved: "Reserved",
  claimable: "Claimable",
  claimed: "Claimed",
  refunded: "Refunded",
  reversed: "Reversed",
} as const;
