import { emptyStates } from "../empty-states";
import type { Message } from "../types";

type Labels = Readonly<Record<string, string>>;

type CommandPaletteCopy = {
  readonly placeholder: string;
  readonly groups: Labels;
  readonly actions: Labels;
  readonly explorer: Labels;
  readonly chips: Labels;
  readonly footer: string;
  readonly resultCount: string;
  readonly states: {
    readonly noResults: Message;
    readonly unavailable: string;
  };
};

const noResults = emptyStates["ES-70"];

export const commandPalette = {
  placeholder: "Search campaigns, people, sales or pages",
  groups: {
    suggestions: "Suggestions",
    actions: "Actions",
    pages: "Pages",
    campaigns: "Campaigns",
    people: "People",
    sales: "Sales",
    explorer: "On the explorer",
  },
  actions: {
    newLink: "New link",
    newCampaign: "New campaign",
    addTestFunds: "Add test funds",
    switchToEarn: "Switch to Earn",
    switchToSell: "Switch to Sell",
    enterDemo: "Enter demo",
    exitDemo: "Exit demo",
    reportProblem: "Report a problem",
    collapseSidebar: "Collapse sidebar",
  },
  explorer: {
    transaction: "Open transaction on MonadVision",
    address: "Open address on MonadVision",
    profile: "Open profile",
  },
  chips: { demoOnly: "Demo", sample: "Sample" },
  footer: "↑↓ to move · Enter to open · Esc to close",
  resultCount: "{n} results",
  states: {
    noResults: { title: noResults.title, body: noResults.body },
    unavailable: "Search is unavailable right now. Pages and actions still work.",
  },
} as const satisfies CommandPaletteCopy;
