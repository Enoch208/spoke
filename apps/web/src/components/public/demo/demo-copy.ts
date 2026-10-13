export const demoPageCopy = {
  title: "Explore Spoke with sample data",
  subtitle:
    "A complete sample world runs in your browser: {merchants}, {distributors} and {sales}. Nothing touches the chain and no tokens move.",
  subtitleLoading:
    "A complete sample world runs in your browser. Nothing touches the chain and no tokens move.",
  inDemo: "You’re in demo mode as the {persona}.",
  inDemoBody:
    "Pick another persona below, start the sample world over, or go back to live testnet data.",
  continue: "Continue",
  reset: "Reset demo",
  resetConfirm:
    "Reset the demo? This clears every sample action you’ve taken in this browser and starts the sample world over.",
  resetCancel: "Cancel",
  exit: "Exit demo",
  current: "Current",
  startIn: "You’ll start in {place}.",
  justBrowse: "Just browse the sample campaigns",
  loading: "Loading the sample world…",
  failed: "We couldn’t load the demo. Check your connection and try again.",
  tryAgain: "Try again",
  storageBlocked:
    "Your browser is blocking storage, so the demo will reset when you close this tab.",
  howHeading: "How the demo works",
  how: [
    {
      title: "Clearly marked",
      body: "A bar at the top of every screen says Demo data, every amount carries a Demo badge, and sample people and shops are labelled Sample.",
    },
    {
      title: "Fast clock",
      body: "Holds that take days in a real campaign end in minutes here.",
    },
    {
      title: "Yours to break",
      body: "What you do is saved in this browser until you press Reset demo. Exit any time from the bar.",
    },
  ],
  compareHeading: "Live vs demo",
  compareBody:
    "Everything works in the demo. Here is what also runs for real on Monad Testnet today.",
  liveColumn: "Live on testnet",
  demoColumn: "Demo only",
  whatsComing: "What’s coming",
} as const;

export const personaCards = {
  merchant: {
    title: "Merchant",
    body: "Run a small shop with three campaigns, a funded reward vault, sales in their hold, refunds, partners and analytics.",
    tryLine:
      "Try: fund a campaign, refund a pending sale, finalize after the hold, invite a distributor.",
    place: "Sell overview",
    action: "Explore as a merchant",
    tone: "lime",
    shape: "pink",
    pieceTone: "pink",
  },
  distributor: {
    title: "Distributor",
    body: "Share products from two merchants, with a branching network, earnings at every stage and a public profile.",
    tryLine: "Try: create a link, follow a sale’s paid path, claim settled rewards.",
    place: "Earn home",
    action: "Explore as a distributor",
    tone: "lilac",
    shape: "lime",
    pieceTone: "lime",
  },
  buyer: {
    title: "Buyer",
    body: "Two purchases: one still in its settlement hold, one ready to open.",
    tryLine: "Try: buy through a link, ask for a refund, open what you bought.",
    place: "My purchases",
    action: "Explore as a buyer",
    tone: "sky",
    shape: "block",
    pieceTone: "lilac",
  },
} as const;
