type Labels = Readonly<Record<string, string>>;

type DemoDialogCopy = {
  readonly enter: {
    readonly title: string;
    readonly body: string;
    readonly personas: Labels;
    readonly liveAccount: string;
    readonly primary: string;
    readonly secondary: string;
  };
  readonly reset: {
    readonly title: string;
    readonly body: string;
    readonly primary: string;
    readonly secondary: string;
  };
  readonly states: Labels;
};

export const demoDialog = {
  enter: {
    title: "Explore the demo",
    body: "The demo is a sample world: labelled sample merchants, people and sales. Nothing in it touches the chain or your account, and it’s saved only in this browser.",
    personas: {
      merchant: "Merchant: run three sample campaigns, fund budgets, and refund or finalize sales.",
      distributor:
        "Distributor: share sample campaigns across two merchants and claim simulated earnings.",
      buyer: "Buyer: buy through a link and follow your purchase from hold to settled.",
    },
    liveAccount:
      "You’ll stay signed in to your live account. Live transactions keep running in the background.",
    primary: "Enter demo as {persona}",
    secondary: "Cancel",
  },
  reset: {
    title: "Reset the demo?",
    body: "This clears every sample action you’ve taken in this browser and starts the sample world over.",
    primary: "Reset demo",
    secondary: "Cancel",
  },
  states: {
    loading: "Loading the sample world…",
    loadFailed: "Couldn’t load the demo. Check your connection and try again.",
    storageBlocked:
      "Your browser is blocking storage, so demo progress won’t be saved after you close this tab.",
  },
} as const satisfies DemoDialogCopy;
