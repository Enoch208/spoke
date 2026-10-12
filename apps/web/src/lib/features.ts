export type FeatureStatus = "live" | "demo-only";

type FeatureEntry = {
  readonly status: FeatureStatus;
  readonly target: FeatureStatus;
  readonly prd: readonly string[];
};

const entry = (target: FeatureStatus, ...prd: string[]): FeatureEntry => ({
  status: "demo-only",
  target,
  prd,
});

export const features = {
  discovery: entry("live", "G01", "G54"),
  merchantProfiles: entry("live", "G02", "G53"),
  merchantBadges: entry("demo-only", "G53"),
  catalog: entry("live", "G03"),
  productVariants: entry("demo-only", "G27"),
  composer: entry("live", "G04", "G06", "G07", "G08", "G43", "G66"),
  vault: entry("live", "G05", "G20", "G63"),
  links: entry("live", "G09", "G12", "G61"),
  graph: entry("live", "G10", "G11", "G13"),
  attribution: entry("live", "G14"),
  linkResolution: entry("demo-only", "G36"),
  checkout: entry("live", "G15"),
  settlement: entry("live", "G16", "G17", "G18", "G19"),
  proof: entry("live", "G21"),
  earnDashboard: entry("live", "G22"),
  sellDashboard: entry("live", "G23", "G42"),
  reputation: entry("live", "G24", "G25", "G70"),
  partnerDiscovery: entry("live", "G26", "G55"),
  partnerRecommendations: entry("demo-only", "G55"),
  insights: entry("live"),
  sdkRead: entry("live", "G27"),
  sdkWrite: entry("demo-only", "G28"),
  widgets: entry("demo-only", "G29", "G61"),
  stablecoins: entry("demo-only", "G30"),
  shopify: entry("demo-only", "G31"),
  woocommerce: entry("demo-only", "G32"),
  stripe: entry("demo-only", "G33"),
  attestations: entry("demo-only", "G34"),
  webhooks: entry("demo-only", "G35"),
  team: entry("demo-only", "G37"),
  apiKeys: entry("demo-only", "G38", "G64"),
  risk: entry("live", "G39"),
  riskReview: entry("demo-only", "G39", "G40", "G41", "G62"),
  communities: entry("demo-only", "G44"),
  cohorts: entry("live", "G45", "G46"),
  buyerIncentives: entry("demo-only", "G47"),
  subscriptions: entry("demo-only", "G48"),
  partnerships: entry("demo-only", "G49"),
  multiCurrency: entry("demo-only", "G50"),
  graphExports: entry("demo-only", "G51"),
  thirdPartyClients: entry("demo-only", "G52"),
  credentials: entry("demo-only", "G56"),
  gasSponsorship: entry("live", "G57"),
  pwa: entry("live", "G58"),
  localCurrency: entry("demo-only", "G59"),
  crossChain: entry("demo-only", "G60"),
  analytics: entry("live", "G65"),
  opsHealth: entry("live", "G67", "G68"),
} as const satisfies Record<string, FeatureEntry>;

export type FeatureKey = keyof typeof features;

export const featureKeys = Object.keys(features).filter((key): key is FeatureKey =>
  Object.hasOwn(features, key),
);

export const featureStatus = (key: FeatureKey): FeatureStatus => features[key].status;

export const isLive = (key: FeatureKey) => featureStatus(key) === "live";

export const isFeatureKey = (value: string): value is FeatureKey => Object.hasOwn(features, value);
