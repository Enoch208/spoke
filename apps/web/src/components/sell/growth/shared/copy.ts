export const growthCopy = {
  notLive: {
    title: "{feature} isn’t live yet",
    body: "It’s designed and works on sample data in demo mode. Nothing here touches the chain until it’s live on Monad Testnet.",
    tryDemo: "Try it in demo mode",
    seeLive: "See what’s live",
  },
  demoOnly: "Demo only",
  sample: "Sample",
  sampleData: "Sample data in demo mode. Not onchain.",
  updatedTo: "Updated to block {block}",
  syncing: "We are syncing recent transactions. This is not a confirmed payout yet.",
  noPermission: "Your role ({role}) can’t {action}. Ask an owner or admin.",
  viewing: "Viewing as {role}. Changes are disabled.",
  stop: "Stop",
  signedOut: "Sign in to manage your business.",
  pathNote:
    "Being on a sale’s paid path means their link was in the chain the buyer used. It doesn’t prove they caused the sale.",
  overlap:
    "One sale counts for every partner on its paid path, so these totals overlap across partners and don’t add up to your sales.",
  addressNote:
    "Spoke shows what an address did. It can’t tell whether two addresses belong to one person.",
  attested: "This order is merchant-attested. The payment was not independently verified onchain.",
  trust: { native: "Native onchain", attested: "Merchant-attested" },
  filters: "Filters",
  clearFilters: "Clear filters",
  applyFilters: "Show results",
  loadMore: "Load more",
  copyAddress: "Copy address",
  copied: "Copied to clipboard",
  more: "More actions",
  keep: "Keep",
  cancel: "Cancel",
  dash: "—",
  testnet: "· testnet",
} as const;

export const roleCopy = {
  owner: "Owner",
  admin: "Admin",
  finance: "Finance",
  developer: "Developer",
  analyst: "Analyst",
  support: "Support",
} as const;

export const capabilityCopy = {
  view: { label: "View partners, analytics, reports, disputes", action: "view this" },
  invite: { label: "Invite distributors, propose partnerships", action: "invite distributors" },
  export: { label: "Export reports", action: "export reports" },
  integrations: {
    label: "Connect integrations, manage signers",
    action: "change integrations or signers",
  },
  developer: { label: "API keys and webhooks", action: "manage API keys and webhooks" },
  respond: { label: "Respond to refund requests and appeals", action: "answer requests" },
  refund: { label: "Refund a sale (chain)", action: "refund sales" },
  team: { label: "Team: invite, change roles, remove", action: "manage the team" },
  billing: { label: "Billing and statements", action: "see billing" },
  settings: { label: "Business settings", action: "change business settings" },
  danger: { label: "Danger zone", action: "use the danger zone" },
} as const;

export const accessCopy = {
  yes: "Yes",
  signs: "Yes, signs",
  prepares: "Prepares; owner signs",
  no: "No",
  waiting: "Waiting for the business wallet ({address}) to sign. Share this page with the owner.",
  copyLink: "Copy link",
} as const;
