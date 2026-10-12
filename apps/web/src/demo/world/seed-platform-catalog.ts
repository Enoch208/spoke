import { DEMO_CHAIN_ID, DEMO_PROTOCOL_ADDRESS } from "../../lib/client/demo/views/basics";
import { DAY, iso, sampleAddress } from "./ids";
import type { DemoCore, DemoToken } from "./types";
import type { Network, ThirdPartyClient } from "./world";

export const SAMPLE_NETWORK_A = 990_001;
export const SAMPLE_NETWORK_B = 990_002;

const tokenWire = (token: DemoToken, address: string = token.address) => ({
  address,
  symbol: token.symbol,
  decimals: token.decimals,
  name: token.name,
  testnet: true,
});

const sampleNetwork = (core: DemoCore, chainId: number, name: string, key: string): Network => ({
  chainId,
  name,
  explorer: null,
  protocolAddress: sampleAddress(`network:${key}:protocol`),
  allowedTokens: [tokenWire(core.tokens.sdusd, sampleAddress(`network:${key}:token:sdusd`))],
  status: "live",
});

export const seedNetworks = (core: DemoCore): Network[] => [
  {
    chainId: DEMO_CHAIN_ID,
    name: "Monad Testnet",
    explorer: "https://testnet.monadvision.com",
    protocolAddress: DEMO_PROTOCOL_ADDRESS,
    allowedTokens: [tokenWire(core.tokens.sdusd), tokenWire(core.tokens.sdeur)],
    status: "live",
  },
  sampleNetwork(core, SAMPLE_NETWORK_A, "Sample Network A", "a"),
  sampleNetwork(core, SAMPLE_NETWORK_B, "Sample Network B", "b"),
];

export const LISTING_CHECKS = [
  "Reads the live protocol or API",
  "Shows the campaign's policy before a purchase",
  "Links each sale to its public receipt",
  "Never asks for keys or recovery phrases",
];

type ClientRow = readonly [
  name: string,
  maker: string,
  purpose: string,
  type: ThirdPartyClient["type"],
  uses: readonly string[],
  checkedDaysAgo: number,
];

const clientRows: readonly ClientRow[] = [
  [
    "Sample · Newsletter referral bot",
    "Sample newsletter team",
    "Posts a subscriber's referral link under each issue and reports settled sales back to them.",
    "sdk",
    ["SDK", "Read API"],
    2,
  ],
  [
    "Sample · Campus store kiosk",
    "Sample campus co-op",
    "A touchscreen storefront that shows each campaign's terms before a student pays.",
    "web",
    ["Read API", "Contracts directly"],
    5,
  ],
  [
    "Sample · Podcast show-notes widget",
    "Sample podcast studio",
    "Drops a campaign card into each episode's show notes with the host's link attached.",
    "widget",
    ["Widgets"],
    3,
  ],
  [
    "Sample · Distributor earnings tracker",
    "Sample wallet team",
    "Shows reserved, claimable and claimed rewards next to the balances in a wallet.",
    "wallet",
    ["Read API", "Contracts directly"],
    1,
  ],
  [
    "Sample · Merchant analytics notebook",
    "Sample data team",
    "A notebook template that charts settled sales and refunds per campaign.",
    "sdk",
    ["SDK", "Read API"],
    8,
  ],
];

export const seedClients = (core: DemoCore): ThirdPartyClient[] =>
  clientRows.map(([name, maker, purpose, type, uses, checkedDaysAgo]) => ({
    name,
    maker,
    purpose,
    type,
    uses: [...uses],
    protocolVersion: "3.0",
    checks: [...LISTING_CHECKS],
    lastCheckedAt: iso(core.anchor - checkedDaysAgo * DAY),
  }));
