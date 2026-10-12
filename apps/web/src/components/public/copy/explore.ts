export const exploreCopy = {
  title: "Explore campaigns",
  description:
    "Funded offers with public terms. Share one and earn when a sale through you settles.",
  search: "Search products or merchants",
  allCategories: "All",
  categories: "Categories",
  filters: "Filters",
  sort: "Sort",
  howOrdered: "How is this ordered?",
  orderedBody:
    "Recommended mixes four signals: budget left, sales settled in the last 14 days, the merchant’s refund record, and how new the campaign is. Reward size alone never puts a campaign first, and no one can pay for placement. One in every four of the top twelve spots goes to a campaign less than 7 days old, so new merchants get seen.",
  orderedOther:
    "The other sorts are literal: newest first, highest reward rate, most budget left, shortest hold.",
  summary: "{count} · Prices and rewards in SDUSD, a testnet demo token",
  freshness: "Indexed through block {block} · {relative}",
  showMore: "Show more campaigns",
  endOfList: "That’s every campaign matching your filters.",
  clear: "Clear",
  clearFilters: "Clear filters",
  showResults: "Show {count}",
  howSpokeWorks: "How Spoke works",
  launch: "Launch a campaign",
  emptyLiveTitle: "No live campaigns yet",
  emptyLiveBody:
    "Merchants are setting up on Monad Testnet. Be the first to launch one, or explore the full product with sample data.",
  exploreDemo: "Explore the demo",
  nothingOpen: "No campaigns are open right now. {count} paused or ended.",
  showThem: "Show them",
  emptyFilteredTitle: "No campaigns match these filters",
  emptyFilteredBody: "Try fewer filters or a different search.",
  loadError: "We couldn’t load campaigns.",
} as const;

export const sortLabels = {
  balanced: "Recommended",
  newest: "Newest",
  reward: "Highest reward rate",
  budget: "Most budget left",
  hold: "Shortest hold",
} as const;

export const filterGroups = {
  rate: {
    label: "Reward rate",
    options: [
      { value: "any", label: "Any" },
      { value: "upTo5", label: "Up to 5%" },
      { value: "from5", label: "5–10%" },
      { value: "from10", label: "10–20%" },
      { value: "over20", label: "Over 20%" },
    ],
  },
  levels: {
    label: "Paid levels",
    options: [
      { value: "any", label: "Any" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5" },
    ],
  },
  hold: {
    label: "Settlement hold",
    options: [
      { value: "any", label: "Any" },
      { value: "hour", label: "Under 1 hour" },
      { value: "day", label: "Under 1 day" },
      { value: "week", label: "Under 7 days" },
    ],
  },
  access: {
    label: "Who can share",
    options: [
      { value: "any", label: "Anyone" },
      { value: "invite", label: "Invitation only" },
    ],
  },
  status: {
    label: "Status",
    options: [
      { value: "open", label: "Open now" },
      { value: "all", label: "Include paused and ended" },
    ],
  },
} as const;

export const discoverSwitchCopy = {
  label: "Browse",
  campaigns: "Campaigns",
  distributors: "Distributors",
} as const;
