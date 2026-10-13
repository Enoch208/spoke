export const directoryCopy = {
  title: "Explore distributors",
  description:
    "People with settled sales on Spoke who chose to be listed. Every number comes from finalized, non-refunded receipts.",
  search: "Search by name or handle",
  orderedBody:
    "Most relevant puts category matches first, then settled sales in that category over the last 90 days, then the number of different merchants. Every fifth spot goes to a newer distributor (first settled sale in the last 30 days) who matches your filters, marked New, so the list doesn’t only reward early starters.",
  orderedOther:
    "Follower counts, wallet balances and outside data are never used, and no one can pay to rank higher.",
  settledLine: "Settled sales {settled}",
  merchantsLine: "Merchants {merchants}",
  active: "Active {relative}",
  basedOn: "Based on {count}",
  newChip: "New",
  invite: "Invite",
  showMore: "Show more",
  endOfList: "That’s everyone matching your filters.",
  emptyTitle: "No public distributor profiles yet",
  emptyBody:
    "Profiles appear here after a distributor’s first settled sale, and only if they choose to be listed.",
  exploreCampaigns: "Explore campaigns",
  exploreDemo: "Explore the demo",
  filteredTitle: "No distributors match these filters.",
  clearFilters: "Clear filters",
  notListed:
    "Not listed? Profiles appear after a first settled sale, for people who choose Public or Pseudonymous visibility.",
  setUp: "Set up your profile",
  count: "{count} listed",
} as const;

export const directorySorts = [
  { value: "balanced", label: "Most relevant" },
  { value: "settled", label: "Most settled sales" },
  { value: "diversity", label: "Most merchants" },
  { value: "recent", label: "Recently active" },
  { value: "new", label: "Newest" },
] as const;

export const directoryFilterGroups = {
  sales: {
    label: "Settled sales",
    options: [
      { value: "any", label: "Any" },
      { value: "3", label: "3+" },
      { value: "10", label: "10+" },
      { value: "25", label: "25+" },
    ],
  },
  merchants: {
    label: "Merchants",
    options: [
      { value: "any", label: "Any" },
      { value: "2", label: "2+" },
      { value: "3", label: "3+" },
    ],
  },
  active: {
    label: "Active",
    options: [
      { value: "any", label: "Any time" },
      { value: "30", label: "Last 30 days" },
      { value: "90", label: "Last 90 days" },
    ],
  },
} as const;
