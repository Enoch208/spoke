export const accessCopy = {
  crumb: "Files",
  title: "Your files",
  subline: "{product} from {merchant}",
  openPending:
    "Your access is open. It stays open unless the merchant refunds this purchase during the hold.",
  openFinal: "Your access is open.",
  instructions: "From the merchant",
  listLabel: "Files for this purchase",
  names: {
    download: "{product} · file {n}",
    external: "{product} · access link",
    manual: "{product} · delivery note",
  },
  demoName: "Sample file {n}",
  types: {
    download: "Digital download",
    external: "Link to the merchant’s product",
    manual: "Text from the merchant",
  },
  demoType: "Simulated in demo mode",
  download: "Download",
  openLink: "Open link",
  getText: "Download note",
  expires:
    "Download links are personal and expire {relative}. Getting a file again creates a fresh link.",
  expired: "That link expired. Download again.",
  problem: "Problem with a file?",
  report: "Report a problem",
  empty: "The merchant hasn’t added files to this product yet.",
  merchantProfile: "Merchant profile",
  error: "We couldn’t open your files.",
  tryAgain: "Try again",
  revokedTitle: "Access ended",
  revoked:
    "Access ended because this purchase was refunded on {time}. Download links issued before the refund stop working when they expire.",
  viewPurchase: "View purchase",
  unauthorised: "Only the account that bought this can open its files.",
  switchAccount: "Switch account",
  notFound: "We can’t find this purchase.",
  syncing: "Your purchase is confirmed onchain. Your files open as soon as we finish syncing it.",
  demoFile:
    "This is a sample deliverable from Spoke’s demo mode. It stands in for the files a merchant would deliver after a real purchase. Product: {product}.",
} as const;
